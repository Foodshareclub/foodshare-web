#!/usr/bin/env bun

/**
 * Generate Static OG Images
 *
 * Replaces dynamic OG image generation with static files
 * Saves ~50,000 function invocations per month
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const OG_DIR = join(process.cwd(), "public", "og");

// Ensure directory exists
await mkdir(OG_DIR, { recursive: true });

// Simple SVG-based OG images (no canvas dependency needed)
function generateOGImageSVG(title: string, subtitle: string): string {
  return `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF2D55;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#E61E4D;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF6B8A;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#grad)"/>
  
  <!-- Decorative circles -->
  <circle cx="1100" cy="100" r="200" fill="rgba(255,255,255,0.1)"/>
  <circle cx="100" cy="530" r="250" fill="rgba(255,255,255,0.08)"/>
  
  <!-- Title -->
  <text x="600" y="280" font-family="system-ui, sans-serif" font-size="64" font-weight="800" 
        fill="white" text-anchor="middle" letter-spacing="-1">${title}</text>
  
  <!-- Subtitle -->
  <text x="600" y="340" font-family="system-ui, sans-serif" font-size="28" 
        fill="rgba(255,255,255,0.95)" text-anchor="middle">${subtitle}</text>
  
  <!-- URL -->
  <text x="600" y="580" font-family="system-ui, sans-serif" font-size="22" font-weight="500"
        fill="rgba(255,255,255,0.85)" text-anchor="middle">foodshare.club</text>
</svg>
`.trim();
}

const images = [
  {
    filename: "home.png",
    title: "FoodShare",
    subtitle: "Share Food • Reduce Waste • Build Community",
  },
  {
    filename: "food.png",
    title: "Share Food",
    subtitle: "List and discover free food in your community",
  },
  {
    filename: "forum.png",
    title: "Community Forum",
    subtitle: "Connect with food sharers worldwide",
  },
  { filename: "map.png", title: "Food Map", subtitle: "Find free food near you" },
  {
    filename: "profile.png",
    title: "Your Profile",
    subtitle: "Track your impact and contributions",
  },
  {
    filename: "challenge.png",
    title: "Challenges",
    subtitle: "Join the food waste reduction movement",
  },
  { filename: "donation.png", title: "Support Us", subtitle: "Help us fight food waste" },
  { filename: "help.png", title: "Help Center", subtitle: "Get started with FoodShare" },
];

console.log("🎨 Generating static OG images...\n");

for (const { filename, title, subtitle } of images) {
  const svg = generateOGImageSVG(title, subtitle);
  const filepath = join(OG_DIR, filename.replace(".png", ".svg"));
  await writeFile(filepath, svg);
  console.log(`✅ Generated: ${filename.replace(".png", ".svg")}`);
}

console.log(`\n✨ Generated ${images.length} static OG images in /public/og/`);
console.log("💰 This will save ~50,000 function invocations per month!\n");
console.log("Next steps:");
console.log("1. Update metadata in layout.tsx files to use /og/*.svg");
console.log("2. Delete all opengraph-image.tsx files");
console.log("3. Deploy and monitor Vercel usage");
