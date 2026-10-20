// Keep formatting adoption incremental while Oxlint and TypeScript check the
// entire repository. CI supplies the exact PR/push base, so every changed source
// file is checked without rewriting unrelated legacy files.
async function git(...args: string[]): Promise<string[]> {
  const process = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "inherit" });
  const output = await new Response(process.stdout).text();
  if (await process.exited) throw new Error("Cannot determine changed source files");
  return output.trim().split("\n").filter(Boolean);
}
const base = process.env.BIOME_BASE_REF || "HEAD";
const files = new Set([
  ...(await git("diff", "--name-only", "--diff-filter=ACMR", base, "--", "src", "scripts")),
  ...(await git("ls-files", "--others", "--exclude-standard", "--", "src", "scripts")),
]);
const sources = [...files].filter((file) => /\.[cm]?[jt]sx?$/.test(file));
if (sources.length) {
  const check = Bun.spawn(["bunx", "@biomejs/biome@1.9.4", "check", ...sources], {
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(await check.exited);
}
console.log("No changed TypeScript or JavaScript files to format");
