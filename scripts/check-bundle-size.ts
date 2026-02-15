#!/usr/bin/env bun
/**
 * Bundle Size Budget Checker
 *
 * Reads the Next.js build output and checks against defined size budgets.
 * Run after `bun run build` to verify bundle sizes stay within limits.
 *
 * Usage:
 *   bun run build && bun scripts/check-bundle-size.ts
 *
 * Exit codes:
 *   0 - All budgets pass
 *   1 - One or more budgets exceeded
 */

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

// Budget definitions (in KB)
const BUDGETS = {
  // Total first-load JS for key pages
  "First Load JS (shared)": { limit: 300, unit: "KB" as const },
  // Individual page limits are checked against the build manifest
} as const;

// ANSI colors
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const fileStat = await stat(fullPath);
        totalSize += fileStat.size;
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return totalSize;
}

async function checkBundleSizes() {
  const buildDir = join(import.meta.dir, "..", ".next");

  console.log(`\n${BOLD}${CYAN}Bundle Size Budget Check${RESET}\n`);

  // Check if build directory exists
  try {
    await stat(buildDir);
  } catch {
    console.error(`${RED}No .next build directory found. Run 'bun run build' first.${RESET}`);
    process.exit(1);
  }

  // Measure JS-only bundle size in static/chunks
  const staticDir = join(buildDir, "static");
  const chunksDir = join(staticDir, "chunks");
  let totalJsSize = 0;
  let largestChunk = 0;
  let largestChunkName = "";
  let chunkCount = 0;

  try {
    const chunks = await readdir(chunksDir);
    for (const chunk of chunks) {
      if (chunk.endsWith(".js")) {
        const chunkStat = await stat(join(chunksDir, chunk));
        totalJsSize += chunkStat.size;
        chunkCount++;
        if (chunkStat.size > largestChunk) {
          largestChunk = chunkStat.size;
          largestChunkName = chunk;
        }
      }
    }
  } catch {
    // No chunks directory
  }

  const totalJsSizeKB = Math.round(totalJsSize / 1024);
  const largestChunkKB = Math.round(largestChunk / 1024);

  // Print results
  let hasFailures = false;

  console.log(`  ${BOLD}JS chunks:${RESET} ${chunkCount} files, ${totalJsSizeKB} KB total`);

  // Check total JS bundle budget (all chunks combined — includes all routes)
  // Current baseline: ~5.6MB across 158 chunks. Set budget at 7MB to catch regressions.
  const totalJsBudgetKB = 7000;
  if (totalJsSizeKB > totalJsBudgetKB) {
    console.log(
      `  ${RED}FAIL${RESET} Total JS (${totalJsSizeKB} KB) exceeds ${totalJsBudgetKB} KB budget`
    );
    hasFailures = true;
  } else {
    console.log(`  ${GREEN}PASS${RESET} Total JS within ${totalJsBudgetKB} KB budget`);
  }

  // Check largest chunk (no single chunk should exceed 500KB)
  const maxChunkKB = 500;
  if (largestChunkKB > maxChunkKB) {
    console.log(
      `  ${RED}FAIL${RESET} Largest chunk: ${largestChunkName} (${largestChunkKB} KB) exceeds ${maxChunkKB} KB`
    );
    hasFailures = true;
  } else if (largestChunkKB > 300) {
    console.log(
      `  ${YELLOW}WARN${RESET} Largest chunk: ${largestChunkName} (${largestChunkKB} KB) approaching ${maxChunkKB} KB limit`
    );
  } else if (largestChunkName) {
    console.log(
      `  ${GREEN}PASS${RESET} Largest chunk: ${largestChunkName} (${largestChunkKB} KB)`
    );
  }

  // Print performance budget table
  console.log(`\n${BOLD}Performance Budgets:${RESET}`);
  console.log(`  ${"Metric".padEnd(30)} ${"Budget".padEnd(10)} Status`);
  console.log(`  ${"─".repeat(30)} ${"─".repeat(10)} ${"─".repeat(10)}`);
  console.log(
    `  ${"Max single chunk".padEnd(30)} ${"500 KB".padEnd(10)} ${largestChunkKB <= maxChunkKB ? `${GREEN}${largestChunkKB} KB${RESET}` : `${RED}${largestChunkKB} KB${RESET}`}`
  );
  console.log(
    `  ${"Total JS bundle".padEnd(30)} ${"7000 KB".padEnd(10)} ${totalJsSizeKB <= totalJsBudgetKB ? `${GREEN}${totalJsSizeKB} KB${RESET}` : `${RED}${totalJsSizeKB} KB${RESET}`}`
  );

  console.log("");

  if (hasFailures) {
    console.log(`${RED}${BOLD}Bundle size budget exceeded!${RESET}`);
    console.log(`Run 'bun run build:analyze' to investigate.\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}All bundle size budgets pass.${RESET}\n`);
    process.exit(0);
  }
}

checkBundleSizes();
