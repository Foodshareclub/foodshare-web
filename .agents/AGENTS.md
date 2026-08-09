# Workspace Rules

- **Use Bun everywhere:** For all package management and script execution tasks within this workspace (especially in `foodshare-web`, `foodshare-backend`, etc.), ALWAYS use `bun` instead of `npm`, `npx`, `yarn`, or `pnpm`.
  - Use `bun install` or `bun add` for adding dependencies.
  - Use `bun run <script>` for running scripts.
  - Use `bunx <command>` instead of `npx <command>`.
  - The only exception is for Deno Edge Functions where standard library or Deno-specific `npm:` specifiers are required (e.g. `import { foo } from "npm:foo"`). In those specific Deno imports, keep using `npm:`.

- **Web Frontend (`foodshare-web`) Stack:**
  - **Framework:** Next.js 16 (App Router exclusively).
  - **React Features:** Enforce React 19 best practices (`useActionState`, `useFormStatus`, `useOptimistic`, and `use()` hook patterns). Do not use deprecated React 18 patterns for forms.
  - **Styling:** Tailwind CSS v4 with the specialized "Liquid Glass" aesthetic. Prioritize micro-animations and View Transitions.
  - **Caching:** Leverage Turbopack caching paradigms correctly to prevent directive crashes.
  - **i18n:** Utilize `next-intl` for the 21 supported languages. Always sync translation keys using `bun run translations:sync`.

- **Backend (`foodshare-backend`) Stack:**
  - **Infrastructure:** Supabase ecosystem.
  - **Edge Functions:** Written in Deno (TypeScript). Use the mandated `Deno.serve` and `createAPIHandler` patterns.
  - **Testing:** Scaffold robust Deno unit tests for Edge Functions.
  - **Database Migration:** Generate SQL migrations in `supabase/migrations`. ALWAYS sync TypeScript types to the frontend via `bunx supabase gen types typescript` after applying schema changes.
  - **AI / Vector:** Utilize Supabase Vector (pgvector) and Edge AI workflows for embeddings and similarity search.
  - **Secrets:** Safely integrate secrets using Supabase Vault in Edge Functions.

- **Mobile Application (`foodshare-app`) Stack:**
  - **Framework:** Skip (for cross-platform SwiftUI to Kotlin transpilation) and native SwiftUI (iOS 27 patterns).
  - **Design System:** Use Liquid Glass tokens and ensure cross-platform safety for Skip Fuse patterns.
