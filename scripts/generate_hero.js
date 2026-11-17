import sharp from '../../clinical_management/backend/node_modules/sharp/lib/index.js';
import fs from 'fs';

async function processHero() {
  const meta = await sharp('quroxa-patient-frontend/src/assets/hero_reference_top.jpg').metadata();
  console.log('Hero meta:', meta.width, meta.height);
  
  // We want to smoothly mask out the text in the center sky
  // Between x: 175 and x: 505, y: 15 to y: 240
  const svgOverlay = Buffer.from(`
    <svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#8bc2ee" />
          <stop offset="25%" stop-color="#a0cef2" />
          <stop offset="50%" stop-color="#b6daf5" />
          <stop offset="75%" stop-color="#cde5f9" />
          <stop offset="100%" stop-color="#e2f0fc" />
        </linearGradient>
        <filter id="blurFeather" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect x="180" y="20" width="320" height="230" rx="30" fill="url(#skyGrad)" filter="url(#blurFeather)" />
    </svg>
  `);

  await sharp('quroxa-patient-frontend/src/assets/hero_reference_top.jpg')
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .toFile('quroxa-patient-frontend/src/assets/hero_clean_bg.jpg');
    
  console.log('Saved hero_clean_bg.jpg successfully');
}

processHero().catch(console.error);
