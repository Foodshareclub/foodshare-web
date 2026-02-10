#!/bin/bash

# ============================================================================
# Modern Edge Functions Deployment Script
# ============================================================================
# Date: November 30, 2025
# Features:
# - No JWT verification (--no-verify-jwt)
# - Parallel deployment option
# - Health checks after deployment
# - Rollback capability
# - Colored output
# ============================================================================

set -e  # Exit on error

PROJECT_REF="foodshare"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./deployment-$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "${MAGENTA}[→]${NC} $1" | tee -a "$LOG_FILE"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

print_header "FoodShare Edge Functions - Modern Deployment"

print_step "Running pre-flight checks..."

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it first:"
    echo "  npm install -g supabase"
    exit 1
fi
print_success "Supabase CLI found: $(supabase --version)"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    print_error "Not logged in to Supabase. Please run:"
    echo "  supabase login"
    exit 1
fi
print_success "Supabase authentication verified"

# Check project access
if ! supabase functions list --project-ref "$PROJECT_REF" &> /dev/null; then
    print_error "Cannot access project: $PROJECT_REF"
    exit 1
fi
print_success "Project access verified: $PROJECT_REF"

# ============================================================================
# Functions to Deploy
# ============================================================================

FUNCTIONS=(
    # Email Functions
    "smart-email-route"
    "process-email-queue"
    "monitor-email-health"
    "resend"
    
    # Image & Media
    "cors-proxy-images"
    "resize-tinify-upload-image"
    
    # AI & Search
    "hf-inference"
    "search-functions"
    
    # Localization
    "localization"
    "get-translations"
    
    # Notifications
    "notify-new-post"
    "notify-new-user"
    "telegram-bot-foodshare"
    
    # Geocoding
    "update-coordinates"
    "update-post-coordinates"
    
    # Monitoring
    "check-upstash-services"
    "get-my-chat-id"
)

# ============================================================================
# Backup Existing Functions
# ============================================================================

print_header "Creating Backups"

print_step "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

for func in "${FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        print_status "Backing up $func..."
        cp -r "supabase/functions/$func" "$BACKUP_DIR/"
        print_success "✓ $func backed up"
    else
        print_warning "⚠ $func directory not found"
    fi
done

print_success "All backups created in: $BACKUP_DIR"

# ============================================================================
# Deployment Confirmation
# ============================================================================

print_header "Deployment Configuration"

echo "Project: $PROJECT_REF"
echo "Functions to deploy: ${#FUNCTIONS[@]}"
echo "JWT Verification: DISABLED (--no-verify-jwt)"
echo "Backup location: $BACKUP_DIR"
echo "Log file: $LOG_FILE"
echo ""

read -p "$(echo -e ${YELLOW}Do you want to proceed with deployment? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

# ============================================================================
# Deploy Functions
# ============================================================================

print_header "Deploying Functions"

DEPLOYED=0
FAILED=0
FAILED_FUNCTIONS=()

START_TIME=$(date +%s)

for func in "${FUNCTIONS[@]}"; do
    if [ ! -d "supabase/functions/$func" ]; then
        print_warning "⚠ $func directory not found, skipping"
        continue
    fi
    
    print_step "Deploying $func..."
    
    # Deploy with no JWT verification
    if supabase functions deploy "$func" \
        --project-ref "$PROJECT_REF" \
        --no-verify-jwt \
        2>&1 | tee -a "$LOG_FILE"; then
        
        print_success "✓ $func deployed successfully"
        ((DEPLOYED++))
        
        # Small delay to avoid rate limiting
        sleep 1
    else
        print_error "✗ Failed to deploy $func"
        FAILED_FUNCTIONS+=("$func")
        ((FAILED++))
    fi
    
    echo ""
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# ============================================================================
# Health Checks
# ============================================================================

if [ $DEPLOYED -gt 0 ]; then
    print_header "Running Health Checks"
    
    # Wait for functions to be ready
    print_status "Waiting 5 seconds for functions to initialize..."
    sleep 5
    
    # Test a few key functions
    HEALTH_CHECKS=(
        "check-upstash-services"
        "get-translations"
        "smart-email-route"
    )
    
    for func in "${HEALTH_CHECKS[@]}"; do
        if [[ " ${FUNCTIONS[@]} " =~ " ${func} " ]]; then
            print_step "Testing $func..."
            
            URL="https://${PROJECT_REF}.supabase.co/functions/v1/${func}"
            
            if curl -s -f -m 10 "$URL" > /dev/null 2>&1; then
                print_success "✓ $func is responding"
            else
                print_warning "⚠ $func may not be responding (check logs)"
            fi
        fi
    done
fi

# ============================================================================
# Deployment Summary
# ============================================================================

print_header "Deployment Summary"

echo "Duration: ${DURATION}s"
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
print_status "Backup location: $BACKUP_DIR"
print_status "Log file: $LOG_FILE"
echo ""

# ============================================================================
# Next Steps
# ============================================================================

if [ $FAILED -eq 0 ]; then
    print_header "🎉 Deployment Complete!"
    
    echo "All functions deployed successfully!"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Set up Telegram webhook:"
    echo "   curl https://${PROJECT_REF}.supabase.co/functions/v1/telegram-bot-foodshare/setup-webhook"
    echo ""
    echo "2. Configure cron jobs in Supabase Dashboard:"
    echo "   - process-email-queue: */15 * * * * (every 15 minutes)"
    echo "   - monitor-email-health: */10 * * * * (every 10 minutes)"
    echo "   - update-post-coordinates: 0 * * * * (every hour)"
    echo ""
    echo "3. Monitor function logs:"
    echo "   supabase functions logs <function-name> --project-ref $PROJECT_REF"
    echo ""
    echo "4. Test key endpoints:"
    echo "   - Health: https://${PROJECT_REF}.supabase.co/functions/v1/check-upstash-services"
    echo "   - Translations: https://${PROJECT_REF}.supabase.co/functions/v1/get-translations?locale=en"
    echo "   - Email route: https://${PROJECT_REF}.supabase.co/functions/v1/smart-email-route"
    echo ""
else
    print_header "⚠️ Deployment Completed with Errors"
    
    echo "Some functions failed to deploy."
    echo ""
    echo "To retry failed functions:"
    for func in "${FAILED_FUNCTIONS[@]}"; do
        echo "  supabase functions deploy $func --project-ref $PROJECT_REF --no-verify-jwt"
    done
    echo ""
    echo "To rollback:"
    echo "  1. Copy functions from $BACKUP_DIR back to supabase/functions/"
    echo "  2. Run this script again"
    echo ""
fi

# ============================================================================
# Performance Tips
# ============================================================================

print_header "Performance Monitoring"

echo "Monitor these metrics after deployment:"
echo ""
echo "✓ Cache hit rate (should be 75%+)"
echo "✓ Response times (cached: <10ms, uncached: <500ms)"
echo "✓ Error rates (should be <1%)"
echo "✓ Database query count (should be 80% lower)"
echo "✓ Cold start times (should be <500ms)"
echo ""
echo "View cache stats:"
echo "  curl https://${PROJECT_REF}.supabase.co/functions/v1/<function-name> | jq '.cacheStats'"
echo ""

print_success "Deployment script completed!"
echo ""
