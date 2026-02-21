
// Character Avatar Service
// DiceBear Avatars를 활용한 시나리오별 캐릭터 아바타 생성

interface CharacterInfo {
  name: string;
  nameEn: string;
  role: string;
  seed: string;       // DiceBear seed for consistent avatar
  gender: 'male' | 'female';
}

// 시나리오별 캐릭터 정보 매핑
const CHARACTER_MAP: Record<string, CharacterInfo> = {
  'late-comer': { name: '김철수', nameEn: 'Kim Cheol-su', role: '핵심 개발자', seed: 'kimcs', gender: 'male' },
  'team-clash': { name: '최종필', nameEn: 'Choi Jong-pil', role: '시니어 팀원', seed: 'choijp', gender: 'male' },
  'boundaries': { name: '박지민', nameEn: 'Park Ji-min', role: '팀원', seed: 'parkjm', gender: 'female' },
  'feedback-defense': { name: '최준호', nameEn: 'Choi Jun-ho', role: '팀원', seed: 'choijh', gender: 'male' },
  'low-motivation': { name: '강소윤', nameEn: 'Kang So-yun', role: '에이스 팀원', seed: 'kangsy', gender: 'female' },
  'change-resistance': { name: '정대현', nameEn: 'Jung Dae-hyun', role: '시니어 팀원', seed: 'jungdh', gender: 'male' },
  'promotion-fail': { name: '윤지후', nameEn: 'Yun Ji-hu', role: '팀원', seed: 'yunjh', gender: 'male' },
  'quiet-quitting': { name: '임서연', nameEn: 'Im Seo-yeon', role: '팀원', seed: 'imsy', gender: 'female' },
  'micro-management': { name: '오지수', nameEn: 'Oh Ji-su', role: '팀원', seed: 'ohjs', gender: 'female' },
  'skill-gap': { name: '한결', nameEn: 'Han Gyeol', role: '주니어 팀원', seed: 'hangy', gender: 'male' },
  'remote-isolation': { name: '서유나', nameEn: 'Seo Yu-na', role: '팀원', seed: 'seoyn', gender: 'female' },
  'inter-gen-clash': { name: '권혁주', nameEn: 'Kwon Hyeok-ju', role: '중간 관리자', seed: 'kwonhj', gender: 'male' },
  'over-commitment': { name: '송미래', nameEn: 'Song Mi-rae', role: '팀원', seed: 'songmr', gender: 'female' },
  'negativity-virus': { name: '고진우', nameEn: 'Ko Jin-woo', role: '팀원', seed: 'kojw', gender: 'male' },
  'career-pivot': { name: '배현우', nameEn: 'Bae Hyun-woo', role: '에이스 팀원', seed: 'baehw', gender: 'male' },
  'transparency-demand': { name: '신예은', nameEn: 'Shin Ye-eun', role: '마케팅 과장', seed: 'shinye', gender: 'female' },
  'quality-vs-speed': { name: '박건우', nameEn: 'Park Geon-woo', role: '팀원', seed: 'parkgw', gender: 'male' },
  'hidden-agenda': { name: '이선화', nameEn: 'Lee Seon-hwa', role: '팀원', seed: 'leesh', gender: 'female' },
  'recognition-starve': { name: '김하온', nameEn: 'Kim Ha-on', role: '팀원', seed: 'kimho', gender: 'male' },
  'tech-debt': { name: '조유진', nameEn: 'Jo Yu-jin', role: '개발자', seed: 'joyj', gender: 'female' },
  'passive-aggressive-meeting': { name: '한민석', nameEn: 'Han Min-seok', role: '팀원', seed: 'hanms', gender: 'male' },
  'fragile-ego-feedback': { name: '이루다', nameEn: 'Lee Ru-da', role: '팀원', seed: 'leerd', gender: 'female' },
  'selective-work-allergy': { name: '백승현', nameEn: 'Baek Seung-hyun', role: '팀원', seed: 'baeksh', gender: 'male' },
  'growth-refusal': { name: '김문숙', nameEn: 'Kim Mun-suk', role: '시니어 팀원', seed: 'kimms', gender: 'female' },
  'side-project-overload': { name: '최재현', nameEn: 'Choi Jae-hyun', role: '팀원', seed: 'choijh2', gender: 'male' },
  'stealing-credit-misconception': { name: '송아름', nameEn: 'Song A-reum', role: '팀원', seed: 'songar', gender: 'female' },
  'informal-leader': { name: '정만식', nameEn: 'Jung Man-sik', role: '시니어 팀원', seed: 'jungms', gender: 'male' },
  'selective-honesty': { name: '남궁민', nameEn: 'Nam-gung Min', role: '팀원', seed: 'namgm', gender: 'male' },
  'tmi-energy-drainer': { name: '이지혜', nameEn: 'Lee Ji-hye', role: '팀원', seed: 'leejh', gender: 'female' },
  'emotional-rollercoaster': { name: '강승우', nameEn: 'Kang Seung-woo', role: '에이스 팀원', seed: 'kangsw', gender: 'male' },
  'new-hire-lost': { name: '이수아', nameEn: 'Lee Su-a', role: '신입 사원', seed: 'leesa', gender: 'female' },
  'presentation-anxiety': { name: '황도윤', nameEn: 'Hwang Do-yun', role: '팀원', seed: 'hwangdy', gender: 'male' },
  'always-last-minute': { name: '문서준', nameEn: 'Moon Seo-jun', role: '팀원', seed: 'moonsj', gender: 'male' },
  'meeting-rambler': { name: '조성민', nameEn: 'Jo Seong-min', role: '팀원', seed: 'josm', gender: 'male' },
  'eighty-percent-finisher': { name: '장예린', nameEn: 'Jang Ye-rin', role: '팀원', seed: 'jangyr', gender: 'female' },
  'silent-struggle': { name: '오하영', nameEn: 'Oh Ha-young', role: '팀원', seed: 'ohhy', gender: 'female' },
  'upward-feedback-averse': { name: '전지훈', nameEn: 'Jeon Ji-hun', role: '팀원', seed: 'jeonjh', gender: 'male' },
  'unclear-instructions-confusion': { name: '하준서', nameEn: 'Ha Jun-seo', role: '팀원', seed: 'hajs', gender: 'male' },
  'learning-vs-delivering': { name: '유소정', nameEn: 'Yu So-jeong', role: '팀원', seed: 'yusj', gender: 'female' },
  'perfectionist-report-delay': { name: '박세영', nameEn: 'Park Se-yeong', role: '팀원', seed: 'parksy', gender: 'female' },
};

/**
 * 캐릭터 아바타 URL 생성 (DiceBear notionists 스타일)
 */
export function getCharacterAvatar(name: string, scenarioId?: string): string {
  const info = scenarioId ? CHARACTER_MAP[scenarioId] : null;
  const seed = info?.seed || name;
  // Use DiceBear notionists-neutral style for professional look
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent&radius=0`;
}

/**
 * 캐릭터 정보 조회
 */
export function getCharacterInfo(scenarioId?: string, fallbackName?: string): CharacterInfo {
  if (scenarioId && CHARACTER_MAP[scenarioId]) {
    return CHARACTER_MAP[scenarioId];
  }
  return {
    name: fallbackName || '팀원',
    nameEn: fallbackName || 'Team Member',
    role: '팀원',
    seed: fallbackName || 'default',
    gender: 'male'
  };
}

/**
 * Trust Level에 따른 아바타 글로우 색상
 */
export function getAvatarGlowColor(trust: number): { color: string; shadow: string; borderColor: string } {
  if (trust <= 20) return { 
    color: 'rgb(239, 68, 68)',     // red-500
    shadow: '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.1)',
    borderColor: 'border-red-500/50'
  };
  if (trust <= 40) return { 
    color: 'rgb(249, 115, 22)',    // orange-500
    shadow: '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.1)',
    borderColor: 'border-orange-500/50'
  };
  if (trust <= 55) return { 
    color: 'rgb(234, 179, 8)',     // yellow-500
    shadow: '0 0 20px rgba(234, 179, 8, 0.3), 0 0 40px rgba(234, 179, 8, 0.1)',
    borderColor: 'border-yellow-500/50'
  };
  if (trust <= 70) return { 
    color: 'rgb(0, 242, 255)',     // primary cyan
    shadow: '0 0 20px rgba(49, 130, 246, 0.3), 0 0 40px rgba(49, 130, 246, 0.1)',
    borderColor: 'border-primary/50'
  };
  if (trust <= 85) return { 
    color: 'rgb(34, 197, 94)',     // green-500
    shadow: '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.1)',
    borderColor: 'border-green-500/50'
  };
  return { 
    color: 'rgb(74, 222, 128)',    // green-400
    shadow: '0 0 25px rgba(74, 222, 128, 0.5), 0 0 50px rgba(74, 222, 128, 0.15)',
    borderColor: 'border-green-400/60'
  };
}

/**
 * Trust Level에 따른 감정 이모지
 */
export function getEmotionEmoji(trust: number): string {
  if (trust <= 20) return '😠';
  if (trust <= 40) return '😒';
  if (trust <= 55) return '🤔';
  if (trust <= 70) return '😐';
  if (trust <= 85) return '🙂';
  return '😊';
}
