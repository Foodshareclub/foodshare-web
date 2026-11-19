# Listing covers

Listing image bytes belong in the backend Supabase Storage service. R2 is
reserved for encrypted recovery backups. Existing usable photos take priority;
missing-photo search runs on the backend, never in a browser or mobile client.

The web feed, canonical product-detail content (including intercepted modals),
and arrangement detail use ReferencePhotoDisclosure. It labels reference
images with a localized explanation that they are not photos of the actual item.
The label follows the active carousel photo and disappears when that photo
fails; detail follows the usable hero selected by the existing error handler.

Only exact HTTPS api.foodshare.club Storage paths in the backend-owned
assets/listing-reference/<sha256>/<file> and
food-images/<owner>/reference-covers/<sha256>.<raster> namespaces qualify.
Ordinary uploads, foreign origins, deceptive suffixes, nondefault ports,
credentials in URLs and reference-looking query parameters do not qualify.
This namespace policy also labels the legacy website reference covers already
repaired into Supabase, which have no new metadata.cover provenance.

The badge uses the existing UI primitive and semantic colors. It is informational,
not a button. Its copy exists in all 21 catalogues. The locale baseline is
ratcheted only for the additional translated key; untranslated counts did not
increase. Existing image optimization, upload behavior and URLs are preserved.

Validation on the Studio: strict TSRS passed; the affected image and locale
suites passed 48 tests. Real listing 11634 loaded its Supabase image through the
Next.js optimizer. The disclosure rendered at 390x844 and 1440x1000; phone page
width was 390 with no document overflow. Screenshot and operational receipts
live under ../artifacts/listing-cover-repair-20261118 in the umbrella workspace.
These are local runtime checks, not evidence of production publication.

The full isolated suite initially had 1,444 passes and three failures. Two were
resolved by the required tightening of the locale baseline and key-count test.
The vendored-backend migration mismatch is unrelated and remains separate.
No vendored backend or database migration was changed for this UI work.

Production was checked independently: the same listing and backend cover render,
but the new disclosure was not deployed at this checkpoint. Paired native mobile
reference-photo UI, release builds and store publication remain separate gates.


## CI follow-up

The first disclosure pipeline passed both web test jobs and strict lint. It
identified two native Bun formatting changes and a stale vendored backend tree.
The follow-up copies only committed blobs from backend main
0560ca438be96f0134e4aa229146b2cc15a22e1f: the two missing migrations and 20 differing
Edge Function files, including the deployed cover-search implementation and its
tests. No SQL is executed by copying these files. Existing dirty local backend
or web-function edits are excluded from the commit and preserved in place.
The complete committed function/migration trees must match before delivery;
CI remains responsible for rechecking against backend main.
