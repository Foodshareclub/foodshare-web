import { expect, test } from "bun:test";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const sha = "a".repeat(40);
const image = `ghcr.io/foodshareclub/foodshare-web@sha256:${"b".repeat(64)}`;
const oldEnvironment =
  "EXISTING_SETTING=preserved\nNEXT_PUBLIC_SUPABASE_URL=https://old.example\nNODE_TLS_REJECT_UNAUTHORIZED=0\n";
const script = resolve(import.meta.dir, "../../..", "scripts/deploy-production.sh");

async function deploy(options: Record<string, string> = {}, check = false) {
  const directory = await mkdtemp(join(tmpdir(), "foodshare-web-deploy-"));
  try {
    await Bun.write(join(directory, ".env.production"), oldEnvironment);
    await Bun.write(join(directory, "docker-compose.yml"), "services: {}\n");
    await Bun.write(
      join(directory, "docker"),
      `#!/bin/bash
printf '%s\\n' "$*" >> "$MOCK_DIRECTORY/commands"
if [ "\${1:-}" = --config ]; then shift 2; fi
case "$1 $2" in
  "container inspect")
    if [[ "$*" == *State.Running* ]]; then echo "\${MOCK_RUNNING:-true}"; else echo sha256:previous; fi ;;
  "compose -f")
    if [[ "$*" == *" up "* ]]; then echo "$FOODSHARE_WEB_IMAGE" >> "$MOCK_DIRECTORY/images"; fi ;;
  "login ghcr.io") cat >/dev/null ;;
  "pull "*) [ "\${MOCK_PULL_FAIL:-0}" != 1 ] ;;
  "image inspect") echo "\${MOCK_REVISION:-$DEPLOY_SHA}" ;;
  "exec foodshare-web") [ "\${MOCK_HEALTH_FAIL:-0}" != 1 ] ;;
  "exec -i") cat >/dev/null; [ "\${MOCK_API_FAIL:-0}" != 1 ] ;;
  *) exit 2 ;;
esac
`
    );
    await Bun.write(join(directory, "podman"), '#!/bin/sh\necho "${MOCK_PODMAN:-false}"\n');
    await Bun.write(join(directory, "sleep"), "#!/bin/sh\nexit 0\n");
    for (const name of ["docker", "podman", "sleep"]) await chmod(join(directory, name), 0o700);
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
    const imageFile = Bun.file(join(directory, "images"));
    return {
      code,
      output,
      error,
      commands: (await commandFile.exists()) ? await commandFile.text() : "",
      images: (await imageFile.exists()) ? await imageFile.text() : "",
      environment: await Bun.file(join(directory, ".env.production")).text(),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("production preflight only inspects configuration and the existing service", async () => {
  const result = await deploy({}, true);
  expect(result.code).toBe(0);
  expect(result.environment).toBe(oldEnvironment);
  expect(result.images).toBe("");
  expect(result.commands).not.toContain("login");
});
test("missing or ambiguous services stop before any deployment", async () => {
  for (const configuration of [{ MOCK_RUNNING: "false" }, { MOCK_PODMAN: "true" }]) {
    const result = await deploy(configuration);
    expect(result.code).not.toBe(0);
    expect(result.images).toBe("");
    expect(result.environment).toBe(oldEnvironment);
  }
});
test("a registry failure or wrong revision leaves the running image and settings intact", async () => {
  for (const configuration of [{ MOCK_PULL_FAIL: "1" }, { MOCK_REVISION: "wrong-commit" }]) {
    const result = await deploy(configuration);
    expect(result.code).not.toBe(0);
    expect(result.images).toBe("");
    expect(result.environment).toBe(oldEnvironment);
  }
});
test("deploys the immutable validated image without touching other services or logging credentials", async () => {
  const result = await deploy();
  expect(result.code).toBe(0);
  expect(result.images.trim()).toBe(image);
  expect(result.commands).toContain("compose -f docker-compose.yml up -d --no-deps foodshare-web");
  expect(result.environment).toContain("EXISTING_SETTING=preserved");
  expect(result.environment).toContain('NEXT_PUBLIC_SUPABASE_URL="https://new.example"');
  expect(result.environment).not.toContain("NODE_TLS_REJECT_UNAUTHORIZED");
  expect(result.commands + result.output + result.error).not.toContain("registry-test-secret");
});
test("failed health checks restore the exact previous image and settings", async () => {
  for (const configuration of [{ MOCK_HEALTH_FAIL: "1" }, { MOCK_API_FAIL: "1" }]) {
    const result = await deploy(configuration);
    expect(result.code).not.toBe(0);
    expect(result.images.trim().split("\n")).toEqual([image, "sha256:previous"]);
    expect(result.environment).toBe(oldEnvironment);
  }
});
