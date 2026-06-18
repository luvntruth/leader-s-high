// 광고 소재(옵션 b) 생성: 앱 UI(신뢰도 게이지 + 대화) 기반 이미지를 버전별로 렌더링.
// 실행: node scripts/gen-ad-creatives.mjs  → ad-creatives/*.png (1080x1350, @2x)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../ad-creatives');
mkdirSync(OUT, { recursive: true });

// 버전별 콘텐츠 (랜딩 lp 변형과 메시지 일치)
const VERSIONS = [
  {
    file: 'ad_v1_practice.png',
    badge: 'AI 리더십 시뮬레이터',
    h1: '팀원과의 어려운 대화,',
    h2: '미리 연습하세요',
    name: '김철수', sub: '성과 좋은 만성 지각자',
    gauge: 65, gaugeColor: '#10b981', gaugeNote: '경계 → 점진적 수용으로 이동 중',
    msgs: [
      { who: 'ai', t: '...네, 뭐 팀장님이 그렇게 생각하시면 할 말은 없죠.' },
      { who: 'me', t: '철수씨 입장에서 어떤 점이 가장 힘들었어요?' },
      { who: 'ai', t: '사실 마감 때문에 새벽까지 한 적이 많은데, 지각 얘기만 나오면 좀 억울해요.' },
    ],
    coach: { tone: 'pos', t: '즉시 코칭 · 감정 인정 후 맥락 질문 — 신뢰도 +17' },
    cta: '무료로 연습 시작',
  },
  {
    file: 'ad_v2_diagnosis.png',
    badge: 'AI 리더십 진단',
    h1: '그 대화, 왜 꼬였을까요?',
    h2: 'AI로 다시 진단하세요',
    name: '김철수', sub: '성과 좋은 만성 지각자',
    gauge: 34, gaugeColor: '#f59e0b', gaugeNote: '신뢰 하락 구간 — 원인 진단 중',
    msgs: [
      { who: 'me', t: '요즘 지각이 잦던데, 좀 신경 써야 하지 않을까요?' },
      { who: 'ai', t: '...네 알겠습니다. (그게 다인가)' },
      { who: 'me', t: '왜 그러는지 이유라도 좀…' },
    ],
    coach: { tone: 'neg', t: '진단 · 지적 먼저 → 방어심 유발, 신뢰도 −12' },
    cta: '무료로 진단 시작',
  },
  {
    file: 'ad_v3_new-manager.png',
    badge: '신임 팀장 맞춤 훈련',
    h1: '처음 팀장,',
    h2: '가장 어려운 건 대화입니다',
    name: '이서연', sub: '입사 3개월 · 신입',
    gauge: 62, gaugeColor: '#10b981', gaugeNote: '방어 → 열린 대화로 이동 중',
    msgs: [
      { who: 'me', t: '서연님, 이번 보고서에서 아쉬웠던 점 같이 볼까요?' },
      { who: 'ai', t: '...제가 많이 부족했죠. 죄송합니다.' },
      { who: 'me', t: '부족한 게 아니라, 같이 다듬어가면 돼요.' },
    ],
    coach: { tone: 'pos', t: '즉시 코칭 · 질책 대신 협력 프레임 — 신뢰도 +14' },
    cta: '무료로 연습 시작',
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(v) {
  const bubbles = v.msgs.map((m) => {
    if (m.who === 'me') {
      return `<div class="row me"><div class="b me">${esc(m.t)}</div></div>`;
    }
    return `<div class="row ai"><div class="av">${esc(v.name[0])}</div><div class="b ai">${esc(m.t)}</div></div>`;
  }).join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
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
  .h1 { margin-top:34px; font-size:78px; line-height:1.16; font-weight:900; letter-spacing:-.02em; }
  .h1 .accent { color:#fbbf24; }
  .card { margin-top:46px; background:#0b1224; border:1px solid rgba(255,255,255,0.10);
    border-radius:34px; overflow:hidden; box-shadow:0 30px 90px rgba(0,0,0,0.45); }
  .chead { display:flex; align-items:center; gap:18px; padding:28px 30px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#22d3ee);
    display:flex; align-items:center; justify-content:center; font-size:30px; font-weight:800; color:#fff; }
  .who .n { font-size:30px; font-weight:800; }
  .who .s { font-size:23px; color:#94a3b8; margin-top:3px; }
  .live { margin-left:auto; font-size:21px; font-weight:800; color:#fcd34d;
    background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); padding:8px 16px; border-radius:999px; }
  .gauge { padding:26px 30px 18px; border-bottom:1px solid rgba(255,255,255,0.06); }
  .glabel { display:flex; align-items:center; gap:16px; }
  .glabel .t { font-size:21px; font-weight:800; color:#94a3b8; letter-spacing:.1em; }
  .bar { flex:1; height:16px; border-radius:999px; background:#1e293b; overflow:hidden; }
  .fill { height:100%; border-radius:999px; }
  .gval { font-size:30px; font-weight:900; }
  .gnote { margin-top:12px; font-size:21px; color:#94a3b8; }
  .msgs { padding:28px 30px; display:flex; flex-direction:column; gap:20px; }
  .row { display:flex; gap:14px; align-items:flex-end; }
  .row.me { justify-content:flex-end; }
  .row .av { width:46px; height:46px; border-radius:50%; background:rgba(99,102,241,0.25);
    display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; color:#c7d2fe; flex:0 0 auto; }
  .b { max-width:74%; padding:20px 24px; font-size:27px; line-height:1.4; }
  .b.ai { background:#1e293b; color:#e2e8f0; border-radius:22px 22px 22px 6px; }
  .b.me { background:rgba(99,102,241,0.22); color:#eef2ff; border-radius:22px 22px 6px 22px; border:1px solid rgba(99,102,241,0.35); }
  .coach { margin:6px 30px 30px; padding:18px 22px; border-radius:18px; font-size:24px; font-weight:700; text-align:center; }
  .coach.pos { background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); color:#6ee7b7; }
  .coach.neg { background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); color:#fca5a5; }
  .foot { margin-top:auto; display:flex; align-items:center; gap:24px; }
  .ctabtn { background:#f59e0b; color:#1b1300; font-size:34px; font-weight:900; padding:26px 44px; border-radius:18px; }
  .micro { font-size:25px; color:#cbd5e1; font-weight:600; }
</style></head>
<body><div class="canvas">
  <div class="brand"><b>Letmefree</b> · 렛미프리 — AI 리더십 대화 리허설</div>
  <span class="badge">${esc(v.badge)}</span>
  <div class="h1">${esc(v.h1)}<br><span class="accent">${esc(v.h2)}</span></div>
  <div class="card">
    <div class="chead">
      <div class="avatar">${esc(v.name[0])}</div>
      <div class="who"><div class="n">${esc(v.name)}</div><div class="s">${esc(v.sub)}</div></div>
      <div class="live">LIVE TRUST</div>
    </div>
    <div class="gauge">
      <div class="glabel"><span class="t">신뢰도</span>
        <div class="bar"><div class="fill" style="width:${v.gauge}%;background:${v.gaugeColor}"></div></div>
        <span class="gval" style="color:${v.gaugeColor}">${v.gauge}</span>
      </div>
      <div class="gnote">${esc(v.gaugeNote)}</div>
    </div>
    <div class="msgs">${bubbles}</div>
    <div class="coach ${v.coach.tone}">${esc(v.coach.t)}</div>
  </div>
  <div class="foot">
    <div class="ctabtn">${esc(v.cta)} →</div>
    <div class="micro">가입 없이 3개<br>시나리오 무료</div>
  </div>
</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
for (const v of VERSIONS) {
  await page.setContent(html(v), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(OUT, v.file) });
  console.log('saved', v.file);
}
await browser.close();
console.log('DONE →', OUT);
