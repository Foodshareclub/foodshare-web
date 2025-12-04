#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔍 Verifying FoodShare Project Structure${NC}\n"

# Check root directory is clean
echo -e "${YELLOW}Checking root directory...${NC}"
ROOT_MD_COUNT=$(find . -maxdepth 1 -type f -name "*.md" | grep -v README.md | wc -l | tr -d ' ')
ROOT_SH_COUNT=$(find . -maxdepth 1 -type f -name "*.sh" | wc -l | tr -d ' ')

if [ "$ROOT_MD_COUNT" -eq 0 ] && [ "$ROOT_SH_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ Root directory is clean (no loose .md or .sh files)${NC}"
else
    echo -e "${RED}✗ Found $ROOT_MD_COUNT .md files and $ROOT_SH_COUNT .sh files in root${NC}"
fi

# Check docs directory exists and has content
echo -e "\n${YELLOW}Checking docs directory...${NC}"
if [ -d "docs" ]; then
    DOCS_COUNT=$(find docs -type f -name "*.md" | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ docs/ directory exists with $DOCS_COUNT markdown files${NC}"
else
    echo -e "${RED}✗ docs/ directory not found${NC}"
fi

# Check scripts directory
echo -e "\n${YELLOW}Checking scripts directory...${NC}"
if [ -d "scripts" ]; then
    SCRIPTS_COUNT=$(find scripts -type f -name "*.sh" | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ scripts/ directory exists with $SCRIPTS_COUNT shell scripts${NC}"
else
    echo -e "${RED}✗ scripts/ directory not found${NC}"
fi

# Check edge functions directory is clean
echo -e "\n${YELLOW}Checking supabase/functions directory...${NC}"
if [ -d "supabase/functions" ]; then
    FUNC_MD_COUNT=$(find supabase/functions -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
    FUNC_SH_COUNT=$(find supabase/functions -maxdepth 1 -type f -name "*.sh" | wc -l | tr -d ' ')
    
    if [ "$FUNC_MD_COUNT" -eq 0 ] && [ "$FUNC_SH_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✓ supabase/functions/ is clean (code only)${NC}"
    else
        echo -e "${RED}✗ Found $FUNC_MD_COUNT .md and $FUNC_SH_COUNT .sh files in supabase/functions${NC}"
    fi
else
    echo -e "${RED}✗ supabase/functions/ directory not found${NC}"
fi

# Check key documentation files exist
echo -e "\n${YELLOW}Checking key documentation files...${NC}"
KEY_DOCS=(
    "docs/START_HERE.md"
    "docs/INDEX.md"
    "docs/PROJECT_STRUCTURE.md"
    "docs/supabase/edge-functions/README.md"
    "scripts/deploy/edge-functions/README.md"
    "README.md"
)

MISSING_DOCS=0
for doc in "${KEY_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓ $doc${NC}"
    else
        echo -e "${RED}✗ $doc (missing)${NC}"
        MISSING_DOCS=$((MISSING_DOCS + 1))
    fi
done

# Summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ROOT_MD_COUNT" -eq 0 ] && [ "$ROOT_SH_COUNT" -eq 0 ] && \
   [ "$FUNC_MD_COUNT" -eq 0 ] && [ "$FUNC_SH_COUNT" -eq 0 ] && \
   [ "$MISSING_DOCS" -eq 0 ]; then
    echo -e "${GREEN}✅ Project structure verification PASSED${NC}"
    echo -e "${GREEN}All files are properly organized!${NC}"
else
    echo -e "${YELLOW}⚠️  Project structure needs attention${NC}"
    echo -e "${YELLOW}Review the issues above${NC}"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
