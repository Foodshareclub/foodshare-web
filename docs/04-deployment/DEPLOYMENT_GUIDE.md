# 🚀 FoodShare Web Deployment Guide

This guide covers the deployment of the FoodShare Web application to production on our self-hosted VPS.

## 🏗️ Architecture Summary

- **App**: Next.js 16 (App Router)
- **Runtime**: Bun 1.2+
- **Infrastructure**: Docker Compose + Nginx (Host)
- **CI/CD**: GitHub Actions (Docker Build → GHCR → Deploy)
- **Registry**: GitHub Container Registry (ghcr.io)
- **Monitoring**: Sentry + Structured Logging

---

## 🛠️ Local Development

Before deploying, ensure your local environment is correctly configured.

```bash
# 1. Install dependencies
bun install

# 2. Run dev server
bun run dev

# 3. Full project audit (lint + type-check + build)
bun run build:check
```

---

## 🚀 CI/CD Pipeline

We use **"Latest-Wins" Concurrency**. Pushing a new commit to `main` will automatically cancel any in-progress builds for that branch.

### 1. Build Phase (GitHub Actions)
- Linting & Type-checking
- Bun:test suite execution
- Docker image build (multi-stage)
- Push to `ghcr.io/foodshareclub/foodshare-web:latest`

### 2. Deployment Phase
- SSH into VPS via `autossh`
- `docker compose pull`
- `docker compose up -d`
- `bun run translations:sync` (Updates Edge Function translations)

---

## 🖥️ VPS Management (Manual)

While deployment is automated, you may need to access the VPS for debugging.

### SSH Access
```bash
autossh -M 0 -o ServerAliveInterval=600 -o ServerAliveCountMax=600 -o ConnectTimeout=10 -o ConnectionAttempts=60 -i ~/.ssh/foodshare_id_ed25519 organic@web.foodshare.club
```

### Common Operations
```bash
# Check service health
docker compose ps

# View production logs
docker compose logs -f next-app

# Restart the application
docker compose restart next-app

# Manual sync of translations
bun run translations:sync
```

---

## 🔐 Environment Variables

We follow a **Vault-First** parity model. Secrets are managed centrally and synchronized during deployment.

### Production Secret Management
Runtime secrets (API keys, OAuth credentials, etc.) are stored in the **Supabase Vault** on the VPS.

- **Source of Truth**: Supabase Vault.
- **Management**: Use `./scripts/deploy.sh set-secret KEY VALUE` in the backend repository on the VPS.
- **Build-time Secrets**: Still managed via GitHub Actions Secrets (e.g., `SENTRY_AUTH_TOKEN`).
- **Initial Seeding**: GitHub Secrets can be used for initial setup; the deployment script automatically promotes missing secrets to the Vault.

### Required Production Config (Vault)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL/TOKEN`
- `GOTRUE_EXTERNAL_*` (OAuth providers)

---

## ⚡ Performance Optimization

Our production Docker build includes:
1. **Next.js Standalone Mode**: Minimized bundle for containerization.
2. **Sharp**: Automatic image optimization.
3. **Multi-stage Build**: Final image contains only production dependencies.
4. **Aggressive Caching**: Configured in `proxy.ts` for static-like routes.

---

## 🛠️ Troubleshooting

### Issue: Build Hanging
**Cause:** JSR imports or large bundle size.
**Solution:** Check `next.config.ts` for bundle analyzer and ensure no JSR imports in shared backend symlinks.

### Issue: Translation Sync Failed
**Cause:** Supabase Service Role key expired or network timeout.
**Solution:** Run `bun run translations:sync` manually on the VPS to identify the error.

### Issue: 429 Too Many Requests
**Cause:** Rate limit triggered in `proxy.ts`.
**Solution:** Check Upstash dashboard to verify Redis connection health.

---

## 🔄 Rollback Plan

If a deployment fails:
1. **GitHub Action**: Re-run the last successful workflow.
2. **Manual VPS**:
   ```bash
   docker compose rollback # If using docker rollout
   # OR
   docker compose up -d --build --force-recreate
   ```

---

_For more detailed infrastructure info, see `docs/02-development/ARCHITECTURE.md`._
console
- [ ] Monitoring active
- [ ] Team notified

### Follow-up

- [ ] Monitor for 24 hours
- [ ] Gather user feedback
- [ ] Document any issues
- [ ] Plan next improvements

---

**Deployment Date:** **\*\***\_**\*\***

**Deployed By:** **\*\***\_**\*\***

**Version:** **\*\***\_**\*\***

**Status:** ⬜ Success ⬜ Issues ⬜ Rollback

**Notes:**

---

---

---

---

_This deployment guide ensures a smooth, safe deployment of the modernized storage system._
