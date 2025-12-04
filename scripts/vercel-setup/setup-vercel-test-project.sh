#!/bin/bash
# Setup script for Vercel test project
# This will help you configure foodshare-pearl.vercel.app

set -e

echo "=========================================="
echo "Vercel Test Project Setup"
echo "=========================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "✅ Vercel CLI found"
echo ""

# Login to Vercel
echo "📝 Please login to Vercel..."
vercel login

echo ""
echo "🔗 Linking to project..."
echo "When prompted:"
echo "  - Select scope: organicnz"
echo "  - Link to existing project: Yes"
echo "  - Project name: foodshare-pearl"
echo ""

# This will prompt for project selection
vercel link

echo ""
echo "📤 Setting environment variables..."
echo ""

# Count total vars
total=$(grep -v '^#' .env | grep -v '^$' | wc -l | xargs)
current=0

# Read .env and set each variable
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
  
  current=$((current + 1))
  echo "[$current/$total] Setting: $key"
  
  # Set for production environment
  echo "$value" | vercel env add "$key" production 2>/dev/null || echo "  ⚠️  Already exists or error"
  
done < .env

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to: https://vercel.com/organicnz/foodshare-pearl"
echo "2. Trigger a new deployment (or it will auto-deploy)"
echo "3. Check the deployment logs for any errors"
echo "4. Test the site: https://foodshare-pearl.vercel.app"
echo ""
echo "To manually trigger a deployment:"
echo "  vercel --prod"
echo ""
