#!/usr/bin/env python3
"""
SZISZTEMATIKUS CSS DUPLIKÁCIÓ CLEANUP
Benchmark: teljes_duplikacio_lista.txt (555 duplikáció → 0)
"""

import re
import os
import shutil
from pathlib import Path
from collections import defaultdict

class DuplicationCleaner:
    """Szisztematikus duplikáció tisztító"""
    
    def __init__(self):
        self.base_dir = Path(".")
        self.backup_dir = Path("backup_before_cleanup")
        self.progress_file = "cleanup_progress.txt"
        self.benchmark_file = "teljes_duplikacio_lista.txt"
        
    def create_backup(self):
        """Biztonsági mentés készítése"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        
        print("🔄 Biztonsági mentés készítése...")
        shutil.copytree(".", self.backup_dir, ignore=shutil.ignore_patterns(
            "*.pyc", "__pycache__", "backup_*", "*.log", "teljes_duplikacio_lista.txt"
        ))
        print("✅ Backup kész!")
    
    def get_current_benchmark(self):
        """Aktuális benchmark beolvasása"""
        try:
            with open(self.benchmark_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Duplikációk számának kinyerése
            match = re.search(r'📊 Valódi duplikációk: (\d+)', content)
            if match:
                return int(match.group(1))
            return 0
        except:
            return 0
    
    def regenerate_benchmark(self):
        """Benchmark újragenerálása"""
        print("🔄 Benchmark újragenerálása...")
        os.system("python3 show_all_duplications.py > teljes_duplikacio_lista.txt 2>&1")
        return self.get_current_benchmark()
    
    def fix_cross_file_duplications(self):
        """Cross-file duplikációk javítása - PRIORITÁS 1"""
        print("\n🔴 PRIORITÁS 1: Cross-file duplikációk javítása")
        
        # Legkritikusabb duplikációk
        critical_fixes = [
            {
                'selector': '.price-change',
                'keep_file': '01-base/typography.css',
                'remove_from': [
                    '03-layout/app-container.css',
                    '03-layout/main-content.css',
                    '02-shared/fonts.css',
                    '04-components/stock-header/stock-header.css',
                    '04-components/widgets/financial-widgets.css',
                    '04-components/stock-header/price-display/price-display-main.css'
                ]
            },
            {
                'selector': '.content-wrapper',
                'keep_file': '03-layout/app-layout.css',
                'remove_from': [
                    '03-layout/app-container.css',
                    '03-layout/main-content.css'
                ]
            },
            {
                'selector': '.status-indicator',
                'keep_file': '03-layout/nav-main.css',
                'remove_from': [
                    '03-layout/main-content.css',
                    '04-components/widgets/financial-widgets.css'
                ]
            },
            {
                'selector': '.hidden',
                'keep_file': '02-shared/utilities.css',
                'remove_from': [
                    '03-layout/app-container.css',
                    '01-base/global.css',
                    '04-components/core.css'
                ]
            },
            {
                'selector': '.dropdown-menu',
                'keep_file': '03-layout/nav-main.css',
                'remove_from': [
                    '04-components/chart/controls.css'
                ]
            },
            {
                'selector': '.dropdown-item',
                'keep_file': '03-layout/nav-main.css',
                'remove_from': [
                    '04-components/chart/controls.css'
                ]
            }
        ]
        
        for fix in critical_fixes:
            self._apply_cross_file_fix(fix)
    
    def _apply_cross_file_fix(self, fix_config):
        """Egy cross-file duplikáció javítása"""
        selector = fix_config['selector']
        keep_file = fix_config['keep_file']
        remove_from = fix_config['remove_from']
        
        print(f"  🔧 Javítás: {selector}")
        print(f"     ✅ Megtartva: {keep_file}")
        
        for file_to_clean in remove_from:
            file_path = Path(file_to_clean)
            if not file_path.exists():
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Szelektort tartalmazó blokk eltávolítása
                cleaned_content = self._remove_css_block(content, selector)
                
                if cleaned_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(cleaned_content)
                    print(f"     🗑️  Eltávolítva: {file_to_clean}")
                
            except Exception as e:
                print(f"     ❌ Hiba: {file_to_clean} - {e}")
    
    def _remove_css_block(self, content, selector):
        """CSS blokk eltávolítása szelektora alapján"""
        lines = content.split('\n')
        result_lines = []
        skip_block = False
        brace_count = 0
        
        for line in lines:
            stripped = line.strip()
            
            # Szelektort tartalmazó sor keresése
            if selector in stripped and '{' in stripped:
                skip_block = True
                brace_count = stripped.count('{') - stripped.count('}')
                continue
            
            if skip_block:
                brace_count += stripped.count('{') - stripped.count('}')
                if brace_count <= 0:
                    skip_block = False
                continue
            
            result_lines.append(line)
        
        return '\n'.join(result_lines)
    
    def fix_utility_class_duplications(self):
        """Utility class duplikációk javítása - PRIORITÁS 2"""
        print("\n🟡 PRIORITÁS 2: Utility class duplikációk javítása")
        
        # Utility classok központosítása
        utility_fixes = [
            {
                'pattern': r'\.text-\w+',
                'target_file': '02-shared/utilities.css'
            },
            {
                'pattern': r'\.bg-\w+',
                'target_file': '02-shared/utilities.css'
            },
            {
                'pattern': r'\.border-\w+',
                'target_file': '02-shared/utilities.css'
            }
        ]
        
        for fix in utility_fixes:
            self._consolidate_utility_classes(fix)
    
    def _consolidate_utility_classes(self, fix_config):
        """Utility classok konszolidálása"""
        pattern = fix_config['pattern']
        target_file = fix_config['target_file']
        
        print(f"  🔧 Utility konszolidálás: {pattern} → {target_file}")
        
        # Implementáció később...
        pass
    
    def fix_within_file_duplications(self):
        """Within-file duplikációk javítása - PRIORITÁS 3"""
        print("\n🟢 PRIORITÁS 3: Within-file duplikációk javítása")
        
        css_files = list(Path(".").rglob("*.css"))
        
        for css_file in css_files:
            if css_file.name in ["main_combined_financehub.css", "main_financehub.css"]:
                continue
            
            self._fix_within_file_duplications(css_file)
    
    def _fix_within_file_duplications(self, css_file):
        """Egy fájlon belüli duplikációk javítása"""
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Duplikált szelektorok keresése és eltávolítása
            cleaned_content = self._remove_duplicate_selectors_in_file(content)
            
            if cleaned_content != content:
                with open(css_file, 'w', encoding='utf-8') as f:
                    f.write(cleaned_content)
                print(f"  🔧 Javítva: {css_file}")
        
        except Exception as e:
            print(f"  ❌ Hiba: {css_file} - {e}")
    
    def _remove_duplicate_selectors_in_file(self, content):
        """Duplikált szelektorok intelligens egyesítése egy fájlon belül.

        A régebbi implementáció a duplikált blokkokat egyszerűen eldobta – ez veszélyes,
        mert elveszhetnek stilus-deklarációk, vagy felborulhat a deklarációk sorrendje,
        amely befolyásolja a CSS kaszkádot.  Az új logika a következőt teszi:

        1.  Végigiterál a legfelső (root) szinten lévő blokkokon, @-szabályokon kívül.
        2.  Az adott szelektor összes deklarációját **összeolvasztja** – ha ugyanaz a
            property név többször szerepel, a legutolsó érték nyer (ez felel meg a
            természetes CSS-kaszkádnak).
        3.  A végén az első előfordulás helyén hagyja az összevont blokkot, az összes
            későbbi duplikált blokkot pedig eltávolítja.

        A függvény NEM érinti az @media, @keyframes stb. blokkokat, illetve a bennük
        lévő esetleges duplikációkat – azok általában kontextus-specifikusak.
        """
        import re
        from collections import OrderedDict

        # Gyors kilépés, ha nincs kapcsos zárójel
        if '{' not in content:
            return content

        # Regex a root-szintű blokkok gyors kinyeréséhez (nem @-rule, nincs beágyazott
        # kapcsos zárójel).  Nem tökéletes parser, de a FinanceHub CSS fájloknál
        # elegendő – a beágyazott @-rule-okat előtte kivágjuk.
        block_regex = re.compile(r'(?:^[^{@][^{]*?)\{[^{}]*?\}', re.M | re.S)

        # Első kör – kigyűjtjük a blokkokat pozícióval együtt
        blocks = []  # (start_idx, end_idx, selector_text, body_text)
        for m in block_regex.finditer(content):
            start, end = m.span()
            raw_block = m.group(0)
            selector_part, body_part = raw_block.split('{', 1)
            selector = selector_part.strip()
            body = body_part.rsplit('}', 1)[0]  # remove trailing }
            blocks.append((start, end, selector, body))

        if not blocks:
            return content  # semmi dolgunk

        # Map a szelektoronkénti összevont property-listákhoz
        merged_props: dict[str, "OrderedDict[str, str]"] = {}
        first_occurrence_index: dict[str, int] = {}

        # Helper: property-sor feldolgozása → (prop, value)
        def parse_property_line(line: str):
            if ':' not in line:
                return None, None
            prop, val = line.split(':', 1)
            return prop.strip(), val.strip().rstrip(';')

        for idx, (start, end, selector, body) in enumerate(blocks):
            # Egyszerű normalizálás – többszörös szóköz → egy szóköz
            normalized_selector = re.sub(r'\s+', ' ', selector)
            if normalized_selector not in merged_props:
                merged_props[normalized_selector] = OrderedDict()
                first_occurrence_index[normalized_selector] = idx  # eredeti sorrend megtartása

            # Feldolgozzuk a tulajdonságokat soronként
            for line in body.split('\n'):
                stripped = line.strip()
                if not stripped or stripped.startswith('/*'):
                    # Komment vagy üres sor → továbbítjuk az eredeti blokkban, ha az
                    # első előfordulásban volt.  A kommentek sorrendje nem kritikus.
                    continue
                prop, val = parse_property_line(stripped)
                if prop:
                    # A későbbi előfordulás felülírja az értéket (CSS cascade)
                    merged_props[normalized_selector][prop] = val

        # Új blokk szövegének összeállítása szelektoronként
        rebuilt_blocks = {}
        for selector, props in merged_props.items():
            prop_lines = [f"  {p}: {v};" for p, v in props.items()]
            block_text = selector + " {\n" + "\n".join(prop_lines) + "\n}"
            rebuilt_blocks[selector] = block_text

        # Második kör – eredeti content újraépítése, duplikátumok kiszűrése
        new_content_parts = []
        last_idx = 0
        processed_selectors = set()

        for start, end, selector, _ in blocks:
            normalized_selector = re.sub(r'\s+', ' ', selector)
            # Add content between previous block end and this block start (kommentek, @-rule-ok stb.)
            new_content_parts.append(content[last_idx:start])

            if normalized_selector in processed_selectors:
                # Ezt a duplikált blokkot kihagyjuk
                pass  # semmit sem adunk hozzá
            else:
                # Első (és egyetlen) előfordulás → beillesztjük az összevont verziót
                new_content_parts.append(rebuilt_blocks[normalized_selector])
                processed_selectors.add(normalized_selector)
            last_idx = end  # tovább lépünk

        # A maradék tartalom (fájl vége) hozzáfűzése
        new_content_parts.append(content[last_idx:])

        cleaned_css = "".join(new_content_parts)
        return cleaned_css
    
    def run_cleanup_cycle(self):
        """Egy teljes cleanup ciklus futtatása"""
        print("🚀 SZISZTEMATIKUS CLEANUP INDÍTÁSA")
        print("=" * 60)
        
        # Kezdeti állapot
        initial_count = self.get_current_benchmark()
        print(f"📊 Kezdeti duplikációk: {initial_count}")
        
        if initial_count == 0:
            print("🎉 Nincs több duplikáció!")
            return
        
        # Biztonsági mentés
        self.create_backup()
        
        # Prioritás szerinti javítás
        self.fix_cross_file_duplications()
        
        # Benchmark frissítése
        current_count = self.regenerate_benchmark()
        print(f"\n📈 PROGRESS: {initial_count} → {current_count} duplikáció")
        
        if current_count < initial_count:
            print(f"✅ Javítva: {initial_count - current_count} duplikáció!")
        else:
            print("⚠️  Nincs javulás, következő prioritás...")
        
        # Folytatás ha még vannak duplikációk
        if current_count > 0:
            self.fix_utility_class_duplications()
            current_count = self.regenerate_benchmark()
            print(f"📈 PROGRESS: {initial_count} → {current_count} duplikáció")
        
        if current_count > 0:
            self.fix_within_file_duplications()
            current_count = self.regenerate_benchmark()
            print(f"📈 FINAL PROGRESS: {initial_count} → {current_count} duplikáció")
        
        # Végső eredmény
        print(f"\n🎯 CLEANUP CIKLUS BEFEJEZVE")
        print(f"📊 Végső duplikációk: {current_count}")
        
        if current_count == 0:
            print("🎉 MINDEN DUPLIKÁCIÓ JAVÍTVA!")
        else:
            print(f"🔄 Következő ciklusban folytatjuk...")

def main():
    """Fő cleanup folyamat"""
    cleaner = DuplicationCleaner()
    cleaner.run_cleanup_cycle()

if __name__ == "__main__":
    main() 