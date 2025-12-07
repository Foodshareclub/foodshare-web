/**
 * Generate branded placeholder images for foodbanks and fridges
 * 
 * Usage: npx tsx scripts/generate-placeholder.ts
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'placeholders');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface PlaceholderConfig {
  filename: string;
  title: string;
  subtitle: string;
  icon: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
}

const configs: PlaceholderConfig[] = [
  {
    filename: 'foodbank.jpg',
    title: 'Food Bank',
    subtitle: 'Community Support',
    icon: '🏪',
    gradientStart: '#FF6B6B',
    gradientEnd: '#FF8E53',
    accentColor: '#FFF5F5',
  },
  {
    filename: 'fridge.jpg',
    title: 'Community Fridge',
    subtitle: 'Share Food, Share Love',
    icon: '🧊',
    gradientStart: '#4ECDC4',
    gradientEnd: '#44A08D',
    accentColor: '#F0FFFF',
  },
];

async function generatePlaceholder(config: PlaceholderConfig): Promise<void> {
  const width = 800;
  const height = 600;

  // Create SVG with gradient background and text
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${config.gradientStart};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${config.gradientEnd};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#grad)"/>
      
      <!-- Decorative circles -->
      <circle cx="650" cy="100" r="150" fill="${config.accentColor}" opacity="0.1"/>
      <circle cx="100" cy="500" r="200" fill="${config.accentColor}" opacity="0.08"/>
      <circle cx="700" cy="550" r="100" fill="${config.accentColor}" opacity="0.12"/>
      
      <!-- Icon -->
      <text x="400" y="220" font-size="120" text-anchor="middle" filter="url(#shadow)">${config.icon}</text>
      
      <!-- Title -->
      <text x="400" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow)">${config.title}</text>
      
      <!-- Subtitle -->
      <text x="400" y="400" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="${config.accentColor}" text-anchor="middle" opacity="0.9">${config.subtitle}</text>
      
      <!-- FoodShare branding -->
      <text x="400" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.7">FoodShare</text>
      
      <!-- Bottom decorative line -->
      <rect x="300" y="540" width="200" height="3" rx="1.5" fill="white" opacity="0.5"/>
    </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, config.filename);
  
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  console.log(`✓ Generated: ${outputPath}`);
}

async function main() {
  console.log('🎨 Generating placeholder images...\n');

  for (const config of configs) {
    await generatePlaceholder(config);
  }

  console.log('\n✅ Done! Images saved to public/placeholders/');
  console.log('\nYou can view them at:');
  console.log('  - /placeholders/foodbank.jpg');
  console.log('  - /placeholders/fridge.jpg');
}

main().catch(console.error);
