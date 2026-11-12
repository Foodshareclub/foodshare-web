# Primary application file storage

Live application files use Supabase Storage on the backend VPS. R2 is reserved
for off-site database backups. Web uploads already use imageAPI; storageAPI now
uses Supabase directly for URLs, downloads, signed URLs and deletion. The unused
R2 client, credential cache and presigned upload exports have been removed.
A Supabase deletion failure is returned to the caller instead of being hidden
by the former dual-provider error-count check.

The canonical migration and server-side ownership controls are in
Foodshareclub/foodshare-backend. Existing R2 application objects are copied with
conditional source reads, conflict refusal and full target SHA-256 verification.
Backup objects and their bounded retention stay in R2. Source delivery, CI and
installed web release status are separate evidence.
