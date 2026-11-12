# Blog production verification — November 12, 2026

The canonical content migration is recorded in
Foodshareclub/foodshare-backend:
docs/BLOG_SUPABASE_PRESERVATION_2026-11-12.md.

All 218 latest published source articles are in backend Supabase. The 205
original cover mappings and 13 intentional cover absences were verified through
the anonymous API. All 905 distinct images/videos (200,333,566 bytes) passed
authenticated and public full SHA-256 readback. Seven encoded-path inline
references were repaired; no source repository is required for live media.

The final backend state passed the normal encrypted recovery service with
full R2 ciphertext readback at 23:02:18 UTC (15:02:18 PST). R2 holds off-site
recovery data; live application files remain in backend Supabase.


## Approved credential installation and successful live publication

This section supersedes the publication blocker recorded above. The owner
explicitly approved the exact credential destinations: the web repository's
two GitHub Actions production secret names and the frontend VPS's existing
private web environment file through the normal deployment script.

The existing Redis service returned an authenticated PONG before configuration.
Both approved GitHub secret names were verified by metadata, and the frontend
environment file remains mode 0600. No credential value was committed or printed.
No new service or paid subscription was created. TLS verification is enabled.

The unchanged CI-validated e3260074 image was then deployed successfully through
scripts/deploy-production.sh. Its revision check, backend feed/detail preflight,
production health, Food page and post-start listing checks passed. The running
OCI digest is:
sha256:bdb427c08f45d927a28237c2573e959e49b17bf0b8b6eeaa6f48e8f81eb09d96

At 23:18:01 UTC (15:18:01 PST), /api/health returned healthy with database,
auth, storage and Redis all up. The container reported healthy and its OCI
revision matched e3260074e375b4d74c00f7571810b803e2fff7e1.

All six representative live Playwright checks passed:
- coming-soon: restored original cover rendered.
- what-we-are-reading-our-7-essential-books-on-hunger-and-food-waste:
  cover and all seven inline images loaded.
- how-to-start-a-community-fridge: recovered published article rendered.
- more-treasure-than-trash-dumpster-diving-continues-to-rise-across-australia:
  cover and all four encoded-path inline mappings loaded.
- dumpster-diving-isnt-crazy-food-waste-is: cover and all three inline images loaded.
- health-benefits-of-incorporating-fruit-veggies-grains-nuts-and-seeds-into-your-diet:
  rendered with its intentional original cover absence.

All six returned HTTP 200 with article headings. The original restored cover
screenshot was also visually inspected. Complete browser screenshots and the
machine-readable rendered-page-verification-final.json remain in the private
Studio audit directory. Browser evidence covers these six cases; the complete
218-article API and 905-object hash verification are separate exhaustive checks.

The successful live deployment was an operator recovery through the unchanged
normal script, using the already CI-built/tested immutable image. It does not
turn the original workflow's failed/queued deployment jobs into CI successes.
Exact-revision CI for subsequent source/documentation commits is still reported
independently. No organization repository has been deleted.

