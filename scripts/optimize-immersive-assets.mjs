// 몰입 모드 에셋 후처리 — 레터박스 자동 크롭 + WebP 변환 (원본 PNG 는 삭제)
// 실행: node scripts/optimize-immersive-assets.mjs
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/immersive/late-comer');
const pngs = readdirSync(DIR).filter(f => f.endsWith('.png'));
if (!pngs.length) { console.log('변환할 PNG 없음'); process.exit(0); }

const browser = await chromium.launch();
const page = await browser.newPage();

for (const file of pngs) {
  const b64 = readFileSync(resolve(DIR, file)).toString('base64');
  const webpB64 = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = dataUrl; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    // 행/열 분산으로 콘텐츠 바운딩 박스 탐지 (레터박스 = 균일 회색)
    const rowVar = (y) => {
      let min = 255, max = 0;
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (v < min) min = v; if (v > max) max = v;
      }
      return max - min;
    };
    const colVar = (x) => {
      let min = 255, max = 0;
      for (let y = 0; y < height; y += 4) {
        const i = (y * width + x) * 4;
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (v < min) min = v; if (v > max) max = v;
      }
      return max - min;
    };
    const T = 24;
    let top = 0, bottom = height - 1, left = 0, right = width - 1;
    while (top < height / 2 && rowVar(top) < T) top++;
    while (bottom > height / 2 && rowVar(bottom) < T) bottom--;
    while (left < width / 2 && colVar(left) < T) left++;
    while (right > width / 2 && colVar(right) < T) right--;
    const cw = right - left + 1, ch = bottom - top + 1;
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(img, left, top, cw, ch, 0, 0, cw, ch);
    return { b64: out.toDataURL('image/webp', 0.82).split(',')[1], box: { left, top, cw, ch } };
  }, `data:image/png;base64,${b64}`);

  const outFile = file.replace('.png', '.webp');
  writeFileSync(resolve(DIR, outFile), Buffer.from(webpB64.b64, 'base64'));
  unlinkSync(resolve(DIR, file));
  console.log(`${file} → ${outFile} (crop ${webpB64.box.cw}x${webpB64.box.ch}, ${Math.round(webpB64.b64.length * 0.75 / 1024)}KB)`);
}

await browser.close();
console.log('DONE →', DIR);
