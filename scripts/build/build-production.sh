#!/bin/bash
set -e

# Production Build Script for FoodShare React App
# Creates an optimized Vite production build with validation
#
# Usage: ./scripts/build/build-production.sh
# Output: dist/ directory with production-ready assets

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodShare Production Build${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Warning: node_modules not found${NC}"
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Check environment variables
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    echo ""
fi

# Clean previous build
echo -e "${BLUE}Step 1/4: Cleaning previous build...${NC}"
if [ -d "dist" ]; then
    rm -rf dist
    echo "  ✓ Removed old dist/ directory"
fi
echo ""

# TypeScript type checking
echo -e "${BLUE}Step 2/4: TypeScript type checking...${NC}"
if npm run build > build.log 2>&1; then
    echo "  ✓ TypeScript compilation successful"
else
    echo -e "${RED}  ✗ TypeScript errors found${NC}"
    tail -20 build.log
    exit 1
fi
echo ""

# Vite production build (already done by npm run build)
echo -e "${BLUE}Step 3/4: Vite production build...${NC}"
echo "  ✓ Production build completed"
echo ""

# Validate build output
echo -e "${BLUE}Step 4/4: Validating build output...${NC}"

if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}  ✗ dist/index.html not found${NC}"
    exit 1
fi
echo "  ✓ dist/index.html exists"

if [ ! -d "dist/assets" ]; then
    echo -e "${RED}  ✗ dist/assets/ directory not found${NC}"
    exit 1
fi
echo "  ✓ dist/assets/ directory exists"

# Count asset files
JS_FILES=$(find dist/assets -name "*.js" 2>/dev/null | wc -l | xargs)
CSS_FILES=$(find dist/assets -name "*.css" 2>/dev/null | wc -l | xargs)

echo "  ✓ Found $JS_FILES JavaScript file(s)"
echo "  ✓ Found $CSS_FILES CSS file(s)"

# Check for source maps (should not exist in production)
if find dist -name "*.map" | grep -q .; then
    echo -e "${YELLOW}  ⚠ Warning: Source maps found in production build${NC}"
    echo "  Consider disabling source maps for production"
fi

echo ""

# Display bundle sizes
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Build output:"
echo "  Location: ./dist/"
echo ""

# Calculate total size
TOTAL_SIZE=$(du -sh dist 2>/dev/null | awk '{print $1}')
echo "  Total size: $TOTAL_SIZE"
echo ""

# Show largest files
echo "Largest assets:"
find dist/assets -type f -exec ls -lh {} \; 2>/dev/null | \
    awk '{print $5 "\t" $9}' | \
    sort -rh | \
    head -5 | \
    sed 's/^/  /'

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Preview the build locally:"
echo "   npm run preview"
echo ""
echo "2. Deploy to Vercel:"
echo "   ./scripts/deploy/deploy-vercel.sh production"
echo ""
echo "3. Deploy to other hosting:"
echo "   - Upload dist/ directory to your host"
echo "   - Configure server to serve index.html for all routes (SPA mode)"
echo ""
echo "4. Verify deployment:"
echo "   - Test all routes work correctly"
echo "   - Check environment variables are set"
echo "   - Verify API connections to Supabase"
echo ""

# Cleanup
rm -f build.log
