#!/usr/bin/env bun

/**
 * Audit Vercel API Routes Usage
 *
 * Scans codebase to find which API routes are actually called
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";

const API_ROUTES_DIR = "src/app/api";
const SRC_DIR = "src";

// Find all API route files
async function findAPIRoutes(dir: string): Promise<string[]> {
  const routes: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...(await findAPIRoutes(path)));
    } else if (entry.name === "route.ts" || entry.name === "route.js") {
      // Extract route path from directory structure
      const routePath = path
        .replace("src/app", "")
        .replace("/route.ts", "")
        .replace("/route.js", "");
      routes.push(routePath);
    }
  }

  return routes;
}

// Search for fetch calls to API routes
async function findAPIUsage(dir: string, apiRoute: string): Promise<string[]> {
  const usages: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory() && !path.includes("node_modules") && !path.includes(".next")) {
      usages.push(...(await findAPIUsage(path, apiRoute)));
    } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
      const content = await readFile(path, "utf-8");

      // Check for fetch calls to this route
      const patterns = [
        `fetch('${apiRoute}`,
        `fetch("${apiRoute}`,
        `fetch(\`${apiRoute}`,
        `axios.get('${apiRoute}`,
        `axios.post('${apiRoute}`,
      ];

      if (patterns.some((p) => content.includes(p))) {
        usages.push(path);
      }
    }
  }

  return usages;
}

// Main audit
async function audit() {
  console.log("🔍 Auditing Vercel API Routes Usage\n");

  const routes = await findAPIRoutes(API_ROUTES_DIR);
  console.log(`Found ${routes.length} API routes\n`);

  const results: { route: string; used: boolean; files: string[] }[] = [];

  for (const route of routes) {
    const usages = await findAPIUsage(SRC_DIR, route);
    results.push({
      route,
      used: usages.length > 0,
      files: usages,
    });
  }

  // Summary
  const used = results.filter((r) => r.used);
  const unused = results.filter((r) => !r.used);

  console.log("📊 Summary:");
  console.log(`✅ Used routes: ${used.length}`);
  console.log(`❌ Unused routes: ${unused.length}\n`);

  console.log("🗑️  Unused Routes (Safe to Delete):");
  unused.forEach((r) => console.log(`  - ${r.route}`));

  console.log("\n✅ Used Routes (Need Migration):");
  used.forEach((r) => {
    console.log(`  - ${r.route}`);
    console.log(`    Used in: ${r.files.length} file(s)`);
  });

  // Export results
  await Bun.write("api-usage-audit.json", JSON.stringify(results, null, 2));

  console.log("\n💾 Full results saved to: api-usage-audit.json");
}

audit().catch(console.error);
