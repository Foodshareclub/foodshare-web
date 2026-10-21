import { chmod, mkdir, mkdtemp, rm } from "bun:fs/promises";
import { tmpdir } from "bun:os";
import { join, resolve } from "bun:path";
import { expect, test } from "bun:test";

const sha = "a".repeat(40);
const image = `ghcr.io/foodshareclub/foodshare-web@sha256:${"b".repeat(64)}`;
const oldEnvironment =
  "EXISTING_SETTING=preserved\nNEXT_PUBLIC_SUPABASE_URL=https://old.example\nNODE_TLS_REJECT_UNAUTHORIZED=0\n";
const script = resolve(import.meta.dir, "../../..", "scripts/deploy-production.sh");

// Podman is the only container runtime this estate uses, so the mock set is
// one runtime rather than two. The case that disappeared with the Docker
// fallback is the one that could not happen any more: a service held by two
// runtimes at once, which is why the script used to probe for a second
// runtime and refuse to deploy. There is no Docker daemon on the host, on
// the CI runner, or on a developer machine, so that probe could only ever
// have found nothing — and a branch that hides a broken probe is worse
// than no branch. The guarantees that remain are the ones that still have
// to hold: the deployment talks to the runtime that owns the running
// service, and it stops rather than assuming.

/**
 * The deployment runs a Podman container described by a Quadlet unit, and
 * pins the image it deploys with a drop-in next to that unit. The test runs
 * the real script against fake `podman`, `systemctl` and `sleep`, so the
 * things that are checked here are the things the script actually does:
 * which image it pulls, what it writes into the unit's drop-in, and what it
 * puts back when the health check fails.
 */
async function deploy(options: Record<string, string> = {}, check = false) {
  const directory = await mkdtemp(join(tmpdir(), "foodshare-web-deploy-"));
  try {
    const environmentFile = join(directory, "foodshare-web.env");
    const unitDirectory = join(directory, "systemd");
    // A host whose environment file was lost, or that was reprovisioned,
    // has none. The deployment writes it, so the test has to be able to
    // ask for a host without one.
    if (options.MOCK_NO_ENV !== "1") await Bun.write(environmentFile, oldEnvironment);
    await mkdir(join(unitDirectory, "foodshare-web.container.d"), { recursive: true });
    await Bun.write(
      join(unitDirectory, "foodshare-web.container"),
      "[Container]\nImage=ghcr.io/foodshareclub/foodshare-web:latest\n",
    );
    await Bun.write(
      join(directory, "podman"),
      `#!/bin/bash
printf 'podman %s\\n' "$*" >> "$MOCK_DIRECTORY/commands"
if [ "\${1:-}" = --config ]; then shift 2; fi
case "$1 $2" in
  "container inspect")
    if [ "\${MOCK_MISSING:-0}" = 1 ]; then exit 1; fi
    if [[ "$*" == *State.Running* ]]; then echo "\${MOCK_RUNNING:-true}"; else echo sha256:previous; fi ;;
  "login ghcr.io") cat >/dev/null ;;
  "pull "*) [ "\${MOCK_PULL_FAIL:-0}" != 1 ] ;;
  "image inspect") echo "\${MOCK_REVISION:-$DEPLOY_SHA}" ;;
  "exec foodshare-web") [ "\${MOCK_HEALTH_FAIL:-0}" != 1 ] ;;
  "exec -i") cat >/dev/null; [ "\${MOCK_API_FAIL:-0}" != 1 ] ;;
  *) exit 2 ;;
esac
`,
    );
    await Bun.write(
      join(directory, "systemctl"),
      `#!/bin/bash
printf 'systemctl %s\\n' "$*" >> "$MOCK_DIRECTORY/commands"
`,
    );
    await Bun.write(join(directory, "sleep"), "#!/bin/sh\nexit 0\n");
    for (const name of ["podman", "systemctl", "sleep"]) await chmod(join(directory, name), 0o700);
    const child = Bun.spawn(["bash", script, ...(check ? ["--check"] : [])], {
      cwd: directory,
      env: {
        PATH: `${directory}:${process.env.PATH}`,
        MOCK_DIRECTORY: directory,
        DEPLOY_SHA: sha,
        DEPLOY_IMAGE: image,
        GITHUB_TOKEN: "registry-test-secret",
        GITHUB_ACTOR: "test-user",
        NEXT_PUBLIC_SUPABASE_URL: "https://new.example",
        FOODSHARE_WEB_ENV_FILE: environmentFile,
        FOODSHARE_WEB_UNIT_DIR: unitDirectory,
        ...options,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, output, error] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    const commandFile = Bun.file(join(directory, "commands"));
    const dropinFile = Bun.file(join(unitDirectory, "foodshare-web.container.d", "50-image.conf"));
    return {
      code,
      output,
      error,
      commands: (await commandFile.exists()) ? await commandFile.text() : "",
      dropin: (await dropinFile.exists()) ? await dropinFile.text() : "",
      environment: (await Bun.file(environmentFile).exists()) ? await Bun.file(environmentFile).text() : "",
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("production preflight only inspects the running service and the unit", async () => {
  const result = await deploy({}, true);
  expect(result.code).toBe(0);
  expect(result.environment).toBe(oldEnvironment);
  expect(result.dropin).toBe("");
  expect(result.commands).not.toContain("login");
  expect(result.commands).not.toContain("pull");
});
test("a service that is stopped is started by the deployment", async () => {
  // A stopped service is the state the deployment exists to fix, so it must
  // not be the state that stops the deployment. The container still knows
  // the image it was running, which is what the rollback restores.
  const result = await deploy({ MOCK_RUNNING: "false" });
  expect(result.code).toBe(0);
  expect(result.commands).toContain("systemctl --user restart foodshare-web");
  expect(result.dropin.trim()).toBe(`Image=${image}`);
});
test("a host that has never run the app stops the deployment", async () => {
  // There is no previous image to roll back to, and the unit has to be
  // installed before the app can be started at all.
  const result = await deploy({ MOCK_MISSING: "1" });
  expect(result.code).not.toBe(0);
  expect(result.error).toContain("does not exist on this host");
  expect(result.dropin).toBe("");
  expect(result.environment).toBe(oldEnvironment);
});
test("a host with no environment file is given one", async () => {
  // The deployment writes the file, so requiring it to be there first was
  // the second way a deployment could not bring a host back.
  const result = await deploy({ MOCK_NO_ENV: "1" });
  expect(result.code).toBe(0);
  expect(result.environment).toContain('NEXT_PUBLIC_SUPABASE_URL="https://new.example"');
  expect(result.environment).not.toContain("EXISTING_SETTING");
});
test("a host that had no environment file has none again after a rollback", async () => {
  const result = await deploy({ MOCK_NO_ENV: "1", MOCK_HEALTH_FAIL: "1" });
  expect(result.code).not.toBe(0);
  expect(result.environment).toBe("");
});
test("a registry failure or wrong revision leaves the running image and settings intact", async () => {
  for (const configuration of [{ MOCK_PULL_FAIL: "1" }, { MOCK_REVISION: "wrong-commit" }]) {
    const result = await deploy(configuration);
    expect(result.code).not.toBe(0);
    expect(result.dropin).toBe("");
    expect(result.environment).toBe(oldEnvironment);
  }
});
test("deploys the immutable validated image by pinning it in the unit's drop-in", async () => {
  const result = await deploy();
  expect(result.code).toBe(0);
  expect(result.commands).toContain(`pull ${image}`);
  expect(result.dropin.trim()).toBe(`Image=${image}`);
  expect(result.commands).toContain("systemctl --user restart foodshare-web");
  expect(result.environment).toContain("EXISTING_SETTING=preserved");
  expect(result.environment).toContain('NEXT_PUBLIC_SUPABASE_URL="https://new.example"');
  expect(result.environment).not.toContain("NODE_TLS_REJECT_UNAUTHORIZED");
  expect(result.commands + result.output + result.error).not.toContain("registry-test-secret");
});
test("the tunnel token is written under both names the units read", async () => {
  const result = await deploy({ CLOUDFLARE_TUNNEL_TOKEN: "tunnel-token" });
  expect(result.code).toBe(0);
  expect(result.environment).toContain('CLOUDFLARE_TUNNEL_TOKEN="tunnel-token"');
  expect(result.environment).toContain('TUNNEL_TOKEN="tunnel-token"');
});
test("failed health checks restore the exact previous image and settings", async () => {
  for (const configuration of [{ MOCK_HEALTH_FAIL: "1" }, { MOCK_API_FAIL: "1" }]) {
    const result = await deploy(configuration);
    expect(result.code).not.toBe(0);
    // The image that was running, by id — the `:latest` tag may have moved
    // since it was pulled, so the tag is not what was running.
    expect(result.dropin.trim()).toBe("Image=sha256:previous");
    expect(result.environment).toBe(oldEnvironment);
  }
});
