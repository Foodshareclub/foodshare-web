import { logger } from "../_shared/logger.ts";
import { getAdminClient } from "../_shared/supabase.ts";

logger.info("main function started");

let cachedVaultSecrets: [string, string][] = [];
let vaultSecretsLastFetched = 0;
const VAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedVaultSecrets(): Promise<[string, string][]> {
  if (Date.now() - vaultSecretsLastFetched < VAULT_CACHE_TTL_MS && cachedVaultSecrets.length > 0) {
    return cachedVaultSecrets;
  }

  try {
    const supabase = getAdminClient();
    const { data: secrets, error } = await supabase
      .schema("vault")
      .from("secrets")
      .select("name,secret");

    if (!error && secrets) {
      const newSecrets: [string, string][] = [];
      for (const { name, secret } of secrets) {
        if (name && secret) {
          newSecrets.push([name, secret]);
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
    return new Response(JSON.stringify({ message: "ok" }), { status: 200, headers });
  }

  if (pathname === "/_internal/metric") {
    // @ts-ignore: EdgeRuntime is available in Supabase Edge Functions environment
    const metric = await EdgeRuntime.getRuntimeMetrics();
    return Response.json(metric);
  }

  const pathParts = pathname.split("/");
  const serviceName = pathParts[1];

  if (!serviceName || serviceName === "") {
    return new Response(JSON.stringify({ msg: "missing function name in request" }), {
      status: 400,
      headers,
    });
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

  const callWorker = async (): Promise<Response> => {
    try {
      const worker = await createWorker();
      const controller = new AbortController();
      return await worker.fetch(req, { signal: controller.signal });
    } catch (e) {
      logger.error("Worker fetch failed", { error: e, serviceName, pathname });
      // @ts-ignore: WorkerAlreadyRetired is specific to Deno Deploy / Supabase Edge Functions
      if (e instanceof Deno.errors.WorkerAlreadyRetired) {
        return await callWorker();
      }
      return new Response(JSON.stringify({ msg: String(e) }), { status: 500, headers });
    }
  };

  return callWorker();
});
