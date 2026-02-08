
export interface LeaderData {
  id: string;
  name: string;
  dept: string;
  lq: number;
  sbi: number;
  empathy: number;
  active: boolean;
  lastActive: string;
  trend: 'up' | 'down' | 'stable';
}

export interface RadarStats {
  trust: number;
  motivation: number;
  conflict: number;
  decision: number;
  strategy: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: string;
  color: string;
  isUnlocked: boolean;
}

export interface UserRank {
  level: number;
  title: string;
  subTitle: string;
  progress: number;
  nextLevelXp: number;
  currentXp: number;
}

const DEPARTMENTS = ['플랫폼개발팀', '브랜드마케팅', '영업전략본부', 'CX디자인센터', '인사운영팀'];
const NAMES = ['김철수', '이영희', '박지민', '최준호', '강소윤', '정대현', '윤지후', '임서연', '오지수', '한결', '서유나', '권혁주', '송미래', '고진우', '배현우', '신예은', '박건우', '이선화', '김하온', '조유진', '장민준', '홍다은', '남궁혁', '류지혜', '양승호', '강백호', '전소민', '백종민', '채원', '구본승'];

export const DataService = {
  initOrgData() {
    const existing = localStorage.getItem('leadershigh_org_v4');
    if (!existing) {
      const dummyData: LeaderData[] = NAMES.map((name, i) => ({
        id: `leader-${i}`,
        name,
        dept: DEPARTMENTS[i % DEPARTMENTS.length],
        lq: Math.floor(Math.random() * (950 - 650) + 650),
        sbi: Math.floor(Math.random() * (100 - 40) + 40),
        empathy: Math.floor(Math.random() * (100 - 50) + 50),
        active: Math.random() > 0.15,
        lastActive: `${Math.floor(Math.random() * 23) + 1}시간 전`,
        trend: Math.random() > 0.5 ? 'up' : (Math.random() > 0.5 ? 'down' : 'stable')
      }));
      localStorage.setItem('leadershigh_org_v4', JSON.stringify(dummyData));
    }
  },

  getOrgData(): LeaderData[] {
    return JSON.parse(localStorage.getItem('leadershigh_org_v4') || '[]');
  },

  getUserHistory(): any[] {
    return JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
  },

  getAverageRadarStats(): RadarStats {
    const history = this.getUserHistory();
    if (history.length === 0) {
      return { trust: 70, motivation: 65, conflict: 60, decision: 75, strategy: 55 };
    }
    
    const validStats = history.filter(h => h.evaluation?.radarChart);
    if (validStats.length === 0) return { trust: 70, motivation: 65, conflict: 60, decision: 75, strategy: 55 };

    const totals = validStats.reduce((acc, curr) => ({
      trust: acc.trust + (curr.evaluation.radarChart.trust || 0),
      motivation: acc.motivation + (curr.evaluation.radarChart.motivation || 0),
      conflict: acc.conflict + (curr.evaluation.radarChart.conflict || 0),
      decision: acc.decision + (curr.evaluation.radarChart.decision || 0),
      strategy: acc.strategy + (curr.evaluation.radarChart.strategy || 0),
    }), { trust: 0, motivation: 0, conflict: 0, decision: 0, strategy: 0 });

    const len = validStats.length;
    return {
      trust: Math.floor(totals.trust / len),
      motivation: Math.floor(totals.motivation / len),
      conflict: Math.floor(totals.conflict / len),
      decision: Math.floor(totals.decision / len),
      strategy: Math.floor(totals.strategy / len),
    };
  },

  // 조직 평균 역량 지표 (비교용)
  getOrgAverageRadarStats(): RadarStats {
    return { trust: 62, motivation: 58, conflict: 64, decision: 60, strategy: 55 };
  },

  getWeakestAreaInfo(): { area: string; category: string; score: number } {
    const stats = this.getAverageRadarStats();
    const mapping: Record<keyof RadarStats, string> = {
      trust: '조직 문화',
      motivation: '동기 부여',
      conflict: '갈등 해결',
      decision: '피드백',
      strategy: '성과 관리'
    };
    
    let weakestKey: keyof RadarStats = 'trust';
    let minScore = stats.trust;

    (Object.keys(stats) as Array<keyof RadarStats>).forEach(key => {
      if (stats[key] < minScore) {
        minScore = stats[key];
        weakestKey = key;
      }
    });

    const areaNames: Record<keyof RadarStats, string> = {
        trust: '신뢰 구축',
        motivation: '동기 부여',
        conflict: '갈등 해결',
        decision: '의사 결정',
        strategy: '전략적 사고'
    };

    return {
      area: areaNames[weakestKey],
      category: mapping[weakestKey],
      score: minScore
    };
  },

  getOrgStats() {
    const data = this.getOrgData();
    if (data.length === 0) return { avgLQ: 0, activeRate: 0, total: 0 };
    const totalLQ = data.reduce((acc, curr) => acc + curr.lq, 0);
    return {
      avgLQ: Math.floor(totalLQ / data.length),
      activeRate: Math.floor((data.filter(d => d.active).length / data.length) * 100),
      total: data.length,
      topDept: DEPARTMENTS[0]
    };
  },

  getUserRank(): UserRank {
    const history = this.getUserHistory();
    const missionCount = history.length;
    const radar = this.getAverageRadarStats();
    
    let level = Math.floor(missionCount / 2) + 1;
    let title = "";
    let subTitle = "";

    if (level <= 5) {
      title = "루키 리더";
      subTitle = "리더십의 기초를 다지는 중";
    } else if (level <= 10) {
      title = "프로페셔널 매니저";
      subTitle = "안정적인 팀 운영 능력 보유";
    } else if (level <= 15) {
      if (radar.strategy > 80) title = "엘리트 전략가";
      else if (radar.trust > 80) title = "엘리트 하모니어";
      else title = "엘리트 리더";
      subTitle = "조직의 핵심 리더십 발휘 중";
    } else {
      title = "마스터 디렉터";
      subTitle = "조직 문화를 리딩하는 존재";
    }

    const nextLevelXp = 1000;
    const currentXp = (missionCount * 235) % 1000;

    return {
      level,
      title,
      subTitle,
      currentXp,
      nextLevelXp,
      progress: (currentXp / nextLevelXp) * 100
    };
  },

  getOrgTrend() {
    return [{ month: '1월', count: 45 }, { month: '2월', count: 52 }, { month: '3월', count: 88 }, { month: '4월', count: 76 }, { month: '5월', count: 124 }];
  },

  getUserTrend() {
    return [{ month: '1월', count: 2 }, { month: '2월', count: 5 }, { month: '3월', count: 12 }, { month: '4월', count: 8 }, { month: '5월', count: 15 }];
  },

  getTopMissions() {
    return [
      { title: '시니어 간 의견 대립 중재', count: 12, category: '갈등 해결' },
      { title: 'Z세대 팀원 피드백 코칭', count: 9, category: '성과 관리' },
      { title: '번아웃 팀원 동기부여', count: 7, category: '조직 문화' },
    ];
  },

  getUserBadges(): Badge[] {
    const history = this.getUserHistory();
    const missionCount = history.length;
    const maxEmpathy = Math.max(...history.map((h: any) => h.evaluation?.metrics?.empathyIndex || 0), 0);
    const genZCount = history.filter((h: any) => h.scenario?.generation === 'Gen Z').length;
    
    return [
      { id: 'beginner', name: '첫 걸음', icon: 'rocket_launch', description: '리더십 여정을 시작했습니다.', condition: '미션 1회 완료', color: 'text-primary', isUnlocked: missionCount >= 1 },
      { id: 'empathy', name: '공감의 신', icon: 'favorite', description: '팀원의 마음을 읽는 탁월한 능력을 갖췄습니다.', condition: '공감 지수 90% 달성', color: 'text-accent-neon', isUnlocked: maxEmpathy >= 90 },
      { id: 'streak', name: '성실한 리더', icon: 'local_fire_department', description: '꾸준함이 변화를 만듭니다.', condition: '5일 연속 스트릭 달성', color: 'text-accent-amber', isUnlocked: true },
      { id: 'genz', name: 'Z세대 전문가', icon: 'auto_awesome', description: '젊은 세대와 완벽하게 소통합니다.', condition: 'Z세대 미션 3회 클리어', color: 'text-purple-400', isUnlocked: genZCount >= 3 }
    ];
  },

  getDeptMetrics() {
    const data = this.getOrgData();
    return DEPARTMENTS.map(dept => {
      const deptLeaders = data.filter(l => l.dept === dept);
      const avg = deptLeaders.length > 0 ? Math.floor(deptLeaders.reduce((a, b) => a + b.lq, 0) / deptLeaders.length) : 0;
      return { name: dept, score: avg };
    }).sort((a, b) => b.score - a.score);
  }
};
