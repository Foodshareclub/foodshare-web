# Phasic Plan: Codebase Modernization & Infrastructure Migration

## Overview

This plan systematically modernizes the FoodShare web application across four phasic domains:

1. Component & Module Deep Modularization
2. Sentry Error Tracking & GitHub Integration
3. Docker to Podman/Quadlet Migration
4. CI/CD Execution & Verification

---

## PHASE 1: Deep Component & Module Modularization

### Goal

Further componentize and modulize the codebase to make it very efficient across the code domain, following bleeding-edge React/Next.js patterns.

### Key Activities

#### 1.1 Analyze Component Duplication & Opportunities

- [x] **Completed**: Explored component structure - found well-organized ui/atoms, molecules, organisms
- [ ] **Action**: Identify components that can be extracted into reusable lib utilities
- [ ] **Action**: Create shared utility components from duplicated patterns

#### 1.2 Enhance UI Component Library

- [ ] **Action**: Migrate remaining inline styles to Tailwind v4 utilities where applicable
- [ ] **Action**: Ensure all UI components support `variant` and `size` props via CVA (Class Variance Authority)
- [ ] **Action**: Add missing accessibility props (aria-label, role) to all interactive components
- [ ] **Action**: Create component index barrel exports for easier imports

#### 1.3 Modularize Lib Utilities

- [ ] **Action**: Group related functions in `src/lib/` into sub-modules (e.g., `lib/observability`, `lib/security`)
- [ ] **Action**: Ensure all utilities have proper TypeScript typing
- [ ] **Action**: Create index.ts exports for each sub-module

#### 1.4 optimize Images & Assets

- [ ] **Action**: Verify all images use `next/image` or `src/utils/image.ts`
- [ ] **Action**: Add proper `sizes` attributes for responsive images
- [ ] **Action**: Optimize SVG usage across components

### Success Metrics

- Zero component prop-drilling via proper context/use hooks
- 100% of interactive components have accessibility labels
- All images optimized with next/image or proper SVG

---

## PHASE 2: Sentry Full Configuration & GitHub Integration

### Goal

Ensure Sentry is fully set and is able to open up the issues and PRs respectively (via Sentry GitHub integration).

### Current State

- Sentry is configured in `sentry.client.config.ts` and `sentry.server.config.ts`
- `attachStacktrace: true` is set
- DSN is configured via environment variables
- Next.js 16 with cacheComponents enabled

### Enhancements Needed

#### 2.1 GitHub Integration for Auto-Issue/PR Opening

- [ ] **Action**: Ensure `SENTRY_AUTH_TOKEN` has `repo` scope in GitHub secrets
- [ ] **Action**: Verify Sentry GitHub integration is enabled in sentry dashboard
- [ ] **Action**: Add GitHub webhook configuration in Sentry for automatic issue/PR linking
- [ ] **Action**: Configure `enableInboundFilters` for automatic error grouping

#### 2.2 Enhance Error Reporting

- [ ] **Action**: Add custom breadcrumbs in critical user flows
- [ ] **Action**: Implement `onError` handler for additional context
- [ ] **Action**: Add `release` tracking for better deployment visibility
- [ ] **Action**: Configure `environment` mapping (development/staging/production)

#### 2.3 Sentry Performance Monitoring

- [ ] **Action**: Add transaction name customization for better routing insights
- [ ] **Action**: Configure `tracePropagationHeaders` for cross-origin iframes
- [ ] **Action**: Add `beforeSend` to strip sensitive data

#### 2.4 Edge Runtime Sentry

- [ ] **Action**: Ensure `sentry.edge.config.ts` is properly synced with client config
- [ ] **Action**: Test error capture on edge routes

### Success Metrics

- Errors automatically link to GitHub issues/PRs
- Custom breadcrumbs capture user flow context
- Release tracking shows deployment status

---

## PHASE 3: Docker to Podman/Quadlet Migration

### Goal

Ensure we went through the full migration from Docker to Podman using the best practices.

### Current State

- Dockerfile uses `oven/bun:1` multi-stage build
- docker-compose.yml defines web + cloudflared services
- GitHub Actions `web.yml` uses Docker for build/push/deploy
- VPS deployment uses `docker compose` directly

### Migration Strategy: Quadlet (Podman's native container format)

#### 3.1 Create Quadlet Unit Files

- [ ] **Action**: Create `foodshare-web.container` Quadlet unit for systemd/podman
- [ ] **Action**: Create `foodshare-cloudflared-web.container` Quadlet unit
- [ ] **Action**: Migrate environment variable handling to Quadlet

#### 3.2 Update Dockerfile for Podman Compatibility

- [ ] **Action**: Keep Dockerfile as-is (oven/bun works with Podman via build arguments)
- [ ] **Action**: Ensure standalone output is maintained for Quadlet deployment

#### 3.3 Update GitHub Actions for Podman

- [ ] **Action**: Replace Docker build/push with Podman/Buildah equivalents
- [ ] **Action**: Update deploy step to use `podman pull` + `podman restart` / systemctl
- [ ] **Action**: Add Quadlet unit deployment step to workflow

#### 3.4 Update VPS Deployment Script

- [ ] **Action**: Replace `docker compose` commands with `podman compose` or Quadlet equivalents
- [ ] **Action**: Update VPS maintenance workflow
- [ ] **Action**: Ensure read-only filesystem compatibility

#### 3.5 Test Podman Local Development

- [ ] **Action**: Verify `podman compose up` works with current docker-compose.yml
- [ ] **Action**: Test standalone .next output with Podman

### Success Metrics

- Zero Docker-specific commands in CI/CD (replaced with Podman/Quadlet)
- Quadlet units deploy successfully to VPS
- Local development with Podman works identically to Docker

---

## PHASE 4: CI/CD Execution & Verification

### Goal

Commit & push, and then watch the ci/cd execution.

### Activities

#### 4.1 Create Feature Branch

- [ ] **Action**: `git checkout -b modernization/phasic-plan`

#### 4.2 Implement Phase 1 Changes

- [ ] **Action**: Execute component modularization
- [ ] **Action**: Run `bun run lint` and `bun run type-check`

#### 4.3 Implement Phase 2 Sentry Changes

- [ ] **Action**: Update Sentry configs with GitHub integration
- [ ] **Action**: Verify Sentry test workflows

#### 4.4 Implement Phase 3 Podman Migration

- [ ] **Action**: Create Quadlet unit files
- [ ] **Action**: Update GitHub Actions workflows
- [ ] **Action**: Update VPS deployment scripts

#### 4.5 Commit & Push

- [ ] **Action**: `git add .`, `git commit -m "modernization: phasic plan execution"`, `git push origin modernization/phasic-plan`

#### 4.6 Watch CI/CD Execution

- [ ] **Action**: Monitor GitHub Actions workflow
- [ ] **Action**: Fix any failing jobs
- [ ] **Action**: Verify all four phases pass

#### 4.7 Merge & Deploy

- [ ] **Action**: Create Pull Request, get approvals
- [ ] **Action**: Merge to main
- [ ] **Action**: Watch production deployment via GitHub Actions
- [ ] **Action**: Verify application running correctly

### Success Metrics

- All GitHub Actions jobs pass (validate, build, e2e, docker→podman, deploy)
- Production deployment successful
- Sentry opens issues/PRs from errors automatically
- Podman/Quadlet migration complete

---

## Execution Strategy

Each phase will be executed sequentially with verification steps. The plan is designed to be run without stops, moving from code improvement to infrastructure migration to CI/CD verification.

**Estimated time**: 6-8 hours total across all phases
**Risk level**: Medium (incremental changes with rollback possible)
