
import React, { useEffect, useState, lazy, Suspense } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
// recharts(~367KB) 초기 번들 제외
const CompetencyRadar = lazy(() => import('../components/CompetencyRadar'));
import { DataService, Badge, UserRank } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { dbService } from '../services/dbService';
import { paymentService } from '../services/paymentService';
import { LEADERSHIP_TYPE_INFO, CommunicationPattern, LeadershipType, SimulationRecord } from '../src/types/database';

interface RankDetail {
  lv: string;
  name: string;
  definition: string;
  features: string[];
  usage: string;
  actions: string[];
}

const RANK_DETAILS: Record<string, RankDetail> = {
  '루키 리더': {
    lv: 'Lv 1-5',
    name: '루키 리더',
    definition: '리더십의 기초 체력을 다지는 입문 단계입니다. 기본적인 소통과 팀원과의 신뢰 관계 구축에 집중하는 시기입니다.',
    features: ['학습 의욕이 높음', '표준적인 상황에서의 대화 선호', '갈등 상황에서 다소 방어적인 태도'],
    usage: '전체 카테고리의 기초 미션들을 골고루 수행하며 본인만의 소통 스타일(Communication Style)을 발견하는 데 집중하세요.',
    actions: ['일주일 3회 이상 미션 완료하기', '성과 관리 기초 시나리오 5개 클리어', '공감 지수 평균 70점 달성']
  },
  '프로페셔널 매니저': {
    lv: 'Lv 6-10',
    name: '프로페셔널 매니저',
    definition: '팀의 성과를 안정적으로 관리하며, 실무 리더로서의 핵심 역량이 검증된 중급 단계입니다.',
    features: ['갈등 해결 및 피드백 기술 숙달', '결과 중심적 사고와 합리적 의사결정', '팀원별 맞춤형 코칭 시도'],
    usage: '점차 난도가 높아지는 "갈등 해결" 및 "동기 부여" 심화 시나리오를 통해 고난도 대인관계 역량을 강화하세요.',
    actions: ['공감 지수 평균 85점 이상 유지', 'Z세대 팀원 피드백 미션 3회 완료', '연속 5일 학습 스트릭 달성']
  },
  '엘리트 전략가/하모니어': {
    lv: 'Lv 11-15',
    name: '엘리트 전략가/하모니어',
    definition: '본인만의 강점이 독보적으로 발현되어, 조직의 핵심 문제 해결사로 인정받는 상위 15% 리더입니다.',
    features: ['전략적 판단 또는 독보적 심리 지원에 특화', '복잡한 이해관계 조정 능력 탁월', '데이터 기반의 코칭 습관화'],
    usage: '정해진 시나리오를 넘어 "나만의 상황 커스텀 설계(Custom Lab)"를 활용해 실제 현업의 고민을 AI와 시뮬레이션하세요.',
    actions: ['상위 10% 리더 그룹 벤치마킹 지수 달성', 'Custom Lab을 통한 실전 시뮬레이션 5회', '전략 사고 역량 90점 돌파']
  },
  '마스터 디렉터': {
    lv: 'Lv 16+',
    name: '마스터 디렉터',
    definition: '조직 전체의 문화를 선도하고 미래 리더를 육성하는 통찰력을 지닌 최상위 리더십 단계입니다.',
    features: ['비전 제시 및 조직 가치 내재화 탁월', '극한의 스트레스 상황에서도 평정심 유지', '차세대 리더들을 위한 멘토링 가능'],
    usage: '고급 시나리오 전 분야를 넘나들며 팀·조직 단위 리더십 인사이트를 관리하고, 차세대 리더 육성에 역량을 투자하세요.',
    actions: ['종합 LQ 지수 950점 돌파', '전사 리더십 벤치마킹 리포트 생성 및 활용', '모든 카테고리 마스터 배지 획득']
  }
};

/* ── 스킬 노드 데이터 구조 (SkillTree.tsx에서 이관) ── */
interface SkillNode {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  category: 'communication' | 'leadership' | 'development';
  level: number;
  maxLevel: number;
  description: string;
  effect: string;
  nextXp: number;
  dependencies?: string[];
  x: number;
  y: number;
}

// 스킬 레벨은 모두 0(잠금)으로 초기화 — 하드코딩 진행값 없음
// 실제 해금은 computeSkillLevels()가 Supabase 완주 횟수로 계산
const SKILL_DATA_BASE: Omit<SkillNode, 'level'>[] = [
  { id: 'listen', name: '경청의 달인', nameEn: 'ACTIVE LISTENING', icon: 'hearing', category: 'communication', maxLevel: 5, x: 20, y: 30, description: '팀원의 발언 뒤에 숨겨진 의도와 감정을 정확히 파악하는 능력입니다.', effect: '심리 분석 정확도 +20%', nextXp: 120 },
  { id: 'empathy', name: '공감적 대화', nameEn: 'EMPATHIC TALK', icon: 'diversity_3', category: 'communication', maxLevel: 5, x: 20, y: 50, description: '상대방의 감정에 공감하며 신뢰를 쌓는 대화 기술입니다.', effect: '신뢰도 회복 속도 +15%', nextXp: 150, dependencies: ['listen'] },
  { id: 'nonverbal', name: '비언어적 소통', nameEn: 'BODY LANGUAGE', icon: 'emoji_people', category: 'communication', maxLevel: 5, x: 20, y: 70, description: '말하지 않아도 표정과 몸짓으로 전해지는 메시지를 읽습니다.', effect: '돌발 대사 해금 확률 +10%', nextXp: 200, dependencies: ['empathy'] },
  { id: 'command', name: '카리스마 지시', nameEn: 'CHARISMA', icon: 'record_voice_over', category: 'leadership', maxLevel: 5, x: 50, y: 30, description: '강력한 장악력으로 팀원에게 명확한 방향을 제시하는 능력입니다.', effect: '지시 수용률 +25%', nextXp: 180 },
  { id: 'decisive', name: '전략적 의사결정', nameEn: 'STRATEGIC', icon: 'psychology', category: 'leadership', maxLevel: 5, x: 50, y: 50, description: '복잡한 상황에서도 최적의 루트를 빠르게 판단하여 결정합니다.', effect: '갈등 해결 보너스 XP +20%', nextXp: 220, dependencies: ['command'] },
  { id: 'mentor', name: '성장 멘토링', nameEn: 'MENTORING', icon: 'school', category: 'development', maxLevel: 5, x: 80, y: 30, description: '팀원의 잠재력을 끌어내어 전문성을 강화시키는 육성 능력입니다.', effect: '팀원 성장속도 +30%', nextXp: 140 },
  { id: 'safety', name: '심리적 안전감', nameEn: 'PSY SAFETY', icon: 'shield_with_heart', category: 'development', maxLevel: 5, x: 80, y: 50, description: '팀원들이 실패를 두려워하지 않고 아이디어를 낼 수 있는 환경을 만듭니다.', effect: '팀 번아웃 확률 -15%', nextXp: 250, dependencies: ['mentor'] },
];

/**
 * Supabase 완주 횟수로 스킬 레벨을 계산.
 * 추적 근거 있는 첫 스킬('listen')만 완주 1회 이상이면 Lv 1로 해금.
 * 나머지는 스킬 추적 시스템 미구축으로 잠금(Lv 0) 유지.
 */
function computeSkillLevels(completedCount: number): SkillNode[] {
  return SKILL_DATA_BASE.map(node => ({
    ...node,
    level: node.id === 'listen' && completedCount >= 1 ? 1 : 0,
  }));
}

const SKILL_CATEGORY_META = {
  communication: { label: '소통 계열', color: '#F2B90D', glow: 'rgba(242,185,13,0.4)', bg: 'rgba(242,185,13,0.1)' },
  leadership: { label: '리더십 계열', color: '#FFB800', glow: 'rgba(255,184,0,0.4)', bg: 'rgba(255,184,0,0.1)' },
  development: { label: '육성 계열', color: '#A855F7', glow: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.1)' },
};

/* ── 우주 별 좌표 ── */
const STARS = [
  { top: '3%', left: '8%', size: 2, dur: '2.3s', delay: '0s' },
  { top: '7%', left: '72%', size: 1.5, dur: '3.5s', delay: '0.6s' },
  { top: '14%', left: '30%', size: 1, dur: '2.8s', delay: '1.1s' },
  { top: '20%', left: '90%', size: 2, dur: '4.0s', delay: '0.3s' },
  { top: '28%', left: '55%', size: 1.5, dur: '2.6s', delay: '1.8s' },
  { top: '36%', left: '5%', size: 1, dur: '3.2s', delay: '0.8s' },
  { top: '44%', left: '82%', size: 2, dur: '2.5s', delay: '1.4s' },
  { top: '52%', left: '18%', size: 1.5, dur: '3.8s', delay: '0.2s' },
  { top: '60%', left: '68%', size: 1, dur: '2.1s', delay: '0.9s' },
  { top: '68%', left: '40%', size: 2, dur: '3.3s', delay: '1.7s' },
];

function getRankStars(title: string): number {
  if (title === '루키 리더') return 1;
  if (title === '프로페셔널 매니저') return 3;
  if (title.includes('엘리트')) return 4;
  if (title === '마스터 디렉터') return 5;
  return 2;
}

function getRankTheme(title: string): { accent: string; glow: string; bg: string; border: string; nebula: string } {
  if (title === '마스터 디렉터')
    return { accent: '#FFB800', glow: 'rgba(255,184,0,0.6)', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.3)', nebula: 'rgba(255,184,0,0.12)' };
  if (title.includes('엘리트'))
    return { accent: '#9F7AEA', glow: 'rgba(159,122,234,0.6)', bg: 'rgba(159,122,234,0.08)', border: 'rgba(159,122,234,0.3)', nebula: 'rgba(159,122,234,0.12)' };
  if (title === '프로페셔널 매니저')
    return { accent: '#10B981', glow: 'rgba(16,185,129,0.6)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', nebula: 'rgba(16,185,129,0.12)' };
  return { accent: '#F2B90D', glow: 'rgba(242,185,13,0.6)', bg: 'rgba(242,185,13,0.08)', border: 'rgba(242,185,13,0.3)', nebula: 'rgba(242,185,13,0.12)' };
}

function getRankIcon(title: string): string {
  if (title === '마스터 디렉터') return 'crown';
  if (title.includes('엘리트')) return 'diamond';
  if (title === '프로페셔널 매니저') return 'shield_person';
  return 'military_tech';
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [completedHistory, setCompletedHistory] = useState<SimulationRecord[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [selectedRankName, setSelectedRankName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'leadership' | 'skills' | 'badges' | 'account'>('status');
  const [simCount, setSimCount] = useState(0);
  const [purchasedPlaybooks, setPurchasedPlaybooks] = useState<Array<{ id: string; simulation_id: string; created_at: string; scenario_title?: string }>>([]);
  const [leadershipData, setLeadershipData] = useState<{type: string; pattern: any} | null>(null);

  useEffect(() => {
    if (user && activeTab === 'account') {
      paymentService.getPurchasedPlaybooks(user.id).then(setPurchasedPlaybooks).catch(() => {});
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user && profile) {
      dbService.getSimulationCount(user.id).then(setSimCount).catch(() => {});
      // 완주한 시뮬레이션만 가져오기 (리더 프로필 집계용)
      dbService.getHistory(user.id, 20).then(records => {
        const completed = records.filter(r => r.completed);
        setCompletedHistory(completed);
        // leadership 탭용: 가장 최근 완주 기록의 리더십 타입
        const withType = completed.find(r => r.leadership_type);
        if (withType) {
          setLeadershipData({
            type: withType.leadership_type!,
            pattern: withType.communication_pattern,
          });
        }
      }).catch(() => {});
    }
  }, [user, profile]);

  // ── 스킬 트리 상태 (SkillTree.tsx에서 이관) ──
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [isSkillReady, setIsSkillReady] = useState(false);

  useEffect(() => {
    setRank(DataService.getUserRank());
    // 스킬 트리 준비
    setTimeout(() => setIsSkillReady(true), 100);
  }, []);

  // ── 실데이터 기반 리더 프로필 집계 ──
  const leaderProfileData = React.useMemo(() => {
    if (completedHistory.length < 3) return null;

    // 리더십 타입 최빈값
    const typeCounts: Record<string, number> = {};
    for (const r of completedHistory) {
      if (r.leadership_type) typeCounts[r.leadership_type] = (typeCounts[r.leadership_type] || 0) + 1;
    }
    const dominantType = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as LeadershipType | null;

    // radar_chart 평균
    const radarKeys = ['trust', 'motivation', 'conflict', 'decision', 'strategy'];
    const radarAvg: Record<string, number> = {};
    for (const key of radarKeys) {
      const vals = completedHistory
        .map(r => (r.radar_chart as Record<string, number> | null)?.[key])
        .filter((v): v is number => typeof v === 'number');
      radarAvg[key] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }

    // final_trust 평균
    const trustVals = completedHistory
      .map(r => r.final_trust)
      .filter((v): v is number => typeof v === 'number');
    const avgTrust = trustVals.length > 0
      ? Math.round(trustVals.reduce((a, b) => a + b, 0) / trustVals.length)
      : null;

    // radar 데이터 (CompetencyRadar 형식)
    const radarData = [
      { subject: '결단력', A: radarAvg['decision'] ?? 0, fullMark: 100 },
      { subject: '소통 능력', A: radarAvg['trust'] ?? 0, fullMark: 100 },
      { subject: '혁신성', A: radarAvg['strategy'] ?? 0, fullMark: 100 },
      { subject: '안정성', A: Math.round(((radarAvg['trust'] ?? 0) + (radarAvg['conflict'] ?? 0)) / 2), fullMark: 100 },
      { subject: '공감 능력', A: radarAvg['motivation'] ?? 0, fullMark: 100 },
    ];

    // 리더십 타입 라벨
    const typeInfo = dominantType ? LEADERSHIP_TYPE_INFO[dominantType] : null;

    return {
      dominantType,
      typeInfo,
      radarData,
      radarAvg,
      avgTrust,
      completedCount: completedHistory.length,
      recentHistory: completedHistory.slice(0, 2),
    };
  }, [completedHistory]);

  // ── 실데이터 기반 스킬 레벨 계산 (Supabase 완주 횟수 활용) ──
  const skillData = React.useMemo(
    () => computeSkillLevels(completedHistory.length),
    [completedHistory.length]
  );

  // ── 실데이터 기반 배지 계산 (Supabase 완주 기록만 사용) ──
  const computedBadges: Badge[] = React.useMemo(() => {
    const completedCount = completedHistory.length;
    return [
      {
        id: 'beginner',
        name: '첫 완주',
        icon: 'rocket_launch',
        description: '리더십 여정의 첫 걸음을 내딛었습니다.',
        condition: '시뮬레이션 1회 완주',
        color: 'text-primary',
        isUnlocked: completedCount >= 1,
      },
      {
        id: 'five_complete',
        name: '5회 완주',
        icon: 'workspace_premium',
        description: '꾸준한 훈련으로 리더십 기반을 다졌습니다.',
        condition: '시뮬레이션 5회 완주',
        color: 'text-accent-amber',
        isUnlocked: completedCount >= 5,
      },
      {
        id: 'ten_complete',
        name: '10회 완주',
        icon: 'military_tech',
        description: '반복 훈련을 통해 실전 감각을 키웠습니다.',
        condition: '시뮬레이션 10회 완주',
        color: 'text-yellow-400',
        isUnlocked: completedCount >= 10,
      },
      {
        id: 'twenty_complete',
        name: '20회 완주',
        icon: 'diamond',
        description: '지속적인 성장으로 탁월한 리더십을 증명했습니다.',
        condition: '시뮬레이션 20회 완주',
        color: 'text-purple-400',
        isUnlocked: completedCount >= 20,
      },
    ];
  }, [completedHistory]);

  const renderSkillLines = () => {
    return skillData.map(node => {
      if (!node.dependencies) return null;
      return node.dependencies.map(depId => {
        const depNode = skillData.find(n => n.id === depId);
        if (!depNode) return null;
        const isUnlocked = node.level > 0 && depNode.level > 0;
        return (
          <line
            key={`${depId}-${node.id}`}
            x1={`${depNode.x}%`} y1={`${depNode.y}%`}
            x2={`${node.x}%`} y2={`${node.y}%`}
            stroke={isUnlocked ? SKILL_CATEGORY_META[node.category].color : 'rgba(255,255,255,0.05)'}
            strokeWidth="2"
            strokeDasharray={isUnlocked ? '0' : '5,5'}
            className={isUnlocked ? 'animate-pulse' : ''}
            style={{ transition: 'all 1s ease' }}
          />
        );
      });
    });
  };

  const unlockedCount = computedBadges.filter(b => b.isUnlocked).length;
  const currentRankDetail = selectedRankName ? RANK_DETAILS[selectedRankName] : null;
  const theme = rank ? getRankTheme(rank.title) : getRankTheme('루키 리더');
  const rankStars = rank ? getRankStars(rank.title) : 1;
  const rankIcon = rank ? getRankIcon(rank.title) : 'military_tech';

  return (
    <div className="min-h-screen bg-[#060B18] text-white font-display flex flex-col relative">

      {/* ── 우주 배경 ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% -10%, ${theme.nebula} 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 80%, rgba(30,20,80,0.4) 0%, transparent 50%),
                         radial-gradient(ellipse at 20% 60%, rgba(0,20,60,0.3) 0%, transparent 40%)`
          }}
        />
        {STARS.map((s, i) => (
          <div
            key={i}
            className="star absolute rounded-full bg-white"
            style={{
              top: s.top, left: s.left,
              width: `${s.size}px`, height: `${s.size}px`,
              '--dur': s.dur, '--delay': s.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── 헤더 ── */}
      <header className="p-4 flex items-center justify-between sticky top-0 backdrop-blur-xl border-b border-white/5 z-10"
        style={{ backgroundColor: 'rgba(6,11,24,0.9)' }}>
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: theme.bg, borderColor: theme.border, boxShadow: `0 0 12px ${theme.glow}` }}
          >
            <span className="material-symbols-outlined text-xl font-bold" style={{ color: theme.accent }}>{rankIcon}</span>
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: theme.accent, textShadow: `0 0 10px ${theme.glow}` }}>
              Player Status
            </h1>
            <p className="text-sm font-bold">리더 프로필</p>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-slate-400">close</span>
        </button>
      </header>

      {/* ── 탭 네비게이션 (Spec v3 §5.6: 무료 플랜은 status/leadership/skills 잠금) ── */}
      <div className="sticky top-[65px] z-10 bg-[#060B18]/90 backdrop-blur-xl border-b border-white/5 px-4 py-2">
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1 overflow-x-auto hide-scrollbar">
          {(() => {
            const isFreePlan = (profile?.plan ?? 'free') === 'free';
            const PAID_ONLY_TABS: Array<'status' | 'leadership' | 'skills'> = ['status', 'leadership', 'skills'];
            const tabs = [
              { key: 'status' as const, label: '리더 프로필', icon: 'person' },
              { key: 'leadership' as const, label: '리더십 분석', icon: 'insights' },
              { key: 'skills' as const, label: '스킬 트리', icon: 'auto_awesome' },
              { key: 'badges' as const, label: '배지', icon: 'workspace_premium' },
              { key: 'account' as const, label: '계정', icon: 'settings' },
            ];
            return tabs.map((tab) => {
              const isLocked = isFreePlan && PAID_ONLY_TABS.includes(tab.key as any);
              return (
                <button
                  key={tab.key}
                  onClick={() => isLocked ? navigate('/pricing') : setActiveTab(tab.key)}
                  title={isLocked ? '프로 플랜부터 이용 가능' : undefined}
                  className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.key
                    ? 'bg-[#F2B90D]/15 text-[#F2B90D] border border-[#F2B90D]/20'
                    : isLocked
                      ? 'text-slate-700 hover:text-amber-400'
                      : 'text-slate-600 hover:text-slate-400'
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">{isLocked ? 'lock' : tab.icon}</span>
                  {tab.label}
                </button>
              );
            });
          })()}
        </div>
      </div>

      <main className="flex-1 p-5 pb-28 space-y-6 relative z-10">

        {/* ════════ 스테이터스 탭 (리더 프로필) ════════
            1단계: 플랜 게이팅 (pro/ultra 아니면 업그레이드 유도)
            2단계: 완주 시뮬레이션 3회 미만 → "준비 중" UI
            3단계: 실데이터 기반 리더 프로필 표시 */}

        {/* 1단계: 플랜 게이팅 */}
        {activeTab === 'status' && !['pro', 'ultra'].includes(profile?.plan ?? '') && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-500">
            <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-amber-400 text-3xl">lock</span>
            </div>
            <h2 className="text-white font-black text-xl mb-2">Pro / Ultra 전용 기능</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              리더 프로필은 <span className="text-amber-400 font-bold">Pro 또는 Ultra</span> 플랜<br />
              사용자에게만 제공됩니다.<br />
              누적 대화 데이터를 기반으로 당신만의<br />
              리더십 성향 리포트를 확인하세요.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm active:scale-95 transition-all"
            >
              플랜 업그레이드 →
            </button>
          </div>
        )}

        {/* 2단계: 데이터 부족 */}
        {activeTab === 'status' && ['pro', 'ultra'].includes(profile?.plan ?? '') && completedHistory.length < 3 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-500">
            <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-amber-400 text-3xl">timeline</span>
            </div>
            <h2 className="text-white font-black text-xl mb-2">리더 프로필 준비 중</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              시뮬레이션을 <span className="text-amber-400 font-bold">3회 이상 완주</span>하면,<br />
              누적 대화 데이터를 기반으로 당신만의<br />
              리더십 프로필이 자동 생성됩니다.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="text-slate-500 text-xs">현재 완주 횟수</span>
              <span className="text-amber-400 font-black text-sm">{completedHistory.length} / 3</span>
            </div>
            <button
              onClick={() => navigate('/missions')}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm active:scale-95 transition-all"
            >
              시뮬레이션 시작하기 →
            </button>
          </div>
        )}

        {/* 3단계: 실데이터 리더 프로필 */}
        {activeTab === 'status' && ['pro', 'ultra'].includes(profile?.plan ?? '') && leaderProfileData !== null && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── RPG 랭크 요약 (상단 미니 칩) ── */}
            {rank && (
              <div className="flex justify-center">
                <div className="px-5 py-2 rounded-full bg-[#F2B90D]/10 border border-[#F2B90D]/30 flex items-center gap-3 backdrop-blur-md">
                  <span className="material-symbols-outlined text-[#F2B90D] text-sm">verified_user</span>
                  <span className="text-[11px] font-black text-[#F2B90D] uppercase tracking-widest">Comprehensive Leadership Analysis</span>
                  <div className="w-px h-3 bg-white/20 mx-1" />
                  <span className="text-[11px] font-black text-white/70 uppercase">LV.{rank.level} {rank.title}</span>
                </div>
              </div>
            )}

            {/* 메인 타이틀 */}
            <header className="text-center mb-4">
              <h1 className="text-5xl font-black text-white mb-6 tracking-tighter drop-shadow-2xl">리더십 성향 리포트</h1>
              {leaderProfileData.typeInfo && (
                <div className="inline-block relative px-12 py-3 rounded-[2rem] bg-gradient-to-r from-[#F2B90D]/20 to-transparent border border-[#F2B90D]/30 backdrop-blur-md overflow-hidden group shadow-[0_0_30px_rgba(242,185,13,0.2)]">
                  <div className="absolute inset-0 bg-[#F2B90D]/5 blur-xl group-hover:bg-[#F2B90D]/10 transition-all duration-500" />
                  <span className="relative z-10 text-3xl font-black italic text-[#F2B90D] group-hover:text-white transition-colors duration-500">
                    {leaderProfileData.typeInfo.emoji} {leaderProfileData.typeInfo.name}
                    <span className="text-lg font-medium not-italic text-slate-400 ml-2">({leaderProfileData.dominantType})</span>
                  </span>
                </div>
              )}
            </header>

            {/* 상단 섹션: 아바타 & 차트 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 캐릭터 프로필 카드 (좌측) */}
              <div className="lg:col-span-3 relative group">
                <div className="absolute -inset-1 bg-gradient-to-b from-[#F2B90D]/30 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative h-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#0D1525] shadow-2xl flex flex-col">

                  {/* 애니메이션 아바타 */}
                  <div className="flex-1 flex flex-col items-center justify-center relative py-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#F2B90D]/5 via-transparent to-transparent" />
                    {/* 회전 링 */}
                    <div className="absolute size-52 rounded-full border border-[#F2B90D]/8"
                      style={{ animation: 'spin 12s linear infinite' }} />
                    <div className="absolute size-40 rounded-full border border-[#F2B90D]/12 animate-pulse" />
                    {/* 스캔 라인 */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
                    </div>

                    {/* 아바타 코어 */}
                    <div className="relative z-10">
                      <div
                        className="size-28 rounded-full flex items-center justify-center"
                        style={{
                          background: 'radial-gradient(circle at 40% 30%, rgba(242,185,13,0.2), rgba(0,242,255,0.05) 70%)',
                          border: '2px solid rgba(242,185,13,0.45)',
                          boxShadow: '0 0 40px rgba(242,185,13,0.2), 0 0 80px rgba(242,185,13,0.08)',
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: '60px',
                            color: '#F2B90D',
                            filter: 'drop-shadow(0 0 10px rgba(242,185,13,0.6))',
                          }}
                        >
                          shield_person
                        </span>
                      </div>
                      {/* 온라인 상태 점 */}
                      <div
                        className="absolute bottom-1 right-1 size-4 rounded-full border-2 border-[#0D1525] bg-emerald-400"
                        style={{ boxShadow: '0 0 8px rgba(52,211,153,0.9)', animation: 'pulse 2s ease-in-out infinite' }}
                      />
                    </div>
                  </div>

                  {/* 완주 횟수 뱃지 */}
                  <div className="absolute top-6 right-6 text-right">
                    <p className="text-[9px] font-black text-[#F2B90D]/60 uppercase tracking-widest mb-1">COMPLETED</p>
                    <p className="text-3xl font-black text-[#F2B90D] drop-shadow-[0_0_10px_rgba(242,185,13,0.5)]">
                      {leaderProfileData.completedCount}회
                    </p>
                  </div>

                  {/* 하단 정보 */}
                  <div className="px-7 pb-8">
                    <p className="text-[9px] font-black text-[#F2B90D] uppercase tracking-[0.3em] mb-1.5">LEADERSHIP TYPE</p>
                    <h2 className="text-2xl font-black text-white tracking-tighter italic">
                      {leaderProfileData.typeInfo
                        ? <><span className="text-[#F2B90D] italic">{leaderProfileData.typeInfo.emoji} {leaderProfileData.typeInfo.name}</span></>
                        : <span className="text-slate-400 text-base">분석 중...</span>
                      }
                    </h2>
                    {leaderProfileData.typeInfo && (
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{leaderProfileData.typeInfo.desc}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 역량 레이더 (우측) */}
              <div className="lg:col-span-9 flex flex-col gap-6">
                <div className="bg-[#111A2E]/50 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 flex-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <span className="material-symbols-outlined text-8xl">analytics</span>
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                    <div className="size-10 rounded-xl bg-[#F2B90D]/20 flex items-center justify-center text-[#F2B90D] border border-[#F2B90D]/20">
                      <span className="material-symbols-outlined text-xl">bar_chart</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white italic tracking-tight">역량 레이더</h3>
                      <p className="text-[10px] text-slate-500">최근 완주 {leaderProfileData.completedCount}회 평균</p>
                    </div>
                  </div>

                  {/* 역량 레이더 컴포넌트 (lazy) */}
                  <Suspense fallback={<div className="min-h-[320px] w-full animate-pulse bg-white/[0.02] rounded-xl" />}>
                    <CompetencyRadar
                      data={leaderProfileData.radarData}
                      teamAffinity={leaderProfileData.radarAvg['trust'] != null ? Math.round((leaderProfileData.radarAvg['trust'] + leaderProfileData.radarAvg['motivation']) / 2) : undefined}
                      tacticalRisk={leaderProfileData.radarAvg['conflict'] != null ? Math.round(leaderProfileData.radarAvg['conflict']) : undefined}
                    />
                  </Suspense>
                </div>

                {/* 누적 지표 카드 (Row) */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#111A2E]/50 rounded-3xl p-5 border border-white/5 hover:border-[#F2B90D]/30 transition-all group">
                    <div className="size-10 rounded-xl bg-[#F2B90D]/10 flex items-center justify-center text-[#F2B90D] mb-4 border border-[#F2B90D]/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-xl">verified</span>
                    </div>
                    <h4 className="text-sm font-black text-white mb-1 leading-tight">완주 횟수</h4>
                    <p className="text-2xl font-black text-[#F2B90D]">{leaderProfileData.completedCount}<span className="text-xs text-slate-500 ml-1">회</span></p>
                  </div>
                  <div className="bg-[#111A2E]/50 rounded-3xl p-5 border border-white/5 hover:border-[#F2B90D]/30 transition-all group">
                    <div className="size-10 rounded-xl bg-[#F2B90D]/10 flex items-center justify-center text-[#F2B90D] mb-4 border border-[#F2B90D]/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-xl">favorite</span>
                    </div>
                    <h4 className="text-sm font-black text-white mb-1 leading-tight">평균 신뢰도</h4>
                    <p className="text-2xl font-black text-[#F2B90D]">
                      {leaderProfileData.avgTrust !== null ? leaderProfileData.avgTrust : '-'}<span className="text-xs text-slate-500 ml-1">점</span>
                    </p>
                  </div>
                  <div className="bg-[#111A2E]/50 rounded-3xl p-5 border border-white/5 hover:border-[#F2B90D]/30 transition-all group">
                    <div className="size-10 rounded-xl bg-[#F2B90D]/10 flex items-center justify-center text-[#F2B90D] mb-4 border border-[#F2B90D]/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-xl">psychology</span>
                    </div>
                    <h4 className="text-sm font-black text-white mb-1 leading-tight">주요 리더십</h4>
                    <p className="text-sm font-black text-[#F2B90D]">{leaderProfileData.typeInfo?.name ?? '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 성과 지표 (기존 RPG 요소 하단 배치) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              <div className="bg-[#111A2E]/50 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-xl bg-[#F2B90D]/20 flex items-center justify-center text-[#F2B90D] border border-[#F2B90D]/20">
                    <span className="material-symbols-outlined text-xl">history</span>
                  </div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest">최근 완주 로그</h4>
                </div>
                <div className="space-y-4">
                  {leaderProfileData.recentHistory.length === 0 ? (
                    <p className="text-slate-500 text-xs">기록이 없습니다.</p>
                  ) : leaderProfileData.recentHistory.map((item) => (
                    <div key={item.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer"
                      onClick={() => navigate(`/history/${item.id}`)}>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{item.scenario_title}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(item.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-700 group-hover:text-[#F2B90D] transition-colors">arrow_forward</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111A2E]/50 rounded-[2.5rem] p-8 border border-white/5 backdrop-blur-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <span className="material-symbols-outlined text-xl">military_tech</span>
                  </div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest">현재 랭크 마일스톤</h4>
                </div>
                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl mb-4 border border-white/5">
                  <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,184,0,0.2)]">
                    <span className="material-symbols-outlined text-5xl" style={{ color: theme.accent }}>{rankIcon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white mb-1 italic" style={{ color: theme.accent }}>{rank?.title}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      {rank?.level}단계 도달 / {rank?.subTitle}
                    </p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${rank?.progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ 리더십 분석 탭 ════════ */}
        {activeTab === 'leadership' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Section 1: 리더십 유형 (무료에서 보임) */}
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 mb-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">나의 리더십 유형</h3>
              {leadershipData && LEADERSHIP_TYPE_INFO[leadershipData.type as LeadershipType] ? (() => {
                const typeInfo = LEADERSHIP_TYPE_INFO[leadershipData.type as LeadershipType];
                return (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{typeInfo.emoji}</span>
                    <div>
                      <p className="text-white font-bold text-lg">{typeInfo.name}</p>
                      <p className="text-slate-400 text-xs">{typeInfo.desc}</p>
                    </div>
                  </div>
                );
              })() : (
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📊</span>
                  <div>
                    <p className="text-white font-bold text-lg">데이터 수집 중</p>
                    <p className="text-slate-400 text-xs">시뮬레이션을 완료하면 리더십 유형이 분석됩니다</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: 대화 패턴 분석 (PRO) */}
            {profile?.plan === 'free' ? (
              <div className="relative rounded-2xl border border-amber-500/20 overflow-hidden">
                <div className="p-5 filter blur-sm select-none pointer-events-none">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">대화 패턴 분석</h3>
                  <div className="space-y-3">
                    {[
                      { label: '질문', value: 45, color: '#10B981' },
                      { label: '공감', value: 30, color: '#3B82F6' },
                      { label: '지시', value: 15, color: '#F59E0B' },
                      { label: '경청', value: 10, color: '#8B5CF6' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-white font-bold">{item.value}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700/50 rounded-full">
                          <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60">
                  <span className="text-2xl mb-2">🔒</span>
                  <p className="text-white font-bold text-sm mb-1">프로 플랜에서 확인</p>
                  <button onClick={() => navigate('/pricing')} className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold">업그레이드</button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 mb-4">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">대화 패턴 분석</h3>
                <div className="space-y-3">
                  {[
                    { label: '질문', value: leadershipData?.pattern?.questionRatio ?? 0, color: '#10B981' },
                    { label: '공감', value: leadershipData?.pattern?.empathyRatio ?? 0, color: '#3B82F6' },
                    { label: '지시', value: leadershipData?.pattern?.directiveRatio ?? 0, color: '#F59E0B' },
                    { label: '경청', value: leadershipData?.pattern?.listeningRatio ?? 0, color: '#8B5CF6' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-bold">{item.value}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700/50 rounded-full">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: 성장 추이 (PRO) */}
            {profile?.plan === 'free' ? (
              <div className="relative rounded-2xl border border-amber-500/20 overflow-hidden">
                <div className="p-5 filter blur-sm select-none pointer-events-none">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">성장 추이</h3>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">12</p>
                      <p className="text-[10px] text-slate-500 mt-1">총 시뮬레이션</p>
                    </div>
                    <div className="w-px h-10 bg-slate-700" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-emerald-400">78</p>
                      <p className="text-[10px] text-slate-500 mt-1">평균 신뢰 점수</p>
                    </div>
                    <div className="w-px h-10 bg-slate-700" />
                    <div className="text-center">
                      <p className="text-2xl font-black text-amber-400">+12%</p>
                      <p className="text-[10px] text-slate-500 mt-1">성장률</p>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60">
                  <span className="text-2xl mb-2">🔒</span>
                  <p className="text-white font-bold text-sm mb-1">프로 플랜에서 확인</p>
                  <button onClick={() => navigate('/pricing')} className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold">업그레이드</button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 mb-4">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">성장 추이</h3>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{simCount}</p>
                    <p className="text-[10px] text-slate-500 mt-1">총 시뮬레이션</p>
                  </div>
                  <div className="w-px h-10 bg-slate-700" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-400">{leadershipData?.pattern ? Math.round((leadershipData.pattern.questionRatio + leadershipData.pattern.empathyRatio + leadershipData.pattern.listeningRatio) / 3) : '-'}</p>
                    <p className="text-[10px] text-slate-500 mt-1">평균 신뢰 점수</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: 전체 사용자 비교 (ULTRA - always locked) */}
            <div className="relative rounded-2xl border border-purple-500/20 overflow-hidden">
              <div className="p-5 filter blur-sm select-none pointer-events-none">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3">전체 사용자 비교</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">상위 퍼센트</span>
                    <span className="text-white font-bold text-lg">15%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">평균 대비 점수</span>
                    <span className="text-emerald-400 font-bold text-lg">+22점</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">리더십 유형 분포</span>
                    <span className="text-amber-400 font-bold text-lg">코칭형 32%</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60">
                <span className="text-2xl mb-2">🔒</span>
                <p className="text-white font-bold text-sm mb-1">울트라 플랜에서 확인</p>
                <button onClick={() => navigate('/pricing')} className="px-4 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-bold">업그레이드</button>
              </div>
            </div>

          </div>
        )}

        {/* ════════ 스킬 트리 탭 (Stitch 디자인 기반) ════════ */}
        {activeTab === 'skills' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[600px] relative overflow-hidden bg-black/40 rounded-[2.5rem] border border-white/5 cursor-grab active:cursor-grabbing">
            {/* 스킬 트리 맵 (SkillTree.tsx 로직 통합) */}
            <div className="absolute inset-0 z-0 opacity-40">
              <div className="absolute top-[-10%] left-[-10%] size-[60%] rounded-full blur-[120px] bg-[#F2B90D]/10 animate-pulse" />
              <div className="absolute bottom-[-10%] right-[-10%] size-[50%] rounded-full blur-[100px] bg-purple-600/10 animate-pulse" />
            </div>

            <div className="relative w-full h-full overflow-auto p-10 select-none hide-scrollbar">
              <div className="min-w-[800px] min-h-[500px] relative">
                {/* SVG lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {renderSkillLines()}
                </svg>

                {/* Skill Nodes */}
                {skillData.map((node) => {
                  const meta = SKILL_CATEGORY_META[node.category];
                  const isUnlocked = node.level > 0;
                  const isSelectable = !node.dependencies || node.dependencies.every(depId => skillData.find(n => n.id === depId)!.level > 0);

                  return (
                    <div
                      key={node.id}
                      className={`absolute transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2 ${isSkillReady ? 'opacity-100' : 'opacity-0 scale-50'}`}
                      style={{ top: `${node.y}%`, left: `${node.x}%` }}
                    >
                      <button
                        onClick={() => setSelectedNode(node)}
                        className={`flex flex-col items-center group relative ${isUnlocked ? 'cursor-pointer' : isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        <div className={`size-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative ${isUnlocked
                          ? 'bg-[#0f172a] shadow-lg'
                          : isSelectable
                            ? 'bg-[#0f172a]/50 border-white/20'
                            : 'bg-black/20 border-white/5 opacity-40'
                          }`}
                          style={isUnlocked ? { borderColor: meta.color, boxShadow: `0 0 15px ${meta.glow}` } : {}}>
                          <span className={`material-symbols-outlined text-2xl transition-transform group-hover:scale-110 ${isUnlocked ? '' : 'text-slate-600'
                            }`} style={isUnlocked ? { color: meta.color, filter: `drop-shadow(0 0 8px ${meta.glow})` } : {}}>
                            {node.icon}
                          </span>
                          {isUnlocked && (
                            <div className="absolute -bottom-2 -right-2 size-5 rounded-lg flex items-center justify-center border border-white/20 text-[8px] font-black bg-[#0F1729]"
                              style={{ color: meta.color }}>
                              {node.level}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-center">
                          <p className={`text-[10px] font-black tracking-tight ${isUnlocked ? 'text-white' : 'text-slate-600'}`}>{node.name}</p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 안내 뱃지 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 pointer-events-none">
              <span className="material-symbols-outlined text-xs text-[#F2B90D] animate-bounce">pan_tool_alt</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Drag to Explore Skill Map</span>
            </div>
          </div>
        )}

        {/* ════════ 배지 탭 ════════ */}
        {activeTab === 'badges' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ── 퀵 스탯 (배지 탭) ── */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div onClick={() => navigate('/streak')}
                className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] p-5 rounded-[2rem] border border-white/5 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-amber-500/30">
                <div className="size-11 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400 mb-3 border border-amber-500/20 group-hover:shadow-neon-amber transition-all">
                  <span className="material-symbols-outlined">local_fire_department</span>
                </div>
                <p className="font-bold text-sm">스트릭</p>
                <p className="text-[8px] text-slate-600 mt-0.5 uppercase tracking-widest font-black">Streak</p>
              </div>
              <div onClick={() => navigate('/insights')}
                className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] p-5 rounded-[2rem] border border-white/5 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-primary/30">
                <div className="size-11 rounded-2xl bg-primary/15 flex items-center justify-center text-primary mb-3 border border-primary/20 group-hover:shadow-neon-cyan transition-all">
                  <span className="material-symbols-outlined">query_stats</span>
                </div>
                <p className="font-bold text-sm">성과 분석</p>
                <p className="text-[8px] text-slate-600 mt-0.5 uppercase tracking-widest font-black">Analytics</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
                  <span className="material-symbols-outlined text-base" style={{ color: theme.accent }}>workspace_premium</span>
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-white">배지 컬렉션</h3>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full" style={{ backgroundColor: theme.bg, color: theme.accent, border: `1px solid ${theme.border}` }}>
                {unlockedCount}/{computedBadges.length}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {computedBadges.map((badge) => (
                <button key={badge.id} onClick={() => setSelectedBadge(badge)}
                  className="flex flex-col items-center gap-1.5 transition-all active:scale-90">
                  <div className="relative">
                    <div className={`hexagon size-14 flex items-center justify-center transition-all ${badge.isUnlocked ? '' : ''}`}
                      style={badge.isUnlocked ? {
                        background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,0.05))`,
                        filter: `drop-shadow(0 0 8px ${theme.glow})`
                      } : {
                        background: 'rgba(255,255,255,0.03)', filter: 'grayscale(1)', opacity: 0.25,
                      }}>
                      <span className={`material-symbols-outlined text-xl ${badge.isUnlocked ? badge.color : 'text-slate-600'}`}>
                        {badge.icon}
                      </span>
                    </div>
                    {!badge.isUnlocked && (
                      <div className="absolute inset-0 flex items-end justify-center pb-1">
                        <span className="material-symbols-outlined text-[10px] text-slate-600">lock</span>
                      </div>
                    )}
                    {badge.isUnlocked && (
                      <div className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full pulse-cyan" style={{ backgroundColor: theme.accent }} />
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap leading-tight text-center">{badge.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── 랭크 정보 모달 ── */}
      {showRankInfo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowRankInfo(false)}>
          <div className="w-full max-w-sm bg-[#0D1525] rounded-[3rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {!currentRankDetail ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-center mb-6">
                  <div className="size-14 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: theme.bg, borderColor: theme.border, boxShadow: `0 0 20px ${theme.glow}` }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>{rankIcon}</span>
                  </div>
                </div>
                <h3 className="text-xl font-black mb-6 text-center italic tracking-tighter uppercase">Leadership Ranking</h3>
                <p className="text-[9px] text-center text-slate-600 mb-6 uppercase tracking-widest font-bold">각 단계를 클릭하여 상세 가이드 확인</p>
                <div className="space-y-3">
                  {Object.keys(RANK_DETAILS).map((key, i) => {
                    const item = RANK_DETAILS[key];
                    const t = getRankTheme(key);
                    const stars = getRankStars(key);
                    return (
                      <button key={i} onClick={() => setSelectedRankName(key)}
                        className="w-full flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group text-left">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.accent }}>{item.lv}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, si) => (
                              <span key={si} className="text-xs leading-none" style={{ color: si < stars ? t.accent : 'rgba(255,255,255,0.1)' }}>★</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.definition.slice(0, 22)}...</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-700 text-sm group-hover:text-primary transition-colors self-center">chevron_right</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowRankInfo(false)}
                  className="w-full mt-8 py-4 bg-white/5 text-slate-400 font-black text-xs uppercase rounded-xl border border-white/5">닫기</button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button onClick={() => setSelectedRankName(null)}
                  className="flex items-center gap-1 text-[10px] font-black text-[#F2B90D] uppercase tracking-widest mb-6 hover:translate-x-[-4px] transition-transform">
                  <span className="material-symbols-outlined text-sm">arrow_back</span> 뒤로가기
                </button>
                <div className="mb-6">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{currentRankDetail.lv}</span>
                  <h3 className="text-2xl font-black italic">{currentRankDetail.name}</h3>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto hide-scrollbar pr-1">
                  <section>
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">정의</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{currentRankDetail.definition}</p>
                  </section>
                  <section>
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">핵심 특징</h4>
                    <ul className="space-y-1.5">
                      {currentRankDetail.features.map((f, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-primary mt-1 text-[10px]">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="bg-primary/5 p-5 rounded-2xl border border-primary/20">
                    <h4 className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">훈련 앱 활용 방안</h4>
                    <p className="text-xs text-slate-200 leading-relaxed italic">"{currentRankDetail.usage}"</p>
                  </section>
                  <section>
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Next Level 추천 액션</h4>
                    <div className="space-y-2">
                      {currentRankDetail.actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                          <span className="text-xs font-bold text-slate-300">{a}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <button onClick={() => setSelectedRankName(null)}
                  className="w-full mt-8 py-5 bg-primary text-navy-deep font-black text-xs uppercase rounded-2xl shadow-neon-cyan active:scale-95 transition-all">다른 랭크 확인</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 스킬 상세 모달 (SkillTree.tsx 로직 통합) ── */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedNode(null)}>
          <div className="w-full max-w-sm bg-[#0D1525] rounded-[3rem] border p-8 shadow-2xl relative overflow-hidden"
            style={{ borderColor: SKILL_CATEGORY_META[selectedNode.category].color + '40' }}
            onClick={e => e.stopPropagation()}>
            <div className="relative z-10 text-center">
              <div className="size-20 mx-auto rounded-3xl flex items-center justify-center border-2 mb-6"
                style={{ borderColor: SKILL_CATEGORY_META[selectedNode.category].color, boxShadow: `0 0 20px ${SKILL_CATEGORY_META[selectedNode.category].glow}` }}>
                <span className="material-symbols-outlined text-5xl" style={{ color: SKILL_CATEGORY_META[selectedNode.category].color }}>
                  {selectedNode.icon}
                </span>
              </div>
              <h3 className="text-2xl font-black italic tracking-tighter mb-1">{selectedNode.name}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-6" style={{ color: SKILL_CATEGORY_META[selectedNode.category].color }}>
                {SKILL_CATEGORY_META[selectedNode.category].label}
              </p>
              <div className="space-y-4 text-left">
                <section className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">스킬 설명</h4>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{selectedNode.description}</p>
                </section>
                <section className="bg-primary/5 p-4 rounded-2xl border border-primary/20">
                  <h4 className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">
                    {selectedNode.level > 0 ? `현재 효과 (Lv.${selectedNode.level})` : '잠금 상태'}
                  </h4>
                  {selectedNode.level > 0 ? (
                    <p className="text-xs font-black italic text-accent-neon">"{selectedNode.effect}"</p>
                  ) : (
                    <p className="text-xs text-slate-500">시뮬레이션을 완주하여 스킬을 해금하세요.</p>
                  )}
                </section>
              </div>
              <button onClick={() => setSelectedNode(null)}
                className="w-full mt-8 py-4 bg-white/5 text-slate-400 font-black text-xs uppercase rounded-2xl border border-white/5">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 배지 상세 모달 ── */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedBadge(null)}>
          <div className="w-full max-w-sm bg-[#0D1525] rounded-[3rem] p-8 border border-white/10 shadow-2xl text-center flex flex-col items-center"
            onClick={e => e.stopPropagation()}>
            <div className={`hexagon size-24 flex items-center justify-center mb-6`}
              style={selectedBadge.isUnlocked ? {
                background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,0.05))`,
                filter: `drop-shadow(0 0 16px ${theme.glow})`
              } : {
                background: 'rgba(255,255,255,0.03)', filter: 'grayscale(1)', opacity: 0.4,
              }}>
              <span className={`material-symbols-outlined text-5xl ${selectedBadge.isUnlocked ? selectedBadge.color : 'text-slate-700'}`}>
                {selectedBadge.icon}
              </span>
            </div>
            <h3 className="text-2xl font-black mb-2">{selectedBadge.name}</h3>
            {selectedBadge.isUnlocked && (
              <div className="flex gap-1 mb-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} className="text-sm" style={{ color: theme.accent }}>★</span>
                ))}
              </div>
            )}
            <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">{selectedBadge.description}</p>
            <div className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 mb-8">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">획득 조건</p>
              <p className={`text-sm font-bold ${selectedBadge.isUnlocked ? 'text-primary' : 'text-slate-400'}`}>
                {selectedBadge.condition}
              </p>
            </div>
            <button onClick={() => setSelectedBadge(null)}
              className="w-full py-4 text-navy-deep font-black text-xs uppercase tracking-widest rounded-xl"
              style={{ backgroundColor: theme.accent }}>닫기</button>
          </div>
        </div>
      )}

      {/* ── 계정 관리 탭 ── */}
      {activeTab === 'account' && (
        <div className="space-y-4 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-800/40 rounded-2xl p-5 border border-white/5 space-y-4">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <span className="material-icons text-amber-500 text-lg">manage_accounts</span>
              계정 정보
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">이메일</span>
                <span className="text-white">{profile?.email || user?.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">이름</span>
                <span className="text-white">
                  {profile?.display_name
                    || (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name
                    || (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name
                    || user?.email
                    || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">플랜</span>
                <span className="text-amber-500 font-semibold capitalize">{profile?.plan || 'free'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">시뮬레이션 이용 횟수</span>
                <span className="text-white">{simCount}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">가입일</span>
                <span className="text-white">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold"
            >
              플랜 관리
            </button>
            <button
              onClick={async () => {
                if (!user) return;
                const json = await authService.exportData(user.id);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `letmefree-data-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs font-semibold"
            >
              데이터 내보내기
            </button>
          </div>

          {/* ── 구매한 플레이북 목록 ── */}
          <div className="bg-slate-800/40 rounded-2xl p-5 border border-white/5 space-y-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-lg">menu_book</span>
              구매한 플레이북
            </h3>
            {purchasedPlaybooks.length === 0 ? (
              <p className="text-slate-500 text-xs leading-relaxed">
                구매한 플레이북이 없습니다.
                <br />
                <span className="text-slate-600">유료 플랜 구독 시 상세 피드백 리포트를 무제한 이용할 수 있습니다.</span>
              </p>
            ) : (
              <ul className="space-y-2">
                {purchasedPlaybooks.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white text-xs font-semibold">{p.scenario_title || '시뮬레이션'}</p>
                      <p className="text-slate-500 text-[10px]">{new Date(p.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/history/${p.simulation_id}`)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-colors shrink-0"
                    >
                      보기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs font-semibold"
          >
            로그아웃
          </button>

          <button
            onClick={() => {
              if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                if (user) authService.deleteAccount(user.id);
              }
            }}
            className="w-full py-2 text-red-500/60 text-xs hover:text-red-400 transition-colors"
          >
            계정 삭제
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
