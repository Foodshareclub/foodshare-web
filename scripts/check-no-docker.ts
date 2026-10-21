#!/usr/bin/env bun
// Guard the repository against the Docker product creeping back in.
//
// This project runs on Podman. There is no Docker daemon on the host, on
// the CI runner, or on a developer machine, so a Docker reference is
// always a mistake.
//
// The guard checks for the two things that would actually let Docker back
// in -- a Docker-named file, and a Docker command -- rather than the word
// "docker" in prose. Prose about the Docker API, the Compose
// Specification's own label namespace, the `docker.io` registry hostname,
// and the history of the migration are all legitimate and must not be
// flagged.
//
// Usage: bun scripts/check-no-docker.ts

import { readdir } from "bun:fs/promises";
import { join } from "bun:path";

/**
 * File names that name the Docker product's own build artefacts.
 *
 * `Dockerfile.caddy` and friends are covered too: a variant is still a
 * Docker-named file, and a reader who trusts the filename will reach for a
 * binary that is not installed anywhere.
 */
const BANNED_FILENAME = /^(Dockerfile(\..*)?|\.dockerignore)$/;

/**
 * The Docker product's own compose file name, and its variants.
 *
 * The Compose Specification's own name -- `compose.yaml` -- is not banned.
 * Podman implements the specification, so a file called `compose.yaml` is
 * the correct name for the same thing, and the backend repository uses it.
 */
const BANNED_COMPOSE = /^docker-compose(\..*)?\.(ya?ml)$/;

/**
 * The Docker commands, as they would appear at the start of a shell
 * command or a YAML `run:` step.
 *
 * Matched as a whole word so that `docker.io/library/postgres` (the
 * registry hostname), `host.docker.internal` (the local-development
 * hostname) and `com.docker.compose` (the Compose Specification's label
 * namespace) are not caught: none of them is a command.
 */
const DOCKER_COMMAND = /(^|[\s"'`=(|;&])docker(\s|$)/;

/**
 * A YAML step that runs something.
 *
 * A leading "-" is a markdown list item, and a list item is prose. But in a
 * workflow the dash is a YAML sequence entry, and "- run: docker ps" is a
 * command. What follows the dash is the difference.
 */
const YAML_STEP = /^-\s*(run|uses|with)\s*:/;

/**
 * A GitHub Action published by the Docker product.
 *
 * `docker/build-push-action` is the Docker product's own action, and the
 * command regex does not catch it: the name is a path segment, not a
 * command.
 */
const DOCKER_ACTION = /uses:\s*docker\//;

/** This file names the thing it forbids, so it is not checked against itself. */
const SELF = "scripts/check-no-docker.ts";

const SKIPPED = new Set([
  ".git",
  ".history",
  ".next",
  ".snapshots",
  "artifacts",
  "coverage",
  "dist",
  "logs",
  "node_modules",
  "test-results",
]);

/**
 * The directories whose contents are the project's own source.
 *
 * Documentation and the plan files are not here on purpose: they record
 * the migration, and a record of why the runtime changed is not a Docker
 * reference. The same goes for the vendored `messages/` translations and
 * the static assets in `public/`.
 */
const CODE_DIRECTORIES = [".github", "commands", "e2e", "patches", "scripts", "src", "supabase", "tools"];

async function walk(directory: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (SKIPPED.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found;
}

/** The repository's own files: the top level, plus the code directories. */
async function collectFiles(): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(".", { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (SKIPPED.has(entry.name)) continue;
    if (entry.isDirectory()) continue;
    found.push(entry.name);
  }
  for (const directory of CODE_DIRECTORIES) {
    found.push(...(await walk(directory)));
  }
  return found;
}

const violations: string[] = [];

for (const file of await collectFiles()) {
  if (file === SELF) continue;
  const name = file.split("/").pop() ?? file;

  if (BANNED_FILENAME.test(name)) {
    violations.push(`${file} names the Docker product's build artefact (use Containerfile)`);
  }
  if (BANNED_COMPOSE.test(name)) {
    violations.push(`${file} uses the Docker product's compose file name (use compose.yaml)`);
  }

  const text = await Bun.file(file)
    .text()
    .catch(() => null);
  if (text === null) continue;
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    const trimmed = line.trimStart();
    // Prose about Docker -- in a comment, or in a plan that records the
    // migration -- is not a Docker command. Only a line that would
    // actually run one is a violation. A leading "-" is a list item or a
    // SQL comment, so those are prose too -- unless the item is a YAML
    // step, where the dash is syntax and the command is the value.
    if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    if (trimmed.startsWith("-") && !YAML_STEP.test(trimmed)) continue;
    if (DOCKER_ACTION.test(line)) {
      violations.push(`${file}:${index + 1} uses a Docker action: ${line.trim()}`);
      continue;
    }
    if (!DOCKER_COMMAND.test(line)) continue;
    violations.push(`${file}:${index + 1} runs a Docker command: ${line.trim()}`);
  }
}

if (violations.length > 0) {
  console.error("❌ The Docker guard found the Docker product in the repository:\n");
  for (const violation of violations) console.error(`   ${violation}`);
  console.error(
    [
      "",
      "This estate runs on Podman. Docker is not installed on the host, on",
      "the CI runner, or on a developer machine, so a Docker command cannot",
      "work and a Docker-named file misleads the next reader.",
      "",
      "Use `podman` and the Containerfile. The Compose Specification's",
      "`com.docker.compose.*` labels, the `docker.io` registry hostname, and",
      "the Docker API socket path are protocol, not branding, and are allowed.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("✅ The Docker guard is happy: no Docker product, no Docker commands.");
