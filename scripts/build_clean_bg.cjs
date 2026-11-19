const sharp = require('../../clinical_management/backend/node_modules/sharp');
const fs = require('fs');

const orig = 'quroxa-patient-frontend/scripts/test_clean_bg.jpg';

async function buildCleanFeathered() {
  const { data, info } = await sharp(orig).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const out = Buffer.from(data);

  const get = (x, y) => {
    const i = (y * w + x) * 3;
    return [data[i], data[i+1], data[i+2]];
  };
  const set = (x, y, rgb) => {
    const i = (y * w + x) * 3;
    out[i] = rgb[0]; out[i+1] = rgb[1]; out[i+2] = rgb[2];
  };

  // Sky above card: y=60..135, x=580..975
  for (let y = 60; y <= 135; y++) {
    const leftColor = get(580, y);
    const rightColor = get(975, y);
    for (let x = 585; x <= 970; x++) {
      const t = (x - 580) / (975 - 580);
      set(x, y, [
        Math.round(leftColor[0] * (1-t) + rightColor[0] * t),
        Math.round(leftColor[1] * (1-t) + rightColor[1] * t),
        Math.round(leftColor[2] * (1-t) + rightColor[2] * t),
      ]);
    }
  }

  // Hospital & Trees behind card: y=136..470, x=590..970
  for (let y = 136; y <= 470; y++) {
    const rightTreeColor = get(975, y);
    for (let x = 590; x <= 970; x++) {
      const offset = (x - 590) % 140;
      const srcX = 440 + offset;
      const bColor = get(srcX, y);
      let t = 0;
      if (x > 910) {
        t = (x - 910) / (970 - 910);
      }
      set(x, y, [
        Math.round(bColor[0] * (1-t) + rightTreeColor[0] * t),
        Math.round(bColor[1] * (1-t) + rightTreeColor[1] * t),
        Math.round(bColor[2] * (1-t) + rightTreeColor[2] * t),
      ]);
    }
  }

  // Ground / Wave behind card bottom: y=471..520, x=590..970
  for (let y = 471; y <= 520; y++) {
    const leftColor = get(580, y);
    const rightColor = get(975, y);
    for (let x = 585; x <= 970; x++) {
      const t = (x - 580) / (975 - 580);
      set(x, y, [
        Math.round(leftColor[0] * (1-t) + rightColor[0] * t),
        Math.round(leftColor[1] * (1-t) + rightColor[1] * t),
        Math.round(leftColor[2] * (1-t) + rightColor[2] * t),
      ]);
    }
  }

  const fullImg = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 96 })
    .toBuffer();

  const regW = 430, regH = 490, regL = 565, regT = 45;

  const featherMaskSvg = `
    <svg width="${regW}" height="${regH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rGrad" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stop-color="#fff" stop-opacity="1" />
          <stop offset="98%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${regW}" height="${regH}" fill="url(#rGrad)" />
    </svg>
  `;

  const featherMask = await sharp(Buffer.from(featherMaskSvg))
    .extractChannel(0)
    .toBuffer();

  const blurredCardRegion = await sharp(fullImg)
    .extract({ left: regL, top: regT, width: regW, height: regH })
    .blur(18)
    .ensureAlpha()
    .composite([{ input: featherMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const result = await sharp(fullImg)
    .composite([
      { input: blurredCardRegion, left: regL, top: regT }
    ])
    .jpeg({ quality: 96 })
    .toBuffer();

  fs.writeFileSync('quroxa-patient-frontend/src/assets/hero_desktop_bg.jpg', result);
  fs.writeFileSync('quroxa-patient-frontend/public/hero_desktop_bg.jpg', result);
  fs.writeFileSync('quroxa-patient-frontend/scripts/test_clean_desktop_bg.jpg', result);

  console.log('Saved clean desktop background to src/assets/hero_desktop_bg.jpg!');
}

buildCleanFeathered().catch(err => {
  console.error(err);
  process.exit(1);
});
