#!/bin/bash

# 🔍 COMPREHENSIVE FINANCEHUB SYSTEM TEST
# =====================================
# Dátum: 2025-06-07 | Verzió: v1.0 Premium
# Cél: Teljes rendszer ellenőrzése - működés, redundancia, performance

echo "🔍 FinanceHub Comprehensive System Audit"
echo "========================================"
echo "Indítás: $(date)"
echo ""

# Colors for better output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

RESULTS_FILE="audit_results_$(date +%Y%m%d_%H%M%S).log"

# Function to log results
log_result() {
    echo "$1" | tee -a "$RESULTS_FILE"
}

# Function to test with timeout
test_with_timeout() {
    timeout 10s "$@"
    return $?
}

echo "📋 1. SZERVER STÁTUSZ ELLENŐRZÉS"
echo "--------------------------------"

# Test Backend Server
echo -n "🔧 Backend (8084): "
if test_with_timeout curl -f -s http://localhost:8084/api/v1/stock/ticker-tape/ > /dev/null; then
    echo -e "${GREEN}✅ MŰKÖDIK${NC}"
    log_result "Backend Server: PASS"
else
    echo -e "${RED}❌ HIBA${NC}"
    log_result "Backend Server: FAIL"
fi

# Test Frontend Server  
echo -n "🎨 Frontend (8083): "
if test_with_timeout curl -f -s http://localhost:8083/ > /dev/null; then
    echo -e "${GREEN}✅ MŰKÖDIK${NC}"
    log_result "Frontend Server: PASS"
else
    echo -e "${RED}❌ HIBA${NC}"
    log_result "Frontend Server: FAIL"
fi

echo ""
echo "📡 2. API ENDPOINT TESZTELÉS"
echo "----------------------------"

# API Endpoints to test
declare -a endpoints=(
    "ticker-tape/"
    "AAPL"
    "news/AAPL" 
    "chart/AAPL"
    "fundamentals/AAPL"
)

for endpoint in "${endpoints[@]}"; do
    echo -n "🔗 /api/v1/stock/$endpoint: "
    response_time=$(test_with_timeout curl -f -s -w "%{time_total}" -o /dev/null http://localhost:8084/api/v1/stock/$endpoint 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ OK (${response_time}s)${NC}"
        log_result "API $endpoint: PASS ($response_time s)"
    else
        echo -e "${RED}❌ FAIL${NC}"
        log_result "API $endpoint: FAIL"
    fi
done

echo ""
echo "🔍 3. REDUNDANCIA & CLEANUP AUDIT"  
echo "--------------------------------"

# Check for duplicate JavaScript files
echo "🔎 Duplikált JS fájlok keresése..."
duplicate_js=$(find static/js -name "*.js" -exec basename {} \; 2>/dev/null | sort | uniq -d)
if [ -z "$duplicate_js" ]; then
    echo -e "${GREEN}✅ Nincs duplikált JS fájl${NC}"
    log_result "JS Duplicates: PASS"
else
    echo -e "${YELLOW}⚠️  Talált duplikátumok: $duplicate_js${NC}"
    log_result "JS Duplicates: WARNING - $duplicate_js"
fi

# Check for old manager files
echo "🗑️  Legacy manager fájlok keresése..."
legacy_files=$(find static/js -name "*Manager.js" 2>/dev/null)
if [ -z "$legacy_files" ]; then
    echo -e "${GREEN}✅ Legacy fájlok eltávolítva${NC}"
    log_result "Legacy Files: PASS"
else
    echo -e "${YELLOW}⚠️  Talált legacy fájlok:${NC}"
    echo "$legacy_files"
    log_result "Legacy Files: WARNING - Still present"
fi

# Check for test/debug files
echo "🧪 Test/debug fájlok keresése..."
test_files=$(find . -name "*test*.js" -o -name "*debug*.html" -o -name "*init-test*" 2>/dev/null)
if [ -z "$test_files" ]; then
    echo -e "${GREEN}✅ Test fájlok eltávolítva${NC}"
    log_result "Test Files: PASS"
else
    echo -e "${YELLOW}⚠️  Talált test fájlok:${NC}"
    echo "$test_files"
    log_result "Test Files: WARNING - Still present"
fi

echo ""
echo "📊 4. PERFORMANCE METRICS"
echo "------------------------"

# Bundle size calculation
if [ -d "static/js" ]; then
    bundle_size=$(du -sh static/js 2>/dev/null | cut -f1)
    echo "📦 JS Bundle méret: $bundle_size"
    log_result "Bundle Size: $bundle_size"
else
    echo -e "${RED}❌ static/js mappa nem található${NC}"
    log_result "Bundle Size: FAIL - Directory not found"
fi

# CSS size calculation  
if [ -d "static/css" ]; then
    css_size=$(du -sh static/css 2>/dev/null | cut -f1)
    echo "🎨 CSS Bundle méret: $css_size"
    log_result "CSS Size: $css_size"
else
    echo -e "${RED}❌ static/css mappa nem található${NC}"
    log_result "CSS Size: FAIL - Directory not found"
fi

# Frontend load time test
echo -n "⏱️  Frontend betöltési idő: "
load_time=$(test_with_timeout curl -s -w "%{time_total}" -o /dev/null http://localhost:8083/ 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "${load_time}s"
    log_result "Load Time: ${load_time}s"
    
    # Check if under 2s target
    if (( $(echo "$load_time < 2.0" | bc -l) )); then
        echo -e "${GREEN}✅ Target alatt (< 2.0s)${NC}"
    else
        echo -e "${YELLOW}⚠️  Target felett (> 2.0s)${NC}"
    fi
else
    echo -e "${RED}❌ Nem mérhető${NC}"
    log_result "Load Time: FAIL"
fi

echo ""
echo "🔧 5. KOMPONENS INTEGRITÁS"
echo "-------------------------"

# Check if main files exist
declare -a critical_files=(
    "static/js/main.js"
    "static/js/components/chat/chat-modular.js"
    "static/js/components/ticker-tape/ticker-tape.js"
    "static/js/components/chart/chart.js"
    "index.html"
)

for file in "${critical_files[@]}"; do
    echo -n "📄 $file: "
    if [ -f "$file" ]; then
        file_size=$(ls -lh "$file" | awk '{print $5}')
        echo -e "${GREEN}✅ EXISTS ($file_size)${NC}"
        log_result "File $file: PASS ($file_size)"
    else
        echo -e "${RED}❌ MISSING${NC}"
        log_result "File $file: FAIL - Missing"
    fi
done

echo ""
echo "📈 6. FINAL AUDIT SUMMARY"
echo "========================"

# Count results
total_tests=$(grep -c ": " "$RESULTS_FILE" 2>/dev/null || echo "0")
passed_tests=$(grep -c ": PASS" "$RESULTS_FILE" 2>/dev/null || echo "0")
failed_tests=$(grep -c ": FAIL" "$RESULTS_FILE" 2>/dev/null || echo "0") 
warning_tests=$(grep -c ": WARNING" "$RESULTS_FILE" 2>/dev/null || echo "0")

echo "📊 Összesített eredmény:"
echo "   🟢 Sikeres: $passed_tests"
echo "   🔴 Hibás: $failed_tests"
echo "   🟡 Figyelmeztetés: $warning_tests"
echo "   📋 Összes teszt: $total_tests"

# Calculate success rate
if [ "$total_tests" -gt 0 ]; then
    success_rate=$(( passed_tests * 100 / total_tests ))
    echo "   ✅ Sikerességi arány: ${success_rate}%"
    log_result "SUCCESS RATE: ${success_rate}%"
    
    if [ "$success_rate" -ge 90 ]; then
        echo -e "${GREEN}🎉 RENDSZER STÁTUSZ: KIVÁLÓ${NC}"
    elif [ "$success_rate" -ge 75 ]; then
        echo -e "${YELLOW}⚠️  RENDSZER STÁTUSZ: MEGFELELŐ${NC}"
    else
        echo -e "${RED}🚨 RENDSZER STÁTUSZ: JAVÍTANDÓ${NC}"
    fi
fi

echo ""
echo "📄 Részletes eredmények: $RESULTS_FILE"
echo "🕐 Befejezés: $(date)"
echo "========================================" 