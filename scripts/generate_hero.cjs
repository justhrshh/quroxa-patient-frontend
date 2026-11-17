const sharp = require('../../clinical_management/backend/node_modules/sharp');
const fs = require('fs');

async function processHeroClean() {
  // Extract top 285px where only the doctor, sky, and hospital building exist (NO white card at all)
  const cropped = await sharp('C:/Users/lenovo/.gemini/antigravity/brain/22361f4f-362b-4a07-bf4f-93ddfa8486fe/.user_uploaded/media_1794890382200_e8202ca3.jpg')
    .extract({ left: 0, top: 0, width: 682, height: 285 })
    .toBuffer();

  const meta = await sharp(cropped).metadata();

  const svgOverlay = Buffer.from(`
    <svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f3f8fe" />
          <stop offset="50%" stop-color="#edf4fe" />
          <stop offset="100%" stop-color="#e2ecfd" />
        </linearGradient>
        <filter id="blurFeather" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="bottomFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e2ecfd" stop-opacity="0" />
          <stop offset="100%" stop-color="#f0f6fc" stop-opacity="1" />
        </linearGradient>
      </defs>
      <!-- Solid smooth patch covering from x=160 to x=525 -->
      <polygon points="158,0 528,0 520,260 162,260" fill="url(#skyGrad)" filter="url(#blurFeather)" />
      <!-- Soft bottom gradient into page background -->
      <rect x="0" y="220" width="${meta.width}" height="65" fill="url(#bottomFade)" />
    </svg>
  `);

  await sharp(cropped)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .png()
    .toFile('quroxa-patient-frontend/src/assets/hero_clean_top.png');

  fs.copyFileSync(
    'quroxa-patient-frontend/src/assets/hero_clean_top.png',
    'quroxa-patient-frontend/public/hero_clean_top.png'
  );

  console.log('Successfully regenerated hero_clean_top.png at 285px height');
}

processHeroClean().catch(console.error);
