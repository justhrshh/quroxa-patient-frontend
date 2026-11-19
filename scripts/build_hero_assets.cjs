const sharp = require('../../clinical_management/backend/node_modules/sharp');
const fs = require('fs');

const orig = 'C:/Users/lenovo/.gemini/antigravity/brain/22361f4f-362b-4a07-bf4f-93ddfa8486fe/.user_uploaded/media_1794890382200_e8202ca3.jpg';

async function main() {
  console.log('Building 100% seamless full-depth hero background...');

  // Extract top 340px from original 682x1024 image
  const topSlice = await sharp(orig)
    .extract({ left: 0, top: 0, width: 682, height: 340 })
    .toBuffer();

  // Create smooth inpainting patch covering ONLY the text area (x: 180 to 500, y: 20 to 225)
  // With soft feathered edges blending into the surrounding clouds
  const patchSvg = `
    <svg width="682" height="340" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyBlend" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eff4fe" />
          <stop offset="40%" stop-color="#f5f8fe" />
          <stop offset="70%" stop-color="#edf3fd" />
          <stop offset="100%" stop-color="#f0f6fc" />
        </linearGradient>
        <filter id="blurPatch" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <linearGradient id="botFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f0f6fc" stop-opacity="0" />
          <stop offset="85%" stop-color="#f0f6fc" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#f0f6fc" stop-opacity="1" />
        </linearGradient>
      </defs>
      <!-- Soft feathered polygon covering only the text -->
      <polygon points="176,18 504,18 498,225 178,225" fill="url(#skyBlend)" filter="url(#blurPatch)" />
      <!-- Subtle bottom fade matching card background -->
      <rect x="0" y="270" width="682" height="70" fill="url(#botFade)" />
    </svg>
  `;

  await sharp(topSlice)
    .composite([{ input: Buffer.from(patchSvg), top: 0, left: 0 }])
    .png()
    .toFile('quroxa-patient-frontend/src/assets/hero_clean_top.png');

  fs.copyFileSync(
    'quroxa-patient-frontend/src/assets/hero_clean_top.png',
    'quroxa-patient-frontend/public/hero_clean_top.png'
  );

  console.log('Seamless full-depth hero successfully built!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
