/**
 * Does this checkout own the supabase corpus, or is it a vendored copy?
 *
 * Several contracts in this directory describe things that live *outside* the
 * vendored set (`supabase/migrations` + `supabase/functions`, which the web
 * checkout byte-matches against the backend):
 *
 *   * `docs/oracle.md`            — the catalog's live figures (doc-drift)
 *   * `CLAUDE.md`'s function table — the function registry's doc (contract-drift)
 *   * `services/crates/fs-db/src` — the Rust worker's SQL (worker-grants)
 *   * `scripts/deploy.sh`         — the deploy pipeline's classifier (oracle)
 *   * `types/*.d.ts` at the root  — the Deno shims the tsrs budget compiles
 *     against (typecheck-baseline)
 *
 * Those contracts are owned by the repository that owns the corpus. A
 * vendored copy carrying a second list of any of them would be the cross-repo
 * version of the drift this directory exists to stop — a duplicate table in
 * the web checkout is "two lists that are both 28" again, only bigger. The
 * vendored test files themselves stay in sync by the byte-match gate, so
 * skipping here costs nothing: the check still runs — in the owning repo.
 *
 * The marker is `services/` at the repository root: the Rust workspace, which
 * only the backend has. A vendored checkout lacks the directory entirely, and
 * `statSync` throws rather than answering "not a directory" for a missing
 * path, so the answer is a try/catch, not a boolean on a stat.
 */
const REPO_ROOT = new URL("../../../../", import.meta.url);

let cached: boolean | null = null;

export function ownsCorpus(): boolean {
  if (cached === null) {
    try {
      cached = Deno.statSync(new URL("services/", REPO_ROOT)).isDirectory;
    } catch {
      cached = false;
    }
  }
  return cached;
}
