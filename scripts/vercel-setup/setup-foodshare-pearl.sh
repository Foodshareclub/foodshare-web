#!/bin/bash
# Setup environment variables for foodshare-pearl test project
# This project is under organicnz team, not foodshare team

set -e

echo "=========================================="
echo "Setting up foodshare-pearl test project"
echo "=========================================="
echo ""
echo "Project: https://foodshare-pearl.vercel.app"
echo "Team: organicnz"
echo ""

# Create a temporary directory for the link
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📝 Linking to foodshare-pearl project..."
echo ""
echo "When prompted, select:"
echo "  - Scope: organicnz"
echo "  - Link to existing project: Yes"
echo "  - Project name: foodshare-pearl"
echo ""
read -p "Press Enter to continue..."

vercel link

echo ""
echo "📤 Adding environment variables..."
echo ""

# Count total vars
total=$(grep -v '^#' "$OLDPWD/.env" | grep -v '^$' | wc -l | xargs)
current=0

# Read .env and set each variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  [[ -z "$key" ]] && continue
  [[ -z "$value" ]] && continue
  
  current=$((current + 1))
  echo "[$current/$total] Adding: $key"
  
  # Add to production environment
  echo "$value" | vercel env add "$key" production --yes 2>/dev/null || echo "  ⚠️  Already exists or error"
  
done < "$OLDPWD/.env"

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Environment variables have been added to:"
echo "https://vercel.com/organicnz/foodshare-pearl/settings/environment-variables"
echo ""
echo "Next steps:"
echo "1. Go to: https://vercel.com/organicnz/foodshare-pearl"
echo "2. Trigger a redeploy (or wait for auto-deploy)"
echo "3. Test: https://foodshare-pearl.vercel.app"
echo ""

# Cleanup
cd "$OLDPWD"
rm -rf "$TEMP_DIR"
