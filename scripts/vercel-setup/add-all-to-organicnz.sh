#!/bin/bash
# Add all environment variables to organicnz/foodshare project

set -e

echo "Adding all environment variables to organicnz/foodshare..."
echo ""

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
  
  printf "%s\n" "$value" | vercel env add "$key" production 2>&1 | tail -1
  
done < .env

echo ""
echo "✅ Done! Added $count variables to organicnz/foodshare"
