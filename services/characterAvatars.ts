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
  realityImageUrl?: string; // 실사 AI 이미지 경로
  themeColor: string;      // 캐릭터 고유 테마 컬러
  visualTraits: {
    hair: string;
    clothing: string;
    expression: string;
    accent: string;
  };
  disposition: string[];   // 캐릭터의 핵심 성향 (1-2단어)
}

const SCENARIO_CHARACTERS: Record<string, CharacterInfo> = {
  'late-comer': {
    name: '김철수', nameEn: 'Kim Cheolsu', role: '주임', seed: 'cheolsu', gender: 'male',
    themeColor: '#00F2FF',
    realityImageUrl: '/assets/avatars/chulsoo.png',
    visualTraits: { hair: '트렌디한 댄디컷', clothing: '블러 블랙 후디', expression: '피곤하지만 실력있는', accent: '다크서클' },
    disposition: ['최고의 실력', '워커홀릭']
  },
  'team-clash': {
    name: '최종필', nameEn: 'Choi Jongpil', role: '시니어', seed: 'jongpil', gender: 'male',
    themeColor: '#FF2E63',
    realityImageUrl: '/assets/avatars/jongpil.png',
    visualTraits: { hair: '중후한 그레이 헤어', clothing: '깔끔한 정장 재킷', expression: '엄격하고 날카로운', accent: '금테 안경' },
    disposition: ['논리적인', '직설적인']
  },
  'boundaries': {
    name: '박지민', nameEn: 'Park Jimin', role: '대리', seed: 'jimin', gender: 'female',
    themeColor: '#8B5CF6',
    realityImageUrl: '/assets/avatars/jimin.png',
    visualTraits: { hair: '긴 생머리', clothing: '스타일리시한 블레이저', expression: '차분하지만 단호한', accent: '스마트 워치' },
    disposition: ['효율중심', '정확한']
  },
  'feedback-defense': {
    name: '최준호', nameEn: 'Choi Junho', role: '사원', seed: 'junho', gender: 'male',
    themeColor: '#10B981',
    realityImageUrl: '/assets/avatars/junho.png',
    visualTraits: { hair: '단정한 가르마 머리', clothing: '화이트 와이셔츠', expression: '조심스러운', accent: '무테 안경' },
    disposition: ['원칙주의', '방어적']
  },
};

export const DEFAULT_CHARACTERS: CharacterInfo[] = [
  SCENARIO_CHARACTERS['late-comer'],
  SCENARIO_CHARACTERS['team-clash'],
  SCENARIO_CHARACTERS['boundaries'],
  SCENARIO_CHARACTERS['feedback-defense'],
];

export function getCharacterInfo(scenarioId?: string, fallbackName?: string): CharacterInfo {
  // 1. 시나리오 ID 기반 정확한 매핑 확인
  if (scenarioId && SCENARIO_CHARACTERS[scenarioId]) {
    const info = SCENARIO_CHARACTERS[scenarioId];
    // 매핑된 이름과 fallbackName이 다를 경우(사용자 정의 등) fallbackName 우선 가능성 고려
    if (fallbackName && info.name !== fallbackName) {
      // 이름이 명시적으로 전달되었다면 해당 이름으로 정보를 동적 생성하여 응답
      return generateDynamicCharacter(fallbackName, scenarioId);
    }
    return info;
  }

  // 2. 이름 기반 검색 (기존 데이터 내에 있는 경우)
  if (fallbackName) {
    const found = Object.values(SCENARIO_CHARACTERS).find(c => c.name === fallbackName);
    if (found) return found;

    // 3. 없으면 동적 생성 (이민수로 고정되는 문제 해결)
    return generateDynamicCharacter(fallbackName, scenarioId);
  }

  return DEFAULT_CHARACTERS[0];
}

/**
 * 시나리오 ID나 이름 정보를 바탕으로 캐릭터 정보를 동적으로 생성합니다.
 */
function generateDynamicCharacter(name: string, scenarioId?: string): CharacterInfo {
  // 이름 기반으로 일관된 시드 생성
  const seed = name.toLowerCase().replace(/\s+/g, '') || (scenarioId ? scenarioId : 'default');

  // 이름으로 성별 추측 (단순 로직)
  const isFemale = name.endsWith('나') || name.endsWith('은') || name.endsWith('윤') || name.endsWith('희') || name.endsWith('서') || name.endsWith('연') || name.endsWith('민') || name.endsWith('혜');

  return {
    name: name,
    nameEn: name,
    role: '팀원',
    seed: seed,
    gender: isFemale ? 'female' : 'male',
    themeColor: '#00F2FF',
    visualTraits: {
      hair: '스타일리시한 컷',
      clothing: '비즈니스 캐주얼',
      expression: '진지한',
      accent: '없음'
    },
    disposition: ['전문적인', '개성있는']
  };
}

/**
 * 전용 실사 아바타 이미지를 반환합니다.
 * 실사 이미지가 없는 경우 DiceBear의 'adventurer' 스타일(게임풍/웹툰풍 샘플)로 폴백합니다.
 */
export function getCharacterAvatar(name: string, scenarioId?: string, emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'concerned'): string {
  const info = getCharacterInfo(scenarioId, name);

  // 실사 AI 이미지가 존재하면 사용 (public 폴더 내 파일 확인 로직은 클라이언트 사이드에서 처리 권장)
  // 현재는 경로가 설정되어 있으면 해당 경로를 반환
  if (info.realityImageUrl && !info.realityImageUrl.startsWith('/assets/avatars/')) {
    return info.realityImageUrl;
  }

  // 생성 전까지는 보스가 요청한 스타일에 가까운 'adventurer' 스타일 사용
  const base = `https://api.dicebear.com/7.x/adventurer/svg?seed=${info.seed}`;

  return base;
}


export function getAvatarGlowColor(trust: number): { color: string; shadow: string; borderColor: string; animationClass: string } {
  if (trust <= 20) return {
    color: 'rgb(239, 68, 68)',
    shadow: '0 0 20px rgba(239,68,68,0.7), 0 0 40px rgba(239,68,68,0.3)',
    borderColor: '#ef4444',
    animationClass: 'animate-glow-pulse pulse-red'
  };
  if (trust <= 40) return {
    color: 'rgb(249, 115, 22)',
    shadow: '0 0 20px rgba(249,115,22,0.7), 0 0 40px rgba(249,115,22,0.3)',
    borderColor: '#f97316',
    animationClass: 'animate-glow-pulse'
  };
  if (trust <= 55) return {
    color: 'rgb(234, 179, 8)',
    shadow: '0 0 20px rgba(234,179,8,0.7),  0 0 40px rgba(234,179,8,0.3)',
    borderColor: '#eab308',
    animationClass: ''
  };
  if (trust <= 70) return {
    color: 'rgb(0, 242, 255)',
    shadow: '0 0 20px rgba(0,242,255,0.7),  0 0 40px rgba(0,242,255,0.3)',
    borderColor: '#00f2ff',
    animationClass: ''
  };
  if (trust <= 85) return {
    color: 'rgb(34, 197, 94)',
    shadow: '0 0 20px rgba(34,197,94,0.7),  0 0 40px rgba(34,197,94,0.3)',
    borderColor: '#22c55e',
    animationClass: 'animate-float'
  };
  return {
    color: 'rgb(74, 222, 128)',
    shadow: '0 0 20px rgba(74,222,128,0.7), 0 0 40px rgba(74,222,128,0.3)',
    borderColor: '#4ade80',
    animationClass: 'animate-glow-pulse'
  };
}

export function getEmotionEmoji(trust: number): string {
  if (trust <= 20) return '😠';
  if (trust <= 35) return '😤';
  if (trust <= 50) return '😒';
  if (trust <= 65) return '🤔';
  if (trust <= 80) return '🙂';
  return '😊';
}
