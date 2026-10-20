// One-shot autofix for TS1484 (verbatimModuleSyntax): converts type-only
// named imports to `import type` or inline `type` qualifiers.
// Usage: bun scripts/fix-verbatim-imports.ts

// This file has no imports or exports of its own, so without this it is a
// script rather than a module — and a module is what allows the top-level
// `await` below.
export {};

const tsc = Bun.spawnSync(["bun", "node_modules/typescript/bin/tsc", "--noEmit", "--verbatimModuleSyntax"], {
  stdout: "pipe",
  stderr: "pipe",
});
const out = `${tsc.stdout?.toString() ?? ""}${tsc.stderr?.toString() ?? ""}`;

// file -> line(1-based) -> Set<flagged names>
const flagged = new Map<string, Map<number, Set<string>>>();
for (const m of out.matchAll(/^(.+?)\((\d+),\d+\): error TS1484: '([^']+)'/gm)) {
  const [, file, lineStr, name] = m;
  if (!file || !lineStr || !name) continue;
  if (file.startsWith("node_modules/")) continue;
  let perFile = flagged.get(file);
  if (!perFile) {
    perFile = new Map();
    flagged.set(file, perFile);
  }
  const line = Number(lineStr);
  let set = perFile.get(line);
  if (!set) {
    set = new Set();
    perFile.set(line, set);
  }
  set.add(name);
}

let changedFiles = 0;
for (const [file, perFile] of flagged) {
  const lines = (await Bun.file(file).text()).split("\n");
  let changed = false;
  for (const [lineNo, names] of perFile) {
    const idx = lineNo - 1;
    const line = lines[idx];
    if (!line || !line.includes("import")) continue;
    // Match: import [Default, ]{ A, B as C } from / import X from
    const named = line.match(/import\s+(?:(\w+)\s*,\s*)?\{([^}]*)\}/);
    if (!named) continue;
    const [, def, list] = named;
    if (list === undefined) continue;
    const parts = list
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const flaggedBase = new Set([...names].map((n) => n.trim()));
    // Determine exported local names (handle `A as B` -> local B)
    const isTypePart = (part: string): boolean => {
      const m2 = part.match(/^(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
      if (!m2) return false;
      const local = m2[2] ?? m2[1] ?? "";
      return flaggedBase.has(local ?? "");
    };
    if (parts.length > 0 && parts.every(isTypePart) && !def) {
      // All named bindings are types and no default import -> whole import is type-only
      lines[idx] = line
        .replace("import", "import type")
        .replace(/\{?\s*type\s+/g, (s) => (s.startsWith("{") ? "{ " : "type "))
        .replace("import type", "import type");
      // Clean any leftover inline `type` qualifiers
      lines[idx] = (lines[idx] ?? "").replace(/import type\s*\{([^}]*)\}/, (_, inner: string) => {
        return `import type {${inner.replace(/\btype\s+/g, "")}}`;
      });
      changed = true;
    } else {
      // Mixed: prefix flagged bindings with inline `type`
      const fixed = parts.map((part) => {
        if (part.startsWith("type ")) return part;
        const m2 = part.match(/^(\w+)(\s+as\s+\w+)?$/);
        if (!m2) return part;
        const local = (m2[2] ? part.split(/\s+as\s+/)[1] : m2[1]) ?? "";
        if (flaggedBase.has((local ?? "").trim())) return `type ${part}`;
        return part;
      });
      const defPart = def ? `${def}, ` : "";
      lines[idx] = (line ?? "").replace(
        /import\s+(?:\w+\s*,\s*)?\{[^}]*\}/,
        `import ${defPart}{ ${fixed.join(", ")} }`,
      );
      changed = true;
    }
  }
  if (changed) {
    await Bun.write(file, lines.join("\n"));
    changedFiles++;
  }
}
console.log(`Fixed imports in ${changedFiles} files (${flagged.size} files with TS1484).`);
