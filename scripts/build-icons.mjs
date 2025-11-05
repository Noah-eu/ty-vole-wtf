import sharp from 'sharp';
import fs from 'fs';

const src = 'public/brand/tvl-logo.svg';
if(!fs.existsSync(src)){
  console.error('Source SVG not found:', src);
  process.exit(1);
}

const sizes = [1024, 512, 192, 180, 64, 32, 16];
for (const s of sizes) {
  const out = `public/brand/icon-${s}.png`;
  await sharp(src)
    .png()
    .resize(s, s)
    .toFile(out);
  console.log('Written', out);
}

await sharp(src)
  .png()
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .toFile('public/brand/og-image.png');
console.log('Written public/brand/og-image.png');
console.log('icons + og-image ready');
