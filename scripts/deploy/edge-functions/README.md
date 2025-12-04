# Edge Functions Deployment Scripts

This directory contains all deployment scripts for Supabase Edge Functions.

## 🚀 Main Deployment Scripts

### Modern Deployment (Recommended)

- **deploy-all-modern.sh** - Modern deployment with latest optimizations
- **deploy-all-optimized.sh** - Optimized deployment script

### No-JWT Deployment

- **deploy-all-no-jwt.sh** - Deploy without JWT verification
- **deploy-all-no-jwt-optimized.sh** - Optimized no-JWT deployment
- **redeploy-no-jwt.sh** - Redeploy without JWT

### Legacy/Alternative

- **deploy-with-link.sh** - Deploy with Supabase link

## 📋 Usage

### Quick Deploy (Recommended)

```bash
# Modern optimized deployment
./scripts/deploy/edge-functions/deploy-all-modern.sh

# Or optimized version
./scripts/deploy/edge-functions/deploy-all-optimized.sh
```

### No-JWT Deployment

```bash
# If you need to deploy without JWT verification
./scripts/deploy/edge-functions/deploy-all-no-jwt-optimized.sh
```

### Individual Function Deployment

```bash
# Deploy a specific function
supabase functions deploy function-name --no-verify-jwt
```

## 🔧 Prerequisites

1. Supabase CLI installed
2. Logged in to Supabase: `supabase login`
3. Project linked: `supabase link --project-ref your-project-ref`
4. Environment variables configured in `.env`

## 📖 Documentation

For detailed deployment guides, see:

- `docs/supabase/edge-functions/DEPLOYMENT_GUIDE.md`
- `docs/supabase/edge-functions/QUICK_DEPLOY.md`
- `docs/supabase/edge-functions/START_HERE.md`

## ⚠️ Important Notes

- Always test in a development environment first
- Review the deployment checklist before deploying
- Keep backups of working deployments
- Monitor function logs after deployment

## 🔍 Troubleshooting

If deployment fails:

1. Check Supabase CLI version: `supabase --version`
2. Verify project link: `supabase projects list`
3. Check function logs: `supabase functions logs function-name`
4. Review error messages in deployment output

## 📊 Deployment Status

Check deployment status:

```bash
# List all functions
supabase functions list

# Check specific function
supabase functions inspect function-name
```

---

**Last Updated**: November 30, 2024
