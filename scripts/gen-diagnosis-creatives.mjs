// diagnosis 앵글 소재 변주 2종 생성 (기존 ad_v2_diagnosis.png = diagnosis_v1 컨트롤 유지)
//  - ad_diagnosis_v2.png: '되감기' 훅 — 꼬인 대화를 같은 상황·다른 문장으로 다시
//  - ad_diagnosis_v3.png: 유형 판정 리포트 화면 — 제품의 진단 결과 UI를 소재로 (기대-경험 일치)
// 실행: node scripts/gen-diagnosis-creatives.mjs  → ad-creatives/*.png (1080x1350, @2x)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../ad-creatives');
mkdirSync(OUT, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const HEAD = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Pretendard Variable',Pretendard,-apple-system,'Apple SD Gothic Neo',sans-serif; }
  html,body { width:1080px; height:1350px; }
  .canvas {
    width:1080px; height:1350px; padding:72px 64px;
    background:
      radial-gradient(1200px 600px at 80% -5%, rgba(99,102,241,0.20), transparent 60%),
      radial-gradient(900px 500px at -10% 110%, rgba(245,158,11,0.14), transparent 55%),
      linear-gradient(180deg,#0b1020 0%, #0d1426 100%);
    color:#fff; display:flex; flex-direction:column;
  }
  .brand { font-size:26px; font-weight:800; letter-spacing:.06em; color:#cbd5e1; }
  .brand b { color:#fff; }
  .badge { display:inline-block; margin-top:26px; padding:10px 20px; border-radius:999px;
    background:rgba(245,158,11,0.14); border:1px solid rgba(245,158,11,0.35);
    color:#fcd34d; font-size:26px; font-weight:800; }
  .h1 { margin-top:34px; font-size:74px; line-height:1.16; font-weight:900; letter-spacing:-.02em; }
  .h1 .accent { color:#fbbf24; }
  .foot { margin-top:auto; display:flex; align-items:center; gap:24px; }
  .ctabtn { background:#f59e0b; color:#1b1300; font-size:34px; font-weight:900; padding:26px 44px; border-radius:18px; }
  .micro { font-size:25px; color:#cbd5e1; font-weight:600; }
</style>`;

// ── v2: 되감기 훅 — 실패 턴 → 되감기 → 다른 문장으로 신뢰 회복 ──────────────
function htmlV2() {
  return `${HEAD}
<style>
  .card { margin-top:44px; background:#0b1224; border:1px solid rgba(255,255,255,0.10);
    border-radius:34px; overflow:hidden; box-shadow:0 30px 90px rgba(0,0,0,0.45); }
  .msgs { padding:30px; display:flex; flex-direction:column; gap:18px; }
  .row { display:flex; gap:14px; align-items:flex-end; }
  .row.me { justify-content:flex-end; }
  .row .av { width:46px; height:46px; border-radius:50%; background:rgba(99,102,241,0.25);
    display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#c7d2fe; flex:0 0 auto; }
  .b { max-width:76%; padding:19px 24px; font-size:27px; line-height:1.4; }
  .b.ai { background:#1e293b; color:#e2e8f0; border-radius:22px 22px 22px 6px; }
  .b.me { background:rgba(99,102,241,0.22); color:#eef2ff; border-radius:22px 22px 6px 22px; border:1px solid rgba(99,102,241,0.35); }
  .b.me.bad { background:rgba(239,68,68,0.14); border:1px solid rgba(239,68,68,0.4); color:#fecaca; }
  .delta { font-size:22px; font-weight:900; margin-left:10px; align-self:center; }
  .delta.neg { color:#f87171; } .delta.pos { color:#34d399; }
  .rewind { display:flex; align-items:center; gap:16px; padding:20px 30px;
    background:rgba(245,158,11,0.08); border-top:1px dashed rgba(245,158,11,0.4); border-bottom:1px dashed rgba(245,158,11,0.4); }
  .rewind .ic { font-size:30px; }
  .rewind .t { font-size:25px; font-weight:900; color:#fcd34d; letter-spacing:.04em; }
</style>
<body><div class="canvas">
  <div class="brand"><b>Letmefree</b> · 렛미프리 — AI 리더십 대화 리허설</div>
  <span class="badge">AI 대화 되감기</span>
  <div class="h1">오늘 꼬인 그 면담,<br><span class="accent">되감기해서 다시 해보세요</span></div>
  <div class="card">
    <div class="msgs">
      <div class="row me"><div class="b me bad">요즘 지각이 잦던데, 좀 신경 써야 하지 않을까요?</div><span class="delta neg">−12</span></div>
      <div class="row ai"><div class="av">김</div><div class="b ai">...네, 알겠습니다. (대화 종료)</div></div>
    </div>
    <div class="rewind"><span class="ic">⏪</span><span class="t">REWIND — 같은 상황, 다른 문장</span></div>
    <div class="msgs">
      <div class="row me"><div class="b me">철수씨, 요즘 아침마다 뭔가 힘든 일 있어요? 그 얘기부터 들어볼게요.</div><span class="delta pos">+15</span></div>
      <div class="row ai"><div class="av">김</div><div class="b ai">...사실 마감 때문에 새벽까지 한 적이 많았어요. 말씀드리긴 좀 그래서요.</div></div>
    </div>
  </div>
  <div class="foot">
    <div class="ctabtn">무료로 되감기 →</div>
    <div class="micro">가입 없이 3개<br>시나리오 무료</div>
  </div>
</div></body></html>`;
}

// ── v3: 유형 판정 리포트 — 제품 진단 결과 화면을 소재로 ─────────────────────
function radarSvg() {
  // DiagnosisRadar 와 동일한 5축 구성. 샘플: 심리적 안전 38(급소) / 진정성·일관 71(강점)
  const dims = [38, 55, 62, 71, 58]; // 안전, 이해, 자율, 진정성, 역량
  const labels = ['심리적 안전 ⚑', '이해·정렬', '자율·공정', '진정성·일관', '역량·지원'];
  const size = 460, cx = size / 2, cy = size / 2 + 8, R = size / 2 - 70;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const poly = (r) => [0, 1, 2, 3, 4].map((i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ');
  const dataPoly = dims.map((v, i) => pt(i, (v / 100) * R).map((n) => n.toFixed(1)).join(',')).join(' ');
  const grid = [1, 0.72, 0.44].map((f) => `<polygon points="${poly(R * f)}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>`).join('');
  const axes = [0, 1, 2, 3, 4].map((i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.09)" stroke-width="1.5"/>`; }).join('');
  const dots = dims.map((v, i) => {
    const [x, y] = pt(i, (v / 100) * R);
    const gap = i === 0, str = i === 3;
    return `<circle cx="${x}" cy="${y}" r="${gap ? 9 : 6}" fill="${gap ? '#FBBF24' : str ? '#5EEAD4' : '#F59E0B'}" ${gap ? 'stroke="#fff" stroke-width="2"' : ''}/>`;
  }).join('');
  const texts = labels.map((l, i) => {
    const [x, y] = pt(i, R + 42);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="21" font-weight="${i === 0 ? 900 : 600}" fill="${i === 0 ? '#FBBF24' : '#94A3B8'}">${l}</text>`;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${grid}${axes}<polygon points="${dataPoly}" fill="rgba(245,158,11,0.20)" stroke="#F59E0B" stroke-width="3"/>${dots}${texts}</svg>`;
}

function htmlV3() {
  return `${HEAD}
<style>
  .h1 { font-size:64px; }
  .report { margin-top:40px; background:#0b1224; border:1px solid rgba(255,255,255,0.10);
    border-radius:34px; box-shadow:0 30px 90px rgba(0,0,0,0.45); padding:44px 48px; }
  .rlabel { font-size:22px; font-weight:900; color:#f59e0b; letter-spacing:.22em; text-transform:uppercase; }
  .rsub { margin-top:18px; font-size:28px; color:#94a3b8; }
  .type { margin-top:6px; font-size:72px; font-weight:900; letter-spacing:-.02em; }
  .type .accent { color:#fbbf24; }
  .identity { margin-top:10px; font-size:30px; color:#cbd5e1; }
  .body { display:flex; gap:36px; margin-top:26px; align-items:center; }
  .radar { flex:0 0 auto; }
  .cards { flex:1; display:flex; flex-direction:column; gap:18px; }
  .kcard { border-radius:22px; padding:22px 26px; }
  .kcard .kl { font-size:20px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; margin-bottom:8px; }
  .kcard .kt { font-size:28px; font-weight:800; line-height:1.3; }
  .kcard.str { background:rgba(94,234,212,0.07); border:1px solid rgba(94,234,212,0.3); }
  .kcard.str .kl { color:#5eead4; }
  .kcard.gap { background:rgba(251,191,36,0.07); border:1px solid rgba(251,191,36,0.35); }
  .kcard.gap .kl { color:#fbbf24; }
</style>
<body><div class="canvas">
  <div class="brand"><b>Letmefree</b> · 렛미프리 — AI 리더십 대화 리허설</div>
  <span class="badge">AI 대화 진단 리포트</span>
  <div class="h1">5분 대화하면,<br><span class="accent">당신의 대화 유형이 나옵니다</span></div>
  <div class="report">
    <div class="rlabel">AI 진단 결과</div>
    <div class="rsub">당신의 리더십 대화 유형은</div>
    <div class="type"><span class="accent">돌직구형</span> 리더</div>
    <div class="identity">“맞는 말만 하는데, 사람이 다친다”</div>
    <div class="body">
      <div class="radar">${radarSvg()}</div>
      <div class="cards">
        <div class="kcard str"><div class="kl">✓ 강점</div><div class="kt">말과 행동이<br>일치한다</div></div>
        <div class="kcard gap"><div class="kl">⚑ 급소</div><div class="kt">말이 맞을수록,<br>방어벽이 올라간다</div></div>
      </div>
    </div>
  </div>
  <div class="foot">
    <div class="ctabtn">내 유형 무료 진단 →</div>
    <div class="micro">가입 없이 5분<br>대화하면 끝</div>
  </div>
</div></body></html>`;
}

const JOBS = [
  { file: 'ad_diagnosis_v2.png', html: htmlV2() },
  { file: 'ad_diagnosis_v3.png', html: htmlV3() },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
for (const j of JOBS) {
  await page.setContent(j.html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(OUT, j.file) });
  console.log('saved', j.file);
}
await browser.close();
console.log('DONE →', OUT);
