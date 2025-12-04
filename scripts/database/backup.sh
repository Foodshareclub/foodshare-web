#!/bin/bash
set -e

# Supabase Database Backup Script
# Creates a timestamped backup of the FoodShare database
#
# Usage: ./scripts/database/backup.sh
# Output: backups/foodshare-YYYY-MM-DD-HHMMSS.sql

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FoodShare Database Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo ""
    echo "Install Supabase CLI:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or use npx:"
    echo "  npx supabase db dump"
    exit 1
fi

# Check if project is linked
echo -e "${BLUE}Checking Supabase project link...${NC}"
if ! supabase projects list &>/dev/null; then
    echo -e "${RED}Error: Not logged in to Supabase${NC}"
    echo ""
    echo "Login to Supabase:"
    echo "  supabase login"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}Warning: Project not linked${NC}"
    echo ""
    echo "Link your project:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    read -p "Continue with local database? (yes/no): " -r
    if [ "$REPLY" != "yes" ]; then
        echo "Backup cancelled"
        exit 0
    fi
fi

echo "  ✓ Supabase CLI configured"
echo ""

# Create backups directory
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
echo -e "${BLUE}Created backups directory: $BACKUP_DIR${NC}"
echo ""

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_FILE="$BACKUP_DIR/foodshare-$TIMESTAMP.sql"

# Perform backup
echo -e "${BLUE}Creating database backup...${NC}"
echo "This may take a few minutes depending on database size..."
echo ""

if supabase db dump -f "$BACKUP_FILE"; then
    echo ""
    echo -e "${GREEN}✓ Backup successful!${NC}"
else
    echo ""
    echo -e "${RED}✗ Backup failed!${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Ensure you're logged in: supabase login"
    echo "  2. Check project is linked: supabase projects list"
    echo "  3. Verify database access"
    exit 1
fi

# Backup statistics
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    LINE_COUNT=$(wc -l < "$BACKUP_FILE")

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Backup Details${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "File: $BACKUP_FILE"
    echo "Size: $BACKUP_SIZE"
    echo "Lines: $LINE_COUNT"
    echo "Created: $(date)"
    echo ""

    # Show backup contents summary
    echo "Tables backed up:"
    grep -E "^CREATE TABLE" "$BACKUP_FILE" | \
        sed 's/CREATE TABLE public\./  - /' | \
        sed 's/ (.*//' || echo "  (unable to parse tables)"

    echo ""
    echo -e "${GREEN}Backup saved successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Store backup securely (offsite recommended)"
    echo "  2. Test restore procedure periodically"
    echo "  3. Consider automating backups (cron job)"
    echo ""
    echo "To restore this backup:"
    echo "  supabase db reset"
    echo "  psql -h db.PROJECT_REF.supabase.co -U postgres -d postgres < $BACKUP_FILE"
    echo ""
else
    echo -e "${RED}Error: Backup file not created${NC}"
    exit 1
fi

# Cleanup old backups (optional)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/foodshare-*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}Notice: You have $BACKUP_COUNT backup files${NC}"
    echo "Consider removing old backups to save space:"
    echo "  ls -lt $BACKUP_DIR/foodshare-*.sql | tail -n +11"
    echo ""
fi
