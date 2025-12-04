#!/bin/bash
set -e

echo "Adding environment variables to Vercel project..."
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
  
  printf "%s\n" "$value" | vercel env add "$key" production 2>&1 | grep -v "Debugger" | grep -v "Waiting for" | head -1 || true
  
done < .env

echo ""
echo "✅ Done! Processed $count variables"
