#!/bin/bash
# Export environment variables for Vercel
# Usage: Run this script and copy the output to manually add to Vercel dashboard

echo "==================================================================="
echo "Environment Variables for Vercel"
echo "==================================================================="
echo ""
echo "Go to: https://vercel.com/organicnz/foodshare-pearl/settings/environment-variables"
echo ""
echo "Add these variables (one by one or use Vercel CLI):"
echo ""

# Read .env and format for Vercel
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  # Remove leading/trailing whitespace
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  # Skip if key or value is empty
  [[ -z "$key" ]] && continue
  [[ -z "$value" ]] && continue
  
  echo "$key=$value"
done < .env

echo ""
echo "==================================================================="
echo "Total variables exported from .env"
echo "==================================================================="
