# FoodShare Testing Guide

The test runner is **Bun's**. There is no Vitest, no Jest, and no second DOM
library: `bun test` runs the suite, and happy-dom provides the DOM.

| Layer                | Tool                    | Where                                                    |
| -------------------- | ----------------------- | -------------------------------------------------------- |
| Unit + component     | `bun test`              | `src/__tests__/**`                                       |
| DOM                  | happy-dom               | registered by `src/__tests__/happydom.ts`                |
| Global mocks         | `bun:test`'s `mock.module` | `src/__tests__/setup.ts`                              |
| Shared fixtures      | —                       | `src/lib/testing/`                                       |
| Mock Edge Function   | `Bun.serve`             | `src/lib/testing/mock-server.ts`                         |
| End to end           | Playwright              | `e2e/**`                                                 |

## Commands

```bash
bun run test           # the whole suite, each file in its own process
bun run test:watch     # re-run on change
bun run test:ci        # as CI runs it: --ci --isolate --coverage
bun run test:coverage  # text + lcov reports into coverage/
bun run e2e            # Playwright, against a running app
bun run e2e:ui         # Playwright's UI
```

`--isolate` is what makes the suite trustworthy: each test file gets its own
process, so a module mock in one file cannot leak into the next.

## How the suite is wired

`bunfig.toml` preloads two files before any test runs:

```toml
[test]
preload = ["./src/__tests__/happydom.ts", "./src/__tests__/setup.ts"]
```

- **`happydom.ts`** registers happy-dom, so components have a DOM. It also
  captures Bun's own `Response` and `fetch` *before* registering, because
  happy-dom replaces both — and `Bun.serve` rejects happy-dom's `Response`,
  while happy-dom's `fetch` blocks a cross-origin request to a local mock
  server. The capture lives in `src/lib/testing/native.ts` so that the
  library can reach it without importing from the test tree.
- **`setup.ts`** applies the mocks every file inherits: `server-only`,
  `next/cache`, `@supabase/ssr`, the observers happy-dom does not implement,
  and the environment variables the app reads.

## Writing a test

Unit test:

```ts
import { describe, expect, it } from "bun:test";
import { getDistanceFromLatLonInKm } from "@/utils/getDistanceFromLatLonInKm";

describe("getDistanceFromLatLonInKm", () => {
  it("is zero for the same point", () => {
    expect(getDistanceFromLatLonInKm(47.37, 8.54, 47.37, 8.54)).toBe(0);
  });
});
```

Component test — `@testing-library/react` renders into happy-dom's document:

```tsx
import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MenuItem } from "@/components/header/navbar/atoms/MenuItem";

it("renders the label", () => {
  render(<MenuItem label="My listings" />);
  expect(screen.getByText("My listings")).toBeDefined();
});
```

Mocking a module — `mock.module` replaces it for the whole file, so the
module under test has to be imported *after* the mock:

```ts
import { expect, mock, test } from "bun:test";

mock.module("@/lib/supabase/server", () => ({
  createClient: () => ({ from: () => ({ select: () => ({ single: async () => ({ data: null }) }) }) }),
}));

const { getUser } = await import("@/lib/data/auth");
```

## The mock Edge Function server

The app talks to Supabase Edge Functions over HTTP. `src/lib/testing/` can
answer those calls from a real Bun server:

```ts
import { setupMockServer, teardownMockServer } from "@/lib/testing/mock-server";

const server = setupMockServer();
process.env.NEXT_PUBLIC_SUPABASE_URL = server.url; // the client builds
                                                    // ${URL}/functions/v1/<fn>
```

The routes are in `src/lib/testing/mock-routes.ts` — the API surface, as
plain objects. Each can be called directly, without a server, which is how
`src/lib/testing/__tests__/mock-routes.test.ts` asserts on the contract.

`errorRoutes` covers the failure modes the client has to survive: rate
limited, server error, unauthorised, not found, validation error, circuit
open, and a timeout that never comes back.

## Shared fixtures

`src/lib/testing/` holds what more than one test needs:

| Module                     | What it is                                              |
| -------------------------- | ------------------------------------------------------- |
| `mock-factories.ts`        | product / user / room / message factories, and the response envelopes |
| `mock-routes.ts`           | the Edge Function API surface, as routes                |
| `mock-server.ts`           | the `Bun.serve` adapter for those routes                |
| `contract-testing.ts`      | Zod schemas and contract definitions                    |
| `enterprise-test-utils.ts` | circuit breaker, retry, offline queue, cache, realtime  |
| `test-utils.tsx`           | `render` with the app's providers                       |

## End to end

Playwright runs on Bun. `bunx --bun playwright test` works because
`patches/playwright@1.62.1.patch` stops Playwright from overwriting Bun's
native `require.extensions[".ts"]` handler — without the patch every spec
containing a TypeScript annotation fails to parse. The patch is applied by
`bun install` through `patchedDependencies`; never delete `patches/`.

The specs are in `e2e/`, and `playwright.config.ts` starts the app itself
(`bun run dev`, or `bun run start` in CI).

## When something does not work

**"Cannot find module 'react'"** — a module under test was imported before
its mock. `mock.module` has to come first; the import of the module under
test has to be dynamic.

**A test passes but the mock is not being used** — check the import order
above, and check that the module is imported by the path you mocked. Bun
matches the specifier as written, and `@/lib/x` and `../../lib/x` are
different specifiers.

**A `Bun.serve` mock returns an error page** — the response was built with
the global `Response`, which happy-dom has replaced. Use `NativeResponse`
from `src/lib/testing/native.ts`, or the `jsonResponse` helper in
`mock-routes.ts`.

**A request to the mock server is blocked as cross-origin** — happy-dom's
`fetch` replaced the global one. Use `NativeFetch` from the same module.

**Type errors in a test file** — `tsconfig.json` excludes `src/**/*.test.ts`
and `src/__tests__/**` from the type-check, so the suite is not type-checked
by `bun run type-check`. Run `bun run type-check` and read the test file
directly.
