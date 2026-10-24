import { logger } from "../_shared/logger.ts";
import { getAdminClient } from "../_shared/supabase.ts";
import { readVaultEntries } from "../_shared/vault-loader.ts";
import { VAULT_PRELOAD_NAMES } from "../_shared/vault-secret-names.ts";

logger.info("main function started");

let cachedVaultSecrets: [string, string][] = [];
let vaultSecretsLastFetched = 0;
const VAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let vaultSecretsInFlight: Promise<[string, string][]> | null = null;

async function getCachedVaultSecrets(): Promise<[string, string][]> {
  if (
    vaultSecretsLastFetched > 0 && Date.now() - vaultSecretsLastFetched < VAULT_CACHE_TTL_MS
  ) {
    return cachedVaultSecrets;
  }

  if (!vaultSecretsInFlight) {
    vaultSecretsInFlight = refreshVaultSecrets().finally(() => {
      vaultSecretsInFlight = null;
    });
  }
  return await vaultSecretsInFlight;
}

async function refreshVaultSecrets(): Promise<[string, string][]> {
  try {
    const supabase = getAdminClient();
    // Bound the entire refresh, including queued reads, so an unavailable
    // Vault cannot indefinitely block all requests waiting for startup.
    const signal = AbortSignal.timeout(5_000);
    // Vault is private; the service-role RPC isolates corrupt rows without
    // exposing the schema or preventing other readable secrets from loading.
    const { entries: secrets, unreadable } = await readVaultEntries(
      VAULT_PRELOAD_NAMES,
      (name) => supabase.rpc("get_vault_secret", { secret_name: name }).abortSignal(signal),
    );
    if (unreadable) {
      logger.warn("Main router could not read some Vault entries; using environment fallback", {
        count: unreadable,
      });
    }

    if (secrets) {
      const newSecrets: [string, string][] = [];
      for (const s of secrets) {
        const name = (s as { name?: string | null }).name;
        const value = (s as { decrypted_secret?: string | null }).decrypted_secret;
        if (name && value) {
          newSecrets.push([name, value]);
        }
      }
      cachedVaultSecrets = newSecrets;
      vaultSecretsLastFetched = Date.now();
    }
  } catch (e) {
    logger.error("Failed to fetch vault secrets in main router", { error: e });
  }

  return cachedVaultSecrets;
}

Deno.serve(async (req: Request) => {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/_internal/health") {
    return new Response(
      JSON.stringify({ message: "ok" }),
      { status: 200, headers },
    );
  }

  if (pathname === "/_internal/metric") {
    // @ts-ignore: EdgeRuntime is available in Supabase Edge Functions environment
    const metric = await EdgeRuntime.getRuntimeMetrics();
    return Response.json(metric);
  }

  // Prometheus scrapes this path. Do not dispatch it to a nonexistent
  // "metrics" function, or return the JSON-only internal metrics response.
  if (pathname === "/metrics") {
    // @ts-ignore: EdgeRuntime is available in Supabase Edge Functions environment
    const metric = await EdgeRuntime.getRuntimeMetrics();
    const values: [string, string, unknown, string][] = [
      [
        "active_user_workers",
        "gauge",
        metric.activeUserWorkersCount,
        "Currently active user workers.",
      ],
      [
        "retired_user_workers_total",
        "counter",
        metric.retiredUserWorkersCount,
        "Retired user workers.",
      ],
      [
        "received_requests_total",
        "counter",
        metric.receivedRequestsCount,
        "Received runtime requests.",
      ],
      [
        "handled_requests_total",
        "counter",
        metric.handledRequestsCount,
        "Handled runtime requests.",
      ],
      [
        "main_worker_heap_used_bytes",
        "gauge",
        metric.mainWorkerHeapStats?.usedHeapSize,
        "Main worker used heap in bytes.",
      ],
    ];
    const body = values.filter(([, , value]) => typeof value === "number" && Number.isFinite(value))
      .map(([name, type, value, help]) =>
        `# HELP supabase_edge_runtime_${name} ${help}\n# TYPE supabase_edge_runtime_${name} ${type}\nsupabase_edge_runtime_${name} ${value}\n`
      ).join("");
    return new Response(body, {
      headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
    });
  }

  const pathParts = pathname.split("/");
  const serviceName = pathParts[1];

  if (!serviceName || serviceName === "") {
    return new Response(
      JSON.stringify({ msg: "missing function name in request" }),
      { status: 400, headers },
    );
  }

  const servicePath = `/home/deno/functions/${serviceName}`;

  const createWorker = async () => {
    const envVarsObj = Deno.env.toObject();
    const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]]);

    // Fetch secrets from Vault for full parity with Supabase Cloud
    const secrets = await getCachedVaultSecrets();
    for (const [name, secret] of secrets) {
      // Check if already present to avoid overriding explicit Deno.env overrides
      if (!envVarsObj[name]) {
        envVars.push([name, secret]);
      }
    }

    // @ts-ignore: EdgeRuntime is available in Supabase Edge Functions environment
    return await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb: 150,
      workerTimeoutMs: 5 * 60 * 1000,
      noModuleCache: false,
      envVars,
      forceCreate: false,
      cpuTimeSoftLimitMs: 10000,
      cpuTimeHardLimitMs: 20000,
    });
  };

  const callWorker = async (attempts = 0): Promise<Response> => {
    try {
      const worker = await createWorker();
      const controller = new AbortController();
      return await worker.fetch(req, { signal: controller.signal });
    } catch (e) {
      logger.error("Worker fetch failed", { error: e, serviceName, pathname, attempts });
      // @ts-ignore: WorkerAlreadyRetired is specific to Deno Deploy / Supabase Edge Functions
      // A failed fetch can occur after the worker performed a write. Only
      // replay safe methods; writes need endpoint-specific idempotency.
      if (
        ["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        (e as { name?: string })?.name === "WorkerAlreadyRetired" && attempts < 2
      ) {
        return await callWorker(attempts + 1);
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "WORKER_EXECUTION_FAILED",
            message: "Unable to execute Edge Function",
            service: serviceName,
          },
        }),
        { status: 500, headers },
      );
    }
  };

  try {
    return await callWorker();
  } catch (fatalError) {
    logger.error("Fatal unhandled error in edge main router", { error: fatalError, pathname });
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "EDGE_RUNTIME_FATAL_ERROR",
          message: "Internal Edge Runtime error",
        },
      }),
      { status: 500, headers },
    );
  }
});
