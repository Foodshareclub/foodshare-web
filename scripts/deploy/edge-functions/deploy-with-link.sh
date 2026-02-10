#!/bin/bash

# Deploy All Edge Functions WITHOUT JWT - Using Link Method
# This script links the project first, then deploys

set -e

PROJECT_REF="foodshare"
BACKUP_DIR="./backups/no-jwt-$(date +%Y%m%d_%H%M%S)"

echo "🚀 FoodShare Edge Functions Deployment (NO JWT)"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if already linked
if [ ! -f "./.supabase/config.toml" ]; then
    print_status "Project not linked. Linking now..."
    print_warning "You'll need your database password"
    echo ""
    
    if supabase link --project-ref "$PROJECT_REF"; then
        print_success "Project linked successfully"
    else
        print_error "Failed to link project"
        echo ""
        echo "Alternative: Run 'supabase login' first with your access token"
        echo "Get token from: https://supabase.com/dashboard/account/tokens"
        exit 1
    fi
else
    print_success "Project already linked"
fi

echo ""
print_status "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

FUNCTIONS=(
    "check-upstash-services"
    "cors-proxy-images"
    "get-my-chat-id"
    "get-translations"
    "hf-inference"
    "localization"
    "monitor-email-health"
    "notify-new-post"
    "notify-new-user"
    "process-email-queue"
    "resend"
    "resize-tinify-upload-image"
    "search-functions"
    "smart-email-route"
    "telegram-bot-foodshare"
    "update-coordinates"
    "update-post-coordinates"
)

# Backup
print_status "Backing up functions..."
for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        cp -r "supabase/functions/$func" "$BACKUP_DIR/"
    fi
done
print_success "Backups created"

echo ""
read -p "Deploy all functions without JWT verification? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Cancelled"
    exit 0
fi

echo ""
print_status "Deploying functions..."
echo ""

DEPLOYED=0
FAILED=0
FAILED_FUNCTIONS=()

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        print_status "Deploying $func..."
        
        if supabase functions deploy "$func" --no-verify-jwt; then
            print_success "✓ $func"
            ((DEPLOYED++))
        else
            print_error "✗ $func"
            FAILED_FUNCTIONS+=("$func")
            ((FAILED++))
        fi
        echo ""
    fi
done

echo "================================================"
echo "📊 Summary"
echo "================================================"
print_success "Deployed: $DEPLOYED"
[ $FAILED -gt 0 ] && print_error "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    print_success "🎉 All functions deployed!"
else
    print_warning "Some functions failed:"
    for func in "${FAILED_FUNCTIONS[@]}"; do
        echo "  - $func"
    done
fi

echo ""
print_status "Backups: $BACKUP_DIR"
echo ""
