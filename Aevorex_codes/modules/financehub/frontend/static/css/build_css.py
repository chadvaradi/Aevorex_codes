#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================
AEVOREX FINANCEHUB CSS BUNDLE BUILDER
Prémium modularizált CSS build rendszer
DuplikációDetektáló: listázza a problémákat, nem rejti el
===============================================================
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import html
import html.parser as _htmlparser
import textwrap

# === KONFIGURÁCIÓS KONSTANSOK ===
CSS_BASE_DIR = Path(".")  # Current directory
OUTPUT_FILE = Path("main_combined_financehub.css")
DEV_MASTER_FILE = Path("main_financehub.css")

# === WHITELIST & BLACKLIST BEÁLLÍTÁSOK ===
#   A) Whitelist – kizárólag ezekbõl a könyvtárakból engedjük be a CSS-fájlokat
#   B) Blacklist – minden, ami backup / temp / archive stb. → KIHAGYVA
WHITELIST_PREFIXES = [
    "01-base/", "02-shared/", "03-layout/", "04-components/",
    "05-themes/", "06-pages/", "07-vendor/"
]

# Regex-minták a kizáráshoz (kis- és nagybetû érzéketlen)
BLACKLIST_REGEXES = [
    r"backup", r"temp", r"archive", r"duplicate", r"_old", r"google-cloud-sdk",
    r"node_modules", r"venv"
]

# === DUPLIKÁCIÓ DETEKTÁLÁS ===
def detect_duplicates_in_css_files():
    """CSS duplikációk detektálása és részletes listázása minden build előtt."""
    print("\n🔍 === DUPLIKÁCIÓ DETEKTÁLÁS ===")
    print("A build script NEM fogja automatikusan javítani a duplikációkat!")
    print("Minden problémát LISTÁZ, hogy manuálisan meg tudd oldani.\n")
    
    base_dir = Path(".")
    selector_locations = defaultdict(list)  # {selector: [(file_path, line_num), ...]}
    file_internal_duplicates = defaultdict(list)  # {file_path: [duplicated_selectors]}
    total_duplicates = 0
    
    # Minden CSS fájl vizsgálata
    for css_file in base_dir.rglob("*.css"):
        if css_file.name in ["main_combined_financehub.css", "main_financehub.css"]:
            continue
            
        try:
            with open(css_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # CSS szelektorok keresése
            lines = content.split('\n')
            file_selectors = defaultdict(list)  # Track selectors within this file
            
            for line_num, line in enumerate(lines, 1):
                line = line.strip()
                if '{' in line and not line.startswith('/*') and not line.startswith('@'):
                    # Szelektor kinyerése
                    selector = line.split('{')[0].strip()
                    if selector:
                        # Normalizálás összehasonlításhoz
                        normalized = re.sub(r'\s+', ' ', selector.strip())
                        rel_path = css_file.relative_to(base_dir)
                        
                        # Global tracking
                        selector_locations[normalized].append((str(rel_path), line_num))
                        
                        # File internal tracking
                        file_selectors[normalized].append(line_num)
            
            # Check for internal duplicates within the file
            for selector, line_nums in file_selectors.items():
                if len(line_nums) > 1:
                    file_internal_duplicates[str(css_file.relative_to(base_dir))].append({
                        'selector': selector,
                        'lines': line_nums,
                        'count': len(line_nums)
                    })
        
        except Exception as e:
            print(f"⚠️  Hiba a fájl olvasásakor: {css_file} - {e}")
    
    # === KATEGÓRIÁNKÉNTI ELEMZÉS ===
    print("📋 === DUPLIKÁCIÓ KATEGÓRIÁK ===\n")
    
    # 1. FILE INTERNAL DUPLICATES (belső duplikációk)
    print("🔥 1. FÁJLON BELÜLI DUPLIKÁCIÓK:")
    internal_total = 0
    for file_path, duplicates in file_internal_duplicates.items():
        if duplicates:
            print(f"\n📁 Fájl: {file_path}")
            for dup in duplicates:
                internal_total += dup['count'] - 1  # -1 because the first occurrence is valid
                print(f"   🔴 `{dup['selector']}` → {dup['count']}× definiálva: sorok {', '.join(map(str, dup['lines']))}")
    
    if internal_total == 0:
        print("   ✅ Nincs fájlon belüli duplikáció!")
    
    # 2. CROSS-FILE DUPLICATES (komponensek közötti)
    print(f"\n🔥 2. KOMPONENSEK KÖZÖTTI DUPLIKÁCIÓK:")
    cross_file_total = 0
    component_groups = defaultdict(list)
    
    for selector, locations in selector_locations.items():
        if len(locations) > 1:
            # Group by component type
            files = [loc[0] for loc in locations]
            component_type = "mixed"
            
            if all("chart/" in f for f in files):
                component_type = "chart"
            elif all("analysis-bubbles/" in f for f in files):
                component_type = "analysis-bubbles"
            elif all("header/" in f for f in files):
                component_type = "header"
            elif all("stock-header/" in f for f in files):
                component_type = "stock-header"
            elif all("news/" in f for f in files):
                component_type = "news"
            
            component_groups[component_type].append((selector, locations))
            cross_file_total += 1
    
    for component_type, duplicates in component_groups.items():
        if duplicates:
            print(f"\n   📂 {component_type.upper()} komponens:")
            for selector, locations in duplicates[:5]:  # Show first 5 per category
                print(f"      🔴 `{selector}` → {len(locations)} helyen:")
                for file_path, line_num in locations:
                    print(f"         ↳ {file_path}:{line_num}")
            if len(duplicates) > 5:
                print(f"      ... és még {len(duplicates) - 5} duplikáció")
    
    total_duplicates = internal_total + cross_file_total
    
    # === JAVÍTÁSI JAVASLATOK ===
    print(f"\n💡 === JAVÍTÁSI JAVASLATOK ===")
    
    if file_internal_duplicates:
        print("🛠️  PRIORITÁS 1 - Fájlon belüli duplikációk:")
        for file_path, duplicates in list(file_internal_duplicates.items())[:3]:
            if duplicates:
                print(f"   📝 {file_path}:")
                print(f"      → Töröld a duplikált szelektorokat!")
                print(f"      → Konszolidáld a CSS szabályokat egy helyre!")
    
    if component_groups.get("chart"):
        print(f"\n🛠️  PRIORITÁS 2 - Chart komponens tisztítása:")
        print(f"      → 04-components/chart/ almappában TÚLKOMPLEXITÁS!")
        print(f"      → Válaszd szét: chart-base.css + chart-responsive.css")
        print(f"      → Konszolidáld a media query-ket!")
    
    if component_groups.get("analysis-bubbles"):
        print(f"\n🛠️  PRIORITÁS 3 - Analysis bubbles refaktor:")
        print(f"      → shared/bubbles-shared.css TÚLTERHELT!")
        print(f"      → Mozgasd át a közös stílusokat bubble-base.css-be")
    
    # Összefoglaló
    print(f"\n📊 === DUPLIKÁCIÓ ÖSSZEFOGLALÓ ===")
    print(f"🔍 Vizsgált fájlok: {len(list(base_dir.rglob('*.css')))} CSS fájl")
    print(f"🔴 Duplikált szelektorok: {total_duplicates}")
    print(f"   └── Fájlon belüli: {internal_total}")
    print(f"   └── Komponensek közötti: {cross_file_total}")
    print(f"📁 Érintett fájlok: {len(set(loc[0] for locs in selector_locations.values() if len(locs) > 1 for loc in locs))}")
    
    if total_duplicates > 0:
        print(f"\n⚠️  FIGYELEM: {total_duplicates} duplikált szelektor található!")
        print("💡 Javaslat: Prioritások szerint tisztítsd meg a duplikációkat!")
        print("🛠️  1. Fájlon belüli duplikációk → 2. Komponens refaktor → 3. Cross-file cleanup")
        print()
    else:
        print("\n✅ Nincs duplikáció! A CSS struktúra tiszta.\n")
    
    return total_duplicates

def validate_file_structure():
    """CSS fájlstruktúra validálása és hiányzó fájlok jelzése."""
    print("🔍 CSS fájlstruktúra validálása...")
    
    base_dir = Path(".")
    if not base_dir.exists():
        print(f"❌ HIBA: CSS alap könyvtár nem található: {base_dir}")
        return False
    
    required_structure = {
        "01-base": ["reset.css", "variables.css", "typography.css", "global.css"],
        "02-shared": ["forms/forms.css", "buttons/buttons.css", "spacing.css", "icons.css", "animations.css", "utilities.css", "indicators.css", "fonts.css"],
        "03-layout": [],  # Optional könyvtár
        "04-components": [],  # Dinamikusan ellenőrzött
        "05-themes": ["light.css", "dark.css"],
        "06-pages": [],  # Optional könyvtár
        "07-vendor": []  # Optional könyvtár
    }
    
    all_files_exist = True
    existing_files = []
    
    for folder, files in required_structure.items():
        folder_path = base_dir / folder
        if folder_path.exists():
            for file in files:
                file_path = folder_path / file
                if file_path.exists():
                    existing_files.append(f"{folder}/{file}")
                    print(f"✅ Található: {folder}/{file}")
                else:
                    print(f"⚠️  Hiányzik: {folder}/{file}")
        else:
            print(f"⚠️  Könyvtár nem található: {folder}")
    
    # Dinamikus fájlok keresése a components könyvtárban
    components_dir = base_dir / "04-components"
    if components_dir.exists():
        for css_file in components_dir.rglob("*.css"):
            rel_path = css_file.relative_to(base_dir)
            existing_files.append(str(rel_path))
            print(f"✅ Komponens található: {rel_path}")
    
    return existing_files

def scan_existing_css_files():
    """Ténylegesen létező CSS fájlok automatikus felderítése."""
    base_dir = Path(".")  # Current directory
    css_files = []
    
    # Rekurzív keresés minden CSS fájlra
    for css_file in base_dir.rglob("*.css"):
        # Skip build output files
        if css_file.name in ["main_combined_financehub.css", "main_financehub.css"]:
            continue
            
        rel_path = css_file.relative_to(base_dir).as_posix()

        # — BLACKLIST SZÛRÉS —
        if any(re.search(pattern, rel_path, re.IGNORECASE) for pattern in BLACKLIST_REGEXES):
            # print(f"⏭️  Skip (blacklist): {rel_path}")
            continue

        # — WHITELIST SZÛRÉS — (legalább az egyik prefixre illeszkedjen)
        if not any(rel_path.startswith(prefix) for prefix in WHITELIST_PREFIXES):
            # print(f"⏭️  Skip (non-whitelist): {rel_path}")
            continue

        css_files.append(rel_path)
    
    # Prioritás szerinti rendezés
    priority_order = [
        "01-base/",
        "02-shared/", 
        "03-layout/",
        "04-components/",
        "05-themes/",
        "06-pages/",
        "07-vendor/"
    ]
    
    def sort_key(file_path):
        for i, prefix in enumerate(priority_order):
            if file_path.startswith(prefix):
                return (i, file_path)
        return (999, file_path)
    
    css_files.sort(key=sort_key)
    return css_files

def read_css_file(file_path):
    """CSS fájl biztonságos beolvasása UTF-8 kódolással."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content
    except Exception as e:
        print(f"⚠️  Hiba a fájl olvasásakor: {file_path} - {e}")
        return ""

def optimize_css_content(content: str) -> str:
    """Ártalmatlan whitespace-tisztítás, kommentek érintetlenül.

    A korábbi verzió agresszíven eltávolította a /* … */ blokkok nyitó
    karaktereit, ami érvénytelen CSS-hez vezetett (a záró */ megmaradt,
    így a böngésző a komplett bundle hátralévő részét figyelmen kívül
    hagyta).  Most csak a többszörös üres sorokat és a sor eleji
    felesleges szóközöket szűrjük meg – minden kommentet eredeti formában
    bennhagyunk, mert <1 KB többletért cserébe garantált a parse-biztonság.
    """

    # 1) Több egymást követő üres sor ➜ egy sor
    content = re.sub(r"\n{3,}", "\n\n", content)

    # 2) Sor eleji felesleges whitespace eltávolítása (de a kommenteket nem bántjuk)
    cleaned_lines = []
    for line in content.splitlines():
        cleaned_lines.append(line.lstrip())

    return "\n".join(cleaned_lines).rstrip()

# === HTML → USED-SELECTOR GYŰJTÉS (UNUSED PURGE) ===
class _SelectorExtractor(_htmlparser.HTMLParser):
    """Nagyon könnyűsúlyú HTML-parser, ami csak class, id, tag neveket gyűjt."""
    def __init__(self):
        super().__init__()
        self.classes = set()
        self.ids = set()
        self.tags = set()

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        for attr, val in attrs:
            if attr == "class" and val:
                for cls in val.split():
                    self.classes.add(cls)
            elif attr == "id" and val:
                self.ids.add(val)


def collect_used_selectors(html_files):
    """Visszaad (used_classes, used_ids, used_tags) halmazokat."""
    extractor = _SelectorExtractor()
    for html_f in html_files:
        try:
            with open(html_f, "r", encoding="utf-8") as f:
                extractor.feed(f.read())
        except Exception as e:
            print(f"⚠️  Nem tudtam beolvasni HTML-fájlt: {html_f} – {e}")
    return extractor.classes, extractor.ids, extractor.tags


_CSS_RULE_RE = re.compile(r"([^{}]+)\{([^}]*)\}", re.MULTILINE)


def selector_used(selector, used_cls, used_ids, used_tags):
    selector = selector.strip()
    if not selector:
        return False
    # Keep universal selectors & at-rules
    if selector.startswith("@"):
        return True
    if selector in ["*", "html", "body"]:
        return True
    # Split complex selectors (take first simple chunk before combinator)
    first = re.split(r"\s|>|\+|~", selector)[0]
    # --- KEEP GLOBAL TOKEN BLOCKS ----------------------------------
    # FinanceHub uses CSS Custom Properties extensively under :root and
    # :root[data-theme="dark|light"] blocks.  These are critical and must
    # never be purged, even if they don't appear directly in the HTML.
    if first.startswith(':root'):
        return True

    if first.startswith('.'):  
        return first[1:] in used_cls
    if first.startswith('#'):
        return first[1:] in used_ids
    # Tag selector
    return first.lower() in used_tags

def purge_unused_css(css_text, used_cls, used_ids, used_tags):
    """Egyszerű regex-alapú selector purge + duplikáció szűrés."""
    kept_chunks = []
    seen_rules = set()
    pos = 0
    for m in _CSS_RULE_RE.finditer(css_text):
        selectors, body = m.group(1).strip(), m.group(2)
        keep = False
        for sel in selectors.split(','):
            if selector_used(sel, used_cls, used_ids, used_tags):
                keep = True
                break
        rule_text = f"{selectors}{{{body}}}"
        if keep:
            if rule_text not in seen_rules:
                kept_chunks.append(rule_text)
                seen_rules.add(rule_text)
        pos = m.end()
    return "\n".join(kept_chunks)

UTIL_CLASS_RE = re.compile(r"\.([A-Za-z0-9_:\\-]+)\s*\{([^}]+)\}", re.MULTILINE | re.DOTALL)
_APPLY_RE = re.compile(r"@apply\s+([^;]+);")

def _build_util_property_map() -> dict:
    """Aggregates utility class → property mappings from shared utility CSS sources.

    Currently scans both:
    • 02-shared/utilities.css      → display / flex / text / etc.
    • 02-shared/spacing.css        → margin / padding / gap utilities

    The merger allows @apply directives such as `@apply p-4 flex` to be fully
    expanded instead of leaving /* TODO:... */ placeholders that break layout.
    """

    shared_dir = Path("02-shared")
    candidate_files = [shared_dir / "utilities.css", shared_dir / "spacing.css"]

    mapping: dict[str, str] = {}

    for css_path in candidate_files:
        if not css_path.exists():
            print(f"⚠️  util source missing: {css_path}")
            continue
        try:
            css_text = css_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"⚠️  Could not read {css_path.name}: {e}")
            continue

        for m in UTIL_CLASS_RE.finditer(css_text):
            cls_name = m.group(1)
            props_raw = m.group(2).strip()
            props_clean = textwrap.dedent(props_raw).strip()
            # Later files (e.g., spacing.css) should not override previous ones unless intentional
            if cls_name not in mapping:
                mapping[cls_name] = props_clean
    print(f"🗺️  Util map built: {len(mapping)} classes parsed from {len(candidate_files)} files")
    return mapping

def _expand_apply_directives(css_text: str, util_map: dict) -> str:
    """Replaces every `@apply ...;` directive with inline utility declarations.

    If a utility class is missing from util_map, a /* TODO */ comment is inserted so we can
    detect it easily in DevTools / future passes.
    """
    if not util_map:
        return css_text  # nothing to do

    def _replacer(match: re.Match) -> str:
        class_list = match.group(1).strip().split()
        replaced_props = []
        for cls in class_list:
            props = util_map.get(cls)
            if props:
                replaced_props.append(props)
            else:
                replaced_props.append(f"/* TODO:{cls} */")
        # Join declarations with newline + same indent as @apply line
        indent = re.match(r"^[ \t]*", css_text[:match.start()].split('\n')[-1]).group(0)
        return ("\n" + indent).join(replaced_props)

    return _APPLY_RE.sub(_replacer, css_text)

def build_css_bundle(*, dry_run: bool = False, purge_unused: bool = False, strip_apply: bool = False):
    """Fő CSS bundle építési folyamat.

    strip_apply: ha True, minden `@apply ...;` direktívát kommentre cserélünk, hogy
    a nem-Tailwind böngészők (pl. Safari) ne álljanak le parse-stop hibával.
    """
    print("🚀 FinanceHub CSS Combined Bundle építés...")
    
    # Fájlstruktúra validálása
    existing_files = validate_file_structure()
    
    # Automatikus CSS fájl felderítés
    css_files = scan_existing_css_files()
    
    # Base dir dinamikus meghatározása
    base_dir = Path(".")  # Current directory
    
    print(f"📂 Alap mappa: {base_dir}")
    print(f"📊 Összes fájl: {len(css_files)}")
    
    # CSS tartalom összegyűjtése
    combined_content = []
    
    # Header hozzáadása
    header = f"""/* ===================================================================
   AEVOREX FINANCEHUB - COMBINED CSS BUNDLE
   Automatikusan generálva: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
   Development Master: main_financehub.css ({len(css_files)} fájl)
   =================================================================== */

"""
    combined_content.append(header)
    
    # ──────────────────────────────
    # HTML-fájlok összegyűjtése a használati listához (csak ha purge)
    used_classes = used_ids = used_tags = set()
    if purge_unused:
        html_dir = Path("..").resolve().parent  # feljebb lépünk a css-hez képest (static)
        html_candidates = list(html_dir.rglob("*.html"))
        used_classes, used_ids, used_tags = collect_used_selectors(html_candidates)
        print(f"🔎 Purge mód ON – {len(html_candidates)} HTML fájl vizsgálva, "
              f"class={len(used_classes)}, id={len(used_ids)}, tag={len(used_tags)}")
    
    # Build util map once (for @apply expansion)
    util_map = _build_util_property_map()
    
    # CSS fájlok feldolgozása
    processed_files = 0
    for css_file in css_files:
        file_path = base_dir / css_file
        
        if file_path.exists():
            print(f"📝 Feldolgozás: {css_file}")
            
            # Fájl header
            file_header = f"\n/* === {css_file.upper()} === */\n"
            combined_content.append(file_header)
            
            # CSS tartalom
            css_content = read_css_file(file_path)
            if css_content:
                # 1) Expand @apply → inline styles
                css_content = _expand_apply_directives(css_content, util_map)
                if strip_apply:
                    # 2) Ha maradt esetleg @apply, töröljük (biztonsági)
                    css_content = re.sub(r"\s*@apply[^;]+;", "", css_content)
                if purge_unused and css_content:
                    css_content = purge_unused_css(css_content, used_classes, used_ids, used_tags)
            processed_files += 1
            combined_content.append(css_content)
            combined_content.append("\n")
        else:
            print(f"⚠️  ❌ Nem található: {css_file}")
    
    print(f"🔧 CSS optimalizálás...")
    
    # Teljes tartalom összeállítása
    final_content = "".join(combined_content)
    
    # Enyhébb optimalizálás (header kommenteket megtartjuk)
    final_content = optimize_css_content(final_content)

    # ────────────────────────────────────────────────────────────
    # EXTRA STEP – Stray "/* TODO: ... */" scaffolds cleanup
    #   Early developer scaffolding comments that begin with "/* TODO:" sometimes
    #   end up concatenated line-by-line at the top of the bundle, leaving
    #   unmatched comment tokens and (critically) leaking raw property lines
    #   outside of any selector block ⇒ WebKit parse-stop → blank UI.
    #   We drop every SINGLE line that starts with this pattern, together with
    #   any immediate dangling terminator line "*/ */" which was produced by
    #   older formatter glitches.
    cleaned_no_todo_lines = []
    skip_next_closing = False
    for ln in final_content.splitlines():
        stripped = ln.lstrip()
        if stripped.startswith("/* TODO:"):
            skip_next_closing = True  # also skip the very next stray "*/ */" line
            continue  # drop the TODO scaffold line entirely
        # drop legacy malformed closing that immediately follows the TODO line
        if skip_next_closing and stripped.startswith("*/ */"):
            skip_next_closing = False
            continue
        # Remove legacy duplicate-rule markers like "/* body {" or "/* a:hover {" 
        if stripped.startswith("/*") and "{" in stripped:
            # Skip this line and all following lines until standalone closing '}'
            skip_block_until_closing = True
            continue
        if 'skip_block_until_closing' in locals() and skip_block_until_closing:
            # Keep skipping until we meet a line with only '}'
            if stripped.startswith('}') and stripped.strip() == '}':
                skip_block_until_closing = False
            # Continue skipping all lines inside the malformed block
            continue
        cleaned_no_todo_lines.append(ln)
    final_content = "\n".join(cleaned_no_todo_lines)

    # --- EXTRA SANITIZATION -----------------------------------------
    # A strip-apply lépés néha hibásan hagy dupla kettőspont nélküli pszeudoelemeket
    # ( pl. "*: :before,;" ), ami parse-stoppot okoz Safariban.  
    # Egyszerű regex-ekkel javítjuk a leggyakoribb mintákat.
    sanitizers = [
        (r":\s*:before", "::before"),
        (r":\s*:after", "::after"),
        (r",\s*;", ";"),
        # Eltévedt fejléc-sorok pl. "} AEVOREX …" → kommentezzük ki
        (r"(?m)\}\s+([A-Za-z].*?)$", r"}\n/* \1 */"),
    ]
    for pattern, replacement in sanitizers:
        final_content = re.sub(pattern, replacement, final_content)

    # 🩹  QUICK FIX – Drop stray standalone '}' lines before the first valid rule
    # ---------------------------------------------------------------
    #  A korábbi strip / concat lépések néha magányos '}' karaktert
    #  hagytak a fájl legelején (pl. "via Tailwind }"), ami parse-stopot
    #  okoz WebKit-alapú böngészőkben.  Ha ez a záró kapcsos jel még a
    #  legelső nyitó '{' előtt áll, biztonsággal eltávolítható.
    first_open = final_content.find('{')
    if first_open != -1:
        head, tail = final_content[:first_open], final_content[first_open:]
        # Töröljük azokat a sorokat, amelyek CSAK egy záró kapcsos jelet tartalmaznak
        head = re.sub(r"^\s*}\s*$(?:\n)?", "", head, flags=re.MULTILINE)
        final_content = head + tail

    # ────────────────────────────────────────────────────────────
    # EXTRA: álló "*/" zárók, amelyekhez nem tartozik nyitó "/*"
    # Telekom statikus build során néha bent maradnak a fájlok tetejéről
    # lecsupaszított komponens-fejléc sorai (pl. "AEVOREX … */"), ami
    # parse-stopot okoz WebKitben.  Egyszerűen töröljük az ilyen sorokat.
    cleaned_lines = []
    open_comment = False
    for line in final_content.splitlines():
        stripped = line.strip()
        # Nyitó komment detektálása
        if stripped.startswith("/*") and not stripped.endswith("*/"):
            open_comment = True
            cleaned_lines.append(line)
            continue
        # Záró komment detektálása
        if open_comment:
            cleaned_lines.append(line)
            if "*/" in stripped:
                open_comment = False
            continue
        # Ha a sor kizárólag comment-szöveg és "*/"-re végződik, de nincs nyitva komment → hagyjuk ki
        if stripped.endswith("*/") and "/*" not in stripped:
            continue  # DROPPED stray tail
        cleaned_lines.append(line)

    final_content = "\n".join(cleaned_lines)
    
    # --- AUTO BALANCE CURLY BRACES -----------------------------------
    # Safari (és más böngészők) a nyitott kapcsos zárójelek ( { ) megfelelő }
    # zárók nélküli állapotánál a teljes hátralévő stylesheetet eldobhatják.
    # Gyors mentőövként automatikusan pótoljuk a hiányzó zárójeleket a fájl
    # legvégén.  Ez nem tökéletes, de gyakorlati megoldás a parse-stop
    # elkerülésére, amíg fut a teljes lint/CI.

    open_braces = final_content.count('{')
    close_braces = final_content.count('}')
    if open_braces > close_braces:
        missing = open_braces - close_braces
        print(f"🩹  {missing} hiányzó '}}' automatikusan pótlásra kerül a bundle végén.")
        final_content += "\n" + ("}" * missing) + "\n"
    elif close_braces > open_braces:
        # Ritka, de jelöljük, ha több a záró mint a nyitó.
        print(f"⚠️  Figyelmeztetés: több '}}' záró található, mint '{{' nyitó (extra={{close_braces - open_braces}})")
    
    # --------------------- EXTRA: remove stray top-level property lines ------------------------
    #  Ha egy tulajdonság (pl. "display: flex;") a <style> gyökérszintjén marad, a böngészők
    #  teljesen figyelmen kívül hagyhatják a további deklarációkat.  Ez tipikusan a félrement
    #  @apply → inline kibontás mellékhatása volt.  Egyszerű heurisztikával kiszűrjük azokat a
    #  sorokat, amelyek „property: value;” mintát követnek ÉS nem egy blokk ( { } ) belsejében
    #  helyezkednek el.  Az ilyen sorokat inkább kommentezzük ki, hogy ne rontsák el a parsert.

    cleaned_sanitized_lines = []
    brace_level = 0
    prop_regex = re.compile(r"^\s*[a-zA-Z_-]+\s*:\s*[^;]+;\s*$")
    skip_block_until_closing = False
    for ln in final_content.splitlines():
        stripped = ln.lstrip()

        # Skip everything inside a previously detected malformed selector block
        if skip_block_until_closing:
            if stripped.startswith('}') and stripped.strip() == '}':
                skip_block_until_closing = False  # stop skipping after closing brace line
            continue  # Skip current line

        # Detect malformed selector comment lines like "/* body {" and start skip mode
        if stripped.startswith("/*") and "{" in stripped:
            skip_block_until_closing = True
            continue  # drop this line and subsequent ones until closing brace

        # Regular comment lines (not the malformed block above) – keep them and skip brace counting
        if stripped.startswith("/*"):
            cleaned_sanitized_lines.append(ln)
            continue  # SKIP brace counting for generic comment lines

        if brace_level == 0 and prop_regex.match(ln):
            # A deklaráció kívül van bármelyik blokkból – kommentezzük ki
            cleaned_sanitized_lines.append(f"/* ~~FIXME stray property~~ {ln.strip()} */")
            continue

        cleaned_sanitized_lines.append(ln)
        
        # Csak EZUTÁN frissítjük a blokk-mélységet erre a sorra nézve
        brace_level += ln.count('{') - ln.count('}')

    final_content = "\n".join(cleaned_sanitized_lines)
    
    # Kimeneti fájl írása
    try:
        # Legacy bundle is now suffixed with .legacy.css to avoid being imported by the new Vite+Tailwind pipeline
        output_path = Path("main_combined_financehub.legacy.css")
        print(f"🎯 Kimeneti fájl: {output_path}")
        
        if purge_unused and not dry_run:
            # Already pointing to legacy bundle – no need for compatibility copy
            original_path = output_path

        if dry_run:
            print("🔎 DRY-RUN: Kimeneti fájl nem kerül kiírásra (ellenõrzõ mód)")
        else:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
        
        # Statisztikák
        file_size = output_path.stat().st_size if output_path.exists() else 0
        lines_count = len(final_content.split('\n'))
        
        print(f"\n🎉 ✅ CSS BUILD SIKERES!")
        print(f"📄 Feldolgozott fájlok: {processed_files}/{len(css_files)}")
        print(f"📦 Kimeneti fájl: {output_path}")
        print(f"📏 Méret: {file_size:,} byte")
        print(f"📜 Sorok száma: {lines_count:,}")
        print(f"⚡ CSS optimalizálás: AKTÍV")
        
        return True
        
    except Exception as e:
        print(f"❌ Hiba a fájl írásakor: {e}")
        return False

def main():
    """Fő entry point."""
    print("=" * 60)
    print("🏗️  AEVOREX FINANCEHUB CSS BUILDER")
    print("=" * 60)
    
    # Munkakönyvtár ellenőrzése
    current_dir = Path.cwd()
    print(f"📁 Munkakönyvtár: {current_dir}")
    
    # Ha már a css mappában vagyunk, egyből futtatjuk a buildet
    if current_dir.name == "css" and (current_dir / "01-base").exists():
        print(f"✅ CSS könyvtárban vagyunk: {current_dir}")
        
        # DUPLIKÁCIÓ DETEKTÁLÁS FUTTATÁSA (kötelező minden build előtt)
        print("\n" + "="*60)
        duplicate_count = detect_duplicates_in_css_files()
        print("="*60)
        
        # Build futtatása (duplikációk ellenére is)
        print("\n🚀 BUILD FOLYTATÁSA...")
        if duplicate_count > 0:
            print(f"⚠️  FIGYELEM: {duplicate_count} duplikációval folytatva!")
            print("💡 Javaslat: Javítsd ki a duplikációkat a clean build érdekében.\n")
        
        # --- ARGUMENTUMOK FELDOLGOZÁSA ---
        dry_run_flag = "--dry-run" in sys.argv or "--dryrun" in sys.argv or "-n" in sys.argv
        purge_flag = "--purge" in sys.argv
        strip_apply_flag = "--strip-apply" in sys.argv or "--strip_apply" in sys.argv

        success = build_css_bundle(dry_run=dry_run_flag, purge_unused=purge_flag, strip_apply=strip_apply_flag)
        
        if success:
            if duplicate_count > 0:
                print(f"\n🎯 BUILD BEFEJEZVE - DE {duplicate_count} DUPLIKÁCIÓ MARADT! ⚠️")
                print("🛠️  A fájl használható, de nem optimális.")
                print("💡 Következő lépés: duplikációk manuális tisztítása.")
            else:
                print("\n🎯 BUILD BEFEJEZVE - Ready for production! 🚀")
            return True
        else:
            print("\n❌ BUILD FAILED - Ellenőrizd a hibákat!")
            return False
    
    # CSS könyvtár keresése
    css_dir = None
    possible_paths = [
        Path("Aevorex_codes/modules/financehub/frontend/static/css"),
        Path("modules/financehub/frontend/static/css"),
        Path("frontend/static/css"),
        Path("static/css"),
        Path("css")
    ]
    
    for path in possible_paths:
        if path.exists():
            css_dir = path
            break
    
    if not css_dir:
        print("❌ CSS könyvtár nem található! Ellenőrizd a munkakönyvtárat.")
        print(f"Keresett útvonalak: {[str(p) for p in possible_paths]}")
        return False
    
    print(f"✅ CSS könyvtár találva: {css_dir}")
    
    # Váltás a 'css' könyvtárba, hogy a whitelist prefixek stimmeljenek
    if Path.cwd() != css_dir.resolve():
        os.chdir(css_dir)
        print(f"📂 Váltás CSS könyvtárba: {Path.cwd()}")
    
    # DUPLIKÁCIÓ DETEKTÁLÁS FUTTATÁSA (kötelező minden build előtt)
    print("\n" + "="*60)
    duplicate_count = detect_duplicates_in_css_files()
    print("="*60)
    
    # Build futtatása (duplikációk ellenére is)
    print("\n🚀 BUILD FOLYTATÁSA...")
    if duplicate_count > 0:
        print(f"⚠️  FIGYELEM: {duplicate_count} duplikációval folytatva!")
        print("💡 Javaslat: Javítsd ki a duplikációkat a clean build érdekében.\n")
    
    # --- ARGUMENTUMOK FELDOLGOZÁSA ---
    dry_run_flag = "--dry-run" in sys.argv or "--dryrun" in sys.argv or "-n" in sys.argv
    purge_flag = "--purge" in sys.argv
    strip_apply_flag = "--strip-apply" in sys.argv or "--strip_apply" in sys.argv

    success = build_css_bundle(dry_run=dry_run_flag, purge_unused=purge_flag, strip_apply=strip_apply_flag)
    
    if success:
        if duplicate_count > 0:
            print(f"\n🎯 BUILD BEFEJEZVE - DE {duplicate_count} DUPLIKÁCIÓ MARADT! ⚠️")
            print("🛠️  A fájl használható, de nem optimális.")
            print("💡 Következő lépés: duplikációk manuális tisztítása.")
        else:
            print("\n🎯 BUILD BEFEJEZVE - Ready for production! 🚀")
        return True
    else:
        print("\n❌ BUILD FAILED - Ellenőrizd a hibákat!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 