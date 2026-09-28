/* Ilova ikonkalarini SVG'dan PNG'ga chizadi (Chromium orqali). Natija android/res/mipmap-* ga yoziladi.
   Ishlatish: node android/make-icons.cjs */
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const RES = path.join(__dirname, 'res');
const MARK = `<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/>
  <path d="M8 10.2 12 8l4 2.2v3.6L12 16l-4-2.2z" fill="#E9BE62" fill-opacity=".2"/>
  <path d="M12 4v4M12 16v4M4 8.5l4 1.7M20 8.5l-4 1.7M4 15.5l4-1.7M20 15.5l-4-1.7"/>`;
const mark = (cx, cy, s) => `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-12 -12)" fill="none" stroke="#E9BE62" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${MARK}</g>`;
/* eski uslubdagi ikonka: yumaloq burchakli to'q yashil kvadrat */
const legacy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%">
  <rect x="2" y="2" width="44" height="44" rx="11" fill="#073D30"/>
  <rect x="2" y="2" width="44" height="44" rx="11" fill="none" stroke="#0E5A47" stroke-width="1"/>
  ${mark(24, 24, 1.3)}</svg>`;
/* moslashuvchan ikonka (Android 8+): faqat belgi, fon rangi alohida */
const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="100%" height="100%">${mark(54, 54, 2.55)}</svg>`;
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const b = await playwright.chromium.launch();
  const p = await b.newPage();
  const shot = async (svg, px, file) => {
    await p.setViewportSize({ width: px, height: px });
    await p.setContent(`<html><body style="margin:0;background:transparent;width:${px}px;height:${px}px">${svg}</body></html>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
  };
  for (const [d, k] of Object.entries(DENS)) {
    await shot(legacy, Math.round(48 * k), path.join(RES, `mipmap-${d}`, 'ic_launcher.png'));
    await shot(fg, Math.round(108 * k), path.join(RES, `mipmap-${d}`, 'ic_launcher_fg.png'));
  }
  await b.close();
  console.log('ikonkalar tayyor');
})();
