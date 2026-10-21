import { chmod, mkdir, mkdtemp, readdir, rm } from "bun:fs/promises";
import { tmpdir } from "bun:os";
import { dirname, join, resolve } from "bun:path";
import { expect, test } from "bun:test";

const repoRoot = resolve(import.meta.dir, "../../..");
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
    // Where the deployment will write the environment file.
    //
    // A host can carry the other generation of the unit, one that reads
    // its environment from somewhere else, and the deployment follows the
    // unit. The test asks for that host by naming the file in the unit,
    // and the file is not overridden -- an override would take the
    // decision away from the unit.
    const unitEnvironmentFile = options.MOCK_UNIT_ENV ? join(directory, options.MOCK_UNIT_ENV) : environmentFile;
    if (options.MOCK_UNIT_ENV) {
      await mkdir(dirname(unitEnvironmentFile), { recursive: true });
    }
    // A host whose environment file was lost, or that was reprovisioned,
    // has none. The deployment writes it, so the test has to be able to
    // ask for a host without one.
    if (options.MOCK_NO_ENV !== "1") await Bun.write(unitEnvironmentFile, oldEnvironment);
    await mkdir(join(unitDirectory, "foodshare-web.container.d"), { recursive: true });
    // A host that was reprovisioned has no unit either. The deployment
    // installs it from the repository, so the test has to be able to ask
    // for a host without one.
    if (options.MOCK_NO_UNIT !== "1") {
      if (options.MOCK_UNIT_GENERATION === "systemd") {
        // A host carrying the newer generation of the unit: the file is
        // the repository's own, so the deployment recognises it.
        await Bun.write(
          join(unitDirectory, "foodshare-web.container"),
          await Bun.file(join(repoRoot, "systemd", "foodshare-web.container")).text(),
        );
      } else {
        await Bun.write(
          join(unitDirectory, "foodshare-web.container"),
          `[Container]\nImage=ghcr.io/foodshareclub/foodshare-web:latest\nEnvironmentFile=${unitEnvironmentFile}\n`,
        );
      }
    }
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
  "secret inspect") [ "\${MOCK_SECRET_EXISTS:-0}" = 1 ] ;;
  "secret create") cat >/dev/null ;;
  "exec foodshare-web")
    if [ "\${MOCK_INTERRUPT:-0}" = 1 ]; then
      touch "$MOCK_DIRECTORY/health-probe-started"
      /bin/sleep 2
    fi
    [ "\${MOCK_HEALTH_FAIL:-0}" != 1 ] ;;
  "exec -i") cat >/dev/null; [ "\${MOCK_API_FAIL:-0}" != 1 ] ;;
  *) exit 2 ;;
esac
`,
    );
    await Bun.write(
      join(directory, "systemctl"),
      `#!/bin/bash
printf 'systemctl %s\\n' "$*" >> "$MOCK_DIRECTORY/commands"
if [ "\$1" = "--user" ] && [ "\$2" = "daemon-reload" ]; then
  if [ -f "\${MOCK_ENV_FILE:-/nonexistent}" ]; then
    printf 'env-file: present\\n' >> "$MOCK_DIRECTORY/commands"
  else
    printf 'env-file: missing\\n' >> "$MOCK_DIRECTORY/commands"
  fi
fi
`,
    );
    await Bun.write(join(directory, "sleep"), "#!/bin/sh\nexit 0\n");
    for (const name of ["podman", "systemctl", "sleep"]) await chmod(join(directory, name), 0o700);
    const child = Bun.spawn(["bash", script, ...(check ? ["--check"] : [])], {
      cwd: directory,
      env: {
        PATH: `${directory}:${process.env.PATH}`,
        MOCK_DIRECTORY: directory,
        MOCK_ENV_FILE: environmentFile,
        HOME: process.env.HOME ?? "/home/tester",
        DEPLOY_SHA: sha,
        DEPLOY_IMAGE: image,
        GITHUB_TOKEN: "registry-test-secret",
        GITHUB_ACTOR: "test-user",
        NEXT_PUBLIC_SUPABASE_URL: "https://new.example",
        // Only when the unit does not say where the file is: an override
        // takes the decision away from the unit, and the unit is what
        // decides.
        ...(options.MOCK_UNIT_ENV ? {} : { FOODSHARE_WEB_ENV_FILE: environmentFile }),
        FOODSHARE_WEB_UNIT_DIR: unitDirectory,
        ...options,
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    // A deployment that is interrupted: the run is cancelled by a newer
    // push, or the runner goes away. The image is pinned and the health
    // check has not answered, and that is the state the host is left in
    // unless the deployment puts it back.
    if (options.MOCK_INTERRUPT === "1") {
      // Wait until the health probe has actually started, so the
      // interruption lands in the middle of the deployment and not after
      // it. The mock's own `sleep` exits at once, so the wait is the
      // system one, by its full path.
      for (let attempt = 0; attempt < 200; attempt++) {
        if (await Bun.file(join(directory, "health-probe-started")).exists()) break;
        await Bun.sleep(50);
      }
      child.kill("SIGTERM");
    }
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
      environment: (await Bun.file(unitEnvironmentFile).exists()) ? await Bun.file(unitEnvironmentFile).text() : "",
      units: (await readdir(unitDirectory).catch(() => [])).sort().join(" "),
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
test("the environment file is written where the unit on the host reads it", async () => {
  // Two generations of the unit exist: one that reads the environment
  // file from /etc, and a newer one that reads it from the operator's
  // home. The unit on the host decides, and the deployment follows it --
  // otherwise the service starts with no configuration at all.
  const result = await deploy({ MOCK_UNIT_ENV: "/somewhere/else/web.env" });
  expect(result.code).toBe(0);
  expect(result.environment).toContain('NEXT_PUBLIC_SUPABASE_URL="https://new.example"');
  expect(result.commands).toContain("systemctl --user restart foodshare-web");
});
test("a host running the newer generation is not given the older one's units", async () => {
  // The two generations name their tunnel unit differently, so installing
  // the wrong one puts a second tunnel on a host that already has one:
  // two connectors, one token, and the second one is started by nothing.
  const result = await deploy({
    MOCK_UNIT_GENERATION: "systemd",
    CLOUDFLARE_TUNNEL_TOKEN: "tunnel-token",
  });
  expect(result.code).toBe(0);
  expect(result.units).toContain("foodshare.network");
  expect(result.units).toContain("foodshare-cloudflared.container");
  expect(result.units).not.toContain("foodshare-cloudflared-web.container");
  expect(result.units).not.toContain("foodshare-web-network.network");
});
test("a host whose tunnel reads a secret is given one", async () => {
  // The tunnel on a host that runs the newer unit reads its token from a
  // podman secret, and the secret is not there unless somebody makes it.
  const result = await deploy({ MOCK_UNIT_GENERATION: "systemd", CLOUDFLARE_TUNNEL_TOKEN: "tunnel-token" });
  expect(result.code).toBe(0);
  expect(result.commands).toContain("secret create cf_tunnel_token");
});
test("a secret that is already there is left alone", async () => {
  // Replacing a secret that a running container has mounted is a way to
  // break the tunnel that is working.
  const result = await deploy({
    MOCK_UNIT_GENERATION: "systemd",
    MOCK_SECRET_EXISTS: "1",
    CLOUDFLARE_TUNNEL_TOKEN: "tunnel-token",
  });
  expect(result.code).toBe(0);
  expect(result.commands).not.toContain("secret create");
});
test("an interrupted deployment puts the host back the way it was", async () => {
  // A newer push cancels the run and the runner can go away. Either way
  // the host is left holding the new image with no answer about whether
  // it is good, unless the deployment puts it back on the way out.
  const result = await deploy({ MOCK_INTERRUPT: "1" });
  expect(result.code).not.toBe(0);
  expect(result.dropin.trim()).toBe("Image=sha256:previous");
  expect(result.environment).toBe(oldEnvironment);
});
test("a host that has never run the app is installed and deployed", async () => {
  // The deployment installs the unit and writes the environment file, so
  // a host that was reprovisioned -- no container, no unit, no
  // environment file -- is brought back by the pipeline rather than by a
  // person over SSH.
  const result = await deploy({ MOCK_MISSING: "1", MOCK_NO_UNIT: "1", MOCK_NO_ENV: "1" });
  expect(result.code).toBe(0);
  expect(result.commands).toContain("systemctl --user restart foodshare-web");
  expect(result.dropin.trim()).toBe(`Image=${image}`);
  expect(result.environment).toContain('NEXT_PUBLIC_SUPABASE_URL="https://new.example"');
});
test("the environment file is written before the units are generated", async () => {
  // Quadlet refuses to generate a unit whose EnvironmentFile is not
  // there, and the deployment then says the unit does not exist when it
  // is sitting in the directory the whole time.
  //
  // The host that matters is the one that was reprovisioned: no unit and
  // no environment file, so the order is the whole difference.
  const result = await deploy({ MOCK_NO_UNIT: "1", MOCK_NO_ENV: "1" });
  expect(result.code).toBe(0);
  expect(result.commands).not.toContain("env-file: missing");
  expect(result.commands).toContain("env-file: present");
});
test("a host that had no image has no pinned image after a rollback", async () => {
  const result = await deploy({ MOCK_MISSING: "1", MOCK_HEALTH_FAIL: "1" });
  expect(result.code).not.toBe(0);
  expect(result.dropin).toBe("");
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
