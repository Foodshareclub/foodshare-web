# Foodshare Phasal Plan: Componentization, Sentry, Docker→Podman, CI/CD

## Overview

This plan systematically improves the foodshare codebase across 5 phases, ensuring bleeding-edge practices, deep modularization, Sentry integration, Docker→Podman migration, and CI/CD execution.

---

## PHASE 1: Sentry Full Setup & Issue/PR Integration

### Goals

- Verify Sentry is fully operational across client/server/edge
- Ensure Sentry captures issues and links to PRs
- Configure release tracking and environment mapping

### Current State

- `sentry.client.config.ts` - DSN configured, `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`
- `sentry.server.config.ts` - Server-side init, `tracesSampleRate: isProd ? 0.1 : 1.0`
- `sentry.edge.config.ts` - Edge function init for Supabase Functions
- All configs use `process.env.SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`

### Tasks

1. **Verify DSN environment variables** are set in all `.env*` files
2. **Add Sentry release tracking** - ensure `NEXT_PUBLIC_SENTRY_RELEASE` is set in CI/CD
3. **Configure issue auto-assignment** - Sentry can link to GitHub issues/PRs
4. **Add PR template integration** - ensure Sentry errors from PR branches are traceable
5. **Test Sentry capture** - add a deliberate error test

### Success Criteria

- Sentry dashboard shows errors from all environments
- Issues can be opened from Sentry with PR links
- Release tags correlate with GitHub releases

---

## PHASE 2: Docker → Podman Migration (Quadlet Best Practices)

### Goals

- Migrate all Docker Compose services to Quadlet/Podman-compatible specs
- Ensure `standalone` Next.js output works with Podman
- Maintain identical service configurations

### Current State

- `foodshare-backend/docker-compose.yml` - Full Supabase stack (20+ services)
- `foodshare-runner/docker-compose.yml` - GitHub runner fleet with profiles
- `foodshare-web/next.config.ts` - `output: "standalone"` already configured
- Dockerfiles exist for runner (`myoung34/github-runner:ubuntu-noble`)

### Tasks

1. **Create Quadlet `.conf` files** for each docker-compose service in `foodshare-backend/`
2. **Convert runner compose** to Podman-compatible format with profiles
3. **Update `next.config.ts`** standalone output verification
4. **Create `compose-to-podman` script** for automated migration validation
5. **Test Podman startup** with converted configs

### Success Criteria

- All 20+ Supabase services run identically under Podman
- GitHub runner fleet works under Podman
- Next.js standalone output serves correctly via Podman

---

## PHASE 3: Deep Componentization & Modularization

### Goals

- Further componentize web app shared patterns
- Ensure backend packages (api, functions, cron) are fully independent
- Verify Skip app Core/Features boundaries
- Tighten tools crate boundaries

### Current State

- **Web**: `app/`, `components/`, `lib/`, `hooks/`, `store/` - good but can deepen
- **Backend**: `packages/api`, `packages/functions`, `packages/cron` - workspaces already set
- **Skip**: `Core/` with 30+ submodules, `Features/` with 24 modules - already very modular
- **Tools**: 9 packages in monorepo - workspaces set

### Tasks

1. **Web App**: Extract shared UI patterns into `components/ui/` with compound component patterns
2. **Web App**: Create `lib/utils/` with purely functional utilities (no side effects)
3. **Web App**: Move API routes to `app/api/` with typed endpoints using Hono patterns
4. **Backend**: Verify each package (`api`, `functions`, `cron`) has independent `package.json`
5. **Backend**: Ensure types are exported and shared across packages
6. **Skip**: Verify `Core/Protocols/` defines all abstractions, `Core/Services/` implements them
7. **Tools**: Ensure each WASM package (`compression-wasm`, `crypto-wasm`, etc.) has clean API

### Success Criteria

- Web components are independently importable and testable
- Backend packages can be deployed independently
- Skip Core protocols are fully abstracted from implementations
- Tools packages have no circular dependencies

---

## PHASE 4: Bleeding Edge Practices

### Goals

- Update to latest dependencies with breaking changes managed
- Enable React Compiler optimizations
- Configure Cache Components and PPR
- Optimize Turbopack configuration

### Current State

- Next.js `16.3.3` with `reactCompiler: true`
- Tailwind CSS `4.3.3`
- Sentry `10.71.0`
- Hono `4.13.5`
- Bun `1.1.0+`

### Tasks

1. **Update Next.js to 16.4+** (latest stable) with React Compiler
2. **Enable `cacheComponents: true`** with proper `cacheLife` configs (already set!)
3. **Configure `partialPrefetching`** on key links
4. **Update Tailwind CSS** to use JIT mode or latest features
5. **Update Hono** to latest `4.x` patch
6. **Enable Turbopack** experimental features where beneficial
7. **Update Bun** to latest stable version

### Success Criteria

- App builds with latest deps, no deprecation warnings
- Cache components work - routes render static shell instantly
- Bundle size optimized via tree-shaking and React Compiler
- All dependencies on latest secure versions

---

## PHASE 5: CI/CD Execution

### Goals

- Commit all changes
- Push to remote
- Watch CI/CD execution
- Fix any failing checks

### Tasks

1. **Add/modify GitHub Actions workflows** in `.github/` for each sub-project
2. **Ensure test suites pass** - `bun test`, type-check, lint
3. **Verify Docker/Podman builds** work in CI
4. **Sentry release tracking** in CI pipeline
5. **Commit and push** all changes

### Success Criteria

- All CI checks pass (lint, type-check, test)
- Docker/Podman builds succeed
- Sentry captures release versions
- Code is available on remote

---

## Execution Workflow

```bash
# Phase 1: Sentry
cd foodshare-web && ./scripts/verify-sentry.sh
# Phase 2: Podman migration
./scripts/migrate-to-podman.sh
# Phase 3: Modularization
# Phase 4: Bleeding edge deps
bun update
# Phase 5: CI/CD
git add .
git commit -m "phasal plan execution: phases 1-4"
git push
# Watch CI/CD
```
