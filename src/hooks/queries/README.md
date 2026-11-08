# Query Hooks (`src/hooks/queries/`)

Client-side TanStack Query hooks. Most data fetching in this app runs through
Server Components + Server Actions; these hooks exist only where client-side
state is required (realtime updates, infinite scroll on a client component,
map viewport prefetching).

| Hook file                    | Used by                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `useChallenges.ts`           | Challenge deck swiping (`app/challenge/ChallengesClient.tsx`)              |
| `useChallengeLeaderboard.ts` | Leaderboard board + user modal (`components/challenges/`)                  |
| `useLeaderboardRealtime.ts`  | Realtime leaderboard updates (`ChallengeLeaderboard.tsx`)                  |
| `useActiveChallenges.ts`     | Active challenges widget (`components/challenges/ActiveChallenges/`)       |
| `useEmailCRM.ts`             | Admin email CRM dashboard (`app/admin/email/`)                             |
| `useViewportLocations.ts`    | Map viewport prefetching (`components/leaflet/ViewportLocationLoader.tsx`) |

The public barrel is `src/hooks/queries/index.ts`; components import from the
individual hook files.
