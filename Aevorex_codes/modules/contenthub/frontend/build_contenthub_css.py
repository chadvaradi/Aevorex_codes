#!/usr/bin/env python3
"""
ContentHub CSS Builder v2.0
Combines all CSS files into one optimized bundle with theme support
Author: Aevorex Premium Team
"""

import os
import sys
import shutil
from datetime import datetime
import glob
import re

class ContentHubCSSBuilder:
    def __init__(self):
        self.css_dir = "shared/css"
        self.output_file = "shared/css/main_combined_contenthub.css"
        self.backup_dir = "shared/css/backup"
        self.cache_buster = datetime.now().strftime("%Y%m%d_%H%M")
        
        # CSS import order for proper cascade
        self.import_order = [
            # === BASE STYLES (CRITICAL) ===
            "01-base/reset.css",
            "01-base/variables.css",
            "01-base/typography.css",
            
            # === COMPONENTS (MAIN) ===
            "02-components/buttons.css",
            "02-components/forms.css",
            "02-components/cards.css",
            "02-components/navigation.css",
            "02-components/hero.css",
            "02-components/header.css",
            "02-components/footer.css",
            "02-components/modal.css",
            "02-components/layout.css",
            "02-components/layout-main.css",
            "02-components/layout-dashboard.css",
            "02-components/module-cards.css",
            "02-components/workflow.css",
            "02-components/theme-system.css",
            
            # === THEMES (ORDER MATTERS) ===
            "03-themes/light.css",
            "03-themes/dark.css",
            
            # === UTILITIES (FINAL) ===
            "04-utilities/animations.css",
            "04-utilities/responsive.css",
            "04-utilities/accessibility.css",
            "04-utilities/performance.css",
            "04-utilities/print.css",
            "05-utilities/utilities.css",  # Fixed path
            "04-utilities/test-elements.css",
            "04-utilities/fallback.css"
        ]

    def create_backup(self):
        """Create backup of existing CSS"""
        if os.path.exists(self.output_file):
            os.makedirs(self.backup_dir, exist_ok=True)
            backup_name = f"main_combined_contenthub_{self.cache_buster}.css.bak"
            shutil.copy2(self.output_file, os.path.join(self.backup_dir, backup_name))
            print(f"✅ Backup created: {backup_name}")

    def combine_css_files(self):
        """Combine CSS files in proper order"""
        combined_content = []
        
        # Header comment
        combined_content.append(f"""/*
 * ==========================================================================
 * CONTENTHUB COMBINED CSS BUNDLE v2.0 - PRODUCTION READY
 * ==========================================================================
 * 
 * Auto-generated CSS bundle for ContentHub
 * Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 * Cache-buster: {self.cache_buster}
 * Build: PREMIUM ENTERPRISE
 * 
 * Features:
 * ✅ Complete CSS reset and variables
 * ✅ Premium component library
 * ✅ Light/Dark theme support
 * ✅ Animation system
 * ✅ Test element styles
 * ✅ Responsive utilities
 * 
 * NEVER EDIT THIS FILE DIRECTLY - Use build_contenthub_css.py
 */

""")

        # Process files in order
        for css_file in self.import_order:
            file_path = os.path.join(self.css_dir, css_file)
            
            if os.path.exists(file_path):
                print(f"📄 Processing: {css_file}")
                
                # Add file separator
                combined_content.append(f"/* {css_file.upper()} */\n")
                
                # Read and add file content
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Remove existing file headers and duplicates
                        content = re.sub(r'/\*\*[\s\S]*?\*/', '', content)
                        content = re.sub(r'^\s*@import[^;]+;\s*$', '', content, flags=re.MULTILINE)
                        combined_content.append(content)
                        combined_content.append("\n\n")
                except Exception as e:
                    print(f"⚠️  Error reading {css_file}: {e}")
            else:
                print(f"⚠️  File not found: {css_file}")

        return "\n".join(combined_content)

    def optimize_css(self, css_content):
        """Basic CSS optimization"""
        # Remove excessive whitespace
        css_content = re.sub(r'\n\s*\n', '\n\n', css_content)
        
        # Remove comments (except important ones)
        css_content = re.sub(r'/\*(?!.*IMPORTANT).*?\*/', '', css_content, flags=re.DOTALL)
        
        return css_content.strip()

    def update_html_references(self):
        """Update HTML files with new cache-buster"""
        html_files = ['index.html', 'test_main_bundles.html']
        
        for html_file in html_files:
            if os.path.exists(html_file):
                try:
                    with open(html_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Update CSS link with new cache-buster
                    old_pattern = r'main_combined_contenthub\.css\?test=[^"]*'
                    new_link = f'main_combined_contenthub.css?test={self.cache_buster}'
                    content = re.sub(old_pattern, new_link, content)
                    
                    with open(html_file, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    print(f"📝 Updated {html_file} with cache-buster: {self.cache_buster}")
                except Exception as e:
                    print(f"⚠️  Error updating {html_file}: {e}")

    def build(self):
        """Main build process"""
        print("🔨 Starting ContentHub CSS Build...")
        print(f"📁 Working directory: {os.getcwd()}")
        print(f"🎯 Target: {self.output_file}")
        print(f"🔄 Cache-buster: {self.cache_buster}")
        
        # Create backup
        self.create_backup()
        
        # Combine CSS files
        print("\n📦 Combining CSS files...")
        combined_css = self.combine_css_files()
        
        # Optimize
        print("⚡ Optimizing CSS...")
        optimized_css = self.optimize_css(combined_css)
        
        # Write output file
        try:
            os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
            with open(self.output_file, 'w', encoding='utf-8') as f:
                f.write(optimized_css)
            
            file_size = os.path.getsize(self.output_file)
            print(f"✅ CSS bundle created: {self.output_file}")
            print(f"📊 File size: {file_size:,} bytes")
            
        except Exception as e:
            print(f"❌ Error writing output file: {e}")
            return False
        
        # Update HTML references
        print("\n🔗 Updating HTML references...")
        self.update_html_references()
        
        print(f"\n🎉 BUILD COMPLETE! Cache-buster: {self.cache_buster}")
        return True

if __name__ == "__main__":
    builder = ContentHubCSSBuilder()
    success = builder.build()
    sys.exit(0 if success else 1) 