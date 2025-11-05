#!/usr/bin/env node
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, '../public/icons/tvl.svg');
const outputDir = join(__dirname, '../public/icons');

const svgBuffer = readFileSync(svgPath);

console.log('🎨 Generating PWA icons from tvl.svg...\n');

// Standard icons (no padding)
const standardSizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' }
];

// Maskable icons (with 12% safe zone padding)
const maskableSizes = [
  { size: 192, name: 'maskable-192.png' },
  { size: 512, name: 'maskable-512.png' }
];

// Generate standard icons
for (const { size, name } of standardSizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(outputDir, name));
  
  console.log(`✅ Generated ${name} (${size}×${size})`);
}

// Generate maskable icons with safe zone padding
// Maskable icons need 12% safe zone (inner 76% is always visible)
// So we render the SVG at 88% size and add 12% padding (6% each side)
for (const { size, name } of maskableSizes) {
  const innerSize = Math.round(size * 0.88); // 88% of final size
  const padding = Math.round((size - innerSize) / 2); // 6% each side
  
  await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 10, g: 10, b: 10, alpha: 1 } // #0A0A0A
    })
    .png()
    .toFile(join(outputDir, name));
  
  console.log(`✅ Generated ${name} (${size}×${size} with 12% safe zone)`);
}

console.log('\n🎉 All icons generated successfully!');
console.log('📦 Output directory: /public/icons/');
