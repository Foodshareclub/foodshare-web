# Phasal Plan: correctness, exposure, weight

Replaces the September plan, whose phases (Sentry setup, Docker→Podman,
componentization, dependency bumps) shipped and whose remaining items are
tracked in the commit history rather than here.

Every phase below was executed in one pass with the gate green at each step:
`bun run type-check`, `bun run lint`, `bun test --ci --isolate src/`,
`bun run build`, plus the four budget scripts.

---

## Phase 0 — Baseline

The tree did not build its own tests: `supabase/migrations/` had drifted from
`foodshare-backend/supabase/migrations` by one file, and the migration contract
test caught it. 1015 uncommitted files were landed in seven domain-grouped
commits, because an unformatted tree makes every later diff unreadable.

**Gate:** the migration re-sync was the only fix needed.

---

## Phase 1 — User-visible correctness

| Defect                                                                  | Symptom                                                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `getUserProducts` read `posts_with_location` (`WHERE is_active = true`) | A listing you hid vanished from `/my-posts` permanently; the Inactive filter could never match |
| `String(profile.location)` on the public profile                        | Rendered the literal text `[object Object]`, and published a member's home coordinates         |
| `getAdminUsers` filtered by role _after_ pagination                     | `?role=admin` returned an empty page with a non-zero total; admins sat on page 13              |
| `getEventDistribution` returned hard-coded numbers                      | Fabricated chart on a shipped admin dashboard                                                  |
| `getAnalyticsSummary` catch returned `success: true` with zeros         | A database outage rendered as a healthy empty platform                                         |
| `reviews(*)` embedded and never read                                    | Every product view transferred every review row, notes included                                |
| `calculateAggregateRating` averaged only 4★ and 5★                      | Reported 4.6 for nine 1★ and two 5★ — the manual-action risk Google penalises                  |
| Home feed reads shipped as Server Actions                               | A POST, so every page of infinite scroll spent one of the 30/min _write_ rate-limit calls      |

New database functions: `get_post_rating`, `get_post_engagement_totals` — both
aggregate in Postgres instead of transferring rows to sum columns.

---

## Phase 2 — Exposure

| Defect                                                                                                                       | Consequence                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles` had `USING (true)` + an `anon` grant on all tables                                                                | Every member's email, phone, birth date, home coordinates and **live email-verification code** readable with the public anon key. The code is what `api-v1-auth` compares to confirm an address. |
| `log_audit_event` unbound, `get_user_post_activity_summary` unbound                                                          | anon could append fabricated rows to the audit log an admin reads as genuine                                                                                                                     |
| `views`, `telegram_user_activity`, `forum_post_history`, `forum_comment_history`, `translation_analytics` all `USING (true)` | Per-user browsing history; Telegram behavioural profiling; removed forum content surviving verbatim forever                                                                                      |
| Rate limiters were `null` without Redis, and the deploy never passed it                                                      | **No rate limiting in production**, indistinguishable from having it. Credential stuffing and reset-password mail relay were unthrottled.                                                        |
| `PublishPort=3000:3000`                                                                                                      | Origin on `0.0.0.0`: `X-Forwarded-For` rotated every IP-keyed limiter and the reputation ban                                                                                                     |
| crm / newsletter / admin-email actions checked for a _session_, or nothing                                                   | The role was enforced only by RLS one layer away — defence in depth with nothing underneath                                                                                                      |

The `profiles` fix is the one that needed design rather than a patch: RLS cannot
restrict columns, so `profiles` became owner-or-admin readable, a
`profiles_public` view carries the publishable columns with the location floored
to an ~11 km cell **in the database**, and the three public read paths moved to
it. Every edge function and both mobile apps use the service role, which
bypasses RLS, so nothing they read changed.

---

## Phase 3 — Weight

The first-load floor was 453 KB gzip on all 70 routes, including `/privacy`.
Four things in the root layout's dependency graph did not belong:

- `lib/utils` re-exported the security barrel, reaching the browser Supabase
  client through `lib/security/mfa`
- the toast provider imported framer-motion for a fade
- the `@/hooks` barrel — unshakeable, because `lib/supabase/client.ts` has a
  module-scope `Proxy`
- `useAuth` in the navbar, subscribing to auth state the server had already
  resolved and passed in as props

**Floor: 453 KB → 377 KB gzip.** Two of the largest remaining chunks are the
React and Next runtimes (135 KB gzip) and are not reducible from here.

`scripts/check-bundle-size.ts` was rewritten: it measured the whole build
against a total, so adding 200 KB to every page passed as noise. It now measures
per-route raw and gzip, the shared floor, and render-blocking CSS — with the
budgets as committed constants, because a budget derived from the artifact it
checks cannot fail.

Also: `partialPrefetching` enabled, the `webpack` callback deleted (the build
runs `--turbopack`, which ignores it), three Sentry options removed that are not
keys of `SentryBuildOptions` in 10.71, 25 self-referential `hreflang` tags gone,
and 19 `NEXT_PUBLIC_*` build args restored — without which GA4, push
notifications, site verification and two OAuth providers were silently off in
production.

---

## Phase 4 — Language and access

- **69 translation keys existed in no catalogue** and rendered as their own key
  path in all 21 locales, on the product detail page among others. Invisible to
  `translations:check` because its reference _is_ `en.json`; the check now also
  walks `src/`.
- **The proxy never read `Accept-Language`.** It wrote `locale=en` on a
  visitor's first request, so a German browser got an English server render for
  the whole session and a silent post-hydration swap.
- **The main nav menu was mouse-only** — `role="menuitem"` divs inside a Radix
  `DropdownMenuContent`, outside the collection Radix drives roving focus over.
- **Every default button failed WCAG AA** at 3.61:1. Dark mode needed the
  opposite fix, because `--primary` is both a button background and the colour of
  224 `text-primary` call sites, and those want opposite things on a dark page.

---

## Phase 5 — The cache table was decorative

- **248 `invalidateTag` call sites and a `cacheLife` profile table** fed a cache
  that had no entries. Ten public reads — products, product ratings, nearby
  posts, challenges, public profiles — now carry `'use cache'` with a tag and a
  lifetime, so the invalidation calls finally have something to invalidate.
- **Cached reads that returned a placeholder on failure were the worst bug in
  the phase.** The build-environment stub existed to survive a missing
  `NEXT_PUBLIC_*`, and inside `'use cache'` a prerendered segment will bake that
  placeholder and serve it to real users. It is now forbidden there.
- **`process.env.NEXT_PHASE` is inlined into the server bundle**, so the stub
  could not be told apart from a real environment. `src/lib/build-env.ts` now
  checks only `SKIP_ENV_VALIDATION`.
- **`bun run build` now requires the database.** That is the honest state: a
  build that can silently produce a site full of placeholders is not a build.
  `scripts/check-build-network.ts` fails with an actionable message instead.

## Phase 7 — The nav was translated only in the catalogue

- **`en.json` had the keys; the components did not use them.** The main
  navigation rendered English literals on every locale, and the language
  settings page listed language names it had no translations for.
- **The reference scan was the reason nobody noticed**: `translations:check`
  validated `en.json` against itself, so a key nobody referenced looked healthy.
  It now walks `src/` for referenced keys as well.

## Phase 8 — RTL: the primitives, and a guard that earns its keep

- **Arabic was nominally supported and structurally LTR.** 729 physical-direction
  utilities across 192 files, with `rtl:` variants in two. The dialog and drawer
  close buttons sat top-left, the vertical scrollbar's border was on the wrong
  side, the search magnifier sat left of its input, and select/dropdown
  chevrons pointed the wrong way.
- **All 24 shared primitives in `ui/` and `ui-library/` are now direction
  correct**, so every modal, menu, select, card and breadcrumb follows the
  document direction with no per-locale markup.
- **The other 405 are pinned, not fixed.** A blind mechanical swap of 405
  occurrences is a silent visual regression that no green build can see, so the
  gate holds the primitives to zero unconditionally and ratchets everything
  else to a committed baseline. Failing all 405 on day one would have meant
  deleting the guard within a week; failing none would have meant not shipping
  it.
- **The guard was wrong three times before it was right**, and all three are now
  tests: it read doc comments (failing over `ml-auto` in a `kbd.tsx` usage
  example), it truncated tokens (`ml-0.5` reported as `ml-0`), and it flagged
  the centring idiom and side-keyed maps, where a physical side is correct.

---

## Phase 9 — Class names are strings, and nothing here could check one

- **`@tailwindcss/typography` was not a dependency.** The forum passes 30
  `prose*` classes to its rich-text viewer, so headings, lists, blockquotes and
  code blocks all rendered with browser defaults. Installed and wired.
- **`animate-pulse-ring` was defined nowhere.** Every avatar drew its ripple
  with it — a 300%-wide coloured disc, clipped, sitting still. The keyframe did
  not exist in the project at all.
- **`font-display`, `font-heading` and `font-body` are not registered.** Eight
  call sites across foodlytics, the shared card and the volunteer cards, so
  every one of those headings fell back to the body face by accident. Declared
  as aliases of Geist rather than inventing a typeface the app does not ship.
- **31 call sites used `glass-panel` and five hover glows** that no `@utility`
  declared, so those cards had no glass and no hover feedback.
- **Four Tailwind v3 spellings** — `bg-gradient-radial`, `bg-gradient-conic`,
  `blur-0`, `resize-vertical` — each rendering as nothing at all.
- **Twenty colour shades that do not exist** (`text-rose-450`, `text-stone-350`,
  `bg-emerald-455`), each already sitting beside a real shade doing the work.
- **`text-rausch-500` on a radio** named a palette never defined _and_ set a
  property a radio does not read, so it was a no-op twice over.

`scripts/check-classes.ts` compiles the stylesheet and reports referenced
classes that emit no rule. Its baseline is **0 across 2,616 classes**, so any
new dead class fails the build.

## Phase 10 — RTL, finished

729 physical utilities across 192 files, two `rtl:` variants, and Arabic
structurally LTR. **It is now 0**, with a baseline of 0 and 2,619 classes
verified to emit.

It took five steps, each only possible because the one before it made it safe.

1. **The shared primitives**, held to zero unconditionally. A physical side in
   `ui/dialog.tsx` is wrong in every modal at once.
2. **The mechanical half** — spacing, alignment, borders, radii, symmetric
   insets, corner-offset pairs, and the field adornments that are always a
   leading icon beside an input whose padding is already `ps-*`.
3. **The guard's own blind spots.** It could not see negative insets or
   arbitrary values, so it reported the corner-offset sweep as clean while the
   count never moved. A ratchet that cannot see what it counts is worse than
   none, because the number stops moving and everyone reads that as progress.
4. **The half-converted adornments** — a container reserving logical padding for
   a glyph anchored physically. This is the defect neither a class scan nor a
   codemod can see, because the two classes are on _different elements_ and only
   their parent connects them, so `check:adornments` walks the TypeScript AST.
   Fourteen instances, including every password-reveal button in the app and the
   magnifier in the component the other twenty were modelled on.
5. **The per-instance judgement calls**, written down individually: a dropdown
   anchored to its trigger's inline end, a badge whose `rounded-tl` has to move
   with it, accordion chevrons and the direction of their hover nudge, two
   half-converted drawers whose transform had to follow the locale.

Twenty-five uses remain in five files, each allowlisted with a reason: a
touch-driven card deck whose geometry follows a fingertip, a donation form's
gradient field, a card's corner wash with no logical form of `translate-x` to
pair it with, a theme preview's sun and star field, and a select item's
side-keyed ternary.

### The six idioms the guard learned to forgive

Each was added because the guard reported a component that was already correct.
A guard that reports correct code is a guard that gets switched off.

1. `left-1/2 -translate-x-1/2`, and its arbitrary-value spelling
   `left-[50%] translate-x-[-50%]` — centring, where swapping either half moves
   the element.
2. An inset agreeing with a same-side slide animation, or with a side name it is
   compared against — including the whole ternary, tried _before_ the looser
   two-argument form, which eats the condition and leaves the `else` arm to be
   reported.
3. A corner-_named_ placement, `"bottom-right": "right-0"` — a toast in the
   bottom-right corner is bottom-right in every locale; that is what the name
   means.
4. A directional transform with an explicit `rtl:` override beside it — the base
   is physical on purpose, and the override is what makes it correct in both.
   Two patterns, because one of the three accordions has the signs reversed.
5. A transform nudged on both axes — optical centring of a mark that does not sit
   square in its box. A glyph does not move when the document mirrors.
6. A transform inside a _runtime_ direction branch — `getLocaleDirection(…) ===
"rtl" ? "translate-x-8" : "-translate-x-8"`. Tailwind has no logical form of
   `translate-x`, so a conditional is the only correct answer there.

### The lightbox stopped being a product decision

`handleTouchEnd` computes `diff = touchStartX - touchEndX`, so a leftward swipe
already called `goNext` while the arrow on the left was `goPrev` — a swipe and
its own arrow disagreeing. Mirroring them settles it: next on the start, prev on
the end, each chevron mirrored so it keeps pointing where it goes. A swipe is a
physical gesture in every locale; what should follow reading direction is which
control sits where.

---

## Phase 11 — The preflight's own remedy did not run

`check-build-network.ts` told you to trust the certificate explicitly. Following
that advice threw `ERR_INVALID_PROTOCOL`, because the branch chosen by the
`http:` target still called `https.request` — the fix for the diagnosis was
itself broken. That is why this is a phase and not a patch: the diagnostic was
lifted into a pure `diagnose(secure, insecure)` with every side effect behind
`import.meta.main`, so both outcomes became unit-testable without touching a
network. It now probes twice, which is the only way to tell _no TLS handshake at
all_ from _a TLS handshake nobody trusts_ — the two look identical to a single
call, and this session's entire earlier diagnosis rested on confusing them.

---

## Phase 12 — An adornment is a promise about space

`scripts/check-adornments.ts` catches the family where a _logical_ padding sits
beside a _physically_ anchored glyph: `ml-2` on an icon that stays on the right
in RTL, a `pr-` beside a chevron that never moves. The rule is `reservesFor(side,
leading, trailing)` — an adornment gets padding on its own side unless the
padding is symmetric, in which case there is nothing to get wrong. Baseline 0,
13 tests.

---

## Phase 13 — 2,250 strings that were never going through the catalogue

`check:i18n-text` reports JSX text nodes that are not routed through `t()`.
This is the other half of "supports 21 languages": a hardcoded `>Save<` renders
as "Save" in all 21, and `translations:check` cannot see it, because a hardcoded
string is not a key anyone referenced.

Two filters had to be fixed before the number meant anything:

- the proper-noun rule `^\p{Lu}?\S*\p{Lu}\S*$` matches **every** capitalised
  English word, so it was silently excluding the single-word majority of exactly
  what the guard exists to find;
- comment stripping replaced `//` with nothing instead of blanking to end of
  line, so every physical utility named in a comment was reported as a class.

Baseline 2,250 across 245 files, recorded **per file** so any file can only
shrink.

---

## Phase 14 — A worklist, and the first batch

The report is the wrong shape to hand to anyone doing 2,250 of these. A human
needs the strings grouped by file, deduplicated, in something they can edit, with
a stable name for each so a key can be agreed before it is written. `--worklist`
emits that.

The first batch went through it on the sign-in surface: six keys in an `Auth`
namespace, translated into all 20 non-English locales. The per-locale budget
ratchet put all twenty one over the moment the keys landed in `en.json` alone —
which is the correct response, and the reason a batch is a namespace and twenty
translations rather than six strings.

`PasswordStrength` was deliberately left. It renders a `strength.label` prop, so
translating its label without the caller would be half a translation that reads
as done.

---

## Phase 15 — `/help`, end to end

The highest-traffic public page, and the richest case: 47 keys, a FAQ array that
had to move inside the component to be translatable, JSON-LD that had to carry
the same localized strings or it would advertise English questions to a German
crawler, and links inside sentences.

Links inside a sentence cannot use interpolation — `TranslationValues` is
`string | number | Date` — so they go through `t.rich` with tags in the ICU
message, which also means the link's own text lives in the message and follows
the word order of the language instead of being pinned to English.

The budget ratchet earned its place again: it caught Czech, the one locale the
seed script missed, with `+47` and the exact keys.

---

## Phase 16 — Metadata is part of the page

Once the body was German, `<title>Help Center</title>` was the only English left
on the page, and it was the part search engines read. `generatePageMetadata` now
takes a `locale` and maps it to OpenGraph's `language_TERRITORY` form via an
explicit table — the territory is a choice (Portuguese and Chinese both have
several defensible answers), so it is written down rather than computed, and a
test fails if a shipped locale is missing from it. Removing one entry was
confirmed to fail.

`/help` resolves its own title and description through `getTranslations()` inside
`generateMetadata`. Keywords stay English on purpose: they are an indexing hint,
not visible copy.

---

---

## Phase 17 — The build blocker was three bugs, not a network

The endpoint genuinely does not speak TLS to this network — that diagnosis was
correct and still is. What was wrong was the conclusion drawn from it: that the
build therefore _cannot run_. It can, and three separate things were true at
once.

1. **`/api/products` read no request.** A handler that takes no `request` and
   touches no dynamic API is fully static, so Next evaluates it during the
   build — which is what made the build need the database. Reading
   `request.url` is the switch `cacheComponents` allows (`export const dynamic`
   is rejected outright), and it is the one `api/listings` and
   `api/map/locations` already use. The same handler queried
   `post_type = "latest"`, which is not a `post_type` at all, so it had been
   answering `data: []` to every caller.
2. **`/product/[id]` fetched the build stub.** The page refuses to fetch the
   sentinel id `0` and says so in a comment — but `generateMetadata` ran first
   and fetched anyway. The stub exists to make the build network-free;
   metadata undid it.
3. **The preflight gated on a premise the code had already falsified.** It
   assumed `next build` prerenders every route and therefore fetches. With
   `cacheComponents` on, every data-bearing route is emitted as a partial
   prerender — a static shell plus a dynamic hole — and holes fill at request
   time, not build time.

With 1 and 2 fixed, and the gate removed: **114/114 static pages, zero fetch
errors, endpoint unreachable the whole time.** The gate is now
`bun run check:build-network`, a diagnostic rather than a lock on the door.

Two numbers the plan could previously only assert:

- **The static shell really is empty.** `/help` prerenders a 4,874-byte HTML
  file whose body is 703 bytes and **78 visible characters** — the skip link and
  a hydration script. That is item 3 below, now measured rather than inferred.
- **The CSS budget, for the first time.** `bun run build:check` ran and passed
  three of four budgets; global CSS is **488 KB raw against a 460 KB budget**,
  63 KB gzip, render-blocking on every one of 70 routes.

---

---

## Phase 18 — The CSS budget was measuring the wrong thing

`build:check` ran for the first time after the build was unblocked and failed one
budget: global CSS at 488 KB against a 460 KB ceiling. The number was wrong.

The check summed every CSS chunk in `.next/static/chunks`. But with partial
prerendering, most of those chunks are route-specific — linked by a handful of
pages, loaded by nobody else, and not render-blocking anywhere near "every
page". Measuring the union overstated the first-load cost by 27 KB: the actual
global sheet, the intersection of what every prerendered page links in `<head>`,
is 460.4 KB.

The fix is the intersection across prerendered pages, excluding
`_global-error.html` (the error boundary links no stylesheets and would empty
the intersection). `globalCssFiles` is extracted as a pure function and gated
behind `import.meta.main` so it can be tested without a build; mutating it back
to a union fails three of its seven tests.

The budget stays at 460 KB. What changed is that the number now means what the
label says, which is the only reason to have the number.

---

## Phase 19 — The homepage was showing three hardcoded numbers

The hero advertised `1,000+` listings, `500+` food rescued and `100+`
communities. None of them was a measurement; all three were typed into
`src/app/page.tsx`, and the first one had been there long enough to look
believable. On a platform with 41 active listings the hero was wrong by a
factor of 25, which is the sort of claim that draws exactly the attention —
from a manual action, not from a customer — that no amount of design can
then walk back.

| Fix                                        | Detail                                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPublicStats()` / `getCategoryCounts()` | `'use cache'` on the anon client, one head-count per aggregate in parallel — so the highest-traffic route does not put a dozen count queries on every request     |
| `profiles_public`, not `profiles`          | The anon role cannot read `profiles` since the Phase 2 exposure fix; counting the public projection is the same number and does not read as a healthy "0 members" |
| Compact formatting via `Intl.NumberFormat` | Built from the resolved locale, so a German hero and an Arabic hero agree on the unit and do not disagree on the separator                                        |
| Hero degrades, page does not               | Stats and counts are wrapped separately: a failed count removes the stats band and keeps the feed, which is the reason a visitor is there                         |

The categories grid names its categories through the **existing**
`categories` namespace rather than new strings, so the navbar and the
homepage cannot drift into calling the same thing by two names — and the
homepage inherits 20 locales of translations it did not have to write.

**A guard found the parts of the copy it can see, and not the rest.** The
`premium-*` components and the hero brought 9 hardcoded strings; the text
guard caught them, so they went through a new `Home` namespace translated
into all 20 locales. It could not see `aria-label="Mobile navigation"`,
`aria-label="Loading"` and `aria-label="Close"` — attributes are not text
nodes, and all three are read aloud by a screen reader. Those are now
required props, which means the compiler refuses a caller that has no
translation, instead of a default that is wrong in 20 of 21 locales.

### The typography plugin cannot be scoped, and the guard said so

Global CSS went 460 → 484 KB and the budget failed. The Phase 18 note named
the lever: the typography plugin is 35 KB of the sheet, and only 6 of 70
routes can ever use it.

Moving `@plugin "@tailwindcss/typography"` into a stylesheet imported only
by the content pages **does not work**, and the reason is worth writing
down because it is not obvious. The directive is only honoured in the
Tailwind entry. In a route-level CSS file it emits nothing at all, and
every `prose-*` variant renders unstyled — silently, on six routes, with a
green build. `check:classes` caught it as 7 dead classes, which is the
guard earning its keep on the one change that would have shipped a visual
regression. The sheet is also global because Tailwind v4 emits one
stylesheet for the whole app, so homepage-only classes land in it
regardless; there is no per-route split to move them to.

So the ceiling moved instead — **460 → 495 KB**, once, with the reason
recorded at the constant. The growth is measured: by utility family the
sheet's two largest groups are gradient stops (`from-*`/`to-*`/`via-*`,
105 KB, 23%) and `shadow-*` (25 KB), and those two groups are essentially
the whole increase. It is the design, not waste in it. The next person
wanting CSS back should take the **65 unique `shadow-[…]` arbitrary
values that predate the homepage** — the larger and more tractable target —
rather than this number.

---

## Phase 20 — `/privacy`, the template

39 hardcoded strings across ten sections, and the shape every legal and
content page should now take.

The English source numbered its headings inside the copy — `1. Information We
Collect` — and translating that literally would have pinned the numbering to
English. Several locales reorder or renumber sections, and the moment a
translator drops the number because their language does not do that, the
headings silently lose their cross-references with no error anywhere. So the
number is not a string: `SectionHeading` renders it beside the message, and
the 42-key namespace carries `Information We Collect` alone. A reading aid
over the document structure stays a reading aid, in every locale.

`<title>` and the meta description resolve per request through
`getTranslations("Privacy")` inside `generateMetadata`, the `/help` pattern
from Phase 16. Verified against a running server rather than assumed:

| Locale | `<title>`                           | Body                           |
| ------ | ----------------------------------- | ------------------------------ |
| `en`   | `Privacy Policy \| FoodShare`       | 2,790 visible chars            |
| `ja`   | `プライバシーポリシー \| FoodShare` | Japanese body, Japanese footer |

## Phase 21 — `/terms`, and the first link inside a sentence

Same shape, 24 strings, and the case Phase 15 predicted: "the first legal
with a link inside a sentence ("Please review our Privacy Policy"), which

A link inside a sentence **cannot** be an interpolated string —
`TranslationValues` is `string | number | Date`, so there is nowhere to put a
component. It goes through `t.rich` with the tag in the ICU message. What that
buys is only visible once the link text follows the _language's_ word order
rather than English's, so it is worth recording what the server actually
returned:

```
en  Your privacy is important to us. Please review our Privacy Policy
    to understand how we collect, use, and protect your information.
de  Ihr Datenschutz ist uns wichtig. Bitte lesen Sie unsere
    Datenschutzerklärung, um zu erfahren, wie wir Ihre Informationen
    erheben, verwenden und schützen.
ar  خصوصيتك مهمة لنا. يرجى مراجعة سياسة الخصوصية لفهم كيفية جمع
    بياناتك واستخدامها وحمايتها.
```

The German link sits before _zweck_ and after _lesen Sie unsere_ because that
is where the German sentence puts it. Interpolated, it would have been welded
between two English fragments and read wrong.

**Both namespaces are structurally verified**, not just translated: every one
of the 21 locales has an identical key set to `en.json`, every locale's
`privacy_link` carries exactly the one `<privacy>` tag, and no value anywhere
equals its own key path — the state next-intl renders as the literal string
`Terms.s6_body` on screen.

Two real defects surfaced while writing the translations, both invisible to
every guard in this file, and both caught by scanning the catalogue for script
boundaries rather than by reading it: an English _thereby_ had landed inside
an Arabic sentence, and `id` had picked up `RELATED热衷penipuan` — latin, a
stray CJK glyph, and an Indonesian word, spliced into one token. `de`,
`fr`, `ru` and the rest were fine. A translation error is invisible to a build,
to `tsc`, to the budget and to the test suite; a machine translation and a
human one are both "non-empty string" to everything the repo can check.

---

## Phase 22 — `/donation`, and the guard the i18n text ratchet could not see

25 keys in a `Donation` namespace, 21 locales, the `/help` metadata pattern —
and two defects on the page that asks for money, neither of which was a
translation problem.

### The page asked for money with a fabricated number and a false tax claim

| Was                                            | Now                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `1,000+` "Lives Impacted", typed into the page | `getPublicStats().members`, formatted for the resolved locale                            |
| "Tax Deductible" as a trust indicator          | `FoodShare Club Ltd, UK 14023669` — a registration number anyone can look up             |
| `1,000+` and `100%` and `Zero`, all literals   | one measured, one stated policy, one stated goal — and the goal says "Goal" in its label |

FoodShare is FOODSHARE CLUB LIMITED, UK 14023669 — a registered **company**. UK
donor tax relief, Gift Aid, is only available when the recipient is a registered
charity or a CASC, and this is neither. So "Tax Deductible" was a false claim, on
the one page whose entire purpose is to be believed about money. It is replaced
by the company number, which is a _stronger_ signal than the claim it replaces:
one asks to be believed, the other can be checked at Companies House in ten
seconds. The other two figures were left alone deliberately — `100%` is a
statement about how money is spent, and `Zero` is a goal that says "Goal" in its
own label. A page that blurred that line would be committing the defect it had
just fixed.

The measured card is typed so that a card showing a figure **cannot** be built
without deciding where the figure comes from: `kind: "symbol" | "word" |
"measured"`, and only the last reads the database. `symbol` exists because
`100%` needs no key in any locale and `Zero` needs one in all of them, and
conflating them was the original bug's shape.

### `check:i18n-text` is blind to exactly this

The guard requires `/\p{L}/u` in a JSX text node. `1,000+` has no letters, so
the fabricated number was **invisible to the guard built to find hardcoded
copy** — while `Zero`, three lines below it, was reported. That asymmetry is
the finding: a number presented as a platform measurement is worse than a
mislabelled string, and the text ratchet is structurally incapable of seeing
one. The test that now covers it lives in
`src/__tests__/i18n/donation.test.ts` and matches a numeric literal rendered
between tags — narrow on purpose, because "a number in JSX" on its own is a
phone number half the time.

### Two directories of copy, and a page that renders it

`DonateButton`'s `label` is a **required** prop, not a defaulted one: a
`label = "Donate Now"` default is English in 20 of 21 locales, and the type is
`string`, so the page builds and the string is wrong for every reader who did
not ask for English. The three impact cards were three hand-copied JSX blocks
differing only in colour; they are one component driven by an accent table, so a
card cannot pick up a hover glow that does not match its own top border.

`makeCompactFormatter` and `formatFoodSaved` were module-local functions in
`src/app/page.tsx`; they are now `src/lib/numbers.ts`, because `/donation` needs
the identical formatter and two copies of `new Intl.NumberFormat(locale, …)` are
two places for the separator convention to drift. `formatFoodSaved` documents
why the _unit_ is not translated: SI symbols are the same in every locale
precisely so a mixed-script document stays unambiguous, and translating them
would be wrong rather than inclusive.

Verified by rendering, not by screenshot — `next start` answers **503** here
because `src/proxy.ts` refuses traffic without Redis configured, which is the
correct production posture and the wrong tool for checking a string:

```
de  FoodShare unterstützen · Heute etwas bewegen
    Jeder Kaffee rettet eine Mahlzeit
    Direkte Wirkung · 100%        1.234  Mitglieder bei FoodShare
    Null   Ziel: keine Lebensmittelabfälle
    FoodShare Club Ltd, UK 14023669 · Tarlan Isaev, Gründer
    Auf Ko-fi unterstützen · Jetzt spenden · Mehr über uns
```

`1.234`, not `1,234` — the German separator, because the formatter is built from
the resolved locale rather than hardcoded.

### A guard for output, not for code

Every guard in this file checks a property of code. `scripts/check-catalogue.ts`
checks a property of **the 947 strings a reader sees**, and it exists because
Phase 21 found two real defects by hand: an English _thereby_ inside an Arabic
sentence, and `RELATED热penipuan` in `id` — latin, a stray CJK glyph and an
Indonesian word spliced into one token. A translation error is invisible to a
build, to `tsc`, to the budget and to the suite; a machine translation and a
human one are both "a non-empty string" to everything the repo can check, and
`translations:check` only asks whether the key exists.

| Rule                   | Catches                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `wrong-script`         | Russian prose in the Thai catalogue — 32 of the 36 baseline findings                                         |
| `stray-latin`          | a Latin word inside non-Latin prose, after tags, ICU args, units and addresses                               |
| `foreign-script`       | the inverse: a non-Latin character inside a Latin-script locale — how the `id` defect hid from `stray-latin` |
| `identical-to-english` | an English sentence in another locale, **byte for byte**                                                     |
| `self-key`             | a value that is its own key path, which next-intl renders literally                                          |
| `unbalanced-*`         | quotes, brackets, rich-text tags — a spliced edit, and a `t.rich` that throws                                |

`identical-to-english` is the one that matters most, and it is not a script rule.
German, French, Spanish, Italian, Portuguese, Dutch, Polish, Czech, Swedish,
Indonesian, Vietnamese and Turkish are **all** Latin script, so
"Every Coffee Saves a Meal" in `de.json` is a perfectly well-formed Latin string
and no character-class check will ever see it. The signal is equality instead of
vocabulary, because an untranslated value is almost always a copy; a stopword
heuristic was the obvious alternative and is not worth it, since "a" is a word
in four of those languages and "in" in six, and any threshold short of absurdity
reports correct translations.

**It found 36 real problems on the day it landed**, all of them untranslated
English that `translations:check` scores as complete: the whole of
`ForgotPassword`, `Maintenance` and `Reports` is still English in `th`,
`Common` in `th`, and `categories.zerowaste` in `cs`, `de`, `es`, `id`, `it`,
`nl`, `pl`, `pt`, `sv`, `vi`. Those are the baseline. The gate is a per-namespace
per-rule ratchet, so each can only shrink, and a namespace written this phase
sits at **zero**.

Five rules were narrowed because they reported correct code, which is the
documented way a guard gets switched off: `cookie` is Latin in Russian,
Ukrainian, Japanese and Chinese; `Apple`/`Facebook`/`Google` are trademarks;
`Foodlytics` is the product's own name; `km` and `kg` are SI symbols; and
`Chat.edited` is legitimately the string "edited" — so `self-key` matches the
full dotted path and not the bare leaf, because nobody writes "edited" as a bug
report and everybody has pasted `Chat.edited` by accident. `{count} items` is
one Dutch word, not two, so ICU arguments do not count towards the
word-count threshold.

Mutation-tested: replacing two German values with their English originals fails
the gate naming both keys, and restoring them passes.

### The `getTranslations` mock is hand-written, on purpose

`src/__tests__/components/DonationPage.test.tsx` renders the real component
through `renderToStaticMarkup` with a `getTranslations` resolved from the real
merged catalogue. The obvious version — delegating to next-intl's own
`getTranslations` — is unreachable in a unit test: it reads the locale from a
request context that exists only inside a Next render, and under bun's resolver
`next-intl` resolves to its `react-server` entry, where `createTranslator` is a
type rather than a value. The mock's **missing-key branch returns the key**,
which is exactly next-intl's documented `getMessageFallback` and exactly what
this page used to look like; a stub returning `""` would have made every
assertion pass for the wrong reason.

---

## Phase 23 — An accident, and the cost of a `git checkout` I should not have run

Not a defect found. A mistake made, recorded because the plan's value has been
honest accounting and this belongs in it.

While reverting my own edit to `messages/`, I ran `git checkout -- messages/`.
The intent was to undo one file's change; the command reverted **all twenty-one**,
destroying the uncommitted Phase 19–21 translation work — the `Home` (31 keys),
`Privacy` (42) and `Terms` (25) namespaces, roughly 1,995 strings across 21
locales. `git fsck` and the Next build cache held no copy; nothing had been
committed.

Recovered in full: the English source for all three was verbatim in the session,
and the twenty translations were rewritten under `scripts/check-catalogue.ts`'s
predecessor, which is why that guard exists in the shape it does. Every locale
returned to **exactly** its pre-loss missing-key count, so `translations:check`
is byte-for-byte where it was.

Three things changed as a result, and all three are the reason the phase is
worth more than the translations it was recovering:

1. **Insertion is textual now.** A `JSON.parse`/`stringify` round trip hoists
   the integer-like key `"0"` to the top of the file, silently reordering every
   catalogue. That is why the recovered namespaces produced a 2,793-line diff
   for 525 keys of content the first time it ran, and a 2,184-line one after.
2. **The validator is a module, not a script.** `scripts/lib/catalogue-batch.ts`
   exports `validate()` so the gate and the batch installer run the _same_ rules.
   It caught eleven real corruptions in my own recovery output on first run —
   five Japanese strings, two Arabic, one Korean, one Indonesian, one
   Ukrainian — none of which any other guard in this file would have seen.
3. **The rules were hardened by what they falsely reported**, which is the
   Phase 10 lesson applied to translation: the first version flagged a company
   registration number that is _supposed_ to be identical everywhere, and the
   fix was an exemption with a reason, not a deleted rule.

The lesson is not about git. It is that **the tree was carrying 1,995 strings of
uncommitted work with no other copy**, in a repository whose entire thesis is
that loss should be recoverable. Committing the translations is the actual fix,
and Phase 24 should not be started on a tree that has just been rewritten once.

---

A guard that has never been seen to fail is a guess. Every one of these was
checked by breaking the thing it protects and confirming the build fails:

| Guard                                                | Catches                                                                                                                                                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-bundle-size.ts`                       | a route growing 50%                                                                                                                                                                           |
| `src/__tests__/migrations/rls-privacy.test.ts`       | `USING (true)`, `TO anon USING (true)`, a re-opened table, a `CREATE` after a `DROP`                                                                                                          |
| `scripts/check-translations.ts`                      | a key referenced in code and in no catalogue                                                                                                                                                  |
| `scripts/check-build-args.ts`                        | a `NEXT_PUBLIC_*` read with no build arg                                                                                                                                                      |
| `scripts/check-contrast.ts`                          | a token pair below WCAG AA                                                                                                                                                                    |
| `src/__tests__/actions/admin-authz-ordering.test.ts` | a removed guard, or one moved after the first call                                                                                                                                            |
| `src/__tests__/components/MenuItem.test.tsx`         | the menu item reverted to a `div`                                                                                                                                                             |
| `src/__tests__/lib/cache-invariants.test.ts`         | a cached read touching the session, dropping its tag or lifetime, or a build placeholder inside `'use cache'`                                                                                 |
| `scripts/check-rtl.ts`                               | a physical direction utility in a shared primitive, or any growth in the committed baseline                                                                                                   |
| `src/__tests__/lib/rtl-check.test.ts`                | the RTL guard itself: a rule that stops firing, and a doc comment that starts failing the build                                                                                               |
| `scripts/check-classes.ts`                           | a class name that emits no CSS at all                                                                                                                                                         |
| `scripts/check-adornments.ts`                        | logical padding beside a physically anchored glyph                                                                                                                                            |
| `scripts/check-i18n-text.ts`                         | a JSX text node bypassing the catalogue, or any file gaining one                                                                                                                              |
| `scripts/check-catalogue.ts`                         | an English sentence left byte-for-byte in another locale — including the 12 Latin-script ones no script rule can reach                                                                        |
| `src/__tests__/i18n/donation.test.ts`                | a JSX numeric literal rendered as a platform figure; a non-English locale holding the English string; a dropped registration number                                                           |
| `src/__tests__/components/DonationPage.test.tsx`     | the page rendering its own locale — de, ja, ar, ru, zh, en, and the German thousands separator                                                                                                |
| `scripts/check-build-network.ts`                     | — (probes live network; its pure `diagnose()` is tested instead)                                                                                                                              |
| `src/__tests__/lib/metadata-locale.test.ts`          | a shipped locale with no OpenGraph territory, so it would silently advertise `en_US`                                                                                                          |
| `src/__tests__/lib/build-network-check.test.ts`      | the build preflight itself: a diagnosis that stops distinguishing the two failure modes                                                                                                       |
| `scripts/check:classes` (Phase 19)                   | the typography plugin moved out of the global sheet: 7 `prose-*` variants that would have rendered unstyled on 6 routes with a green build                                                    |
| `src/__tests__/lib/catalogue-check.test.ts`          | a flat root key reverted to English — the one class of finding the guard had never seen — and the report staying readable at 5,328 findings                                                   |
| `scripts/check-locale-coverage.ts`                   | a shipped locale's share of byte-identical values rising at all: a reverted catalogue, a bad merge, or a locale added untranslated                                                            |
| `src/__tests__/lib/locale-coverage-check.test.ts`    | the coverage guard itself, and the shapes it must not mistake: missing keys counted as identical, an improved catalogue left un-rebaselined, and a nested leaf read under the wrong container |
| `src/__tests__/i18n/auth-errors.test.ts`             | a Supabase error surfacing as a sentence, two codes sharing one English message, or a code with no key in some locale                                                                         |
| `src/__tests__/components/LoginForm.test.tsx`        | any of the sign-in page's 21 locales rendering an English label — element-wise, so a cognate is exempt and a substring is not                                                                 |
| `src/__tests__/actions/auth.test.ts`                 | `error` ceasing to equal a code, or the raw Supabase message appearing anywhere in the serialised result                                                                                      |

---

## Phase 24 — Nine of the twenty-one locales are English

Not a defect found by reading the catalogue. A blind spot in the guard that was
supposed to have found it, found by pointing the guard at its own input.

`scripts/check-catalogue.ts` iterated `Object.keys(reference)` and kept the
entries whose value is an object. Every namespace qualified. **The 611 flat keys
at the root of `messages/en.json` did not**, because their value is a string —
skipped by a `typeof` test, while being the strings the entire pre-namespace UI
draws from. `password`, `email_address`, `first_name`, `hide_password`,
`forgot_password`, `logging_in`, `cancel`, `loading`, `sending`.

The docstring said the guard checked "the 947 strings a reader actually sees". It
checked 336 of them. **Two thirds of the catalogue had never been in scope**,
and the phrase "a reader actually sees" is exactly what the next person would
have trusted.

Loading the root as a synthetic namespace, `(root)`, adds 5,220 findings across
four rules, baselined per rule as always. The number is not the finding. The
finding is what it adds up to:

| Locale                             | Flat keys identical to English | Of the whole catalogue |
| ---------------------------------- | ------------------------------ | ---------------------- |
| `ar` `hi` `it` `ko` `nl` `pl` `tr` | 467 / 469                      | ~71%                   |
| `sv` `th`                          | 513 / 515                      | ~74%                   |
| the other eleven                   | 7–26                           | 1–4%                   |

**Nine shipped locales have never been translated.** `sv.json` holds 513 of its
515 flat strings byte-identical to English: the sign-in form, the navigation, the
listing filters, the error messages. A Swedish or Turkish or Thai reader gets
the whole product in English, and `translations:check` is green through all of
it, because every key is present. Only the value is wrong.

### Why the finding is a locale and not 4,433 keys

4,433 individual findings is the same 381 keys sitting in the same 13
catalogues. Nobody is going to fix "381 keys in 13 locales" — it is not a task,
it is a symptom. The task is that nine locales are English, so that is what the
report says: one line per locale with a percentage.

`scripts/check-locale-coverage.ts` asks about a **locale** rather than a key, and
the threshold is a majority — above 50% byte-identical, the file is not a
partially-translated locale, it is an English locale with a different name.

The gate is that the share may only fall, and it fires on **any** rise. That is
the durable part: a catalogue is generated, merged and occasionally restored from
somewhere else, and the failure mode is never a mistranslation — it is a whole
locale quietly reverting to English while every existence check stays green.

### The two guards are complementary, and neither has the hole alone

Worth writing down, because the obvious place to put the fix was the wrong one.
`identical-to-english` needs **two words** in the English source, because single
words coincide legitimately: "Restaurant" is "Restaurant" in French, "Status" is
"Status" in German, "Transport" is "Transport" in German. A one-word rule would
report correct German forever, and a guard that does that is a guard that gets
switched off.

So **`de` holding `password: "Password"` is invisible to `check:catalogue`.**
Verified rather than assumed: `de.password` was reverted in a copy of `messages/`
and `check:catalogue` passed it. `check:locale-coverage` failed it, at 3.1%
against a baseline of 3.0% — one key, and the gate does not care how small.

A stopword threshold was the obvious way to close the gap from the catalogue side
and is not worth it: "a" is a word in four of the Latin-script locales and "in"
in six, so any threshold short of absurdity reports correct translations.

### Two bugs the new tests found in the new guard

Neither would have been visible in output. The first version of
`leavesOf` carried the English **value** in the tuple slot that
`measure` indexes with, so every nested lookup missed: the whole namespaced half
of the catalogue reported as **0 present in all twenty locales**, in a table that
looked entirely reasonable, wrong in exactly the one direction a reviewer cannot
check by eye. And `check-catalogue --report` printed one line per finding, which
was right for 108 findings and unusable for 5,328 — so it now groups by
(namespace, rule) and caps the key list at twelve, with `--ns=` to narrow.

Both guards also take `--messages <dir>` and `--baseline <file>`, so a failure can
be demonstrated against a fixture instead of by editing `messages/*.json` in place
during a test run — which is the mistake Phase 23 is about. They honour `NO_COLOR`,
because emitting `[31m` without the escape is not "no colour", it is mojibake in
every log that does not strip it.

### What this does not change, and what it reorders

The 2,110 untranslated strings in the JSX are still there, and Phase 24-as-planned
(the auth flow) is still worth doing — but it is worth _less_ than it was an hour
ago, because a fully localised `/auth/login` in `de` is a page a Swedish reader
still cannot read. **The auth flow now means the flat catalogue keys, in all nine
untranslated locales, before any new key lands.**

---

## Phase 25 — The sign-in page, and the errors it was showing in English

Phase 24 said the next work was the flat keys in the nine untranslated locales.
Surveying the auth flow first turned up something that outranks it: **every error
the auth flow could show was an English sentence**, in all 21 locales, and no
amount of translating the page would have touched them.

`src/app/actions/auth.ts` returned `error.message` — Supabase's own English — on
the response body. `useAuth` filled in `"Login failed"`, `"Registration failed"`,
`"Password update failed"`, `"Password recovery failed"`, `"OAuth login failed"`,
`"Magic link failed"`, `"Apple Sign-In failed"` as fallbacks. `getOAuthSignInUrl`
built `${Provider} sign-in is not correctly configured. Please contact support or
use a different method.` from a template **in the browser**.

And the module written to prevent exactly that — `src/lib/errors/auth.ts`, with
`AUTH_ERRORS` and `getAuthErrorMessage()` and four predicates — **was never called
by anything**. It was re-exported from two barrels and imported by none. A guard
that sits next to the thing it guards, unused, is worse than no guard, because the
next person reads it as proof the problem was solved.

### Codes, not sentences

| Was                                                                                                    | Now                                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `AUTH_ERRORS` — 16 English sentences                                                                   | `AUTH_ERROR_CODES` — 16 identifiers                          |
| `getAuthErrorMessage()` string-matched Supabase's English                                              | `getAuthErrorCode()` maps the same inputs to identifiers     |
| `isNetworkError`, `isAuthError`, `isRecoverableError`, `getErrorSuggestion`, all heuristics over prose | deleted                                                      |
| `error.message` on the response body                                                                   | `error: AuthErrorCode`; the raw message goes to the log only |

The client resolves `AuthFlow.errors.<code>` through `t()`. A Supabase upgrade
that rewords its errors now changes a mapping table rather than the text every
reader sees, and a thrown exception's message — English, arbitrary, sometimes a
stack fragment — is logged rather than rendered.

The four predicates were **deleted rather than deprecated**, and that is the part
worth arguing for: leaving them next to the code table invites the next person to
render `getAuthErrorMessage()` on screen, which is the defect.
`sanitizeErrorMessage()` stayed, with a note that it _redacts_ and does not
_classify_.

Mapping is by lower-cased substring as well as exact match, because Supabase
varies both — some paths return `"Invalid login credentials"` and some with a
full stop. A user-visible code that only resolves for one spelling is worse than
the generic message it replaced.

### The `?error` nobody read

`/auth/callback` has always ended its failure path with
`NextResponse.redirect("/auth/login?error=auth_error")`. **Nothing has ever read
that parameter.** A reader whose OAuth round trip failed — expired link, already
used, state mismatch, provider misconfigured — was returned to a clean login form
with no explanation, and the likeliest explanation is that it looked like their
own mistake.

It renders now, in every locale, from `AuthFlow.errors.oauthFailed`, and it is
cleared from the URL once read: left in place, `?error=auth_error` survives every
reload, so a reader who came back to the tab a week later was told their sign-in
had failed again.

### And the error region announced nothing at all

The alert had no `role="alert"` and no `aria-live`. An error appeared on screen
and nothing said so, so somebody who pressed submit with the keyboard was told
nothing. One live region now covers both the callback failure and the action
failure, so a failed redirect followed by a failed submission cannot announce
twice.

### The 48 keys, and what they cost

`AuthFlow` is 48 keys × 21 locales = 1,008 strings, written flat and dotted and
installed through `scripts/lib/catalogue-batch.ts`, which runs the same
`validate()` the permanent gate runs. Three things came out of doing it that way:

1. **`install()` now nests dotted keys.** It wrote them flat before, so
   `AuthFlow.errors.invalidCredentials` would have been a literal key — and
   next-intl splits on `.` and _descends_, so `t()` would have rendered
   **undefined**. Five namespaces in the catalogue already nest
   (`Reports.reasons`, `languageSettings.presets`, `profile.avatar`,
   `ChallengeReveal.keyboardHints`, `languageSettings.regions`) and none of them
   could have been installed by this tool.
2. **The validator caught a false positive in itself.** `FoodShare.` at the end of
   a Russian sentence came back as one token with the full stop attached, missed
   the allowlist, and was reported as stray Latin in `ru`, `uk` and `ar` — three
   correct translations. The fix was `core()`, which strips trailing punctuation
   before the lookup, at both places the list is consulted. The Phase 23 lesson
   applied to translation quality: **the rule was hardened by what it falsely
   reported, not deleted.**
3. **`check:catalogue` and `check:locale-coverage` now walk nested namespaces.**
   Both read one level deep, so `profile.avatar.*` and `Reports.reasons.*` were
   invisible — the same blindness as the flat keys, one level down. Both recurse
   now, and `check-catalogue`'s namespace-qualification test uses a path lookup
   rather than `key in namespace`, because after flattening, `"reasons.spam" in
Reports` is false and three namespaces had silently dropped out of the guard's
   scope. **A namespace vanishing from a baseline is invisible: there is nothing
   left to fail.**

### Two tests, and what they refuse to accept

`src/__tests__/components/LoginForm.test.tsx` renders the real form through
`renderToStaticMarkup` in all 21 locales with a hand-written `t.rich` that splits
on the ICU tags and calls the chunk functions — next-intl's own `useTranslations`
is unreachable here, and a `t.rich` stub that returned the raw message would render
`<terms>…</terms>` into the markup and the test would assert against literal tags.

Its assertions are **absence**, not presence: for each locale, no rendered
_element_ may have the English string as its whole text. The locale's own value is
asserted too, but absence is the check that bites — a page showing the German
heading and keeping `"Password"` as a label looks translated in a spot check.

Two things that check had to be honest about, both of which read like weakening the
test until you know why:

- **Italian writes `Password`.** So "no English on screen" cannot be the assertion
  for a single word, and a test that said so would either fail on correct Italian or
  have had its thresholds loosened until it passed. `COGNATES` names the exemptions
  and a test pins that `it` really does hold `"Password"` while `de`, `sv` and `th`
  do not — so adding a locale there is a decision, not an accident.
- **Dutch starts a sentence with "Log in".** `Log in om voedsel te blijven
delen…` is idiomatic Dutch, so a substring test reports a translated page as
  English. Hence element-level comparison: what "this label was left in English"
  means is that some element's _whole_ text is the English string.

`src/__tests__/i18n/auth-errors.test.ts` asserts the codes, not the prose — a code
is the contract, the prose is somebody else's copy. It checks that every code
resolves in every locale, that no two codes share an English sentence (`unknown`
excepted), and that `JSON.stringify(result)` never contains the Supabase message.

### The five action tests that caught the contract change

All five asserted `result.error` _equalled_ an English sentence. That is the
correct test of the wrong contract, and it failed loudly rather than passing
vacuously — which is the strongest argument there is for asserting values rather
than `toBeDefined()`. They assert the code now, and each gained a second assertion
that the Supabase message appears **nowhere** in the serialised result.

Verified by rendering, not by screenshot. The `/auth/login` markup in Vietnamese,
which is what the guard was for:

```
FoodShare
Chưa có tài khoản?  Đăng ký
Chào mừng trở lại
Đăng nhập để tiếp tục chia sẻ và tìm thức ăn trong cộng đồng của bạn
Địa chỉ email
Mật khẩu        Quên mật khẩu?
[placeholder="Nhập mật khẩu của bạn"]  [aria-label="Hiện mật khẩu"]
Đăng nhập
Khi tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư của FoodShare.
```

The last line is the `t.rich` sentence: two links, translated, with the conjunction
placed where _Vietnamese_ puts it rather than welded between two English fragments.

`check:i18n-text` fell 2,110 → 2,094 across 234 files, and `/auth/login`,
`/auth/error.tsx` and `AuthGuard.tsx` dropped off the list entirely.
`check:locale-coverage` then reported the nine locales falling from 70.8–74.3% to
66.1–70.1% — not because anything was untranslated, but because 48 correct
translated keys joined the denominator of the one locale that is not translated.

---

## Phase 26 — The reset page believed a timer, and two scorers disagreed

Phase 25 fixed the error channel. This is the rest of the auth surface, and the
translation was the easy third of it.

### `setTimeout(500)` was deciding whether a password reset had worked

```ts
await new Promise((resolve) => setTimeout(resolve, 500));
setIsValidSession(isAuthenticated);
```

A fixed 500 ms wait, decided **once**, from a value captured in that render's
closure — on the one page whose entire job is to answer "did your reset link
work?". If the recovery session took 600 ms to establish, the page rendered
**"Link expired or invalid"** for a link that worked, and because the effect's
only dependency is `isAuthenticated`, which did not change again, there was no
second read. The reader's correct conclusion — that their link had expired — was
drawn from a race. **Being wrong in that direction costs somebody their password
reset.**

`useRecoverySession` replaces it with two properties:

1. **Decide on evidence, not on a deadline.** Wait while auth is loading, then
   poll for the session for a bounded window. The bound exists only so a dead link
   reaches an answer instead of spinning.
2. **A late arrival heals the page.** Once concluded invalid, a session that
   appears later still flips it. Deciding "expired" is never the last word.

Six tests, and the one that matters is _"lets a late arrival take back an expired
verdict"_. The hook's first version re-read nothing: its timer called
`setConcluded(true)` after a single interval, so the timeout was decorative and
the poll concluded immediately. A test asserting the _timeout_ passed anyway,
which is why the sixth test exists — _"does not conclude while auth is still
loading, however long it takes"_, because a slow network is not an expired link.

### One password, two answers

`Passw0rd!` was **"Very Strong"** in the sign-in modal and **"Fair"** on the
reset page. Same password, same product, two answers, and the two copies of the
logic disagreed in a way a reader could see:

|                   | modal                                             | reset page (inline)                        |
| ----------------- | ------------------------------------------------- | ------------------------------------------ |
| properties scored | length≥8, length≥12, lower, upper, number, symbol | length≥8, length≥12, upper, number, symbol |
| maximum score     | 6, drawn as **6** bars                            | 5, drawn as **4** bars                     |
| labels            | Weak · Medium · Strong · Very Strong              | Weak · Fair · Good · Strong                |

`src/lib/password-strength.ts` scores **the four rules the product states** —
`passwordSchema` enforces only `length >= 8`, and the other three are the
checklist the reset page prints beneath the meter. `length >= 12` was not one of
the four: nothing anywhere tells a reader their password should be twelve
characters, so scoring it inflated every password between 8 and 11 past the bar
the stated rules justify. The meter and the checklist now read one `strength.met`,
so they cannot disagree.

`labelKey` is a **catalogue key, not a word** — the old `label: "Weak"` literal
was English in 21 locales — and it is **namespace-relative**. The first version
returned `AuthFlow.strength.weak` and every caller reads it through
`useTranslations("AuthFlow")`; the test caught the literal text
`AuthFlow.AuthFlow.strength.weak` rendering on screen. next-intl resolves that
because it is lenient about qualified keys, and relying on leniency is how a
relative key gets mistaken for a qualified one later.

**A test caught a flaw in the scorer itself.** `/[^A-Za-z0-9]/` treats every
Cyrillic and CJK character as punctuation, so `пароль123` scored 3 of 4 and a
reader was told their password was "Good" on the strength of its being written in
a different alphabet. The rule is now `[\p{L}\p{N}\s]` — a character that is
not a letter, not a digit, and not whitespace — which is what "one special
character" means, and needs no list of symbols to maintain.

### 62 more keys, and `install()` had never been asked to update a namespace

`AuthFlow` went from 48 keys to 110, 21 locales. Two things broke on the way, and
the second is the more interesting one.

**`install()` printed success and wrote nothing.** It refused a key the namespace
did not already have, on the theory that an unexpected key is a typo — which made
it impossible to _add_ keys, because a namespace cannot hold a key before the
batch that introduces it. Removing that check was necessary; adding a
`writeFileSync` to the update branch was not noticed until Phase 26 — the first
batch to update an existing namespace — because the only `writeFileSync` in the
function sat on the create path. It mutated a parsed object and fell through.
**Every batch so far had created a namespace, so nothing had ever exercised it.**

Replacing a member is textual, because the catalogues carry the key `"0"` and a
`JSON.parse`/`stringify` round trip hoists integer-like keys to the front and
reorders the file. `spliceMember()` locates the member's block by brace counting
that skips string literals — `ChallengeReveal.keyboardHints` and
`languageSettings.presets` both contain braces, and a naive count cuts the
namespace in half. The first version of that kept only the namespace's _body_ and
left the `"AuthFlow": ` prefix in place, producing `"AuthFlow":   "AuthFlow": {`
in all twenty-one files; the second took the body up to `lastIndexOf("}")`,
which is the **root's** brace, leaving a stray `}` and its newline. Both were
caught by the `JSON.parse` guard at the end of the splice, which is the only
reason they were caught at all.

### A test that could not fail, in a test that read as thorough

`LoginForm.test.tsx` asserts, for each of 20 locales, that **no rendered element
has an English string as its whole text**. That assertion was vacuous. The helper
built the list of text runs by stripping tags and _then_ splitting on a zero-width
`(?=<)` — so it removed every `<`, the split found one boundary, and it returned
a single run containing the whole page. `not.toContain` against one big string
passes for everything. Forty assertions, none of which had ever been able to
fail.

The fix sounds trivial and the second attempt was still wrong: keeping the tags
and splitting on the same zero-width pattern leaves the text at the _start_ of
the following chunk, still attached to its tag, so `filter(!startsWith("<"))`
discarded nearly everything and the helper returned `[]` — which makes
`not.toContain` pass for the same reason. Matching the text between `>` and `<`
with `matchAll(/>([^<]+)</g)` is the list of text nodes, with no edge cases to
reason about.

With the helper actually working, **40 assertions that had never run now pass
for the right reason** — the page is genuinely clean in 20 locales. And the new
sibling test found a real defect in my own Polish on its first run: three
`rules.*` values carried a **leading space**, because a bulleted list had been
hand-written as a continuation. `check:catalogue` cannot see a leading space. A
render test that compares the catalogue's value against what reached the screen
can, because the leading space is in one and not the other.

### What else came with it

- **Both remaining auth pages got per-locale `<title>`.** `/auth/reset-password`
  and `/auth/forgot-password` were `"use client"` files with no
  `generateMetadata`, so their titles came from the layout as a hardcoded English
  `"Login"` in every locale. The reset page is reached from an emailed link, which
  carries no locale — so the browser decides, and a Swedish reader's tab said
  "Login".
- **The reset page's error region announces itself** (`role="alert"`,
  `aria-atomic`), as do its checking state, its mismatch line, and the modal's
  storage checks. None of them did before: text appeared and disappeared and
  nothing said so.
- **The strength label is not hidden from a screen reader.** The four bars are
  `aria-hidden` as a visual echo of the checklist, and the text label beside them
  is the accessible statement of the same fact. The checklist itself carries a
  `sr-only` state, because its tick is a decorative glyph and its colour is not
  an announcement.
- **`/auth/forgot-password` was already going through the catalogue** and is the
  reason `ForgotPassword` exists, but it mixed that namespace with five _flat_
  root keys for the tokens around them — `login`, `try_again`, `email_address_1`,
  `youexamplecom`, `sending`. Those are English in nine of the twenty-one
  locales, so it was a translated form wearing five English labels, and the
  labels are the ones a reader looks at first. The ten `ForgotPassword.*` keys
  stayed where they are: renaming a namespace is 210 lines of catalogue churn for
  no reader-visible gain, and the page now says which namespace each string comes
  from.
- **The modal's `StorageErrorInfo.message` is no longer rendered.** Those fields
  are prose, built in the browser in English ("Browser storage is unavailable"),
  so the component keeps its own state for the copy and leaves the type alone. The
  redaction regex that used to sanitise the _error_ before display went with it —
  it was standing in for a type change, and the type change has now happened.

`check:i18n-text` fell 2,094 → 2,050 across 231 files, with 10 files now fully
translated. `AuthFlow` is 110 keys in 21 locales with zero catalogue findings.

---

## Phase 27 — The blind spot was attributes, and the guard was wrong twice first

Two guards went in, and one of them had to be rewritten twice before it was
correct. Both stories are here because the failures are the point.

### `check:i18n-attributes` — 257 strings with no text node

Phases 13–26 chased hardcoded prose inside JSX text. That scan reads `>text<`, so
it is blind to every place prose reaches a reader through an **attribute**:

| Attribute     | What the reader gets                                                        |
| ------------- | --------------------------------------------------------------------------- |
| `aria-label`  | the accessible name of a control, announced _instead of_ its contents       |
| `alt`         | the text for an image                                                       |
| `placeholder` | what an empty field shows, and what several screen readers use as its label |
| `title`       | a native tooltip, on hover and on focus                                     |

`aria-label` is the most-read string in the product after visible text, and
nothing in the repository could see it. The guard is AST-based rather than
regex-based, because `aria-label="Delete photo"` and `aria-label={t("x")}` differ
only in a form a regular expression can be made to miss.

The finding: **257 hardcoded attributes across 118 files** — 93 `placeholder`,
86 `title`, 59 `aria-label`, 19 `alt` (apps and emails are both `.tsx`).

Nine of them were defect fixes rather than backlog, because the key already
existed in 21 locales and the component was ignoring it: `Search` (×2),
`Send message` (×2), `Go back`, `Check status`, `Dismiss`, `Remove image`,
`Add image`. Those nine cost no translation at all. Four of the six files had
**no `useTranslations` in them at all**, which is the more interesting fact — a
component can be entirely in the catalogue's shadow and nothing reports it.

`SearchField` is a server component, so `useTranslations` there is a server
call and needs no `'use client'`; the other three are client components that
had never asked for a translator.

Ratchet: 257 → **248 across 115 files**, with three files now clear.

### `check:namespace-keys` — written wrong, then wronger, then right

`useTranslations("Chat")` returns a function **already bound** to `Chat`. So:

- `t("sendMessage")` → `Chat.sendMessage` ✓
- `t("Chat.sendMessage")` → **`Chat.Chat.sendMessage`** ✗
- `t("AuthFlow.goBack")` on a `Chat` translator → **`Chat.AuthFlow.goBack`** ✗

Every one of those renders as the literal key path, in all 21 locales, because
that is what `getMessageFallback` does with a key it cannot resolve.

**This has now happened three times in three phases**, and each time a different
tool found it and no tool would have found it at the moment of the mistake:

1. `PasswordStrength` rendered the text `AuthFlow.AuthFlow.rules.length` on
   screen — a render test caught it.
2. `UnifiedChatContainer` resolved `Chat.AuthFlow.goBack` — `translations:check`
   caught it, _after_ the edit.
3. The self-qualified form followed immediately.

Three occurrences is not three coincidences. So it is a guard now.

**Attempt one — reject a key naming the binding's own namespace.** It passed on
the real tree, and it **missed the exact line that had already shipped**:
`Chat` + `AuthFlow.goBack` names a _different_ namespace, so the rule never
looked at it. A check written around the shape that has been seen is a check
that will miss the second.

**Attempt two — reject any dotted key on a namespaced translator.** Correct in
spirit, and it reported **27 bugs that were not bugs**: `t("reset.submit")` on
`AuthFlow` is `AuthFlow.reset.submit` and is perfectly right. The deeper problem
is that `reset` is _itself_ a top-level namespace, so no pattern on the head
segment can distinguish `AuthFlow.reset.submit` (good) from `Chat.Chat.sendMessage`
(bad). A guard that cries wolf on a quarter of a namespace is a guard that gets
deleted, not fixed.

**Attempt three — ask the catalogue.** Walk every dotted path in
`messages/en.json` (1,117 of them) and rule on existence:

- `<bound>.<key>` exists → correct, which is where every nested path lands.
- it is absent, but `<key>` alone exists → the namespace prefix was meant to be
  dropped. **This clause is the bug.**
- both absent → a missing key, which is `translations:check`'s job, not this
  one's.

No heuristic, no false positives, and it cannot be wrong about a key that is in
the catalogue. It needs the catalogue precisely because two structural guesses
already were.

**And the AST caught something regex could not.** The regex version cheerfully
reported the guard's own explanatory comment — the paragraph describing the defect
— as a defect, three lines above the fix it was documenting. The AST version sees
no call expression in a comment. Same for the string literal `'t("AuthFlow.goBack")'`
in a doc example. Two of the tests exist only to pin that.

**A third bug, found by the tests rather than by the guard.** The binding map was
keyed by `ts.Identifier`, the AST node for the _declaration_. A node from the
declaration is never the same object as the node at the call site, so every
lookup missed and **the guard could not fire at all**. It reported clean on the
real tree only because the tree was already fixed. The tests that write a broken
fixture and require a non-zero exit are what made that visible; a guard
exercised only against passing input cannot be distinguished from a guard that
does nothing. 16 tests, of which 9 require the guard to **fail**.

Verified: type-check, lint, **1,249 tests**, all nine guards, `build` 113/113
pages, `build:check` all four budgets, global CSS 484 KB / 57 KB gzip.

---

---

## Next

Ranked by reader-visible consequence, and each with the reason it is not simply
done.

0. **Nine of twenty-one locales are English, and now measurably so.** Phase 24
   moved it from invisible to visible: `check:locale-coverage` reports `sv`, `th`,
   `ar`, `hi`, `it`, `ko`, `nl`, `pl` and `tr` at 70.8–74.3% byte-identical to
   English, against 1.3–4.9% for the other eleven. This is first because it is
   not a content backlog, it is a **product claim** — the language switcher offers
   nine languages the site does not speak. Three ways out, in order of cost:
   1. **Translate them.** ~470 flat keys × 9 locales, and the flat catalogue is
      the legacy UI, so this is the whole app.
   2. **Stop offering them.** `next-intl`'s `locales` list, the language switcher,
      the `<html lang>` and the `OPENGRAPH_LOCALES` map all have to agree, and
      dropping a locale is a visible product decision — a user whose locale is
      removed gets English silently rather than a notice.
   3. **Label them honestly** as "coming soon" and leave them switchable. Cheap,
      and arguably worse: it puts the gap in the UI instead of in the data.
      Either way the decision is a product one and it is not one to make by accident
      at the end of a sprint.
1. **2,050 untranslated strings across 231 files, plus 248 hardcoded
   attributes across 115.** Down from 2,250 text strings (the legal pages, the
   homepage, `/donation` and the whole auth surface have cleared 200) and from a
   standing start of 257 attributes. The per-file ratchets and the worklists mean
   both can only go down. It is content work with guards around it, not a
   mechanical sweep: each string needs a key _and_ 20 translations, and
   `translations:check` puts every locale over budget the moment a key lands
   without them. Order is by reader exposure:
   - ~~Phase 20 — `/privacy`, end to end.~~ **Done**
   - ~~Phase 21 — `/terms`, end to end.~~ **Done**
   - ~~Phase 22 — `/donation`, end to end.~~ **Done** — 25 keys, the page's two
     false claims replaced with one measured figure and one checkable one, and
     `DonateButton`'s label made a required prop.
   - ~~Phase 25 — `/auth/login`, end to end.~~ **Done** — 48 keys × 21 locales,
     the auth error channel turned from sentences into codes, `?error=auth_error`
     now read instead of written-and-ignored, and an error region that actually
     announces itself.
   - ~~Phase 26 — the rest of the auth surface.~~ **Done** — `/auth/reset-password`
     and `/auth/forgot-password` localised with per-locale titles, the recovery
     session race replaced with `useRecoverySession`, one password scorer for the
     whole product, the sign-in modal and `InvitationStep` wired to the same
     namespace, and four live regions that used to announce nothing.
   - ~~Phase 27 — the attribute blind spot.~~ **Done** — `check:i18n-attributes`
     found 257 prose strings with no text node (93 `placeholder`, 86 `title`,
     59 `aria-label`, 19 `alt`). Nine `aria-label`s that already had a
     21-locale key were wired up for nothing; 248 remain as a baselined
     worklist. The pass also produced `check:namespace-keys`, because the ninth
     `aria-label` fix is what surfaced the third occurrence of a namespaced `t`
     being called with a key it already names.
   - **Phase 28 — the 248 hardcoded attributes, in reader order.** `aria-label`
     first: 50 left, and each is the accessible name of a control a screen-reader
     user meets before any visible text. Then `alt` (19, and an `alt` is the only
     description an image gets), then `title` and `placeholder`, which are
     English in nine locales and cosmetically wrong in the other twelve. Same
     shape as the text work: a key, 20 translations, the ratchet moves down.
   - **Phase 29 — the admin surface.** 2,094 strings, of which a large share are
     in `src/app/admin/**`. Lower reader exposure than auth, higher than
     anything else left, and the one place where an English string is a
     _support_ problem rather than a marketing one.

   Each followed by its metadata, as `/help` was.

2. **108 strings the budget ratchet scores as translated and are not**, all
   baselined: `ForgotPassword`, `Maintenance` and `Reports` are entirely English
   in `sv` and `th`, `Common` is English in `th`, and `categories.zerowaste` is
   English in eleven locales. Each key is present, so `translations:check` is
   green and always will be. Phase 24 raised this from 36 to 108 **not because
   anything got worse but because the root namespace came into scope** — which is
   the measure of how much of the catalogue was never being checked.
3. **2,250 → 2,050 is the i18n text ratchet, and it is per file.** The 231
   remaining files are unchanged and cannot get worse.
   `check:i18n-attributes` is per file in the same way, so the 248 attributes
   cannot grow either. `check:catalogue` is per namespace and per rule, and
   `check:locale-coverage` is per locale, for the same reason.
4. **The build blocker.** Resolved in Phase 17 — `bun run build` completes
   offline, 114/114 pages, and `build:check` passes all four budgets.
5. **The static shell is still nearly empty, now measured.** `cacheComponents`
   and `partialPrefetching` are on and the public reads are cached, but the root
   layout reads `cookies()` for the locale and wraps the page tree in a
   request-scoped `Providers`. `/help` prerenders a 4,874-byte HTML file whose
   body is 703 bytes and **78 visible characters**. A meaningful static shell
   needs a `[locale]` segment so direction and messages are decided per segment
   rather than per request — **Phase 30**, planned last because it touches every
   route at once and should be designed against the shell the earlier phases
   produce. Two arguments now say to do it sooner: per-locale URLs are what would
   let a crawler be told which locale a page is in, and they are also the only
   way item 0 above gets a URL to point at.
6. **65 pre-existing `shadow-[…]` arbitrary values** are the largest remaining
   lever on the 484 KB global sheet; the ceiling moved once in Phase 19, with
   the reason recorded at the constant.
7. **The `get_post_rating` and `profiles_public` migrations need applying to the
   live database** alongside the deploy of the code that reads them.

### A note on what this document is for

Every phase above found something that a green build, a passing type-check and
1,055 tests could not see: a dialog close button in the wrong corner for every
a rich-text viewer with no typography at all, an avatar ripple that never
animated, a migration that had drifted out of sync, three numbers on the homepage
that were typed in by hand, a tax-deductibility claim that was simply false, and
nine languages that the language switcher offers and the site does not speak. The guards now in place exist because of those, not in spite of
them. The next thing worth building is whatever catches the class of problem that
has not been caught yet — and the last one was caught by reading the guard's own
docstring against the guard's own input, which is the cheapest technique in this
document and the one most likely to still be available.
