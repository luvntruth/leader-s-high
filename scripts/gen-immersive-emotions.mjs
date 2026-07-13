// 몰입 모드 감정 세트 생성 — late-comer(김철수) × 5감정
// 방식: 기준 이미지(중립) 1장 생성 → 감정별 편집(기준 이미지를 입력 참조로 표정·자세만 변경)
//       → 캐릭터·배경 일관성 확보 (docs/v2-immersive-character-mode.md 검증 방식 재현)
// 실행: node scripts/gen-immersive-emotions.mjs  → public/assets/immersive/late-comer/*.png
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire('C:/Users/luvnt/Desktop/LetmeFree/leader-s-high/package.json');
const { GoogleGenAI } = require('@google/genai');

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/immersive/late-comer');
mkdirSync(OUT, { recursive: true });

const ai = new GoogleGenAI({
  apiKey: 'no-token',
  httpOptions: {
    baseUrl: 'https://leaders-high-proxy.luvntruth.workers.dev',
    headers: { Origin: 'https://app.letmefree.xyz' },
  },
});

const MODEL = 'gemini-2.5-flash-image';

const STYLE = `세미리얼 웹툰/모바일게임 일러스트 스타일 (애니메이션보다 사실적, 실사보다 부드러운 채색).
장면: 한국 IT 회사의 회의실. 1:1 면담 테이블 맞은편에 앉아 있는 20대 후반 남성 직장인 "김철수 주임".
외형: 트렌디한 댄디컷 머리, 다크서클이 옅게 보이는 피곤하지만 실력 있는 인상, 블랙 후디 착용, 워커홀릭 분위기.
구도: 세로형 인물 중심 구도, 허리 위(웨이스트업), 정면에서 살짝 비스듬히. 배경은 회의실 유리벽·화이트보드가 은은하게 보이는 정도로 흐릿하게.
조명: 부드러운 사무실 조명. 화면 하단 1/3은 대화 오버레이가 올라갈 것을 고려해 여백/단순하게.`;

const BASE_PROMPT = `${STYLE}
표정·자세: 무표정에 가까운 유보적 관망. 팔은 테이블 위에 자연스럽게. 시선은 정면(리더 쪽)이지만 감정을 드러내지 않음.
이 이미지는 감정 변형 시리즈의 기준(중립) 이미지입니다. 고품질 일러스트 1장.`;

// 기준 이미지를 입력으로, 표정·자세만 바꾸는 편집 프롬프트
const EMOTIONS = [
  {
    file: 'hostile',
    prompt: '입력 이미지와 동일한 인물·의상·배경·구도를 유지한 채, 표정과 자세만 "적대적"으로 변경: 팔짱을 끼고, 미간을 찌푸리며, 시선을 옆으로 피하거나 차갑게 노려봄. 입은 굳게 다묾. 다른 요소는 절대 바꾸지 마세요.',
  },
  {
    file: 'defensive',
    prompt: '입력 이미지와 동일한 인물·의상·배경·구도를 유지한 채, 표정과 자세만 "방어적·경계"로 변경: 몸을 살짝 뒤로 빼고, 어깨가 경직되고, 눈빛은 경계하며, 입술을 얇게 다묾. 다른 요소는 절대 바꾸지 마세요.',
  },
  {
    file: 'opening',
    prompt: '입력 이미지와 동일한 인물·의상·배경·구도를 유지한 채, 표정과 자세만 "마음이 열리기 시작"으로 변경: 어깨의 긴장이 풀리고, 몸이 테이블 쪽으로 살짝 기울며, 표정이 부드러워지고 옅은 미소의 기미. 다른 요소는 절대 바꾸지 마세요.',
  },
  {
    file: 'convinced',
    prompt: '입력 이미지와 동일한 인물·의상·배경·구도를 유지한 채, 표정과 자세만 "설득됨·확신"으로 변경: 편안한 미소, 밝아진 눈빛, 살짝 끄덕이는 듯한 긍정적 자세, 열린 손짓. 다른 요소는 절대 바꾸지 마세요.',
  },
];

const extractImage = (res) => {
  const parts = res.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData);
  if (!img) throw new Error('응답에 이미지 없음: ' + JSON.stringify(parts).slice(0, 200));
  return img.inlineData; // { mimeType, data(base64) }
};

const genWithRetry = async (contents, label, tries = 3) => {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });
      return extractImage(res);
    } catch (e) {
      console.log(`[${label}] 시도 ${i}/${tries} 실패: ${String(e).slice(0, 150)}`);
      if (i === tries) throw e;
      await new Promise(r => setTimeout(r, 5000 * i));
    }
  }
};

// 1) 기준(중립) 이미지 — 이미 있으면 재사용 (부분 재실행 지원)
const neutralPath = resolve(OUT, 'neutral.png');
let baseB64;
if (existsSync(neutralPath)) {
  baseB64 = readFileSync(neutralPath).toString('base64');
  console.log('neutral.png 기존 파일 재사용');
} else {
  const base = await genWithRetry(BASE_PROMPT, 'neutral');
  baseB64 = base.data;
  writeFileSync(neutralPath, Buffer.from(base.data, 'base64'));
  console.log(`saved neutral.png (${Math.round(base.data.length * 0.75 / 1024)}KB)`);
}

// 2) 감정 4종 — 기준 이미지를 입력 참조로 편집
for (const emo of EMOTIONS) {
  const outPath = resolve(OUT, `${emo.file}.png`);
  if (existsSync(outPath)) { console.log(`${emo.file}.png 존재 — 스킵`); continue; }
  const img = await genWithRetry(
    [
      { inlineData: { mimeType: 'image/png', data: baseB64 } },
      { text: emo.prompt },
    ],
    emo.file,
  );
  writeFileSync(outPath, Buffer.from(img.data, 'base64'));
  console.log(`saved ${emo.file}.png (${Math.round(img.data.length * 0.75 / 1024)}KB)`);
}

console.log('DONE →', OUT);
