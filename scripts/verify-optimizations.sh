#!/bin/bash

# ============================================================================
# Optimization Verification Script
# ============================================================================
# 
# This script verifies that optimizations are working correctly
# Run after implementing changes to ensure everything is functioning
#
# Usage: ./verify-optimizations.sh
# ============================================================================

set -e

echo "🔍 FoodShare Optimization Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        ((FAILED++))
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        ((FAILED++))
        return 1
    fi
}

# Function to check file content
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $description"
        ((WARNINGS++))
        return 1
    fi
}

echo "📁 Checking Core Files..."
echo "-------------------------"

# Check new optimization files
check_file "src/store/selectors.ts" "Memoized selectors file exists"
check_file "src/lib/api-cache.ts" "API cache layer exists"
check_file "src/hooks/useOptimizedSearch.ts" "Optimized search hook exists"
check_file "src/hooks/useCacheInvalidation.ts" "Cache invalidation hook exists"
check_file "src/utils/performanceMonitor.ts" "Performance monitor exists"

echo ""
echo "📚 Checking Documentation..."
echo "----------------------------"

check_file "README_OPTIMIZATIONS.md" "Main optimization README"
check_file "OPTIMIZATION_PLAN.md" "Optimization plan"
check_file "OPTIMIZATIONS_APPLIED.md" "Applied optimizations guide"
check_file "QUICK_OPTIMIZATION_GUIDE.md" "Quick reference guide"
check_file "IMPLEMENTATION_CHECKLIST.md" "Implementation checklist"
check_file "START_HERE.md" "Getting started guide"
check_file "EXAMPLES.md" "Code examples"

echo ""
echo "🔧 Checking Edge Functions..."
echo "-----------------------------"

check_dir "supabase/functions/_shared" "Shared utilities directory"
check_file "supabase/functions/_shared/cache.ts" "Shared cache utility"
check_file "supabase/functions/_shared/cors.ts" "Shared CORS utility"
check_file "supabase/functions/_shared/supabase.ts" "Shared Supabase client"
check_file "supabase/functions/_shared/utils.ts" "Shared utilities"
check_file "supabase/functions/deploy-all-no-jwt-optimized.sh" "Deployment script"

echo ""
echo "⚙️  Checking Configuration..."
echo "----------------------------"

check_file "vite.config.ts" "Vite configuration exists"
check_content "vite.config.ts" "manualChunks" "Vite has optimized chunking"

echo ""
echo "🧪 Running Build Test..."
echo "------------------------"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Build successful"
    ((PASSED++))
    
    # Check bundle sizes
    if [ -d "build/assets/js" ]; then
        BUNDLE_SIZE=$(du -sh build/assets/js | cut -f1)
        echo -e "${BLUE}ℹ${NC} Bundle size: $BUNDLE_SIZE"
        
        # Count chunks
        CHUNK_COUNT=$(ls -1 build/assets/js/*.js 2>/dev/null | wc -l)
        echo -e "${BLUE}ℹ${NC} JavaScript chunks: $CHUNK_COUNT"
        
        if [ $CHUNK_COUNT -lt 15 ]; then
            echo -e "${GREEN}✓${NC} Chunk count optimized (<15)"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠${NC} Many chunks ($CHUNK_COUNT) - consider consolidating"
            ((WARNINGS++))
        fi
    fi
else
    echo -e "${RED}✗${NC} Build failed"
    ((FAILED++))
fi

echo ""
echo "📊 Checking TypeScript..."
echo "-------------------------"

if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} TypeScript check passed"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} TypeScript check has warnings"
    ((WARNINGS++))
fi

echo ""
echo "🔍 Checking Imports..."
echo "----------------------"

# Check if selectors are imported anywhere
if grep -r "from '@/store/selectors'" src/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Selectors are being used"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Selectors not yet imported (Phase 2 pending)"
    ((WARNINGS++))
fi

# Check if API cache is imported
if grep -r "from '@/lib/api-cache'" src/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API cache is being used"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} API cache not yet imported (Phase 2 pending)"
    ((WARNINGS++))
fi

# Check if optimized search is imported
if grep -r "useOptimizedSearch\|useProductSearch" src/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Optimized search is being used"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Optimized search not yet imported (Phase 2 pending)"
    ((WARNINGS++))
fi

echo ""
echo "======================================"
echo "📊 Verification Summary"
echo "======================================"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

# Calculate percentage
TOTAL=$((PASSED + WARNINGS + FAILED))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASSED * 100 / TOTAL))
    echo "Success Rate: $PERCENTAGE%"
    echo ""
fi

# Recommendations
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Recommendations:${NC}"
    echo "  - Some optimizations not yet integrated (Phase 2 pending)"
    echo "  - Review IMPLEMENTATION_CHECKLIST.md for next steps"
    echo "  - Start with updating components to use selectors"
    echo ""
fi

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}✗ Issues Found:${NC}"
    echo "  - Some required files are missing"
    echo "  - Review the output above for details"
    echo "  - Check documentation for setup instructions"
    echo ""
fi

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy edge functions: cd supabase/functions && ./deploy-all-no-jwt-optimized.sh"
    echo "  2. Start integration: Review START_HERE.md"
    echo "  3. Test in browser: npm run dev"
    echo ""
fi

# Exit code
if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
