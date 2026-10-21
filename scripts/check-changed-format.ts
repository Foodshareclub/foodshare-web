// Keep formatting adoption incremental while Oxlint and TypeScript check the
// entire repository. CI supplies the exact PR/push base, so every changed source
// file is checked without rewriting unrelated legacy files.
import { $ } from "bun";

async function git(...args: string[]): Promise<string[]> {
  const process = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "inherit" });
  const output = await new Response(process.stdout).text();
  if (await process.exited) throw new Error("Cannot determine changed source files");
  return output.trim().split("\n").filter(Boolean);
}
// Biome is configured to ignore some paths — the vendored WebAssembly
// modules among them. Handing biome a list of files it is going to
// ignore is not a formatting problem; it is a "no files were processed"
// error, and a commit that touches nothing but generated modules would
// fail the lint job over it. The ignore list is read from the Biome
// configuration rather than repeated here, so the two cannot disagree.
const biomeIgnorePatterns: string[] = [];
try {
  const config = JSON.parse(await Bun.file("biome.json").text());
  biomeIgnorePatterns.push(...(config.files?.ignore ?? []));
} catch {
  // No configuration to read; nothing is ignored.
}
const biomeIgnores = biomeIgnorePatterns.map((pattern) => new Bun.Glob(pattern));
const ignored = (file: string) => biomeIgnores.some((glob) => glob.match(file));

const base = process.env.BIOME_BASE_REF || "HEAD";
const files = new Set([
  ...(await git("diff", "--name-only", "--diff-filter=ACMR", base, "--", "src", "scripts")),
  ...(await git("ls-files", "--others", "--exclude-standard", "--", "src", "scripts")),
]);
const sources = [...files].filter((file) => /\.[cm]?[jt]sx?$/.test(file)).filter((file) => !ignored(file));
if (sources.length) {
  // `bun run biome`, not `bunx @biomejs/biome`: the local devDependency is
  // under the lockfile, so the version that formats the code is the version
  // the repository pinned — not whatever the registry serves today.
  //
  // And it is `bun run` rather than a direct `bunx`: `bunx` resolves a
  // package's own `#!/usr/bin/env node` shebang, so Biome's launcher would
  // run on Node.js. `bunfig.toml`'s `[run] bun = true` does not reach `bunx`.
  // Biome's npm entry point is a Node script that spawns the real binary, so
  // the launcher is the part that has to be on Bun.
  // Bun Shell, because the exit code is the verdict and the output belongs
  // on the terminal as it happens.
  const { exitCode } = await $`bun run biome check ${sources}`.nothrow();
  process.exit(exitCode);
}
console.log("No changed TypeScript or JavaScript files to format");
