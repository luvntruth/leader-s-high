// 광고 영상 PNG 에셋(배경+CTA, 장면 자막, 엔드카드)을 비율별로 렌더링.
// 실행: node scripts/gen-adv-assets.mjs → ad-creatives/video-assets/<aspect>/*.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../ad-creatives/video-assets');

const FONT = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">`;

// 장면별 자막 (5개)
const CAPS = [
  { l1: '어려운 팀원 대화,', l2: '40가지 시나리오로 연습' },
  { l1: '실제처럼 반응하는', l2: 'AI 팀원과 리허설' },
  { l1: '내 상황을 직접 입력해', l2: '나만의 시나리오로 (Ultra)' },
  { l1: '대화가 끝나면', l2: '리더십 역량 리포트' },
  { l1: '무료로 시작하고', l2: '필요할 때만 확장' },
];

// 비율별 레이아웃
const ASPECTS = [
  { name: '9x16', W: 1080, H: 1920, brandTop: 60, capTop: 150, capFont: 74,
    ctaTop: 1500, pillFont: 46, pillPad: '30px 58px', microFont: 32, hFont: 84 },
  { name: '4x5', W: 1080, H: 1350, brandTop: 40, capTop: 66, capFont: 56,
    ctaTop: 1110, pillFont: 40, pillPad: '24px 48px', microFont: 28, hFont: 70 },
];

const base = (W, H) => `*{margin:0;padding:0;box-sizing:border-box;font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;}
html,body{width:${W}px;height:${H}px;}`;

function bgHtml(a) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${base(a.W, a.H)}
.c{width:${a.W}px;height:${a.H}px;position:relative;
  background:
   radial-gradient(900px 520px at 82% 6%, rgba(99,102,241,0.22), transparent 60%),
   radial-gradient(800px 520px at 0% 100%, rgba(245,158,11,0.16), transparent 55%),
   linear-gradient(180deg,#0b1020,#0d1426);}
.brand{position:absolute;top:${a.brandTop}px;width:100%;text-align:center;color:#cbd5e1;font-size:30px;font-weight:800;letter-spacing:.06em;}
.brand b{color:#fff;}
.cta{position:absolute;top:${a.ctaTop}px;left:0;width:100%;text-align:center;}
.pill{display:inline-block;background:#f59e0b;color:#1b1300;font-size:${a.pillFont}px;font-weight:900;padding:${a.pillPad};border-radius:22px;box-shadow:0 16px 50px rgba(245,158,11,.35);}
.micro{margin-top:22px;color:#e2e8f0;font-size:${a.microFont}px;font-weight:600;}
.dom{color:#fbbf24;}
</style></head><body><div class="c">
<div class="brand"><b>Letmefree</b> · 렛미프리 — AI 리더십 대화 리허설</div>
<div class="cta"><div class="pill">무료로 연습 시작 →</div>
<div class="micro">가입 없이 3개 시나리오 무료 · <span class="dom">www.letmefree.xyz</span></div></div>
</div></body></html>`;
}

function capHtml(a, c) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${base(a.W, a.H)}
body{background:transparent;}
.wrap{position:absolute;top:${a.capTop}px;width:100%;text-align:center;padding:0 60px;}
.t{font-size:${a.capFont}px;line-height:1.2;font-weight:900;letter-spacing:-.02em;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.6);}
.t .a{color:#fbbf24;}
</style></head><body><div class="wrap"><div class="t">${c.l1}<br><span class="a">${c.l2}</span></div></div></body></html>`;
}

function endHtml(a) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${base(a.W, a.H)}
.c{width:${a.W}px;height:${a.H}px;background:
   radial-gradient(900px 600px at 50% 14%, rgba(99,102,241,0.26), transparent 60%),
   linear-gradient(180deg,#0b1020,#0d1426);
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;color:#fff;}
.brand{font-size:34px;font-weight:800;letter-spacing:.08em;margin-bottom:46px;}
.h{font-size:${a.hFont}px;line-height:1.22;font-weight:900;letter-spacing:-.02em;}
.h .a{color:#fbbf24;}
.pill{margin-top:58px;background:#f59e0b;color:#1b1300;font-size:${a.pillFont + 4}px;font-weight:900;padding:${a.pillPad};border-radius:24px;}
.micro{margin-top:30px;color:#e2e8f0;font-size:${a.microFont + 2}px;font-weight:600;}
.dom{color:#fbbf24;}
</style></head><body><div class="c">
  <div class="brand">Letmefree · 렛미프리</div>
  <div class="h">팀원과의 어려운 대화,<br><span class="a">오늘 AI와 먼저 연습하세요</span></div>
  <div class="pill">무료로 연습 시작 →</div>
  <div class="micro">가입 없이 3개 무료 · <span class="dom">www.letmefree.xyz</span></div>
</div></body></html>`;
}

const browser = await chromium.launch();
async function shot(a, htmlStr, file, transparent) {
  const page = await browser.newPage({ viewport: { width: a.W, height: a.H }, deviceScaleFactor: 1 });
  await page.setContent(htmlStr, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: file, omitBackground: !!transparent });
  await page.close();
}
for (const a of ASPECTS) {
  const dir = resolve(ROOT, a.name);
  mkdirSync(dir, { recursive: true });
  await shot(a, bgHtml(a), resolve(dir, 'bg.png'), false);
  for (let i = 0; i < CAPS.length; i++) await shot(a, capHtml(a, CAPS[i]), resolve(dir, `cap${i + 1}.png`), true);
  await shot(a, endHtml(a), resolve(dir, 'end.png'), false);
  console.log('rendered aspect', a.name);
}
await browser.close();
console.log('DONE');
