#!/usr/bin/env python3
"""
🎯 INTELLIGENS IMPORT SZINKRONIZÁLÓ - RULE #008 KOMPATIBILIS
============================================================

Automatikusan szinkronizálja a main_financehub.css importjait:
- Eltávolítja a nem létező fájlokra mutató importokat
- Hozzáadja a hiányzó létező fájlokat
- Megtartja a logikus sorrendet és struktúrát
- Rule #008 kompatibilis működés

Funkciók:
- Biztonságos backup készítés
- Intelligens import rendezés
- Komment megőrzés
- Validáció és ellenőrzés
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

class IntelligentImportSynchronizer:
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path).resolve()
        self.main_css_file = self.base_path / "main_financehub.css"
        self.backup_dir = self.base_path / "backup_imports"
        
        # Import kategóriák logikus sorrendben
        self.import_categories = {
            '01-base': 1,
            '02-shared': 2,
            '03-layout': 3,
            '04-components': 4,
            '05-themes': 5,
            '06-pages': 6,
            '07-vendor': 7
        }
        
        print(f"🎯 Intelligens Import Szinkronizáló inicializálva")
        print(f"📁 Alapkönyvtár: {self.base_path}")
        print(f"📄 Fő CSS fájl: {self.main_css_file}")
    
    def create_backup(self) -> Path:
        """Biztonságos backup készítése"""
        print(f"\n💾 Backup készítése...")
        
        # Backup könyvtár létrehozása
        self.backup_dir.mkdir(exist_ok=True)
        
        # Timestamp alapú backup név
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"main_financehub_backup_{timestamp}.css"
        
        # Backup másolása
        shutil.copy2(self.main_css_file, backup_file)
        
        print(f"   ✅ Backup mentve: {backup_file}")
        return backup_file
    
    def scan_existing_css_files(self) -> Set[str]:
        """Létező CSS fájlok szkennelése"""
        print(f"\n🔍 Létező CSS fájlok szkennelése...")
        
        excluded_patterns = {
            'backup', 'backup_', 'final_backup', 'radical_backup', 
            'strategic_backup', 'targeted_backup', 'precise_backup',
            'keyframe_backup', 'manual_backup', '__pycache__', '.git',
            'main_combined_financehub.css', 'main_financehub.css'
        }
        
        existing_files = set()
        for css_file in self.base_path.rglob("*.css"):
            # Kizárjuk a backup fájlokat és a main fájlt
            if not any(excluded in str(css_file).lower() for excluded in excluded_patterns):
                try:
                    rel_path = css_file.relative_to(self.base_path)
                    existing_files.add(str(rel_path))
                except ValueError:
                    continue
        
        print(f"   📊 Talált létező CSS fájlok: {len(existing_files)}")
        return existing_files
    
    def parse_current_imports(self) -> Tuple[List[str], List[str]]:
        """Jelenlegi importok elemzése"""
        print(f"\n📥 Jelenlegi importok elemzése...")
        
        if not self.main_css_file.exists():
            print(f"❌ HIBA: {self.main_css_file} nem található!")
            return [], []
        
        with open(self.main_css_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        import_lines = []
        non_import_lines = []
        
        for line in lines:
            # @import url('...') keresése
            if re.match(r'\s*@import\s+url\([\'"][^\'"]+[\'"]\);', line):
                import_lines.append(line.strip())
            else:
                non_import_lines.append(line.rstrip())
        
        print(f"   📊 Jelenlegi import sorok: {len(import_lines)}")
        print(f"   📊 Egyéb sorok: {len(non_import_lines)}")
        
        return import_lines, non_import_lines
    
    def extract_import_path(self, import_line: str) -> Optional[str]:
        """Import útvonal kinyerése egy sorból"""
        match = re.search(r"@import\s+url\(['\"]([^'\"]+)['\"]\);", import_line)
        if match:
            return match.group(1).lstrip('./')
        return None
    
    def categorize_file(self, file_path: str) -> int:
        """Fájl kategorizálása sorrendhez"""
        for category, order in self.import_categories.items():
            if file_path.startswith(category):
                return order
        return 999  # Ismeretlen kategória a végére
    
    def generate_optimized_imports(self, existing_files: Set[str]) -> List[str]:
        """Optimalizált import lista generálása"""
        print(f"\n🔧 Optimalizált import lista generálása...")
        
        # Fájlok kategorizálása és rendezése
        categorized_files = {}
        for file_path in existing_files:
            category_order = self.categorize_file(file_path)
            if category_order not in categorized_files:
                categorized_files[category_order] = []
            categorized_files[category_order].append(file_path)
        
        # Import sorok generálása kategóriánként
        import_lines = []
        
        # Fejléc komment
        import_lines.append("/* ========================================")
        import_lines.append("   FINANCEHUB MAIN CSS - AUTOMATIKUSAN SZINKRONIZÁLT")
        import_lines.append(f"   Utolsó frissítés: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        import_lines.append("   Rule #008 kompatibilis import struktúra")
        import_lines.append("   ======================================== */")
        import_lines.append("")
        
        # Kategóriák feldolgozása rendezett sorrendben
        for category_order in sorted(categorized_files.keys()):
            files_in_category = sorted(categorized_files[category_order])
            
            # Kategória név meghatározása
            category_name = "EGYÉB"
            for cat_prefix, cat_order in self.import_categories.items():
                if cat_order == category_order:
                    category_name = cat_prefix.upper().replace('-', ' ')
                    break
            
            # Kategória fejléc
            import_lines.append(f"/* === {category_name} === */")
            
            # Import sorok hozzáadása
            for file_path in files_in_category:
                import_line = f"@import url('{file_path}');"
                import_lines.append(import_line)
            
            import_lines.append("")  # Üres sor kategóriák között
        
        print(f"   📊 Generált import sorok: {len([l for l in import_lines if l.startswith('@import')])}")
        return import_lines
    
    def preserve_non_import_content(self, non_import_lines: List[str]) -> List[str]:
        """Nem-import tartalom megőrzése"""
        print(f"\n📝 Nem-import tartalom megőrzése...")
        
        # Eltávolítjuk a régi fejléc kommenteket
        filtered_lines = []
        skip_old_header = False
        
        for line in non_import_lines:
            line_stripped = line.strip()
            
            # Régi fejléc kommentek kihagyása
            if "FINANCEHUB MAIN CSS" in line_stripped or "=======" in line_stripped:
                skip_old_header = True
                continue
            elif skip_old_header and (line_stripped.startswith("/*") or line_stripped.endswith("*/")):
                continue
            elif skip_old_header and not line_stripped:
                continue
            else:
                skip_old_header = False
                filtered_lines.append(line)
        
        print(f"   📊 Megőrzött sorok: {len(filtered_lines)}")
        return filtered_lines
    
    def write_synchronized_file(self, import_lines: List[str], content_lines: List[str]):
        """Szinkronizált fájl írása"""
        print(f"\n✍️  Szinkronizált fájl írása...")
        
        with open(self.main_css_file, 'w', encoding='utf-8') as f:
            # Import sorok írása
            for line in import_lines:
                f.write(line + '\n')
            
            # Elválasztó
            f.write('\n')
            f.write('/* ======================================== */\n')
            f.write('/* EGYÉB CSS TARTALOM */\n')
            f.write('/* ======================================== */\n')
            f.write('\n')
            
            # Eredeti tartalom írása
            for line in content_lines:
                f.write(line + '\n')
        
        print(f"   ✅ Szinkronizált fájl mentve: {self.main_css_file}")
    
    def validate_synchronization(self, existing_files: Set[str]) -> Dict:
        """Szinkronizáció validálása"""
        print(f"\n🔍 Szinkronizáció validálása...")
        
        # Új importok beolvasása
        with open(self.main_css_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Import útvonalak kinyerése
        import_pattern = r"@import\s+url\(['\"]([^'\"]+)['\"]\);"
        found_imports = set(re.findall(import_pattern, content))
        
        # Normalizálás
        normalized_imports = set()
        for imp in found_imports:
            normalized_imports.add(imp.lstrip('./'))
        
        # Validáció
        missing_files = normalized_imports - existing_files
        missing_imports = existing_files - normalized_imports
        
        validation_result = {
            'total_imports': len(normalized_imports),
            'valid_imports': len(normalized_imports - missing_files),
            'missing_files': missing_files,
            'missing_imports': missing_imports,
            'coverage_percentage': (len(normalized_imports - missing_files) / len(existing_files) * 100) if existing_files else 0
        }
        
        print(f"   📊 Összes import: {validation_result['total_imports']}")
        print(f"   ✅ Érvényes importok: {validation_result['valid_imports']}")
        print(f"   ❌ Hiányzó fájlok: {len(missing_files)}")
        print(f"   ⚠️  Hiányzó importok: {len(missing_imports)}")
        print(f"   📈 Lefedettség: {validation_result['coverage_percentage']:.1f}%")
        
        if missing_files:
            print(f"\n❌ Hiányzó fájlok:")
            for file in sorted(missing_files):
                print(f"     • {file}")
        
        if missing_imports:
            print(f"\n⚠️  Hiányzó importok:")
            for file in sorted(missing_imports):
                print(f"     • {file}")
        
        return validation_result
    
    def run_synchronization(self) -> Dict:
        """Teljes szinkronizáció futtatása"""
        print(f"\n🚀 INTELLIGENS IMPORT SZINKRONIZÁCIÓ INDÍTÁSA")
        print(f"=" * 50)
        
        try:
            # 1. Backup készítése
            backup_file = self.create_backup()
            
            # 2. Létező fájlok szkennelése
            existing_files = self.scan_existing_css_files()
            
            # 3. Jelenlegi importok elemzése
            current_imports, non_import_content = self.parse_current_imports()
            
            # 4. Optimalizált importok generálása
            optimized_imports = self.generate_optimized_imports(existing_files)
            
            # 5. Nem-import tartalom megőrzése
            preserved_content = self.preserve_non_import_content(non_import_content)
            
            # 6. Szinkronizált fájl írása
            self.write_synchronized_file(optimized_imports, preserved_content)
            
            # 7. Validáció
            validation_result = self.validate_synchronization(existing_files)
            
            # 8. Összefoglaló
            print(f"\n📋 SZINKRONIZÁCIÓ ÖSSZEFOGLALÓ")
            print(f"=" * 30)
            print(f"Backup fájl: {backup_file.name}")
            print(f"Létező CSS fájlok: {len(existing_files)}")
            print(f"Szinkronizált importok: {validation_result['valid_imports']}")
            print(f"Import lefedettség: {validation_result['coverage_percentage']:.1f}%")
            
            if validation_result['coverage_percentage'] >= 95:
                print(f"✅ SZINKRONIZÁCIÓ SIKERES!")
            elif validation_result['coverage_percentage'] >= 80:
                print(f"⚠️  SZINKRONIZÁCIÓ RÉSZBEN SIKERES")
            else:
                print(f"🚨 SZINKRONIZÁCIÓ JAVÍTÁST IGÉNYEL")
            
            return validation_result
            
        except Exception as e:
            print(f"❌ HIBA a szinkronizáció során: {e}")
            # Backup visszaállítása hiba esetén
            if 'backup_file' in locals():
                shutil.copy2(backup_file, self.main_css_file)
                print(f"🔄 Backup visszaállítva")
            raise

if __name__ == "__main__":
    print("🎯 INTELLIGENS IMPORT SZINKRONIZÁLÓ - RULE #008 KOMPATIBILIS")
    print("=" * 60)
    
    synchronizer = IntelligentImportSynchronizer()
    result = synchronizer.run_synchronization()
    
    print(f"\n✅ Import szinkronizáció befejezve!") 
"""
🎯 INTELLIGENS IMPORT SZINKRONIZÁLÓ - RULE #008 KOMPATIBILIS
============================================================

Automatikusan szinkronizálja a main_financehub.css importjait:
- Eltávolítja a nem létező fájlokra mutató importokat
- Hozzáadja a hiányzó létező fájlokat
- Megtartja a logikus sorrendet és struktúrát
- Rule #008 kompatibilis működés

Funkciók:
- Biztonságos backup készítés
- Intelligens import rendezés
- Komment megőrzés
- Validáció és ellenőrzés
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

class IntelligentImportSynchronizer:
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path).resolve()
        self.main_css_file = self.base_path / "main_financehub.css"
        self.backup_dir = self.base_path / "backup_imports"
        
        # Import kategóriák logikus sorrendben
        self.import_categories = {
            '01-base': 1,
            '02-shared': 2,
            '03-layout': 3,
            '04-components': 4,
            '05-themes': 5,
            '06-pages': 6,
            '07-vendor': 7
        }
        
        print(f"🎯 Intelligens Import Szinkronizáló inicializálva")
        print(f"📁 Alapkönyvtár: {self.base_path}")
        print(f"📄 Fő CSS fájl: {self.main_css_file}")
    
    def create_backup(self) -> Path:
        """Biztonságos backup készítése"""
        print(f"\n💾 Backup készítése...")
        
        # Backup könyvtár létrehozása
        self.backup_dir.mkdir(exist_ok=True)
        
        # Timestamp alapú backup név
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"main_financehub_backup_{timestamp}.css"
        
        # Backup másolása
        shutil.copy2(self.main_css_file, backup_file)
        
        print(f"   ✅ Backup mentve: {backup_file}")
        return backup_file
    
    def scan_existing_css_files(self) -> Set[str]:
        """Létező CSS fájlok szkennelése"""
        print(f"\n🔍 Létező CSS fájlok szkennelése...")
        
        excluded_patterns = {
            'backup', 'backup_', 'final_backup', 'radical_backup', 
            'strategic_backup', 'targeted_backup', 'precise_backup',
            'keyframe_backup', 'manual_backup', '__pycache__', '.git',
            'main_combined_financehub.css', 'main_financehub.css'
        }
        
        existing_files = set()
        for css_file in self.base_path.rglob("*.css"):
            # Kizárjuk a backup fájlokat és a main fájlt
            if not any(excluded in str(css_file).lower() for excluded in excluded_patterns):
                try:
                    rel_path = css_file.relative_to(self.base_path)
                    existing_files.add(str(rel_path))
                except ValueError:
                    continue
        
        print(f"   📊 Talált létező CSS fájlok: {len(existing_files)}")
        return existing_files
    
    def parse_current_imports(self) -> Tuple[List[str], List[str]]:
        """Jelenlegi importok elemzése"""
        print(f"\n📥 Jelenlegi importok elemzése...")
        
        if not self.main_css_file.exists():
            print(f"❌ HIBA: {self.main_css_file} nem található!")
            return [], []
        
        with open(self.main_css_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        import_lines = []
        non_import_lines = []
        
        for line in lines:
            # @import url('...') keresése
            if re.match(r'\s*@import\s+url\([\'"][^\'"]+[\'"]\);', line):
                import_lines.append(line.strip())
            else:
                non_import_lines.append(line.rstrip())
        
        print(f"   📊 Jelenlegi import sorok: {len(import_lines)}")
        print(f"   📊 Egyéb sorok: {len(non_import_lines)}")
        
        return import_lines, non_import_lines
    
    def extract_import_path(self, import_line: str) -> Optional[str]:
        """Import útvonal kinyerése egy sorból"""
        match = re.search(r"@import\s+url\(['\"]([^'\"]+)['\"]\);", import_line)
        if match:
            return match.group(1).lstrip('./')
        return None
    
    def categorize_file(self, file_path: str) -> int:
        """Fájl kategorizálása sorrendhez"""
        for category, order in self.import_categories.items():
            if file_path.startswith(category):
                return order
        return 999  # Ismeretlen kategória a végére
    
    def generate_optimized_imports(self, existing_files: Set[str]) -> List[str]:
        """Optimalizált import lista generálása"""
        print(f"\n🔧 Optimalizált import lista generálása...")
        
        # Fájlok kategorizálása és rendezése
        categorized_files = {}
        for file_path in existing_files:
            category_order = self.categorize_file(file_path)
            if category_order not in categorized_files:
                categorized_files[category_order] = []
            categorized_files[category_order].append(file_path)
        
        # Import sorok generálása kategóriánként
        import_lines = []
        
        # Fejléc komment
        import_lines.append("/* ========================================")
        import_lines.append("   FINANCEHUB MAIN CSS - AUTOMATIKUSAN SZINKRONIZÁLT")
        import_lines.append(f"   Utolsó frissítés: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        import_lines.append("   Rule #008 kompatibilis import struktúra")
        import_lines.append("   ======================================== */")
        import_lines.append("")
        
        # Kategóriák feldolgozása rendezett sorrendben
        for category_order in sorted(categorized_files.keys()):
            files_in_category = sorted(categorized_files[category_order])
            
            # Kategória név meghatározása
            category_name = "EGYÉB"
            for cat_prefix, cat_order in self.import_categories.items():
                if cat_order == category_order:
                    category_name = cat_prefix.upper().replace('-', ' ')
                    break
            
            # Kategória fejléc
            import_lines.append(f"/* === {category_name} === */")
            
            # Import sorok hozzáadása
            for file_path in files_in_category:
                import_line = f"@import url('{file_path}');"
                import_lines.append(import_line)
            
            import_lines.append("")  # Üres sor kategóriák között
        
        print(f"   📊 Generált import sorok: {len([l for l in import_lines if l.startswith('@import')])}")
        return import_lines
    
    def preserve_non_import_content(self, non_import_lines: List[str]) -> List[str]:
        """Nem-import tartalom megőrzése"""
        print(f"\n📝 Nem-import tartalom megőrzése...")
        
        # Eltávolítjuk a régi fejléc kommenteket
        filtered_lines = []
        skip_old_header = False
        
        for line in non_import_lines:
            line_stripped = line.strip()
            
            # Régi fejléc kommentek kihagyása
            if "FINANCEHUB MAIN CSS" in line_stripped or "=======" in line_stripped:
                skip_old_header = True
                continue
            elif skip_old_header and (line_stripped.startswith("/*") or line_stripped.endswith("*/")):
                continue
            elif skip_old_header and not line_stripped:
                continue
            else:
                skip_old_header = False
                filtered_lines.append(line)
        
        print(f"   📊 Megőrzött sorok: {len(filtered_lines)}")
        return filtered_lines
    
    def write_synchronized_file(self, import_lines: List[str], content_lines: List[str]):
        """Szinkronizált fájl írása"""
        print(f"\n✍️  Szinkronizált fájl írása...")
        
        with open(self.main_css_file, 'w', encoding='utf-8') as f:
            # Import sorok írása
            for line in import_lines:
                f.write(line + '\n')
            
            # Elválasztó
            f.write('\n')
            f.write('/* ======================================== */\n')
            f.write('/* EGYÉB CSS TARTALOM */\n')
            f.write('/* ======================================== */\n')
            f.write('\n')
            
            # Eredeti tartalom írása
            for line in content_lines:
                f.write(line + '\n')
        
        print(f"   ✅ Szinkronizált fájl mentve: {self.main_css_file}")
    
    def validate_synchronization(self, existing_files: Set[str]) -> Dict:
        """Szinkronizáció validálása"""
        print(f"\n🔍 Szinkronizáció validálása...")
        
        # Új importok beolvasása
        with open(self.main_css_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Import útvonalak kinyerése
        import_pattern = r"@import\s+url\(['\"]([^'\"]+)['\"]\);"
        found_imports = set(re.findall(import_pattern, content))
        
        # Normalizálás
        normalized_imports = set()
        for imp in found_imports:
            normalized_imports.add(imp.lstrip('./'))
        
        # Validáció
        missing_files = normalized_imports - existing_files
        missing_imports = existing_files - normalized_imports
        
        validation_result = {
            'total_imports': len(normalized_imports),
            'valid_imports': len(normalized_imports - missing_files),
            'missing_files': missing_files,
            'missing_imports': missing_imports,
            'coverage_percentage': (len(normalized_imports - missing_files) / len(existing_files) * 100) if existing_files else 0
        }
        
        print(f"   📊 Összes import: {validation_result['total_imports']}")
        print(f"   ✅ Érvényes importok: {validation_result['valid_imports']}")
        print(f"   ❌ Hiányzó fájlok: {len(missing_files)}")
        print(f"   ⚠️  Hiányzó importok: {len(missing_imports)}")
        print(f"   📈 Lefedettség: {validation_result['coverage_percentage']:.1f}%")
        
        if missing_files:
            print(f"\n❌ Hiányzó fájlok:")
            for file in sorted(missing_files):
                print(f"     • {file}")
        
        if missing_imports:
            print(f"\n⚠️  Hiányzó importok:")
            for file in sorted(missing_imports):
                print(f"     • {file}")
        
        return validation_result
    
    def run_synchronization(self) -> Dict:
        """Teljes szinkronizáció futtatása"""
        print(f"\n🚀 INTELLIGENS IMPORT SZINKRONIZÁCIÓ INDÍTÁSA")
        print(f"=" * 50)
        
        try:
            # 1. Backup készítése
            backup_file = self.create_backup()
            
            # 2. Létező fájlok szkennelése
            existing_files = self.scan_existing_css_files()
            
            # 3. Jelenlegi importok elemzése
            current_imports, non_import_content = self.parse_current_imports()
            
            # 4. Optimalizált importok generálása
            optimized_imports = self.generate_optimized_imports(existing_files)
            
            # 5. Nem-import tartalom megőrzése
            preserved_content = self.preserve_non_import_content(non_import_content)
            
            # 6. Szinkronizált fájl írása
            self.write_synchronized_file(optimized_imports, preserved_content)
            
            # 7. Validáció
            validation_result = self.validate_synchronization(existing_files)
            
            # 8. Összefoglaló
            print(f"\n📋 SZINKRONIZÁCIÓ ÖSSZEFOGLALÓ")
            print(f"=" * 30)
            print(f"Backup fájl: {backup_file.name}")
            print(f"Létező CSS fájlok: {len(existing_files)}")
            print(f"Szinkronizált importok: {validation_result['valid_imports']}")
            print(f"Import lefedettség: {validation_result['coverage_percentage']:.1f}%")
            
            if validation_result['coverage_percentage'] >= 95:
                print(f"✅ SZINKRONIZÁCIÓ SIKERES!")
            elif validation_result['coverage_percentage'] >= 80:
                print(f"⚠️  SZINKRONIZÁCIÓ RÉSZBEN SIKERES")
            else:
                print(f"🚨 SZINKRONIZÁCIÓ JAVÍTÁST IGÉNYEL")
            
            return validation_result
            
        except Exception as e:
            print(f"❌ HIBA a szinkronizáció során: {e}")
            # Backup visszaállítása hiba esetén
            if 'backup_file' in locals():
                shutil.copy2(backup_file, self.main_css_file)
                print(f"🔄 Backup visszaállítva")
            raise

if __name__ == "__main__":
    print("🎯 INTELLIGENS IMPORT SZINKRONIZÁLÓ - RULE #008 KOMPATIBILIS")
    print("=" * 60)
    
    synchronizer = IntelligentImportSynchronizer()
    result = synchronizer.run_synchronization()
    
    print(f"\n✅ Import szinkronizáció befejezve!") 