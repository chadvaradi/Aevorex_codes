#!/usr/bin/env python3
"""
FinanceHub JavaScript Build Script
Merges all JavaScript modules into a single combined file for optimal loading
Similar to the CSS build approach

Author: AEVOREX FinanceHub Team
Version: 3.1.0
"""

import os
import sys
import time
from pathlib import Path
from typing import List, Dict
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class JavaScriptBuilder:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.static_path = self.base_path / 'static'
        self.js_path = self.static_path / 'js'
        self.output_file = self.static_path / 'js' / 'main_combined_financehub.js'
        
        # Define the correct loading order (dependency-based)
        self.file_order = [
            # 📦 PHASE 1: Core Foundation
            'core/utils.js',
            'core/api.js',
            'core/state-manager.js',
            'core/theme-manager.js',
            'core/progressive-loader.js',
            # 🩹 Bootstrap patches (must run before main app scripts)
            'patches/financehub_bootstrap_patches.js',
            
            # 📦 PHASE 2: Core Application
            'core/api-singleton.js',
            'core/stream-hub.js',
            'core/app-initializer.js',
            'core/component-loader.js',
            'core/event-manager.js',
            
            # 📦 PHASE 3: Services
            'services/module-loader.js',
            'logic/search-logic.js',
            
            # 📦 PHASE 4: Store & State
            'store/app-state.js',
            
            # 📦 PHASE 5: UI Framework
            'ui/header-ui.js',
            
            # 📦 PHASE 6: Components (dependency order)
            'components/ticker-tape/ticker-tape.js',
            'components/analysis-bubbles/analysis-bubbles.js',
            'components/analysis-bubbles/company-overview/company-overview.js',
            'components/analysis-bubbles/financial-metrics/financial-metrics.js',
            'components/analysis-bubbles/technical-analysis/technical-analysis.js',
            'components/analysis-bubbles/market-news/market-news.js',
            'components/analysis-bubbles/news/news.js',
            'components/chat/modules/chat-core.js',
            'components/chat/modules/chat-ui.js',
            'components/chat/modules/chat-streaming.js',
            'components/chat/modules/chatScroll.logic.js',
            'components/chat/chat.js',
            'components/chart/chart.js',
            'components/stock-header/stock-header-manager.js',
            'components/ux/ux-enhancements.js',
            'components/header/header-manager.js',
            'components/research/research-platform.js',
            'components/footer/footer.js',
            
            # 📦 PHASE 7: Application Class (before main orchestrator)
            'app/app-class.js',
            
            # 📦 PHASE 8: Main Orchestrator (LAST)
            'main_financehub.js'
        ]
        
        self.stats = {
            'total_files': 0,
            'processed_files': 0,
            'skipped_files': 0,
            'total_size': 0,
            'errors': []
        }

    def build(self) -> bool:
        """Build the combined JavaScript file"""
        try:
            logger.info("🚀 Starting JavaScript build process...")
            logger.info(f"📁 Base path: {self.base_path}")
            logger.info(f"📁 JS path: {self.js_path}")
            logger.info(f"📄 Output file: {self.output_file}")
            
            # Create output directory if it doesn't exist
            self.output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Start building
            combined_content = self._build_header()
            
            # Process files in order
            for file_path in self.file_order:
                full_path = self.js_path / file_path
                content = self._process_file(full_path, file_path)
                if content:
                    combined_content += content
            
            # Add build footer
            combined_content += self._build_footer()
            
            # Write the combined file
            self._write_output_file(combined_content)
            
            # Print statistics
            self._print_stats()
            
            logger.info("✅ JavaScript build completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Build failed: {str(e)}")
            return False

    def _build_header(self) -> str:
        """Generate file header"""
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        return f"""/**
 * FinanceHub Combined JavaScript Bundle
 * 
 * Auto-generated file - DO NOT EDIT MANUALLY
 * 
 * Generated: {timestamp}
 * Builder: FinanceHub JavaScript Builder v3.1.0
 * 
 * This file contains all JavaScript modules combined in the correct
 * dependency order for optimal loading performance.
 * 
 * Total files processed: {len(self.file_order)}
 * 
 * @author AEVOREX FinanceHub Team
 * @version 3.1.0
 */

console.log('🚀 Loading FinanceHub Combined JavaScript Bundle...');

"""

    def _process_file(self, file_path: Path, relative_path: str) -> str:
        """Process a single JavaScript file"""
        self.stats['total_files'] += 1
        
        try:
            if not file_path.exists():
                logger.warning(f"⚠️  File not found: {relative_path}")
                self.stats['skipped_files'] += 1
                self.stats['errors'].append(f"File not found: {relative_path}")
                return ""
            
            # Read file content
            content = file_path.read_text(encoding='utf-8')
            file_size = len(content)
            self.stats['total_size'] += file_size
            self.stats['processed_files'] += 1
            
            logger.info(f"✅ Processed: {relative_path} ({file_size:,} bytes)")
            
            # Clean content
            cleaned_content = self._clean_content(content, relative_path)
            
            # Wrap content with file markers
            return f"""
/* ============================================================================
 * FILE: {relative_path}
 * SIZE: {file_size:,} bytes
 * ============================================================================ */

{cleaned_content}

/* ============================================================================
 * END OF FILE: {relative_path}
 * ============================================================================ */

"""
            
        except Exception as e:
            logger.error(f"❌ Error processing {relative_path}: {str(e)}")
            self.stats['skipped_files'] += 1
            self.stats['errors'].append(f"Error in {relative_path}: {str(e)}")
            return ""

    def _clean_content(self, content: str, file_path: str) -> str:
        """Clean JavaScript content"""
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            
            # Remove ES6 import statements (we're concatenating everything)
            if stripped.startswith('import ') and stripped.endswith(';'):
                cleaned_lines.append(f"// REMOVED IMPORT: {stripped}")
                continue
            
            # Remove ES6 export statements at the end of files
            if stripped.startswith('export ') and ('default' in line or '{' in line):
                cleaned_lines.append(f"// REMOVED EXPORT: {stripped}")
                continue
            
            # Skip duplicate window assignments for common objects
            if stripped.startswith('window.ChatCore =') and 'chat-core.js' not in file_path:
                cleaned_lines.append(f"// SKIPPED DUPLICATE: {stripped}")
                continue
                
            if stripped.startswith('window.FinanceHubAPI =') and 'api.js' not in file_path:
                cleaned_lines.append(f"// SKIPPED DUPLICATE: {stripped}")
                continue
                
            if stripped.startswith('window.FinanceHubState =') and 'state-manager.js' not in file_path:
                cleaned_lines.append(f"// SKIPPED DUPLICATE: {stripped}")
                continue
            
            # Keep all other content
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)

    def _build_footer(self) -> str:
        """Generate file footer"""
        return f"""

/* ============================================================================
 * BUILD STATISTICS
 * ============================================================================ */

console.log('📊 FinanceHub Bundle Statistics:', {{
    totalFiles: {self.stats['total_files']},
    processedFiles: {self.stats['processed_files']},
    skippedFiles: {self.stats['skipped_files']},
    totalSize: '{self.stats['total_size']:,} bytes',
    errors: {len(self.stats['errors'])}
}});

console.log('✅ FinanceHub Combined JavaScript Bundle loaded successfully!');

/* ============================================================================
 * END OF COMBINED BUNDLE
 * ============================================================================ */
"""

    def _write_output_file(self, content: str):
        """Write the combined content to output file"""
        logger.info(f"📝 Writing combined file: {self.output_file}")
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        output_size = len(content)
        logger.info(f"📄 Output file size: {output_size:,} bytes")

    def _print_stats(self):
        """Print build statistics"""
        logger.info("📊 Build Statistics:")
        logger.info(f"   Total files: {self.stats['total_files']}")
        logger.info(f"   Processed files: {self.stats['processed_files']}")
        logger.info(f"   Skipped files: {self.stats['skipped_files']}")
        logger.info(f"   Total size: {self.stats['total_size']:,} bytes")
        logger.info(f"   Errors: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            logger.warning("⚠️  Errors encountered:")
            for error in self.stats['errors']:
                logger.warning(f"     - {error}")

def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        base_path = sys.argv[1]
    else:
        # Default to current directory
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    logger.info(f"🎯 FinanceHub JavaScript Builder v3.1.0")
    logger.info(f"📁 Working directory: {base_path}")
    
    builder = JavaScriptBuilder(base_path)
    success = builder.build()
    
    if success:
        logger.info("🎉 Build completed successfully!")
        sys.exit(0)
    else:
        logger.error("💥 Build failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 