#!/usr/bin/env bun
// Guard the toolchain against Node.js creeping back in.
//
// The project runs on Bun end to end: Bun is the package manager, the script
// runner, the TypeScript executor, the test runner and the Next.js runtime.
// Two things silently reintroduce Node:
//
//   1. `bunx <tool>` — unlike `bun run <script>` and `bun <bin>`, `bunx` does
//      NOT honour bunfig.toml's `[run] bun = true`. It reads the shebang of
//      the installed package instead, so `bunx eslint` executes ESLint on Node.
//      `bunx --bun <tool>` forces Bun's runtime.
//
//   2. An explicit `node`/`npm`/`npx` invocation.
//
//   3. `actions/setup-node` in a workflow — CI installing a Node toolchain for
//      a project that has none.
//
//   4. A `node:`-prefixed import, or a bare Node builtin import, in code that
//      only ever runs on Bun. See BUN_ONLY_DIRS.
//
// Deliberately NOT flagged:
//
//   - `node:`-prefixed import specifiers in `src/` outside the test tree.
//     Those files are bundled by Next.js, and the production bundle has to
//     keep working on the runtime the server ships with, so they name the
//     portable builtin modules rather than Bun's.
//
//   - `deno`. Supabase Edge Functions (`supabase/functions/**`) run on Deno's
//     runtime — that is a platform constraint, not a Node dependency.
//
//   - `NODE_ENV` and other environment variable names.
//
//   - `bunx` invocations of packages that ship platform-native binaries and
//     therefore never execute on Node. These are listed in NATIVE_BUNX.
//
// Usage: bun scripts/check-no-node.ts

const NATIVE_BUNX = [
  // Biome ships a Rust binary per platform; the npm package is only a
  // launcher, so `bunx @biomejs/biome` never touches Node.
  "@biomejs/biome",
  // Oxlint is a Rust binary too.
  "oxlint",
];

const NODE_TOOLS = ["node", "npm", "npx", "pnpm", "yarn"];

/**
 * Code that only ever executes on Bun, and therefore names Bun's own modules.
 *
 * `src/app` and the rest of the application tree are deliberately absent:
 * Next.js bundles those files, and the built output has to keep working on
 * whichever runtime serves it, so they use the portable `node:`-prefixed
 * builtin modules instead. Everything here is executed by `bun` directly —
 * never bundled — so it uses `bun:` and Bun's own APIs.
 *
 * `src/types/bun-modules.d.ts` declares the `bun:` modules as ambient
 * modules mirroring their `node:` counterparts, so the two spellings share one
 * set of types and cannot drift apart.
 */
const BUN_ONLY_DIRS = ["scripts", "commands", "e2e", "tools", "lib", "src/__tests__"];

/** The `bun:` module that replaces each `node:` builtin. */
const BUN_MODULE_FOR: Record<string, string> = {
  "node:path": "bun:path",
  "node:fs": "bun:fs",
  "node:fs/promises": "bun:fs/promises",
  "node:os": "bun:os",
  "node:util": "bun:util",
  "node:dns/promises": "bun:dns/promises",
  "node:url": "bun:url",
  "node:process": "process (a global, not a module)",
  "node:child_process": "Bun.spawn / Bun.spawnSync",
  "node:crypto": "Bun.CryptoHasher",
  "node:zlib": "Bun.gzipSync / Bun.gunzipSync",
  "node:stream": "Bun's ReadableStream / WritableStream",
  "node:buffer": "Bun's Buffer",
  "node:events": "EventTarget",
  "node:timers": "setTimeout / setInterval",
};

/**
 * Node builtins that may be imported without a prefix.
 *
 * A bare `import ... from "fs"` resolves to the Node builtin under `tsc` and
 * to the same module under Bun, but it reads as a Node dependency and is the
 * form the `node:`-prefixed rule exists to catch.
 */
const BARE_NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dns",
  "dgram",
  "events",
  "fs",
  "http",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

const ROOT_FILES = [
  "package.json",
  "bunfig.toml",
  "lefthook.yml",
  "Dockerfile",
  "docker-compose.yml",
  "foodshare-web.container",
  "foodshare-cloudflared-web.container",
  "playwright.config.ts",
  "next.config.ts",
];

// `.github/workflows` is scanned because CI is where Node used to hide: a
// workflow can install a Node toolchain (`actions/setup-node`) and run a
// `bunx` without `--bun`, and neither shows up in the source tree.
const SCANNED_DIRS = ["scripts", "commands", "e2e", "lib", "tools", ".github/workflows"];

const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sh", ".yml", ".yaml", ".json", ".toml"];

const SCRIPT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

type Violation = { file: string; line: number; text: string; reason: string };

/** Strip a whole-line comment so prose about Node is not mistaken for a command. */
function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("*");
}

/** True when the token at `index` sits where a shell would start a command. */
function isCommandPosition(line: string, index: number, isYaml = false): boolean {
  const before = line.slice(0, index).trimEnd();
  if (before === "") return true;
  // In YAML the command can sit directly behind a key — `run: npx foo` — so a
  // trailing colon is the only thing between the key and the command. Without
  // this, every inline `run:` step in a workflow slips past the guard.
  if (isYaml && before.endsWith(":")) return true;
  return (
    before.endsWith("&&") ||
    before.endsWith("||") ||
    before.endsWith(";") ||
    before.endsWith("|") ||
    before.endsWith("$(") ||
    before.endsWith("`") ||
    before.endsWith("[") ||
    before.endsWith('["') ||
    before.endsWith("['") ||
    before.endsWith('-c "') ||
    before.endsWith("-c '")
  );
}

/**
 * True when the token is part of an expression rather than a command.
 *
 * `node = value`, `node.foo`, `arr[node]` and `node: Type` are all ordinary
 * TypeScript — the identifier happens to be called "node" because these files
 * walk AST nodes. Only a token followed by an argument is a command.
 */
function isExpressionToken(line: string, index: number, length: number): boolean {
  const rest = line.slice(index + length);
  const next = rest.trimStart()[0];
  if (next === undefined) return true; // end of line
  return "=.,:;)]}>?".includes(next);
}

/** The package a `bunx` invocation refers to, without its version specifier. */
function stripVersion(pkg: string): string {
  const at = pkg.lastIndexOf("@");
  if (at > 0) return pkg.slice(0, at);
  return pkg;
}

/**
 * Parse the text following a `bunx` token into its package and whether Bun's
 * runtime is forced.
 *
 * Two shapes occur in this repo: the shell form (`bunx --bun <pkg> …`) and
 * the spawn form (`Bun.spawn(["bunx", "<pkg>", …])`).
 */
function parseBunx(rest: string): { forcedBun: boolean; pkg: string } {
  // Spawn form: ["bunx", "--bun", "<pkg>", …]
  const array = rest.match(/^["']?\s*,?\s*((?:\s*["'][^"']*["']\s*,?)+)/);
  if (array?.[1]) {
    const items = [...array[1].matchAll(/["']([^"']*)["']/g)].map((match) => match[1] ?? "");
    for (const item of items) {
      if (item.startsWith("-")) {
        if (item === "--bun") return { forcedBun: true, pkg: "" };
        continue;
      }
      return { forcedBun: false, pkg: stripVersion(item) };
    }
    return { forcedBun: false, pkg: "" };
  }

  // Shell form: bunx [--flags…] <pkg> [args…]
  let forcedBun = false;
  for (const token of rest.trim().split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith("-")) {
      if (token === "--bun") forcedBun = true;
      continue;
    }
    return { forcedBun, pkg: stripVersion(token.replace(/^["']|["']$/g, "")) };
  }
  return { forcedBun, pkg: "" };
}

function isNativeBunx(pkg: string): boolean {
  return NATIVE_BUNX.some((allowed) => pkg === allowed || pkg.startsWith(`${allowed}-`));
}

/**
 * Every place on the line where a Node tool could be launched.
 *
 * Two sources: bare tokens in command position (shell scripts, YAML hook
 * commands, Dockerfile directives) and string literals that begin with a
 * Node tool (TypeScript that spawns a command).
 */
function commandCandidates(
  line: string,
  isScript: boolean,
  isYaml = false,
): { tool: string; rest: string; lineRest: string }[] {
  const candidates: { tool: string; rest: string; lineRest: string }[] = [];

  for (const tool of [...NODE_TOOLS, "bunx"]) {
    const pattern = new RegExp(`(^|[^-\\w])(${tool})(?=\\s|$|["'])`, "g");
    for (const match of line.matchAll(pattern)) {
      const index = match.index + match[1].length;
      if (!isCommandPosition(line, index, isYaml)) continue;
      if (isExpressionToken(line, index, tool.length)) continue;
      candidates.push({ tool, rest: line.slice(index + tool.length), lineRest: "" });
    }
  }

  if (isScript) {
    for (const match of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      const content = match[2] ?? "";
      // A command has arguments. A bare tool name in a string is a type
      // literal (`type: "node" | "way"`), not an invocation.
      const lead = content.match(/^\s*(node|npm|npx|pnpm|yarn|bunx)(?=\s+\S)/);
      if (!lead?.[1]) continue;
      const tool = lead[1];
      // `node:fs` and friends are module specifiers, not the Node runtime.
      if (tool === "node" && content.slice(lead[0].length).startsWith(":")) continue;
      candidates.push({
        tool,
        rest: content.slice(lead[0].length),
        // The package of a spawn form ("bunx" as its own array element) only
        // appears in the next literal, so keep the rest of the line too.
        lineRest: line.slice(match.index + match[0].length),
      });
    }
  }

  return candidates;
}

/** True when the file lives in a directory that only ever runs on Bun. */
function isBunOnlyFile(file: string): boolean {
  return BUN_ONLY_DIRS.some((dir) => file.startsWith(`${dir}/`));
}

/**
 * Node builtins imported by a Bun-only file.
 *
 * Two shapes matter: the prefixed `node:fs` and the bare `fs`. Both name a
 * Node builtin module, and in code that only ever runs on Bun the `bun:`
 * spelling is the native one.
 */
function nodeBuiltinImports(line: string): string[] {
  const found: string[] = [];
  const pattern = /(?:from\s+|import\s+|require\(\s*)["']((?:node:)?[a-z_][a-z0-9_]*(?:\/[a-z_]+)*)["']/g;
  for (const match of line.matchAll(pattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    if (specifier.startsWith("node:")) {
      found.push(specifier);
      continue;
    }
    const root = specifier.split("/")[0] ?? "";
    if (root && BARE_NODE_BUILTINS.has(root)) found.push(specifier);
  }
  return found;
}

function checkLine(file: string, lineNumber: number, line: string, violations: Violation[]): void {
  if (isCommentLine(line)) return;

  const isScript = SCRIPT_EXTENSIONS.some((extension) => file.endsWith(extension));
  const isYaml = /\.(ya?ml)$/.test(file);
  const seen = new Set<string>();

  for (const candidate of commandCandidates(line, isScript, isYaml)) {
    if (candidate.tool !== "bunx") {
      const key = `${candidate.tool}:${candidate.rest.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push({
        file,
        line: lineNumber,
        text: line.trim(),
        reason: `\`${candidate.tool}\` invokes the Node.js toolchain — use Bun (\`bun\`, \`bunx --bun\`, \`bun run\`)`,
      });
      continue;
    }

    let { forcedBun, pkg } = parseBunx(candidate.rest);
    if (!pkg && !forcedBun && candidate.lineRest) {
      const fromLine = parseBunx(candidate.lineRest);
      pkg = fromLine.pkg;
      forcedBun = fromLine.forcedBun;
    }
    if (forcedBun) continue;
    if (pkg && isNativeBunx(pkg)) continue;

    const key = `bunx:${pkg}`;
    if (seen.has(key)) continue;
    seen.add(key);
    violations.push({
      file,
      line: lineNumber,
      text: line.trim(),
      reason: pkg
        ? `\`bunx ${pkg}\` runs on Node — use \`bunx --bun ${pkg}\`, or \`bun node_modules/<pkg>/bin/…\` for a local dependency`
        : "`bunx` without `--bun` runs on Node — use `bunx --bun <tool>`",
    });
  }
  // A `#!/usr/bin/env node` shebang pins the file to the Node runtime.
  if (/^#!\s*\/usr\/bin\/env\s+node\b/.test(line.trim())) {
    violations.push({
      file,
      line: lineNumber,
      text: line.trim(),
      reason: "node shebang — use `#!/usr/bin/env bun`",
    });
  }

  // A workflow that installs Node is a Node toolchain, however it is spelled.
  if (/actions\/setup-node\b/.test(line)) {
    violations.push({
      file,
      line: lineNumber,
      text: line.trim(),
      reason: "`actions/setup-node` installs a Node.js toolchain — this project runs on Bun",
    });
  }

  // `engines.node` in package.json is a promise that the project runs on Node.
  if (file === "package.json" && /"node"\s*:/.test(line)) {
    violations.push({
      file,
      line: lineNumber,
      text: line.trim(),
      reason: "`engines.node` declares a Node.js requirement — this project runs on Bun",
    });
  }

  // Bun-only code names Bun's modules, not Node's.
  if (isBunOnlyFile(file)) {
    for (const specifier of nodeBuiltinImports(line)) {
      const key = `builtin:${specifier}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const replacement = specifier.startsWith("node:")
        ? (BUN_MODULE_FOR[specifier] ?? specifier.replace(/^node:/, "bun:"))
        : `bun:${specifier}`;
      violations.push({
        file,
        line: lineNumber,
        text: line.trim(),
        reason: `\`${specifier}\` is a Node builtin — this file only runs on Bun, so use \`${replacement}\``,
      });
    }
  }
}

async function collectFiles(): Promise<string[]> {
  const files: string[] = [];

  for (const file of ROOT_FILES) {
    if (await Bun.file(file).exists()) files.push(file);
  }

  for (const dir of SCANNED_DIRS) {
    const glob = new Bun.Glob(`${dir}/**/*`);
    for await (const path of glob.scan({ cwd: "." })) {
      if (!SCAN_EXTENSIONS.some((extension) => path.endsWith(extension))) continue;
      files.push(path);
    }
  }

  return files.sort();
}

/**
 * Verify `bunfig.toml` sets `[run] bun = true`.
 *
 * Without it, `bun run <binary>` executes `node_modules/.bin/<binary>` by
 * honouring the `#!/usr/bin/env node` shebang that every JavaScript CLI in
 * the ecosystem ships. The process is then Node — which is not installed, so
 * the command dies with "command not found", or, worse, silently runs on a
 * different runtime than the rest of the toolchain assumes.
 *
 * This is the single setting that decides whether the toolchain is Bun or
 * Node, and it is invisible in a diff: removing it leaves every file in the
 * repository looking correct.
 */
async function checkBunfig(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const path = "bunfig.toml";

  if (!(await Bun.file(path).exists())) {
    violations.push({
      file: path,
      line: 1,
      text: "(missing)",
      reason:
        "`bunfig.toml` is missing — without `[run] bun = true`, `bun run <binary>` executes the binary's `#!/usr/bin/env node` shebang and runs it on Node",
    });
    return violations;
  }

  const text = await Bun.file(path).text();

  // Parse the TOML minimally: find the `[run]` table and look for `bun = true`
  // inside it. A full TOML parser is not worth a dependency here, and the
  // setting has exactly one legal spelling.
  const runTable = /^\s*\[run\]\s*$/m.exec(text);
  if (!runTable) {
    violations.push({
      file: path,
      line: 1,
      text: text.trim().split("\n")[0] ?? "",
      reason: "`bunfig.toml` has no `[run]` table — add `[run]` with `bun = true` so `bun run <binary>` runs on Bun",
    });
    return violations;
  }

  const afterRunTable = text.slice(runTable.index);
  // The `[run]` table ends at the next table header. `afterRunTable` starts
  // with the `[run]` line itself, so search for the next header *after* it.
  const nextTable = /^\s*\[/m.exec(afterRunTable.slice(runTable[0].length));
  const runSection = nextTable
    ? afterRunTable.slice(0, runTable[0].length + nextTable.index)
    : afterRunTable;

  if (!/^\s*bun\s*=\s*true\s*$/m.test(runSection)) {
    violations.push({
      file: path,
      line: 1,
      text: runSection.trim().split("\n")[0] ?? "",
      reason:
        "`[run] bun = true` is not set — `bun run <binary>` would honour the binary's `#!/usr/bin/env node` shebang and run it on Node",
    });
  }

  return violations;
}

const violations: Violation[] = [];
const files = await collectFiles();

for (const file of files) {
  // The guard necessarily contains the very patterns it looks for.
  if (file === "scripts/check-no-node.ts") continue;
  const text = await Bun.file(file).text();
  text.split("\n").forEach((line, index) => checkLine(file, index + 1, line, violations));
}

violations.push(...(await checkBunfig()));

if (violations.length > 0) {
  console.error("❌ Node.js usage found in the toolchain:\n");
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}`);
    console.error(`    ${violation.text}`);
    console.error(`    → ${violation.reason}\n`);
  }
  console.error(`${violations.length} violation(s) across ${files.length} scanned file(s).`);
  process.exit(1);
}

console.log(`✅ No Node.js usage in the toolchain (${files.length} file(s) scanned)`);
