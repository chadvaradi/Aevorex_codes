#!/bin/bash

# 🔍 COMPREHENSIVE FINANCEHUB SYSTEM TEST (macOS Compatible)
# =========================================================
# Dátum: 2025-06-07 | Verzió: v1.1 Premium (macOS Fix)
# Cél: Teljes rendszer ellenőrzése - működés, redundancia, performance

echo "🔍 FinanceHub Comprehensive System Audit (macOS)"
echo "=============================================="
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

# macOS compatible timeout function
run_with_timeout() {
    local timeout_duration=30
    local command="$@"
    
    eval "$command" &
    local cmd_pid=$!
    
    (sleep $timeout_duration && kill $cmd_pid 2>/dev/null) &
    local killer_pid=$!
    
    wait $cmd_pid 2>/dev/null
    local exit_code=$?
    
    kill $killer_pid 2>/dev/null
    wait $killer_pid 2>/dev/null
    
    return $exit_code
}

echo "📋 1. SZERVER STÁTUSZ ELLENŐRZÉS"
echo "--------------------------------"

# Test Backend Server
echo -n "🔧 Backend (8084): "
if run_with_timeout curl -f -s http://localhost:8084/api/v1/stock/ticker-tape/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MŰKÖDIK${NC}"
    log_result "Backend Server: PASS"
else
    echo -e "${RED}❌ HIBA${NC}"
    log_result "Backend Server: FAIL"
fi

# Test Frontend Server  
echo -n "🎨 Frontend (8083): "
if run_with_timeout curl -f -s http://localhost:8083/ > /dev/null 2>&1; then
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
    
    # Measure response time and test endpoint
    start_time=$(date +%s.%N)
    if run_with_timeout curl -f -s http://localhost:8084/api/v1/stock/$endpoint > /dev/null 2>&1; then
        end_time=$(date +%s.%N)
        response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0.0")
        response_time=$(printf "%.3f" "$response_time" 2>/dev/null || echo "0.000")
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

# Check for duplicate JavaScript files (correct path)
echo "🔎 Duplikált JS fájlok keresése..."
if [ -d "frontend/static/js" ]; then
    duplicate_js=$(find frontend/static/js -name "*.js" -exec basename {} \; 2>/dev/null | sort | uniq -d)
    if [ -z "$duplicate_js" ]; then
        echo -e "${GREEN}✅ Nincs duplikált JS fájl${NC}"
        log_result "JS Duplicates: PASS"
    else
        echo -e "${YELLOW}⚠️  Talált duplikátumok: $duplicate_js${NC}"
        log_result "JS Duplicates: WARNING - $duplicate_js"
    fi
else
    echo -e "${YELLOW}⚠️  frontend/static/js mappa nem található${NC}"
    log_result "JS Duplicates: WARNING - Directory not found"
fi

# Check for old manager files
echo "🗑️  Legacy manager fájlok keresése..."
if [ -d "frontend/static/js" ]; then
    legacy_files=$(find frontend/static/js -name "*Manager.js" 2>/dev/null)
    if [ -z "$legacy_files" ]; then
        echo -e "${GREEN}✅ Legacy fájlok eltávolítva${NC}"
        log_result "Legacy Files: PASS"
    else
        echo -e "${YELLOW}⚠️  Talált legacy fájlok:${NC}"
        echo "$legacy_files"
        log_result "Legacy Files: WARNING - Still present"
    fi
else
    echo -e "${YELLOW}⚠️  frontend/static/js mappa nem található${NC}"
    log_result "Legacy Files: WARNING - Directory not found"
fi

# Check for test/debug files
echo "🧪 Test/debug fájlok keresése..."
test_files=$(find . -name "*test*.js" -o -name "*debug*.html" -o -name "*init-test*" 2>/dev/null | grep -v audit_results)
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

# Bundle size calculation (correct path)
if [ -d "frontend/static/js" ]; then
    bundle_size=$(du -sh frontend/static/js 2>/dev/null | cut -f1)
    echo "📦 JS Bundle méret: $bundle_size"
    log_result "Bundle Size: $bundle_size"
    
    # Get detailed size breakdown
    echo "   📄 Részletes fájlméretek:"
    find frontend/static/js -name "*.js" -exec ls -lh {} \; | awk '{print "      " $9 ": " $5}' | head -5
else
    echo -e "${RED}❌ frontend/static/js mappa nem található${NC}"
    log_result "Bundle Size: FAIL - Directory not found"
fi

# CSS size calculation (correct path)
if [ -d "frontend/static/css" ]; then
    css_size=$(du -sh frontend/static/css 2>/dev/null | cut -f1)
    echo "🎨 CSS Bundle méret: $css_size"
    log_result "CSS Size: $css_size"
else
    echo -e "${RED}❌ frontend/static/css mappa nem található${NC}"
    log_result "CSS Size: FAIL - Directory not found"
fi

# Frontend load time test
echo -n "⏱️  Frontend betöltési idő: "
start_time=$(date +%s.%N)
if run_with_timeout curl -s http://localhost:8083/ > /dev/null 2>&1; then
    end_time=$(date +%s.%N)
    load_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0.0")
    load_time=$(printf "%.3f" "$load_time" 2>/dev/null || echo "0.000")
    echo "${load_time}s"
    log_result "Load Time: ${load_time}s"
    
    # Check if under 2s target
    if command -v bc >/dev/null 2>&1 && (( $(echo "$load_time < 2.0" | bc -l) )); then
        echo -e "${GREEN}✅ Target alatt (< 2.0s)${NC}"
    elif [ "${load_time%.*}" -lt 2 ] 2>/dev/null; then
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

# Check if main files exist (correct paths)
declare -a critical_files=(
    "frontend/static/js/main_financehub.js"
    "frontend/static/js/components/chat/chat.js"
    "frontend/static/js/components/ticker-tape/ticker-tape.js"
    "frontend/static/js/components/chart/chart.js"
    "frontend/index.html"
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
echo "🌐 6. LIVE API CONTENT TEST"
echo "---------------------------"

# Test actual API response content
echo -n "📊 Stock Data Quality: "
api_response=$(run_with_timeout curl -s http://localhost:8084/api/v1/stock/AAPL 2>/dev/null)
if echo "$api_response" | grep -q "AAPL\|Apple" 2>/dev/null; then
    echo -e "${GREEN}✅ VÁLASZOL VALÓS ADATOKKAL${NC}"
    log_result "API Content: PASS - Real data"
else
    echo -e "${RED}❌ NINCS VALÓS ADAT${NC}"
    log_result "API Content: FAIL - No real data"
fi

echo -n "📰 News Data: "
news_response=$(run_with_timeout curl -s http://localhost:8084/api/v1/stock/news/AAPL 2>/dev/null)
if echo "$news_response" | grep -q "status\|success\|data" 2>/dev/null; then
    echo -e "${GREEN}✅ NEWS API MŰKÖDIK${NC}"
    log_result "News API: PASS"
else
    echo -e "${YELLOW}⚠️  NEWS API PROBLÉMÁS${NC}"
    log_result "News API: WARNING"
fi

echo ""
echo "📈 7. FINAL AUDIT SUMMARY"
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
        echo "   🏆 Produkciós telepítésre kész!"
    elif [ "$success_rate" -ge 75 ]; then
        echo -e "${YELLOW}⚠️  RENDSZER STÁTUSZ: MEGFELELŐ${NC}"
        echo "   🔧 Kisebb finomítások szükségesek"
    else
        echo -e "${RED}🚨 RENDSZER STÁTUSZ: JAVÍTANDÓ${NC}"
        echo "   🛠️  Jelentős problémák megoldandók"
    fi
fi

echo ""
echo "📋 RECOMMENDATIONS:"
echo "==================="

if [ "$failed_tests" -gt 5 ]; then
    echo "🔴 HIGH PRIORITY: $failed_tests kritikus hiba!"
fi

if [ "$warning_tests" -gt 0 ]; then
    echo "🟡 MEDIUM PRIORITY: $warning_tests figyelmeztetés megoldása"
fi

if [ "$success_rate" -ge 90 ]; then
    echo "🟢 LOW PRIORITY: Performance és UX optimalizálás"
fi

echo ""
echo "📄 Részletes eredmények: $RESULTS_FILE"
echo "🕐 Befejezés: $(date)"
echo "==============================================" 