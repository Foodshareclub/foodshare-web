#!/bin/bash
# FoodShare Secrets Restoration Script
# This script helps restore environment variables from archived configurations

set -e

echo "🔐 FoodShare Secrets Restoration Tool"
echo "======================================"
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to backup and overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled. No changes made."
        exit 1
    fi
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up existing .env.local"
fi

echo ""
echo "📋 Creating .env.local from archived secrets..."
echo ""

cat > .env.local << 'EOF'
# FoodShare Environment Variables
# Auto-generated from archived secrets on $(date)
# Review and update tokens as needed - some may have been rotated

# ============================================
# SUPABASE CONFIGURATION
# ============================================
VITE_SUPABASE_URL=https://***REMOVED***.supabase.co
VITE_SUPABASE_ANON_KEY=REDACTED_OLD_SUPABASE_TOKEN

NEXT_PUBLIC_SUPABASE_URL=https://***REMOVED***.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=REDACTED_OLD_SUPABASE_TOKEN

SUPABASE_URL=https://***REMOVED***.supabase.co
SUPABASE_ANON_KEY=REDACTED_OLD_SUPABASE_TOKEN
SUPABASE_SERVICE_ROLE_KEY=REDACTED_OLD_SUPABASE_KEY
SUPABASE_JWT_SECRET=fd864504-ebac-44a6-81d8-30112a51c55d
SUPABASE_ACCESS_TOKEN=sbp_22739de136972d62a4af616cf3b47ad2df2bd938

# Legacy Create React App compatibility
REACT_APP_SUPABASE_URL=https://***REMOVED***.supabase.co
REACT_APP_SUPABASE_ANON_KEY=REDACTED_OLD_SUPABASE_TOKEN

# ============================================
# POSTGRESQL (via Supabase)
# ============================================
POSTGRES_DATABASE=postgres
POSTGRES_HOST=db.***REMOVED***.supabase.co
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SnzHUJMOUQAJDciw
POSTGRES_PRISMA_URL=postgres://postgres.***REMOVED***:SnzHUJMOUQAJDciw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
POSTGRES_URL=postgres://postgres.***REMOVED***:SnzHUJMOUQAJDciw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x
POSTGRES_URL_NON_POOLING=postgres://postgres.***REMOVED***:SnzHUJMOUQAJDciw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require

# ============================================
# UPSTASH REDIS (Caching & Rate Limiting)
# ============================================
KV_REST_API_URL=https://wondrous-pika-7638.upstash.io
KV_REST_API_TOKEN=AR3WAAImcDIwZTdjOWFiOGNjODI0ZGVlODMyZmI4YWNiNDc4MmIwYXAyNzYzOA
KV_REST_API_READ_ONLY_TOKEN=Ah3WAAIgcDJL-QxxOegZ5kK97pteWRlDanRWVGAr9_cH_5SG4KF-JA
KV_URL=rediss://default:AR3WAAImcDIwZTdjOWFiOGNjODI0ZGVlODMyZmI4YWNiNDc4MmIwYXAyNzYzOA@wondrous-pika-7638.upstash.io:6379
REDIS_URL=rediss://default:AR3WAAImcDIwZTdjOWFiOGNjODI0ZGVlODMyZmI4YWNiNDc4MmIwYXAyNzYzOA@wondrous-pika-7638.upstash.io:6379

# ============================================
# UPSTASH VECTOR (Semantic Search)
# ============================================
UPSTASH_VECTOR_REST_URL=https://adapted-octopus-15379-us1-vector.upstash.io
UPSTASH_VECTOR_REST_TOKEN=ABkFMGFkYXB0ZWQtb2N0b3B1cy0xNTM3OS11czFhZG1pblpXTTFOV1ZrWVRVdFlUZGlaUzAwWlRFd0xXSmtOVGd0WmpnNFkySmpNalZpTXpBMg==
UPSTASH_VECTOR_REST_READONLY_TOKEN=ABkIMGFkYXB0ZWQtb2N0b3B1cy0xNTM3OS11czFyZWFkb25seU9EY3pZbVUyWldRdE5XUmxaUzAwTTJaaUxUaGlOV1F0T1dVNFptWXpOR1JrTURrNA==

# ============================================
# UPSTASH QSTASH (Message Queue)
# ============================================
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=eyJVc2VySUQiOiJmMGVhYjVlYi05ZThkLTQ5YjYtOTljOS0yZDFmZDI2OTY1YTIiLCJQYXNzd29yZCI6IjY5MDAzMTE5YTIwMzQ3YzQ5MTY5MzY5ZjU2ZDZhNWRlIn0=
QSTASH_CURRENT_SIGNING_KEY=sig_7yB4TuZhdfzmLYQMCmaVtUeEuaY1
QSTASH_NEXT_SIGNING_KEY=sig_4zJLaBodP9iF81Pjn4vqBnrauUS1

# ============================================
# UPSTASH SEARCH (Full-text Search)
# ============================================
UPSTASH_SEARCH_REST_URL=https://clean-flounder-21346-gcp-usc1-search.upstash.io
UPSTASH_SEARCH_REST_TOKEN=AB0FMGNsZWFuLWZsb3VuZGVyLTIxMzQ2LWdjcC11c2MxYWRtaW5ZVEExWkdJMU5XTXRNbU15WlMwME5qSXlMVGt3T0RZdE0yRTFObU01TkRNd01qRXo=
UPSTASH_SEARCH_REST_READONLY_TOKEN=AB0IMGNsZWFuLWZsb3VuZGVyLTIxMzQ2LWdjcC11c2MxcmVhZG9ubHlZbUZrTURNMU56UXRORE5oTnkwMFlXRm1MV0l6TlRFdFlUSXhORE14WlRjNE5EUms=

# ============================================
# VERCEL
# ============================================
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_fudq465jyiuwgt8hc75eta7kyd6z?token=80b245b7-d809-4134-ab0b-3562991283dc
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_CTJB6J7aKP2v6AWu_LMUZfFWc0HTc90U2qQ9NgRqO2usbe9"

# OIDC Token (expires - may need refresh from Vercel CLI)
VERCEL_OIDC_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9mb29kc2hhcmUiLCJzdWIiOiJvd25lcjpmb29kc2hhcmU6cHJvamVjdDpmb29kc2hhcmU6ZW52aXJvbm1lbnQ6ZGV2ZWxvcG1lbnQiLCJzY29wZSI6Im93bmVyOmZvb2RzaGFyZTpwcm9qZWN0OmZvb2RzaGFyZTplbnZpcm9ubWVudDpkZXZlbG9wbWVudCIsImF1ZCI6Imh0dHBzOi8vdmVyY2VsLmNvbS9mb29kc2hhcmUiLCJvd25lciI6ImZvb2RzaGFyZSIsIm93bmVyX2lkIjoidGVhbV9hVUEyM1ZIUUV6ZWt0dGRNQ3NRTERYN28iLCJwcm9qZWN0IjoiZm9vZHNoYXJlIiwicHJvamVjdF9pZCI6InByal9wY3BiVFdsa1ZJbklneGlVU2pUeklVTmhLSVhxIiwiZW52aXJvbm1lbnQiOiJkZXZlbG9wbWVudCIsInBsYW4iOiJob2JieSIsInVzZXJfaWQiOiJqbkFtQ0FmOGQzbXZUWVNldGpCVVpKM1QiLCJuYmYiOjE3NjQzMDcwMjcsImlhdCI6MTc2NDMwNzAyNywiZXhwIjoxNzY0MzUwMjI3fQ.MqaPY59fWQg9YsBpUE8CrXVgbuFjPTz2TvAJec1uKTKkY08kbNZTogyVGunUHzSGoTSbxw6UDVWnYqoxvNbA_AGHKj4LEJ6L_BKoVN9NhOzACRWX2LEfJRIy1pRgOfCKCQnDyq2NefqGBjJfzfDy9-vrMmDCPijDz8bB9QWejmJkTbEnSU2kNL9LrtmKvslaB7_eSGOpVTFfw3m32fKMDBFsMDOWBLJVw_Cykv8hNLOvGNUnT_Df6mZN8L7vpJRj_8MyVf7neazc7PNsP9Z370s0X46ycQMZ9OqeMs_JUJgQsHdAO4P--1d5rT_eNwzffNaCk3cI1kITRj1Vpj9nFA"

# ============================================
# EMAIL: BREVO (Sendinblue)
# ============================================
BREVO_API_KEY=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
BREVO_SENDER_EMAIL=noreply@foodshare.club
BREVO_SENDER_NAME=FoodShare
BREVO_TEMPLATE_WELCOME=1
BREVO_TEMPLATE_PASSWORD_RESET=2
BREVO_TEMPLATE_NEW_MESSAGE=3
BREVO_TEMPLATE_PRODUCT_INTEREST=4
BREVO_TEMPLATE_PRODUCT_EXPIRING=5
BREVO_TEMPLATE_WEEKLY_DIGEST=6

# ============================================
# EMAIL: AWS SES (Fallback)
# ============================================
AWS_REGION=us-west-2
AWS_SES_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIAV4K4P4P3ON3ZVTLN
AWS_SECRET_ACCESS_KEY=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
AWS_SES_FROM_EMAIL=noreply@foodshare.club
AWS_SES_CONFIGURATION_SET=foodshare-emails

# ============================================
# TWILIO (Phone Verification)
# ============================================
TWILIO_ACCOUNT_SID=ACffdce5ff52463cc83772beac07ac37c8
TWILIO_AUTH_TOKEN=c2db8ba0410be2c3a2a03cd698bc7a05
TWILIO_API_KEY_SID=SK408f9b719d3610a762f3a2983f5de39f
TWILIO_VERIFY_SERVICE_SID=VA5cebdda36cb6d5b488f842bb9892c1fb
NEXT_PUBLIC_TWILIO_VERIFY_SERVICE_SID=VA5cebdda36cb6d5b488f842bb9892c1fb

# Test credentials (for development)
TWILIO_TEST_ACCOUNT_SID=ACac1a815f34a8f66742eba8e2fdf90e1b
TWILIO_TEST_AUTH_TOKEN=2b89054f9bf6382b790ea4926403a22b

# ============================================
# EMAIL: RESEND (Optional - for auth emails)
# ============================================
RESEND_API_KEY=re_Fazcf1Tw_L94WXDvmCKvdxHzm1gHibYks

# ============================================
# APPLICATION CONFIGURATION
# ============================================
REACT_APP_DOMAIN=foodshare.club
REACT_APP_STAGING_DOMAIN=staging.foodshare.club
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
CI=true

NEXT_PUBLIC_APP_URL=https://foodshare.app
NEXT_PUBLIC_SITE_URL=https://foodshare.app
NEXT_PUBLIC_EMAIL_FROM=noreply@foodshare.app
NEXT_PUBLIC_EMAIL_FROM_NAME=FoodShare

# ============================================
# OPTIONAL: Development Features
# ============================================
EMAIL_ENABLED=true
EMAIL_DEBUG=false
# EMAIL_REDIRECT_ALL_TO=your-test-email@example.com

# ============================================
# OPTIONAL: STRIPE (Payment Processing)
# ============================================
# Uncomment and add your Stripe keys if needed
# STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ============================================
# OPTIONAL: ANALYTICS
# ============================================
# NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
EOF

echo "✅ Created .env.local with archived secrets"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   1. Some tokens may have been rotated - verify they still work"
echo "   2. Test each service connection before deploying"
echo "   3. NEVER commit .env.local to git"
echo "   4. Consider rotating sensitive tokens for security"
echo ""
echo "📝 TODO Items:"
echo "   [✓] Vercel Blob token added"
echo "   [✓] Resend API key added"
echo "   [ ] Verify all Upstash tokens are still valid"
echo "   [ ] Test Twilio, Brevo, and AWS SES connections"
echo ""
echo "📖 For detailed instructions, see: MISSING_SECRETS_GUIDE.md"
echo ""
echo "🧪 Test your configuration with:"
echo "   npm run dev"
echo ""
