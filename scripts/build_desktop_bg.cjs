const sharp = require('../../clinical_management/backend/node_modules/sharp');
const fs = require('fs');

const origDesktop = 'C:/Users/lenovo/.gemini/antigravity/brain/22361f4f-362b-4a07-bf4f-93ddfa8486fe/.user_uploaded/media_1795070315838_69847590.jpg';

async function main() {
  console.log('Building seamless desktop background without baked-in card or text...');

  // 1. Extract hospital facade slice from x: 420 to 620 (width 200, height 440)
  const hospSlice = await sharp(origDesktop)
    .extract({ left: 420, top: 40, width: 200, height: 440 })
    .toBuffer();

  // Create feather mask for hospSlice
  const hospMask = await sharp(Buffer.from(`
    <svg width="200" height="440" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0" />
          <stop offset="25%" stop-color="#fff" stop-opacity="1" />
          <stop offset="80%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="200" height="440" fill="url(#g)" />
    </svg>
  `)).extractChannel(0).toBuffer();

  const featheredHosp = await sharp(hospSlice)
    .ensureAlpha()
    .composite([{ input: hospMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Inpainting patch for text on left and tagline on right
  const patchSvg = `
    <svg width="1024" height="576" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="leftSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eff4fe" />
          <stop offset="40%" stop-color="#f5f8fe" />
          <stop offset="75%" stop-color="#edf4fd" />
          <stop offset="100%" stop-color="#e2ecfb" />
        </linearGradient>
        <filter id="leftBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <linearGradient id="tagSky" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#eef4fd" />
          <stop offset="100%" stop-color="#e6f0fc" />
        </linearGradient>
        <filter id="tagBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="cardCover" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#d4e7fc" />
          <stop offset="60%" stop-color="#e6f0fc" />
          <stop offset="100%" stop-color="#f0f6fc" />
        </linearGradient>
        <filter id="cardBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>
      <!-- Smooth sky patch on left covering pre-baked text -->
      <polygon points="65,22 455,22 445,355 65,355" fill="url(#leftSky)" filter="url(#leftBlur)" />
      <!-- Smooth sky patch on top right covering pre-baked tagline -->
      <rect x="805" y="25" width="170" height="30" fill="url(#tagSky)" filter="url(#tagBlur)" />
      <!-- Soft hospital-sky blend over card area so DOM card has clean backdrop -->
      <rect x="620" y="65" width="350" height="425" rx="30" fill="url(#cardCover)" filter="url(#cardBlur)" opacity="0.9" />
    </svg>
  `;

  await sharp(origDesktop)
    .composite([
      { input: Buffer.from(patchSvg), top: 0, left: 0 },
      { input: featheredHosp, top: 40, left: 630 },
      { input: featheredHosp, top: 40, left: 770 }
    ])
    .jpeg({ quality: 95 })
    .toFile('quroxa-patient-frontend/src/assets/hero_desktop_bg.jpg');

  fs.copyFileSync(
    'quroxa-patient-frontend/src/assets/hero_desktop_bg.jpg',
    'quroxa-patient-frontend/public/hero_desktop_bg.jpg'
  );

  console.log('Seamless desktop background asset successfully created!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
