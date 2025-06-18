#!/bin/bash

# AEVOREX FinanceHub - Module Export Fix Script
# Javítja az összes hibás module.exports hivatkozást biztonságos if ellenőrzésre

echo "🚀 Starting FinanceHub Module Export Fix..."

# FinanceHub frontend JS directory
JS_DIR="frontend/static/js"

if [ ! -d "$JS_DIR" ]; then
    echo "❌ Error: $JS_DIR directory not found!"
    exit 1
fi

cd "$JS_DIR"

# Find all .js files with direct module.exports
FILES=$(grep -r "module\.exports = " . --include="*.js" -l)

if [ -z "$FILES" ]; then
    echo "✅ No direct module.exports found - all files are already safe!"
    exit 0
fi

echo "📝 Found files with direct module.exports:"
echo "$FILES"

# Counter for fixed files
FIXED_COUNT=0

# Process each file
for file in $FILES; do
    echo "🔧 Processing: $file"
    
    # Create backup
    cp "$file" "$file.backup_$(date +%Y%m%d_%H%M%S)"
    
    # Replace direct module.exports with safe conditional
    sed -i '' 's/^module\.exports = /if (typeof module !== '\''undefined'\'' \&\& module.exports) { module.exports = /g' "$file"
    
    # Add closing brace for the if statement
    sed -i '' 's/^if (typeof module !== '\''undefined'\'' \&\& module.exports) { module.exports = \(.*\);$/if (typeof module !== '\''undefined'\'' \&\& module.exports) {\
    module.exports = \1;\
}/g' "$file"
    
    ((FIXED_COUNT++))
    echo "✅ Fixed: $file"
done

echo ""
echo "🎉 FinanceHub Module Export Fix Complete!"
echo "📊 Fixed $FIXED_COUNT files"
echo "💾 Backups created with timestamp suffix"
echo ""
echo "🧪 Test the frontend at http://localhost:8083" 