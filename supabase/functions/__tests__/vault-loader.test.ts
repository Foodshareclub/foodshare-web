import { assertEquals } from "@std/assert";
import { readVaultEntries } from "../_shared/vault-loader.ts";

Deno.test("a corrupt row preserves other Vault secrets and bounds concurrent reads", async () => {
  let active = 0;
  let peak = 0;
  const result = await readVaultEntries(
    Array.from({ length: 20 }, (_, i) => `${i}`),
    async (name) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return name === "3"
        ? { data: null, error: new Error("invalid ciphertext") }
        : { data: `value-${name}`, error: null };
    },
  );
  assertEquals(result.unreadable, 1);
  assertEquals(result.entries.length, 19);
  assertEquals(result.entries.some((row) => row.name === "3"), false);
  assertEquals(peak <= 8, true);
  assertEquals(result.entries.find((row) => row.name === "5")?.decrypted_secret, "value-5");
});

Deno.test("main router isolates dependency failures and never replays writes", async () => {
  // Isolate Deno.serve, environment and fetch stubs from other function tests.
  const entrypoint = new URL("../main/index.ts", import.meta.url).href;
  const namesModule = new URL("../_shared/vault-secret-names.ts", import.meta.url).href;
  const vaultModule = new URL("../_shared/vault.ts", import.meta.url).href;
  const code = `
    import { assertEquals } from "@std/assert";
    import { VAULT_PRELOAD_NAMES } from ${JSON.stringify(namesModule)};
    Deno.env.set("SUPABASE_URL", "http://127.0.0.1:9876");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "router-test-only");
    Deno.env.set("GROQ_API_KEY", "explicit-test-value");
    Deno.env.delete("BOT_TOKEN");
    let handler;
    Deno.serve = (fn) => { handler = fn; };
    let reads = 0;
    let emptyVault = false;
    let hangVault = false;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assertEquals(url.pathname, "/rest/v1/rpc/get_vault_secret");
      reads++;
      if (hangVault) {
        if (init.signal.aborted) throw init.signal.reason;
        return await new Promise((resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(init.signal.reason), {once: true});
        });
      }
      if (emptyVault) return Response.json(null);
      const name = JSON.parse(init.body).secret_name;
      if (name === "ADMIN_CHAT_ID") {
        return Response.json({message: "invalid ciphertext"}, {status: 400});
      }
      return Response.json(name === "BOT_TOKEN" ? "vault-test-value" :
        name === "GROQ_API_KEY" ? "vault-override-test-value" : null);
    };
    let workers = 0;
    let workerFetches = 0;
    let retirementFailures = 0;
    let expectedBot = "vault-test-value";
    globalThis.EdgeRuntime = {
      getRuntimeMetrics: async () => ({activeUserWorkersCount: 2, receivedRequestsCount: 12,
        handledRequestsCount: 11, mainWorkerHeapStats: {usedHeapSize: 32}}),
      userWorkers: { create: async (options) => {
      workers++;
      const env = Object.fromEntries(options.envVars);
      assertEquals(env.BOT_TOKEN, expectedBot);
      assertEquals(env.GROQ_API_KEY, "explicit-test-value");
      return {fetch: async () => {
        workerFetches++;
        if (retirementFailures > 0) {
          retirementFailures--;
          throw Object.assign(new Error("private worker diagnostic"), {name: "WorkerAlreadyRetired"});
        }
        return new Response("worker-ok");
      }};
    }}};
    await import(${JSON.stringify(entrypoint)});
    const metrics = await handler(new Request("http://functions:9000/metrics"));
    assertEquals(metrics.status, 200);
    assertEquals(metrics.headers.get("Content-Type"), "text/plain; version=0.0.4; charset=utf-8");
    const text = await metrics.text();
    assertEquals(text.includes("# TYPE supabase_edge_runtime_received_requests_total counter"), true);
    assertEquals(text.includes("supabase_edge_runtime_received_requests_total 12\\n"), true);
    assertEquals(text.includes("supabase_edge_runtime_main_worker_heap_used_bytes 32\\n"), true);
    assertEquals(text.includes("NaN"), false);
    assertEquals(reads, 0);
    assertEquals(workers, 0);
    const responses = await Promise.all(Array.from({length: 12}, () =>
      handler(new Request("http://functions:9000/api-v1-products"))));
    for (const response of responses) {
      assertEquals(response.status, 200);
      assertEquals(await response.text(), "worker-ok");
    }
    assertEquals(workers, 12);
    assertEquals(reads, VAULT_PRELOAD_NAMES.length);
    // An empty refresh must also be cached, rather than issuing 55 RPC calls
    // for every subsequent worker startup during a Vault outage.
    const now = Date.now();
    Date.now = () => now + 6 * 60 * 1000;
    expectedBot = undefined;
    emptyVault = true;
    for (let i = 0; i < 2; i++) {
      const response = await handler(new Request("http://functions:9000/api-v1-products"));
      assertEquals(await response.text(), "worker-ok");
    }
    assertEquals(reads, VAULT_PRELOAD_NAMES.length * 2);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      retirementFailures = 1;
      const before = workerFetches;
      const failed = await handler(new Request("http://functions:9000/api-v1-products", {method}));
      assertEquals(failed.status, 500);
      assertEquals(workerFetches - before, 1);
      assertEquals((await failed.text()).includes("private worker diagnostic"), false);
    }
    retirementFailures = 2;
    const before = workerFetches;
    const retried = await handler(new Request("http://functions:9000/api-v1-products"));
    assertEquals(retried.status, 200);
    assertEquals(workerFetches - before, 3);
    retirementFailures = 10;
    const last = workerFetches;
    const exhausted = await handler(new Request("http://functions:9000/api-v1-products"));
    assertEquals(exhausted.status, 500);
    assertEquals(workerFetches - last, 3);
    // Simulate a dependency that never responds. Keep the production five-
    // second budget assertion, but shorten the actual timer in this process.
    retirementFailures = 0;
    hangVault = true;
    Date.now = () => now + 12 * 60 * 1000;
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = (ms) => { assertEquals(ms, 5000); return timeout(10); };
    const started = performance.now();
    const fallback = await handler(new Request("http://functions:9000/api-v1-products"));
    assertEquals(await fallback.text(), "worker-ok");
    assertEquals(performance.now() - started < 2000, true);
    const afterTimeout = reads;
    const cachedFallback = await handler(new Request("http://functions:9000/api-v1-products"));
    assertEquals(await cachedFallback.text(), "worker-ok");
    assertEquals(reads, afterTimeout);
    // Every API handler also preloads the shared Vault module. Exercise that
    // real path, not only the outer router's cache.
    const vault = await import(${JSON.stringify(vaultModule)});
    hangVault = false;
    emptyVault = false;
    const beforePreload = reads;
    await Promise.all(Array.from({length: 12}, () => vault.loadAllSecrets()));
    assertEquals(reads - beforePreload, VAULT_PRELOAD_NAMES.length);
    assertEquals(vault.getSecretSync("BOT_TOKEN"), "vault-test-value");
    hangVault = true;
    const preloadStarted = performance.now();
    await vault.loadAllSecrets();
    assertEquals(performance.now() - preloadStarted < 2000, true);
    assertEquals(await vault.getSecret("ABSENT_TEST_SECRET"), undefined);
    hangVault = false;
    Date.now = () => now + 18 * 60 * 1000;
    const beforeIndividualRefresh = reads;
    const refreshed = await Promise.all(Array.from({length: 12}, () => vault.getSecret("BOT_TOKEN")));
    assertEquals(refreshed.every(value => value === "vault-test-value"), true);
    assertEquals(await vault.getSecret("BOT_TOKEN"), "vault-test-value");
    assertEquals(reads - beforeIndividualRefresh, 1);
  `;
  const result = await new Deno.Command(Deno.execPath(), {
    args: [
      "eval",
      "--no-check",
      "--config",
      new URL("../deno.json", import.meta.url).pathname,
      code,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(
    result.code,
    0,
    new TextDecoder().decode(result.stderr) + new TextDecoder().decode(result.stdout),
  );
});
