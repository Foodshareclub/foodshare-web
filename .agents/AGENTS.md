# Workspace Rules (`foodshare-web`)

- **Core Toolchain Mandate (Bun, Turbopack, Oxlint, Biome, Hono):**
  - **Bun:** For all package management and script execution tasks, ALWAYS use `bun` instead of `npm`, `npx`, `yarn`, or `pnpm`.
  - **Turbopack:** Always use the Next.js Turbopack compiler (`bun next dev --turbopack` & `bun next build --turbopack`).
  - **Oxlint:** Enforce Rust-based fast linting (`oxlint` / `bunx oxlint`) across JS/TS/JSON code.
  - **Biome:** Enforce Rust-based fast formatting & linting (`biome` / `bunx biome check`).
  - **Hono:** Use Hono web/edge framework for ultra-fast REST API routing in Next.js App Router (`src/app/api/[[...route]]/route.ts`).

- **Web Frontend Stack:**
  - **Framework:** Next.js 16 (App Router exclusively) with Hono API routes (`src/app/api/[[...route]]/route.ts`).
  - **React Features:** Enforce React 19 best practices (`useActionState`, `useFormStatus`, `useOptimistic`, and `use()` hook patterns). Do not use deprecated React 18 patterns for forms.
  - **Styling:** Tailwind CSS v4 with the specialized "Liquid Glass" aesthetic. Prioritize micro-animations and View Transitions.
  - **Caching:** Leverage Turbopack caching paradigms correctly to prevent directive crashes.
  - **i18n:** Utilize `next-intl` for the 21 supported languages. Always sync translation keys using `bun run translations:sync`.
  - **Deployment:** The frontend is self-hosted via Docker Compose on a VPS and exposed exclusively via Cloudflare Zero Trust Tunnels (`foodshare-frontend`). DO NOT use Vercel for deployment or DNS records.
  - **Secrets Management & Deployment:** GitHub Repository Secrets MUST be used for CI/CD deployments across the domain. All build arguments and environment variables (e.g., `SITE_DOMAIN`, OAuth keys, `CLOUDFLARE_TUNNEL_TOKEN`, `VPS_HOST`) are injected through the `.github/workflows/web.yml` CI/CD pipeline. Avoid hardcoding domain names or IP addresses; use a single domain variable like `SITE_DOMAIN` to derive URLs dynamically (e.g., `NEXT_PUBLIC_APP_URL: https://${{ secrets.SITE_DOMAIN }}`). While CI/CD is the primary deployment method, manual SSH access and `.env` modifications on the VPS are permitted when explicitly requested by the user for debugging or administrative purposes.

- **Sibling repos:** backend contracts in `foodshare-backend`, mobile app in `foodshare-app`, shared tooling in `foodshare-tools`, VPS/ops in `foodshare-runner`.
