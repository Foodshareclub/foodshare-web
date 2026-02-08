#!/bin/bash
set -e

# Deploy FoodShare to Vercel
# Handles both production and preview deployments
#
# Usage: ./scripts/deploy/deploy-vercel.sh [production|preview]
# Default: preview

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment type (default: preview)
DEPLOY_TYPE="${1:-preview}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodShare Vercel Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Validate deployment type
if [ "$DEPLOY_TYPE" != "production" ] && [ "$DEPLOY_TYPE" != "preview" ]; then
    echo -e "${RED}Error: Invalid deployment type${NC}"
    echo "Usage: $0 [production|preview]"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI not found${NC}"
    echo "Install with: bun add -g vercel"
    echo ""
    echo "Or use bunx:"
    echo "  bunx vercel [--prod]"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

# Check environment variables file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Make sure environment variables are configured in Vercel Dashboard"
    echo ""
fi

# Confirm production deployment
if [ "$DEPLOY_TYPE" = "production" ]; then
    echo -e "${YELLOW}⚠️  Production Deployment${NC}"
    echo ""
    echo "This will deploy to PRODUCTION (foodshare.vercel.app or custom domain)"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""
    if [ "$REPLY" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi

# Display deployment info
echo -e "${BLUE}Deployment Configuration:${NC}"
echo "  Type: $DEPLOY_TYPE"
echo "  Branch: $(git branch --show-current)"
echo "  Commit: $(git rev-parse --short HEAD)"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo "Consider committing your changes before deploying"
    echo ""
    read -p "Continue anyway? (yes/no): " -r
    echo ""
    if [ "$REPLY" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi

# Build the application
echo -e "${BLUE}Step 1/3: Building application...${NC}"
if [ -f "./scripts/build/build-production.sh" ]; then
    ./scripts/build/build-production.sh
else
    bun run build
fi
echo ""

# Validate required environment variables
echo -e "${BLUE}Step 2/3: Validating configuration...${NC}"

REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}  ⚠️  Missing environment variables in .env:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "    - $var"
    done
    echo ""
    echo "  Make sure these are configured in Vercel Dashboard:"
    echo "  https://vercel.com/[your-team]/foodshare/settings/environment-variables"
    echo ""
else
    echo "  ✓ Environment variables present in .env"
fi

echo "  ✓ Build output validated"
echo ""

# Deploy to Vercel
echo -e "${BLUE}Step 3/3: Deploying to Vercel...${NC}"
echo ""

if [ "$DEPLOY_TYPE" = "production" ]; then
    vercel --prod
else
    vercel
fi

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    if [ "$DEPLOY_TYPE" = "production" ]; then
        echo "🚀 Production deployment complete!"
        echo ""
        echo "Your application is now live at:"
        echo "  https://foodshare.vercel.app"
        echo "  (or your custom domain)"
    else
        echo "🔍 Preview deployment complete!"
        echo ""
        echo "Your preview URL is shown above."
        echo "Share it with your team for testing."
    fi

    echo ""
    echo "Next steps:"
    echo "  1. Test the deployment"
    echo "  2. Verify all features work correctly"
    echo "  3. Check Supabase connection"
    echo "  4. Monitor for errors in Vercel Dashboard"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Deployment Failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check Vercel CLI authentication: vercel whoami"
    echo "  2. Verify project is linked: vercel link"
    echo "  3. Check build logs above for errors"
    echo "  4. Ensure environment variables are set in Vercel Dashboard"
    echo ""
    exit 1
fi
