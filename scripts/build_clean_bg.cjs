const sharp = require('../../clinical_management/backend/node_modules/sharp');
const fs = require('fs');

const origDesktop = 'C:/Users/lenovo/.gemini/antigravity/brain/22361f4f-362b-4a07-bf4f-93ddfa8486fe/.user_uploaded/media_1795070315838_69847590.jpg';

async function buildCleanDesktopBackground() {
  console.log('Building clean, crisp desktop background with ZERO blur behind login panel...');

  const { data, info } = await sharp(origDesktop).raw().toBuffer({ resolveWithObject: true });
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

  // 1. Clean Top-Left Logo (y: 15..75, x: 65..260)
  for (let x = 65; x <= 260; x++) {
    const topColor = get(x, 14);
    const bottomColor = get(x, 76);
    for (let y = 15; y <= 75; y++) {
      const t = (y - 14) / (76 - 14);
      set(x, y, [
        Math.round(topColor[0] * (1-t) + bottomColor[0] * t),
        Math.round(topColor[1] * (1-t) + bottomColor[1] * t),
        Math.round(topColor[2] * (1-t) + bottomColor[2] * t),
      ]);
    }
  }

  // 2. Clean left hero text & badges: y: 92..350, x: 65..425
  for (let x = 65; x <= 425; x++) {
    const topColor = get(x, 90);
    const bottomColor = get(x, 355);
    for (let y = 92; y <= 350; y++) {
      const t = (y - 90) / (355 - 90);
      set(x, y, [
        Math.round(topColor[0] * (1-t) + bottomColor[0] * t),
        Math.round(topColor[1] * (1-t) + bottomColor[1] * t),
        Math.round(topColor[2] * (1-t) + bottomColor[2] * t),
      ]);
    }
  }

  // 3. Clean Top-Right Tagline: y: 20..58, x: 790..975
  for (let x = 790; x <= 975; x++) {
    const topColor = get(x, 18);
    const bottomColor = get(x, 60);
    for (let y = 20; y <= 58; y++) {
      const t = (y - 18) / (60 - 18);
      set(x, y, [
        Math.round(topColor[0] * (1-t) + bottomColor[0] * t),
        Math.round(topColor[1] * (1-t) + bottomColor[1] * t),
        Math.round(topColor[2] * (1-t) + bottomColor[2] * t),
      ]);
    }
  }

  // 4. Fill sky above card: y: 0..130, x: 575..975 (clean natural horizontal sky gradient)
  for (let y = 0; y <= 130; y++) {
    const leftColor = get(575, y);
    const rightColor = get(975, y);
    for (let x = 580; x <= 970; x++) {
      const t = (x - 575) / (975 - 575);
      set(x, y, [
        Math.round(leftColor[0] * (1-t) + rightColor[0] * t),
        Math.round(leftColor[1] * (1-t) + rightColor[1] * t),
        Math.round(leftColor[2] * (1-t) + rightColor[2] * t),
      ]);
    }
  }

  // 5. Clean architectural hospital module (x: 545..590, exact 45px column)
  // Has white structural columns, crisp blue glass windows, and green trees. Zero text.
  const srcStartX = 545, srcWidth = 45;
  for (let y = 131; y <= 475; y++) {
    const rightTreeColor = get(975, y);
    for (let x = 580; x <= 970; x++) {
      const offset = (x - 580) % srcWidth;
      const srcX = srcStartX + offset;
      const bColor = get(srcX, y);

      let t = 0;
      if (x > 905) {
        t = (x - 905) / (970 - 905);
      }
      set(x, y, [
        Math.round(bColor[0] * (1-t) + rightTreeColor[0] * t),
        Math.round(bColor[1] * (1-t) + rightTreeColor[1] * t),
        Math.round(bColor[2] * (1-t) + rightTreeColor[2] * t),
      ]);
    }
  }

  // 6. Waves / base at bottom: y: 476..575, x: 575..975
  for (let y = 476; y <= 575; y++) {
    const leftColor = get(575, y);
    const rightColor = get(975, y);
    for (let x = 580; x <= 970; x++) {
      const t = (x - 575) / (975 - 575);
      set(x, y, [
        Math.round(leftColor[0] * (1-t) + rightColor[0] * t),
        Math.round(leftColor[1] * (1-t) + rightColor[1] * t),
        Math.round(leftColor[2] * (1-t) + rightColor[2] * t),
      ]);
    }
  }

  // NO BLUR AT ALL: 100% crisp and sharp!
  const result = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 96 })
    .toBuffer();

  fs.writeFileSync('quroxa-patient-frontend/src/assets/hero_desktop_bg.jpg', result);
  fs.writeFileSync('quroxa-patient-frontend/public/hero_desktop_bg.jpg', result);

  console.log('Saved 100% clean, crisp hero_desktop_bg.jpg without any blur!');
}

buildCleanDesktopBackground().catch(err => {
  console.error(err);
  process.exit(1);
});
