#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================
AEVOREX FINANCEHUB CSS SOURCE DUPLIKÁCIÓ ANALÍZIS
SMART DUPLIKÁCIÓ DETEKTÁLÁS - Media Query Aware
SOURCE FÁJLOK (modulok) duplikáció elemzése - NEM a combined output!
===============================================================
"""

import re
import sys
import os
from pathlib import Path
from collections import defaultdict, Counter
import json

class CSSContext:
    """CSS kontextus tracker - media query, keyframes, stb."""
    def __init__(self):
        self.media_queries = []
        self.keyframes = []
        self.nesting_level = 0
        
    def __str__(self):
        if self.media_queries:
            return f"@media({', '.join(self.media_queries)})"
        elif self.keyframes:
            return f"@keyframes({', '.join(self.keyframes)})"
        else:
            return "global"
    
    def copy(self):
        """Create a copy of the context"""
        new_ctx = CSSContext()
        new_ctx.media_queries = self.media_queries.copy()
        new_ctx.keyframes = self.keyframes.copy()
        new_ctx.nesting_level = self.nesting_level
        return new_ctx

def extract_media_query(line):
    """Extract media query condition from @media line"""
    match = re.search(r'@media\s+(.+?)\s*{', line)
    if match:
        return match.group(1).strip()
    return "unknown"

def extract_keyframe_name(line):
    """Extract keyframe name from @keyframes line"""
    match = re.search(r'@keyframes\s+(\w+)', line)
    if match:
        return match.group(1)
    return "unknown"

def parse_css_with_context(content):
    """
    Parse CSS fájl kontextussal (media queries, keyframes, stb.)
    
    Returns:
        List of (selector, line_num, context, full_line)
    """
    lines = content.split('\n')
    results = []
    context_stack = [CSSContext()]  # Stack for nested contexts
    
    for line_num, line in enumerate(lines, 1):
        original_line = line
        line = line.strip()
        
        if not line or line.startswith('/*'):
            continue
            
        current_context = context_stack[-1]
        
        # === CONTEXT TRACKING ===
        
        # Media query start
        if line.startswith('@media'):
            media_query = extract_media_query(line)
            new_context = current_context.copy()
            new_context.media_queries.append(media_query)
            new_context.nesting_level += 1
            context_stack.append(new_context)
            continue
            
        # Keyframes start  
        elif line.startswith('@keyframes'):
            keyframe_name = extract_keyframe_name(line)
            new_context = current_context.copy()
            new_context.keyframes.append(keyframe_name)
            new_context.nesting_level += 1
            context_stack.append(new_context)
            continue
            
        # Other @ rules (skip)
        elif line.startswith('@'):
            continue
            
        # Block end - reduce context
        elif line == '}' and len(context_stack) > 1:
            context_stack.pop()
            continue
            
        # CSS Selector
        elif '{' in line:
            selector = line.split('{')[0].strip()
            if selector:
                # Normalize selector
                normalized_selector = re.sub(r'\s+', ' ', selector.strip())
                
                # KEYFRAMES CONTEXT - csak akkor add hozzá, ha nem keyframes szelektorról van szó
                if current_context.keyframes:
                    # Keyframes szelektorok: 0%, 50%, 100%, from, to
                    if re.match(r'^\d+%$', normalized_selector) or normalized_selector in ['from', 'to']:
                        # Ezeket külön kezeljük - NEM duplikációk!
                        continue
                
                # Skip pseudo-element-only selectors (::before, ::after)
                if not normalized_selector.startswith('::'):
                    results.append((
                        normalized_selector,
                        line_num,
                        current_context.copy(),
                        original_line.strip()
                    ))
    
    return results

def is_responsive_override(selector_occurrences):
    """
    Meghatározza, hogy a selector előfordulások responsive overrides-ok vagy valódi duplikációk.
    
    Args:
        selector_occurrences: List of (file_path, line_num, context, full_line)
    
    Returns:
        (is_responsive, explanation)
    """
    contexts = [str(occ[2]) for occ in selector_occurrences]
    
    # KEYFRAMES SELECTORS - ezek MINDIG validak (0%, 50%, 100%, stb.)
    selector = selector_occurrences[0][0] if selector_occurrences else ""
    if re.match(r'^\d+%$', selector.strip()) or selector.strip() in ['from', 'to']:
        return True, "Keyframes selector (0%, 50%, 100%, from, to) - mindig valid"
    
    # Ha minden előfordulás különböző kontextusban van -> responsive
    unique_contexts = set(contexts)
    if len(unique_contexts) == len(contexts):
        return True, "Minden előfordulás különböző media query kontextusban"
    
    # Ha van global + media query mix -> responsive  
    has_global = any(ctx == "global" for ctx in contexts)
    has_media = any("@media" in ctx for ctx in contexts)
    
    if has_global and has_media:
        return True, "Base definíció + responsive overrides"
    
    # Ha csak media query-k, de mind különböző -> responsive
    if all("@media" in ctx for ctx in contexts) and len(unique_contexts) == len(contexts):
        return True, "Különböző media query overrides"
    
    # UGYANAZON FÁJLON BELÜLI RESPONSIVE OVERRIDES
    files_involved = [occ[0] for occ in selector_occurrences]
    if len(set(files_involved)) == 1:  # Csak egy fájlban
        # Ha van base + media query ugyanabban a fájlban -> responsive
        if has_global and has_media:
            return True, "Ugyanazon fájlban: base + responsive overrides"
        # Ha csak különböző media query-k -> responsive
        if all("@media" in ctx for ctx in contexts) and len(unique_contexts) > 1:
            return True, "Ugyanazon fájlban: különböző responsive breakpoint-ok"
    
    # CROSS-FILE ANALYSIS - csak akkor duplikáció, ha UGYANABBAN A KONTEXTUSBAN
    if len(set(files_involved)) > 1:  # Több fájlban
        # Ha minden global kontextusban -> valódi duplikáció
        if all(ctx == "global" for ctx in contexts):
            return False, "Több fájlban, global kontextusban - valódi duplikáció"
        # Ha van media query mix -> lehet responsive
        if has_media:
            return True, "Több fájlban, de media query kontextusban - responsive override"
    
    # Egyébként valódi duplikáció
    return False, "Azonos kontextusban többször definiálva"

class SourceCSSAnalyzer:
    def __init__(self, css_directory):
        self.css_dir = Path(css_directory)
        self.files_data = {}
        self.all_selector_data = defaultdict(list)  # {selector: [occurrences]}
        self.real_duplicates = []
        self.responsive_overrides = []
        
        # SOURCE FÁJLOK - kizárjuk a build outputokat
        self.excluded_files = {
            'main_combined_financehub.css',  # BUILD OUTPUT
            'css_duplication_analysis.json',  # ANALÍZIS OUTPUT
        }
        
    def scan_css_files(self):
        """SOURCE CSS fájlok szkennelése - BUILD OUTPUTOK NÉLKÜL."""
        print(f"🔍 SOURCE CSS modulok szkennelése: {self.css_dir}")
        
        css_files = []
        for css_file in self.css_dir.rglob("*.css"):
            if css_file.name not in self.excluded_files:
                css_files.append(css_file)
        
        print(f"📂 Talált SOURCE CSS fájlok: {len(css_files)}")
        print(f"🚫 Kizárt build outputok: {', '.join(self.excluded_files)}")
        
        for css_file in css_files:
            self.analyze_file(css_file)
        
        return len(css_files)
    
    def analyze_file(self, css_file):
        """Egy SOURCE CSS fájl elemzése SMART CONTEXT PARSING-gel."""
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # SKIP @import fájlokat - ezek csak importálnak
            if self.is_import_only_file(content):
                print(f"⏭️  Átugrom (import-only): {css_file.name}")
                return
            
            rel_path = css_file.relative_to(self.css_dir)
            file_key = str(rel_path)
            
            # Fájl adatok tárolása
            self.files_data[file_key] = {
                'path': css_file,
                'size': len(content),
                'lines': content.count('\n') + 1,
                'module': self.get_module_category(rel_path)
            }
            
            # SMART CONTEXT PARSING
            selectors = parse_css_with_context(content)
            
            # Globális szelektor térkép frissítése
            for selector, line_num, context, full_line in selectors:
                self.all_selector_data[selector].append((file_key, line_num, context, full_line))
            
            print(f"✅ Elemezve: {rel_path} ({len(selectors)} szelektor)")
            
        except Exception as e:
            print(f"❌ Hiba {css_file} elemzésekor: {e}")
    
    def is_import_only_file(self, content):
        """Ellenőrzi hogy egy fájl csak @import utasításokat tartalmaz-e."""
        lines = [line.strip() for line in content.split('\n') 
                if line.strip() and not line.strip().startswith('/*')]
        
        if len(lines) == 0:
            return True
            
        import_lines = [line for line in lines if line.startswith('@import')]
        non_import_lines = [line for line in lines if not line.startswith('@import') and line != '']
        
        # Ha az összes érdemi sor @import, akkor ez egy import-only fájl
        return len(non_import_lines) <= 2  # Max 2 sor (pl. comments)
    
    def get_module_category(self, rel_path):
        """Modul kategória meghatározása a fájl útvonala alapján."""
        path_str = str(rel_path)
        
        if path_str.startswith('01-base/'):
            return 'base'
        elif path_str.startswith('02-shared/'):
            return 'shared'
        elif path_str.startswith('03-layout/'):
            return 'layout'
        elif path_str.startswith('04-components/'):
            component = path_str.split('/')[1] if '/' in path_str else 'general'
            return f'component-{component}'
        elif path_str.startswith('05-themes/'):
            return 'theme'
        elif path_str.startswith('06-pages/'):
            return 'page'
        elif path_str.startswith('07-vendor/'):
            return 'vendor'
        else:
            return 'other'
    
    def analyze_duplicates(self):
        """SMART duplikáció elemzés - media query aware."""
        print("\n🧠 === SMART DUPLIKÁCIÓ ELEMZÉS ===")
        
        for selector, occurrences in self.all_selector_data.items():
            if len(occurrences) > 1:
                is_responsive, explanation = is_responsive_override(occurrences)
                
                if is_responsive:
                    self.responsive_overrides.append((selector, occurrences, explanation))
                else:
                    self.real_duplicates.append((selector, occurrences, explanation))
        
        print(f"✅ Elemzés kész:")
        print(f"   🔧 Valódi duplikációk: {len(self.real_duplicates)}")
        print(f"   📱 Responsive overrides: {len(self.responsive_overrides)}")
        
        return len(self.real_duplicates), len(self.responsive_overrides)

    def generate_detailed_report(self):
        """Részletes duplikáció jelentés generálása."""
        print("\n" + "="*80)
        print("📋 SOURCE CSS MODULOK DUPLIKÁCIÓ JELENTÉS")
        print("="*80)
        
        # Összegzés
        total_real = len(self.real_duplicates)
        total_responsive = len(self.responsive_overrides)
        
        print(f"\n📊 ÖSSZEGZÉS:")
        print(f"   • SOURCE fájlok elemezve: {len(self.files_data)}")
        print(f"   • Valódi duplikációk: {total_real}")
        print(f"   • Responsive overrides: {total_responsive}")
        print(f"   • Összes duplikáció: {total_real + total_responsive}")
        
        # MODUL SZINTŰ BREAKDOWN
        print(f"\n📂 MODUL SZINTŰ BREAKDOWN:")
        module_stats = defaultdict(lambda: {'files': 0, 'real_dups': 0, 'responsive_dups': 0})
        
        # Modul statisztikák összegyűjtése
        for file_key, file_data in self.files_data.items():
            module = file_data['module']
            module_stats[module]['files'] += 1
        
        # Real duplikációk hozzáadása
        for selector, occurrences, explanation in self.real_duplicates:
            files_involved = set(occ[0] for occ in occurrences)
            for file_key in files_involved:
                if file_key in self.files_data:
                    module = self.files_data[file_key]['module']
                    module_stats[module]['real_dups'] += 1
        
        # Responsive overrides hozzáadása
        for selector, occurrences, explanation in self.responsive_overrides:
            files_involved = set(occ[0] for occ in occurrences)
            for file_key in files_involved:
                if file_key in self.files_data:
                    module = self.files_data[file_key]['module']
                    module_stats[module]['responsive_dups'] += 1
        
        # Modulok megjelenítése
        for module, stats in sorted(module_stats.items()):
            total_module_dups = stats['real_dups'] + stats['responsive_dups']
            if total_module_dups > 0:
                print(f"\n   📦 {module.upper()}:")
                print(f"      • {stats['files']} fájl")
                print(f"      • {stats['real_dups']} valódi duplikáció")
                print(f"      • {stats['responsive_dups']} responsive override")
                print(f"      • ÖSSZESEN: {total_module_dups} probléma")
        
        # KRITIKUS FÁJLOK LISTÁJA
        print(f"\n🔥 KRITIKUS FÁJLOK (legtöbb duplikációval):")
        file_dup_count = defaultdict(int)
        
        # Count real duplicates per file
        for selector, occurrences, explanation in self.real_duplicates:
            for file_key, line_num, context, full_line in occurrences:
                file_dup_count[file_key] += 1
        
        # Sort by duplication count
        file_priorities = [(file_key, count, self.files_data[file_key]['module']) 
                          for file_key, count in file_dup_count.items() if count > 0]
        file_priorities.sort(key=lambda x: x[1], reverse=True)
        
        for file_key, dup_count, module in file_priorities[:10]:
            print(f"   🔴 {file_key} [{module}]: {dup_count} duplikáció")
        
        # KOMPONENS SZINTŰ KERESZT-DUPLIKÁCIÓK
        print(f"\n🔄 KOMPONENS SZINTŰ KERESZT-DUPLIKÁCIÓK:")
        component_cross = defaultdict(list)
        
        for selector, occurrences, explanation in self.responsive_overrides:
            # Komponens típusok azonosítása
            modules = [self.files_data[occ[0]]['module'] for occ in occurrences if occ[0] in self.files_data]
            
            if any(m.startswith('component-') for m in modules):
                component_type = 'components'
            elif any('layout' in m for m in modules):
                component_type = 'layout'
            elif any('shared' in m for m in modules):
                component_type = 'shared'
            else:
                component_type = 'mixed'
                
            component_cross[component_type].append((selector, occurrences))
        
        for comp_type, selectors in component_cross.items():
            if selectors:
                print(f"\n   📂 {comp_type.upper()} kereszt-duplikációk:")
                for selector, occurrences in selectors[:5]:
                    files = set(occ[0] for occ in occurrences)
                    print(f"      • {selector} → {', '.join(files)}")
                if len(selectors) > 5:
                    print(f"      ... és még {len(selectors) - 5} duplikáció")
        
        return {
            'real_total': total_real,
            'responsive_total': total_responsive,
            'total': total_real + total_responsive,
            'module_stats': dict(module_stats)
        }
    
    def generate_target_list(self):
        """MODULÁRIS TISZTÍTÁSI PRIORITÁSI LISTA generálása."""
        print(f"\n🎯 MODULÁRIS TISZTÍTÁSI PRIORITÁSI LISTA:")
        
        # 1. KRITIKUS MODULOK - valódi duplikációk alapján
        module_priorities = defaultdict(lambda: {'real_dups': 0, 'files': [], 'total_impact': 0})
        
        # Count real duplicates per module
        for selector, occurrences, explanation in self.real_duplicates:
            files_involved = set(occ[0] for occ in occurrences)
            for file_key in files_involved:
                if file_key in self.files_data:
                    module = self.files_data[file_key]['module']
                    module_priorities[module]['real_dups'] += 1
                    module_priorities[module]['total_impact'] += 1
                    if file_key not in [f[0] for f in module_priorities[module]['files']]:
                        module_priorities[module]['files'].append((file_key, 1))
        
        # Rendezés impact szerint
        sorted_modules = sorted(module_priorities.items(), 
                              key=lambda x: x[1]['total_impact'], reverse=True)
        
        print(f"\n1️⃣ PRIORITÁS 1 - MODULON BELÜLI DUPLIKÁCIÓK:")
        for module, data in sorted_modules[:5]:
            if data['real_dups'] > 0:
                print(f"\n   📦 {module.upper()} modul ({data['real_dups']} duplikáció):")
                for file_key, dup_count in data['files'][:3]:
                    print(f"      🔧 {file_key}: duplikációk találhatók")
                    
                    # Konkrét javaslatok
                    if 'component-analysis-bubbles' in module:
                        print(f"         → Konszolidáld a .bubble-* osztályokat!")
                        print(f"         → Mozgasd át a közös stílusokat bubble-base.css-be!")
                    elif 'component-chart' in module:
                        print(f"         → Egyesítsd a media query-ket!")
                        print(f"         → Refaktoráld chart-base.css + chart-responsive.css-re!")
                    elif 'layout' in module:
                        print(f"         → Grid és flexbox duplikációk tisztítása!")
                    elif 'shared' in module:
                        print(f"         → Utility osztályok deduplikálása!")
        
        # 2. KOMPONENS KERESZT-DUPLIKÁCIÓK
        print(f"\n2️⃣ PRIORITÁS 2 - KOMPONENS KERESZT-DUPLIKÁCIÓK:")
        
        cross_component_issues = []
        for selector, occurrences, explanation in self.responsive_overrides:
            files_involved = [occ[0] for occ in occurrences]
            modules = [self.files_data[f]['module'] for f in files_involved if f in self.files_data]
            if len(set(modules)) > 1:  # Több modulban is szerepel
                cross_component_issues.append((selector, modules, len(occurrences)))
        
        # Leggyakoribb kereszt-duplikációk
        cross_component_issues.sort(key=lambda x: x[2], reverse=True)
        
        for selector, modules, count in cross_component_issues[:8]:
            unique_modules = list(set(modules))
            print(f"   🔄 `{selector}` ({count}x) → {', '.join(unique_modules)}")
            
            # Modulspecifikus javaslatok
            if 'shared' in unique_modules and any('component-' in m for m in unique_modules):
                print(f"      💡 Mozgasd át 02-shared/utilities.css-be!")
            elif len([m for m in unique_modules if m.startswith('component-')]) > 1:
                print(f"      💡 Létrehozd az 04-components/shared/ mappát!")
        
        # 3. AZONNALI AKCIÓK
        print(f"\n3️⃣ AZONNALI AKCIÓK:")
        print(f"   🔧 1. Kezdd a legnagyobb impact modulokkal")
        print(f"   🔧 2. Konszolidáld a .utility osztályokat 02-shared/utilities.css-be")
        print(f"   🔧 3. Hozd létre 04-components/shared/ mappát közös komponens stílusoknak")
        print(f"   🔧 4. Refaktoráld a chart komponenst: base + responsive fájlokra")
        print(f"   🔧 5. Analysis bubbles: közös bubble-base.css létrehozása")

    def save_detailed_json(self, output_file="css_duplication_analysis.json"):
        """Részletes analízis mentése JSON formátumban."""
        
        # Convert tuples to serializable format
        real_duplicates_data = []
        for selector, occurrences, explanation in self.real_duplicates:
            real_duplicates_data.append({
                'selector': selector,
                'explanation': explanation,
                'occurrences': [
                    {
                        'file': occ[0],
                        'line': occ[1],
                        'context': str(occ[2]),
                        'full_line': occ[3]
                    } for occ in occurrences
                ]
            })
        
        responsive_overrides_data = []
        for selector, occurrences, explanation in self.responsive_overrides:
            responsive_overrides_data.append({
                'selector': selector,
                'explanation': explanation,
                'occurrences': [
                    {
                        'file': occ[0],
                        'line': occ[1],
                        'context': str(occ[2]),
                        'full_line': occ[3]
                    } for occ in occurrences
                ]
            })
        
        analysis_data = {
            'timestamp': str(Path().cwd()),
            'files_analyzed': len(self.files_data),
            'real_duplicates': real_duplicates_data,
            'responsive_overrides': responsive_overrides_data,
            'files_data': self.files_data
        }
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(analysis_data, f, indent=2, ensure_ascii=False)
            print(f"💾 Részletes analízis mentve: {output_file}")
        except Exception as e:
            print(f"❌ JSON mentési hiba: {e}")

    def list_real_duplicates_for_cleanup(self):
        """
        VALÓDI DUPLIKÁCIÓK RÉSZLETES LISTÁZÁSA TISZTÍTÁSI CÉLOKRA
        """
        print(f"\n🧹 === VALÓDI DUPLIKÁCIÓK TISZTÍTÁSI LISTÁJA ===")
        print(f"Összesen {len(self.real_duplicates)} valódi duplikáció található:")
        
        # Rendezés súlyosság szerint (előfordulások száma)
        sorted_real_dups = sorted(self.real_duplicates, 
                                 key=lambda x: len(x[1]), reverse=True)
        
        for i, (selector, occurrences, explanation) in enumerate(sorted_real_dups, 1):
            print(f"\n{i:2d}. 🔴 `{selector}` ({len(occurrences)} előfordulás)")
            print(f"    💡 {explanation}")
            
            # Fájlok és kontextusok listázása
            for file_path, line_num, context, full_line in occurrences:
                module = self.files_data.get(file_path, {}).get('module', 'unknown')
                context_str = str(context)
                if context_str == "global":
                    context_display = "🌐 global"
                elif "@media" in context_str:
                    context_display = f"📱 {context_str}"
                else:
                    context_display = f"🔧 {context_str}"
                    
                print(f"       📁 {file_path}:{line_num} [{module}] {context_display}")
                print(f"          └─ {full_line[:80]}{'...' if len(full_line) > 80 else ''}")
            
            # Tisztítási javaslat
            files_involved = list(set(occ[0] for occ in occurrences))
            modules_involved = list(set(self.files_data.get(f, {}).get('module', 'unknown') for f in files_involved))
            
            if len(files_involved) == 1:
                print(f"    🔧 JAVASLAT: Ugyanazon fájlban duplikált - egyesítsd a definíciókat!")
            elif len(modules_involved) == 1:
                print(f"    🔧 JAVASLAT: Ugyanazon modulban - konszolidáld egy fájlba!")
            elif 'shared' in modules_involved:
                print(f"    🔧 JAVASLAT: Mozgasd át a shared modulba: 02-shared/utilities.css")
            elif any('component-' in m for m in modules_involved):
                print(f"    🔧 JAVASLAT: Hozz létre 04-components/shared/ mappát!")
            else:
                print(f"    🔧 JAVASLAT: Válaszd ki a legmegfelelőbb helyet és töröld a többit!")
        
        # ÖSSZEGZÉS MODULONKÉNT
        print(f"\n📊 === MODULONKÉNTI ÖSSZEGZÉS ===")
        module_dup_count = defaultdict(int)
        
        for selector, occurrences, explanation in self.real_duplicates:
            files_involved = [occ[0] for occ in occurrences]
            modules_involved = [self.files_data.get(f, {}).get('module', 'unknown') for f in files_involved]
            for module in set(modules_involved):
                module_dup_count[module] += 1
        
        sorted_modules = sorted(module_dup_count.items(), key=lambda x: x[1], reverse=True)
        
        for module, count in sorted_modules:
            print(f"   📦 {module}: {count} duplikáció")
        
        return len(self.real_duplicates)

def main():
    css_dir = "."  # Jelenlegi mappa alapértelmezett
    
    if len(sys.argv) > 1:
        css_dir = sys.argv[1]
    
    if not Path(css_dir).exists():
        print(f"❌ HIBA: A megadott mappa nem található: {css_dir}")
        sys.exit(1)
    
    print("🚀 AEVOREX CSS FEJLETT ANALÍZIS")
    print("="*50)
    
    # Analízis futtatása
    analyzer = SourceCSSAnalyzer(css_dir)
    
    files_count = analyzer.scan_css_files()
    if files_count == 0:
        print("❌ Nincsenek CSS fájlok a megadott mappában.")
        sys.exit(1)
    
    internal_count, responsive_count = analyzer.analyze_duplicates()
    
    # Jelentések
    results = analyzer.generate_detailed_report()
    analyzer.generate_target_list()
    
    # JSON mentés automatikusan
    analyzer.save_detailed_json()
    
    # Tisztítási lista generálása
    analyzer.list_real_duplicates_for_cleanup()
    
    print(f"\n🎉 ANALÍZIS BEFEJEZVE")
    print(f"Összesen {results['total']} duplikáció azonosítva")

if __name__ == "__main__":
    main() 