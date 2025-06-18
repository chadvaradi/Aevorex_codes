#!/usr/bin/env python3
"""
FinanceHub CSS-HTML Compatibility Analyzer
Compares classes and IDs used in financehub.html with definitions in main_combined_financehub.css
"""

import re
import os

def analyze_css_html_compatibility():
    """
    Analyze CSS-HTML compatibility for FinanceHub
    """
    print("🔍 FINANCEHUB.HTML ↔ CSS COMPATIBILITY ANALYSIS")
    print("=" * 60)
    
    # Fixed paths for the current directory structure
    html_path = '../../financehub.html'
    css_path = './main_combined_financehub.css'
    
    try:
        # Read HTML file
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Read CSS file
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
            
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        return False

    # Extract classes from HTML
    html_classes = set()
    class_pattern = r'class="([^"]+)"'
    for match in re.finditer(class_pattern, html_content):
        classes = match.group(1).split()
        html_classes.update(classes)

    # Extract IDs from HTML
    html_ids = set()
    id_pattern = r'id="([^"]+)"'
    for match in re.finditer(id_pattern, html_content):
        html_ids.add(match.group(1))

    # Extract CSS classes
    css_classes = set()
    css_class_pattern = r'\.([a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)*(?:--[a-zA-Z0-9_-]+)*)'
    for match in re.finditer(css_class_pattern, css_content):
        css_classes.add(match.group(1))

    # Extract CSS IDs
    css_ids = set()
    css_id_pattern = r'#([a-zA-Z0-9_-]+)'
    for match in re.finditer(css_id_pattern, css_content):
        css_ids.add(match.group(1))

    print(f'📊 STATISTICS:')
    print(f'   HTML Classes: {len(html_classes)}')
    print(f'   CSS Classes: {len(css_classes)}')
    print(f'   HTML IDs: {len(html_ids)}')
    print(f'   CSS IDs: {len(css_ids)}')
    print()

    # Check coverage
    covered_classes = html_classes.intersection(css_classes)
    missing_classes = html_classes - css_classes
    extra_classes = css_classes - html_classes

    covered_ids = html_ids.intersection(css_ids)
    missing_ids = html_ids - css_ids
    extra_ids = css_ids - html_ids

    print('✅ COVERED CLASSES ({}/{}):'.format(len(covered_classes), len(html_classes)))
    for cls in sorted(covered_classes):
        print(f'   ✓ .{cls}')
    print()

    if missing_classes:
        print('❌ MISSING CLASSES (used in HTML but not in CSS):')
        for cls in sorted(missing_classes):
            print(f'   ✗ .{cls}')
        print()

    print('✅ COVERED IDs ({}/{}):'.format(len(covered_ids), len(html_ids)))
    for id_name in sorted(covered_ids):
        print(f'   ✓ #{id_name}')
    print()

    if missing_ids:
        print('❌ MISSING IDs (used in HTML but not in CSS):')
        for id_name in sorted(missing_ids):
            print(f'   ✗ #{id_name}')
        print()

    coverage_percentage = (len(covered_classes) / len(html_classes)) * 100 if html_classes else 100
    id_coverage_percentage = (len(covered_ids) / len(html_ids)) * 100 if html_ids else 100

    print('📈 COVERAGE SUMMARY:')
    print(f'   Classes: {coverage_percentage:.1f}% ({len(covered_classes)}/{len(html_classes)})')
    print(f'   IDs: {id_coverage_percentage:.1f}% ({len(covered_ids)}/{len(html_ids)})')
    
    if coverage_percentage > 95 and id_coverage_percentage > 95:
        status = '🎯 EXCELLENT'
    elif coverage_percentage > 80 and id_coverage_percentage > 80:
        status = '⚠️ NEEDS ATTENTION'
    else:
        status = '❌ CRITICAL'
    
    print(f'   Overall Status: {status}')
    
    # Detailed breakdown of missing classes
    if missing_classes:
        print('\n🔧 PRIORITY FIXES NEEDED:')
        critical_classes = []
        for cls in missing_classes:
            if any(keyword in cls for keyword in ['fh-', 'loading-', 'search-', 'ticker-', 'footer-', 'news-', 'error-']):
                critical_classes.append(cls)
        
        if critical_classes:
            print('   HIGH PRIORITY (component-specific):')
            for cls in sorted(critical_classes):
                print(f'     🔴 .{cls}')
        
        other_missing = missing_classes - set(critical_classes)
        if other_missing:
            print('   MEDIUM PRIORITY (utility/general):')
            for cls in sorted(other_missing):
                print(f'     🟡 .{cls}')

if __name__ == '__main__':
    analyze_css_html_compatibility() 
"""
FinanceHub CSS-HTML Compatibility Analyzer
Compares classes and IDs used in financehub.html with definitions in main_combined_financehub.css
"""

import re
import os

def analyze_css_html_compatibility():
    """
    Analyze CSS-HTML compatibility for FinanceHub
    """
    print("🔍 FINANCEHUB.HTML ↔ CSS COMPATIBILITY ANALYSIS")
    print("=" * 60)
    
    # Fixed paths for the current directory structure
    html_path = '../../financehub.html'
    css_path = './main_combined_financehub.css'
    
    try:
        # Read HTML file
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Read CSS file
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
            
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        return False

    # Extract classes from HTML
    html_classes = set()
    class_pattern = r'class="([^"]+)"'
    for match in re.finditer(class_pattern, html_content):
        classes = match.group(1).split()
        html_classes.update(classes)

    # Extract IDs from HTML
    html_ids = set()
    id_pattern = r'id="([^"]+)"'
    for match in re.finditer(id_pattern, html_content):
        html_ids.add(match.group(1))

    # Extract CSS classes
    css_classes = set()
    css_class_pattern = r'\.([a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)*(?:--[a-zA-Z0-9_-]+)*)'
    for match in re.finditer(css_class_pattern, css_content):
        css_classes.add(match.group(1))

    # Extract CSS IDs
    css_ids = set()
    css_id_pattern = r'#([a-zA-Z0-9_-]+)'
    for match in re.finditer(css_id_pattern, css_content):
        css_ids.add(match.group(1))

    print(f'📊 STATISTICS:')
    print(f'   HTML Classes: {len(html_classes)}')
    print(f'   CSS Classes: {len(css_classes)}')
    print(f'   HTML IDs: {len(html_ids)}')
    print(f'   CSS IDs: {len(css_ids)}')
    print()

    # Check coverage
    covered_classes = html_classes.intersection(css_classes)
    missing_classes = html_classes - css_classes
    extra_classes = css_classes - html_classes

    covered_ids = html_ids.intersection(css_ids)
    missing_ids = html_ids - css_ids
    extra_ids = css_ids - html_ids

    print('✅ COVERED CLASSES ({}/{}):'.format(len(covered_classes), len(html_classes)))
    for cls in sorted(covered_classes):
        print(f'   ✓ .{cls}')
    print()

    if missing_classes:
        print('❌ MISSING CLASSES (used in HTML but not in CSS):')
        for cls in sorted(missing_classes):
            print(f'   ✗ .{cls}')
        print()

    print('✅ COVERED IDs ({}/{}):'.format(len(covered_ids), len(html_ids)))
    for id_name in sorted(covered_ids):
        print(f'   ✓ #{id_name}')
    print()

    if missing_ids:
        print('❌ MISSING IDs (used in HTML but not in CSS):')
        for id_name in sorted(missing_ids):
            print(f'   ✗ #{id_name}')
        print()

    coverage_percentage = (len(covered_classes) / len(html_classes)) * 100 if html_classes else 100
    id_coverage_percentage = (len(covered_ids) / len(html_ids)) * 100 if html_ids else 100

    print('📈 COVERAGE SUMMARY:')
    print(f'   Classes: {coverage_percentage:.1f}% ({len(covered_classes)}/{len(html_classes)})')
    print(f'   IDs: {id_coverage_percentage:.1f}% ({len(covered_ids)}/{len(html_ids)})')
    
    if coverage_percentage > 95 and id_coverage_percentage > 95:
        status = '🎯 EXCELLENT'
    elif coverage_percentage > 80 and id_coverage_percentage > 80:
        status = '⚠️ NEEDS ATTENTION'
    else:
        status = '❌ CRITICAL'
    
    print(f'   Overall Status: {status}')
    
    # Detailed breakdown of missing classes
    if missing_classes:
        print('\n🔧 PRIORITY FIXES NEEDED:')
        critical_classes = []
        for cls in missing_classes:
            if any(keyword in cls for keyword in ['fh-', 'loading-', 'search-', 'ticker-', 'footer-', 'news-', 'error-']):
                critical_classes.append(cls)
        
        if critical_classes:
            print('   HIGH PRIORITY (component-specific):')
            for cls in sorted(critical_classes):
                print(f'     🔴 .{cls}')
        
        other_missing = missing_classes - set(critical_classes)
        if other_missing:
            print('   MEDIUM PRIORITY (utility/general):')
            for cls in sorted(other_missing):
                print(f'     🟡 .{cls}')

if __name__ == '__main__':
    analyze_css_html_compatibility() 