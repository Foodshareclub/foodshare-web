# Post engagement backend contract sync

Canonical backend source:
[`4d4d053794d87b71bfe330ddf8beacba2a4c863c`](https://github.com/Foodshareclub/foodshare-backend/commit/4d4d053794d87b71bfe330ddf8beacba2a4c863c).

The tracked web vendor copy now contains that revision's like/bookmark handlers,
shared atomic mutation helper, shared barrel, generated backend database types,
forward migration, and focused handler tests. The retired error-swallowing toggle
helper is removed. Public RPC signatures in `src/types/database.types.ts` were
copied from the backend's generated definitions; other public client types remain
in their existing shape.

The canonical native database and integration commands run from
`foodshare-backend`. This repository excludes local oracle metadata under
`supabase/oracle`; existing ignored files there were preserved. Backend-only
audit and operations fixtures are validated in their owning repository. This is
a scoped runtime/contract sync, not a claim that the entire vendor tree matches
the backend or that its full test harness runs independently here.

The mobile clients retain their existing shared Swift DTOs and API path. The
backend change takes effect only after its main deployment pipeline passes and
the migration/functions are deployed. A web source push or passing type check is
not evidence of backend deployment, browser behavior, app parity, or publication.
