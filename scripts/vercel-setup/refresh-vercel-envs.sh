#!/bin/bash
set -e

echo "=========================================="
echo "Refreshing Vercel Environment Variables"
echo "=========================================="
echo ""

# Get list of all env vars
echo "📋 Getting current environment variables..."
CURRENT_VARS=$(vercel env ls production 2>&1 | grep "Encrypted" | awk '{print $1}' | sort | uniq)

echo "Found $(echo "$CURRENT_VARS" | wc -l | xargs) existing variables"
echo ""

# Remove duplicates and old variables
echo "🗑️  Removing old variables..."
count=0
while IFS= read -r var; do
  [[ -z "$var" ]] && continue
  count=$((count + 1))
  echo "[$count] Removing: $var"
  vercel env rm "$var" production --yes 2>&1 | grep -v "Debugger" | grep -v "Waiting for" | head -1 || true
done <<< "$CURRENT_VARS"

echo ""
echo "✅ Removed $count old variables"
echo ""

# Add fresh variables from .env
echo "📤 Adding fresh variables from .env..."
count=0
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  [[ -z "$key" ]] && continue
  [[ -z "$value" ]] && continue
  
  count=$((count + 1))
  echo "[$count] Adding: $key"
  
  printf "%s\n" "$value" | vercel env add "$key" production 2>&1 | grep -v "Debugger" | grep -v "Waiting for" | head -1 || true
  
done < .env

echo ""
echo "=========================================="
echo "✅ Done! Added $count fresh variables"
echo "=========================================="
echo ""
echo "Next: Redeploy at https://vercel.com/organicnz/foodshare"
