# Post engagement backend contract sync

Canonical backend source:
[`f5a35b770129d1e7791d30435885b92d15f4f349`](https://github.com/Foodshareclub/foodshare-backend/commit/f5a35b770129d1e7791d30435885b92d15f4f349).

The tracked web vendor copy now contains that revision's like/bookmark handlers,
shared atomic mutation helper, shared barrel, generated backend database types,
forward migration, and focused handler tests. The retired error-swallowing toggle
helper is removed. Public RPC signatures in `src/types/database.types.ts` were
copied from the backend's generated definitions; other public client types remain
in their existing shape.

The vendor report also exposed an older missing room-identity migration. It is
now copied from the same canonical revision. All 87 tracked migration files and
the external-monitor wrapper match that backend revision byte-for-byte.

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

The follow-up sync includes the Edge Function formatting correction and the
latest shared helper. The backend integration suite additionally exercises
same-post counter updates from two different accounts (nine steps total).
