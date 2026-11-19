const sharp = require('../../clinical_management/backend/node_modules/sharp');
const fs = require('fs');

const orig = 'C:/Users/lenovo/.gemini/antigravity/brain/22361f4f-362b-4a07-bf4f-93ddfa8486fe/.user_uploaded/media_1794890382200_e8202ca3.jpg';

async function main() {
  console.log('Regenerating 100% clean hero assets (Zero ghost text)...');

  // 1. Doctor side: strictly left 0 to 180 (Text begins at 183, so 0..180 has ZERO text!)
  const docRaw = await sharp(orig)
    .extract({ left: 0, top: 0, width: 180, height: 280 })
    .toBuffer();

  const docMeta = await sharp(docRaw).metadata();

  // Alpha gradient mask for doctor: solid on left (0 to 130), smoothly feathers to 0 by x=180, and fades at bottom
  const docMaskSvg = `
    <svg width="${docMeta.width}" height="${docMeta.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="docX" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1" />
          <stop offset="70%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="docY" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1" />
          <stop offset="75%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <mask id="m">
          <rect width="${docMeta.width}" height="${docMeta.height}" fill="url(#docX)" />
          <rect width="${docMeta.width}" height="${docMeta.height}" fill="url(#docY)" style="mix-blend-mode: multiply;" />
        </mask>
      </defs>
      <rect width="${docMeta.width}" height="${docMeta.height}" fill="white" mask="url(#m)" />
    </svg>
  `;

  const docMaskBuf = await sharp(Buffer.from(docMaskSvg)).extractChannel(0).toBuffer();

  await sharp(docRaw)
    .ensureAlpha()
    .composite([{ input: docMaskBuf, blend: 'dest-in' }])
    .png()
    .toFile('quroxa-patient-frontend/src/assets/hero_doctor_feather.png');

  fs.copyFileSync(
    'quroxa-patient-frontend/src/assets/hero_doctor_feather.png',
    'quroxa-patient-frontend/public/hero_doctor_feather.png'
  );

  // 2. Hospital side: strictly left 504 to 682 (width 178) (Text ends at 498, so 504..682 has ZERO text!)
  const hospRaw = await sharp(orig)
    .extract({ left: 504, top: 0, width: 178, height: 280 })
    .toBuffer();

  const hospMeta = await sharp(hospRaw).metadata();

  const hospMaskSvg = `
    <svg width="${hospMeta.width}" height="${hospMeta.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hospX" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fff" stop-opacity="0" />
          <stop offset="30%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="hospY" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fff" stop-opacity="1" />
          <stop offset="75%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <mask id="mh">
          <rect width="${hospMeta.width}" height="${hospMeta.height}" fill="url(#hospX)" />
          <rect width="${hospMeta.width}" height="${hospMeta.height}" fill="url(#hospY)" style="mix-blend-mode: multiply;" />
        </mask>
      </defs>
      <rect width="${hospMeta.width}" height="${hospMeta.height}" fill="white" mask="url(#mh)" />
    </svg>
  `;

  const hospMaskBuf = await sharp(Buffer.from(hospMaskSvg)).extractChannel(0).toBuffer();

  await sharp(hospRaw)
    .ensureAlpha()
    .composite([{ input: hospMaskBuf, blend: 'dest-in' }])
    .png()
    .toFile('quroxa-patient-frontend/src/assets/hero_hospital_feather.png');

  fs.copyFileSync(
    'quroxa-patient-frontend/src/assets/hero_hospital_feather.png',
    'quroxa-patient-frontend/public/hero_hospital_feather.png'
  );

  // 3. Composite unified clean hero banner (480 x 240) tailored for mobile screens
  // Center is pure natural sky gradient, doctor at left: 0, hospital at right: (480 - 152 = 328)
  const skySvg = `
    <svg width="480" height="240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f3f8fe" />
          <stop offset="60%" stop-color="#edf4fe" />
          <stop offset="100%" stop-color="#f0f6fc" />
        </linearGradient>
      </defs>
      <rect width="480" height="240" fill="url(#sky)" />
    </svg>
  `;

  // Scale doctor to height 240
  const docResized = await sharp('quroxa-patient-frontend/src/assets/hero_doctor_feather.png')
    .resize({ height: 240 })
    .toBuffer();

  // Scale hospital to height 240
  const hospResized = await sharp('quroxa-patient-frontend/src/assets/hero_hospital_feather.png')
    .resize({ height: 240 })
    .toBuffer();

  const hospResizedMeta = await sharp(hospResized).metadata();

  await sharp(Buffer.from(skySvg))
    .composite([
      { input: docResized, top: 0, left: 0 },
      { input: hospResized, top: 0, left: 480 - hospResizedMeta.width }
    ])
    .png()
    .toFile('quroxa-patient-frontend/src/assets/hero_clean_top.png');

  fs.copyFileSync(
    'quroxa-patient-frontend/src/assets/hero_clean_top.png',
    'quroxa-patient-frontend/public/hero_clean_top.png'
  );

  console.log('Clean hero assets generated successfully (No text artifacts)!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
