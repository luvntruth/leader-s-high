/**
 * characterAvatars.ts
 * 시나리오/이름 기반 캐릭터 아바타 URL과 메타데이터를 반환합니다.
 * DiceBear notionists-neutral 스타일 사용.
 */

export interface CharacterInfo {
  name: string;
  nameEn: string;
  role: string;
  seed: string;
  gender: 'male' | 'female';
}

const SCENARIO_CHARACTERS: Record<string, CharacterInfo> = {
  'late-comer': { name: '이민수', nameEn: 'Lee Minsu', role: '주임', seed: 'minsu', gender: 'male' },
  'team-clash': { name: '박지현', nameEn: 'Park Jihyun', role: '대리', seed: 'jihyun', gender: 'female' },
  'feedback-defense': { name: '최준혁', nameEn: 'Choi Junhyuk', role: '사원', seed: 'junhyuk', gender: 'male' },
  'quiet-resignation': { name: '김유진', nameEn: 'Kim Yujin', role: '대리', seed: 'yujin', gender: 'female' },
  'overtime-refusal': { name: '정다은', nameEn: 'Jung Daeun', role: '주임', seed: 'daeun', gender: 'female' },
  'credit-stealer': { name: '오승민', nameEn: 'Oh Seungmin', role: '차장', seed: 'seungmin', gender: 'male' },
  'perfectionist': { name: '한소희', nameEn: 'Han Sohee', role: '과장', seed: 'sohee', gender: 'female' },
  'silent-struggle': { name: '윤재원', nameEn: 'Yun Jaewon', role: '사원', seed: 'jaewon', gender: 'male' },
  'burnout': { name: '임지수', nameEn: 'Lim Jisu', role: '팀장', seed: 'jisu', gender: 'female' },
  'gen-z-conflict': { name: '강민준', nameEn: 'Kang Minjun', role: '인턴', seed: 'minjun', gender: 'male' },
  'new-hire-lost': { name: '신예은', nameEn: 'Shin Yeeun', role: '신입', seed: 'yeeun', gender: 'female' },
  'presentation-anxiety': { name: '류성호', nameEn: 'Ryu Sungho', role: '주임', seed: 'sungho', gender: 'male' },
  'always-last-minute': { name: '배수연', nameEn: 'Bae Suyeon', role: '대리', seed: 'suyeon', gender: 'female' },
  'meeting-rambler': { name: '홍기현', nameEn: 'Hong Gihyun', role: '차장', seed: 'gihyun', gender: 'male' },
  'eighty-percent-finisher': { name: '장미래', nameEn: 'Jang Mirae', role: '사원', seed: 'mirae', gender: 'female' },
  'upward-feedback-averse': { name: '서동현', nameEn: 'Seo Donghyun', role: '과장', seed: 'donghyun', gender: 'male' },
  'perfectionist-report-delay': { name: '문지아', nameEn: 'Moon Jia', role: '주임', seed: 'jia', gender: 'female' },
};

export const DEFAULT_CHARACTERS: CharacterInfo[] = [
  { name: '이민수', nameEn: 'Lee Minsu', role: '팀원', seed: 'member1', gender: 'male' },
  { name: '박지현', nameEn: 'Park Jihyun', role: '팀원', seed: 'member2', gender: 'female' },
  { name: '최준혁', nameEn: 'Choi Junhyuk', role: '팀원', seed: 'member3', gender: 'male' },
  { name: '김유진', nameEn: 'Kim Yujin', role: '팀원', seed: 'member4', gender: 'female' },
];

export function getCharacterInfo(scenarioId?: string, fallbackName?: string): CharacterInfo {
  if (scenarioId && SCENARIO_CHARACTERS[scenarioId]) {
    return SCENARIO_CHARACTERS[scenarioId];
  }
  if (fallbackName) {
    const found = Object.values(SCENARIO_CHARACTERS).find(c => c.name === fallbackName);
    if (found) return found;
    return { name: fallbackName, nameEn: fallbackName, role: '팀원', seed: fallbackName, gender: 'male' };
  }
  return DEFAULT_CHARACTERS[0];
}

export function getCharacterAvatar(name: string, scenarioId?: string, emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'concerned'): string {
  const info = getCharacterInfo(scenarioId, name);
  const base = `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${info.seed}`;

  const emotionParams: Record<string, string> = {
    angry: '&eyebrows=angry&mouth=nervous',
    sad: '&eyebrows=sad&mouth=sad',
    concerned: '&eyebrows=unibrowNatural&mouth=concerned',
    happy: '&eyebrows=natural&mouth=smile',
    neutral: '',
  };
  return base + (emotionParams[emotion ?? 'neutral'] ?? '');
}

export function getAvatarGlowColor(trust: number): { color: string; shadow: string; borderColor: string } {
  if (trust <= 20) return { color: 'rgb(239, 68, 68)', shadow: '0 0 20px rgba(239,68,68,0.7), 0 0 40px rgba(239,68,68,0.3)', borderColor: '#ef4444' };
  if (trust <= 40) return { color: 'rgb(249, 115, 22)', shadow: '0 0 20px rgba(249,115,22,0.7), 0 0 40px rgba(249,115,22,0.3)', borderColor: '#f97316' };
  if (trust <= 55) return { color: 'rgb(234, 179, 8)', shadow: '0 0 20px rgba(234,179,8,0.7),  0 0 40px rgba(234,179,8,0.3)', borderColor: '#eab308' };
  if (trust <= 70) return { color: 'rgb(0, 242, 255)', shadow: '0 0 20px rgba(0,242,255,0.7),  0 0 40px rgba(0,242,255,0.3)', borderColor: '#00f2ff' };
  if (trust <= 85) return { color: 'rgb(34, 197, 94)', shadow: '0 0 20px rgba(34,197,94,0.7),  0 0 40px rgba(34,197,94,0.3)', borderColor: '#22c55e' };
  return { color: 'rgb(74, 222, 128)', shadow: '0 0 20px rgba(74,222,128,0.7), 0 0 40px rgba(74,222,128,0.3)', borderColor: '#4ade80' };
}

export function getEmotionEmoji(trust: number): string {
  if (trust <= 20) return '😠';
  if (trust <= 35) return '😤';
  if (trust <= 50) return '😒';
  if (trust <= 65) return '🤔';
  if (trust <= 80) return '🙂';
  return '😊';
}
