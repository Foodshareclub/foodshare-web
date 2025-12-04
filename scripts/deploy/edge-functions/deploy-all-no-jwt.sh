#!/bin/bash

# Deploy All Edge Functions WITHOUT JWT Verification
# Date: November 30, 2025
# Usage: ./deploy-all-no-jwt.sh
# 
# This script deploys all edge functions with --no-verify-jwt flag
# to allow access with just the anon key without JWT validation

set -e  # Exit on error

PROJECT_REF="***REMOVED***"
BACKUP_DIR="./backups/no-jwt-$(date +%Y%m%d_%H%M%S)"

echo "🚀 FoodShare Edge Functions Deployment (NO JWT)"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will disable JWT verification on all functions"
echo "   Functions will be accessible with just the anon key"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first."
    exit 1
fi

print_success "Supabase CLI found"

# Create backup directory
print_status "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# All functions to deploy (based on current directory listing)
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

# Backup existing functions
print_status "Backing up existing functions..."

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        print_status "Backing up $func..."
        cp -r "supabase/functions/$func" "$BACKUP_DIR/"
        print_success "Backed up $func"
    else
        print_warning "$func directory not found, skipping backup"
    fi
done

print_success "All backups created in $BACKUP_DIR"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

echo ""
print_status "Starting deployment with --no-verify-jwt flag..."
echo ""

# Deploy each function
DEPLOYED=0
FAILED=0
FAILED_FUNCTIONS=()

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        print_status "Deploying $func (no JWT verification)..."
        
        if supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt; then
            print_success "✓ $func deployed successfully"
            ((DEPLOYED++))
        else
            print_error "✗ Failed to deploy $func"
            FAILED_FUNCTIONS+=("$func")
            ((FAILED++))
        fi
        
        echo ""
    else
        print_warning "$func directory not found, skipping deployment"
    fi
done

# Summary
echo ""
echo "================================================"
echo "📊 Deployment Summary"
echo "================================================"
echo ""
print_success "Successfully deployed: $DEPLOYED functions"

if [ $FAILED -gt 0 ]; then
    print_error "Failed to deploy: $FAILED functions"
    echo ""
    echo "Failed functions:"
    for func in "${FAILED_FUNCTIONS[@]}"; do
        echo "  - $func"
    done
fi

echo ""
print_status "Backups saved in: $BACKUP_DIR"
echo ""

if [ $FAILED -eq 0 ]; then
    print_success "🎉 All functions deployed successfully without JWT verification!"
    echo ""
    echo "✅ Functions are now accessible with just the anon key"
    echo ""
    echo "Next steps:"
    echo "1. Test the deployed functions with anon key"
    echo "2. Monitor logs for errors"
    echo "3. Verify Telegram bot and other webhooks work"
    echo "4. Check that internal authorization logic is working"
    echo ""
else
    print_warning "⚠️  Some functions failed to deploy"
    echo ""
    echo "To retry failed functions:"
    for func in "${FAILED_FUNCTIONS[@]}"; do
        echo "  supabase functions deploy $func --project-ref $PROJECT_REF --no-verify-jwt"
    done
    echo ""
    echo "To rollback:"
    echo "1. Copy functions from $BACKUP_DIR back to supabase/functions/"
    echo "2. Run: supabase functions deploy <function-name> --project-ref $PROJECT_REF"
    echo ""
fi

echo "View logs: supabase functions logs <function-name> --project-ref $PROJECT_REF"
echo "List functions: supabase functions list --project-ref $PROJECT_REF"
echo ""

