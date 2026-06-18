// 페이스북 페이지 프로필 로고 (원형 크롭 안전). 1080x1080.
// 실행: node scripts/gen-logo.mjs → ad-creatives/letmefree_logo.png (+원형 미리보기)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../ad-creatives');
mkdirSync(OUT, { recursive: true });

const FONT = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">`;

// 정사각 로고 (중앙 엠블럼 + 하단 작은 워드마크는 원형 크롭에서 잘리므로 중앙 집중)
const logo = `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;}
.c{width:1080px;height:1080px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(620px 620px at 50% 42%, rgba(99,102,241,0.30), transparent 62%), linear-gradient(160deg,#0b1020,#0d1426);}
.tile{width:560px;height:560px;border-radius:150px;
  background:linear-gradient(135deg,#6366f1 0%, #22d3ee 100%);
  display:flex;align-items:center;justify-content:center;position:relative;
  box-shadow:0 40px 90px rgba(34,211,238,0.30), inset 0 4px 30px rgba(255,255,255,0.25);}
.L{font-size:360px;font-weight:900;color:#fff;line-height:1;letter-spacing:-.04em;
  text-shadow:0 8px 30px rgba(0,0,0,0.25);}
.spark{position:absolute;top:64px;right:74px;width:70px;height:70px;border-radius:50%;
  background:#fbbf24;box-shadow:0 0 40px rgba(251,191,36,0.7);}
</style></head><body><div class="c">
  <div class="tile"><span class="L">L</span><div class="spark"></div></div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
await page.setContent(logo, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: resolve(OUT, 'letmefree_logo.png') });
await page.close();
console.log('saved letmefree_logo.png');
await browser.close();
