# 🚀 FoodShare Web Deployment Guide

This guide covers the deployment of the FoodShare Web application to production on our self-hosted VPS.

## 🏗️ Architecture Summary

- **App**: Next.js 16 (App Router)
- **Runtime**: Bun >=1.1 (CI: latest)
- **Infrastructure**: Docker Compose + Cloudflare Tunnel (`cloudflared` container in compose — no host reverse proxy)
- **Services**: `foodshare-web` + `cloudflared`
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

### 2. Deployment Phase (Automated)

The `web.yml` workflow connects to the VPS over SSH and:

- Writes `.env.production` from GitHub Secrets
- `docker compose pull && docker compose up -d --force-recreate` (services: `foodshare-web`, `cloudflared`)
- `bun run translations:sync` (Updates Edge Function translations)

Public traffic enters through the Cloudflare Tunnel container defined in `docker-compose.yml`.

### 3. Debugging a Failed Deploy

```bash
# Inspect the failed step logs
gh run view --log-failed

# Re-trigger after fixing
git push origin main
```

SSH into the VPS only for debugging — never to build or deploy manually.

---

## 🖥️ VPS Access (Debugging Only)

Deployment is fully automated. Use SSH only to inspect a broken deployment.

### SSH Access

```bash
autossh -M 0 -o ServerAliveInterval=600 -o ServerAliveCountMax=600 -o ConnectTimeout=10 -o ConnectionAttempts=60 -i ~/.ssh/foodshare_id_ed25519 organic@${VPS_HOST:-frontendvps.foodshare.club}
```

### Common Debug Operations

```bash
# Check service health
docker compose ps

# View production logs
docker compose logs -f foodshare-web

# Manual sync of translations (debugging only)
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
**Solution:** Check `next.config.ts` for bundle analyzer and ensure no JSR imports in the vendored `supabase/` copy.

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
2. **Manual VPS** (debugging only):
   ```bash
   docker compose pull
   docker compose up -d --force-recreate
   ```

---

_For more detailed infrastructure info, see `docs/02-development/ARCHITECTURE.md`._
