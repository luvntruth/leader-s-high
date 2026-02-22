
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import CompetencyRadar from '../components/CompetencyRadar';
import { DataService, Badge, UserRank } from '../services/dataService';
import { createGeminiClient } from '../src/lib/geminiClient';

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
    usage: '음성 시뮬레이션(Live API)을 통해 실시간 대화의 즉각적인 반응성을 극대화하고, 전사 리더십 인사이트를 관리하세요.',
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

const SKILL_DATA: SkillNode[] = [
  { id: 'listen', name: '경청의 달인', nameEn: 'ACTIVE LISTENING', icon: 'hearing', category: 'communication', level: 2, maxLevel: 5, x: 20, y: 30, description: '팀원의 발언 뒤에 숨겨진 의도와 감정을 정확히 파악하는 능력입니다.', effect: '심리 분석 정확도 +20%', nextXp: 120 },
  { id: 'empathy', name: '공감적 대화', nameEn: 'EMPATHIC TALK', icon: 'diversity_3', category: 'communication', level: 1, maxLevel: 5, x: 20, y: 50, description: '상대방의 감정에 공감하며 신뢰를 쌓는 대화 기술입니다.', effect: '신뢰도 회복 속도 +15%', nextXp: 150, dependencies: ['listen'] },
  { id: 'nonverbal', name: '비언어적 소통', nameEn: 'BODY LANGUAGE', icon: 'emoji_people', category: 'communication', level: 0, maxLevel: 5, x: 20, y: 70, description: '말하지 않아도 표정과 몸짓으로 전해지는 메시지를 읽습니다.', effect: '돌발 대사 해금 확률 +10%', nextXp: 200, dependencies: ['empathy'] },
  { id: 'command', name: '카리스마 지시', nameEn: 'CHARISMA', icon: 'record_voice_over', category: 'leadership', level: 3, maxLevel: 5, x: 50, y: 30, description: '강력한 장악력으로 팀원에게 명확한 방향을 제시하는 능력입니다.', effect: '지시 수용률 +25%', nextXp: 180 },
  { id: 'decisive', name: '전략적 의사결정', nameEn: 'STRATEGIC', icon: 'psychology', category: 'leadership', level: 1, maxLevel: 5, x: 50, y: 50, description: '복잡한 상황에서도 최적의 루트를 빠르게 판단하여 결정합니다.', effect: '갈등 해결 보너스 XP +20%', nextXp: 220, dependencies: ['command'] },
  { id: 'mentor', name: '성장 멘토링', nameEn: 'MENTORING', icon: 'school', category: 'development', level: 2, maxLevel: 5, x: 80, y: 30, description: '팀원의 잠재력을 끌어내어 전문성을 강화시키는 육성 능력입니다.', effect: '팀원 성장속도 +30%', nextXp: 140 },
  { id: 'safety', name: '심리적 안전감', nameEn: 'PSY SAFETY', icon: 'shield_with_heart', category: 'development', level: 0, maxLevel: 5, x: 80, y: 50, description: '팀원들이 실패를 두려워하지 않고 아이디어를 낼 수 있는 환경을 만듭니다.', effect: '팀 번아웃 확률 -15%', nextXp: 250, dependencies: ['mentor'] },
];

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
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [selectedRankName, setSelectedRankName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'skills' | 'badges'>('status');

  // ── 리더십 리포트 상태 (LeadershipReport.tsx에서 이관) ──
  const [reportProfile, setReportProfile] = useState<any>(null);
  const [aiAdvice, setAiAdvice] = useState<string>("리더님의 리더십 트렌드를 정교하게 분석하고 있습니다...");
  const [isAiLoading, setIsAiLoading] = useState(true);

  // ── 스킬 트리 상태 (SkillTree.tsx에서 이관) ──
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [isSkillReady, setIsSkillReady] = useState(false);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    setRecentHistory(history.slice(0, 2));
    setBadges(DataService.getUserBadges());
    setRank(DataService.getUserRank());

    // 리포트 데이터 생성
    const reportData = DataService.generateLeadershipProfile();
    setReportProfile(reportData);
    fetchAiAdvice(reportData);

    // 스킬 트리 준비
    setTimeout(() => setIsSkillReady(true), 100);
  }, []);

  const fetchAiAdvice = async (p: any) => {
    try {
      const history = DataService.getUserHistory();
      const genAI = createGeminiClient();
      // @ts-ignore
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
        리더십 교육 게임 'Leader's High'의 리더십 전문가로서 다음 데이터를 바탕으로 사용자의 리더십 성향 리포트 하단 'Summary & Advice' 섹션에 들어갈 내용을 작성해주세요.
        
        사용자 리더십 타이틀: ${p.title} (${p.titleEn})
        누적 점수: ${p.persona.totalScore}/100
        팀 친화도: ${p.persona.teamAffinity}%
        최근 미션 이력 수: ${history.length}
        
        요청 사항:
        1. "귀하는 이번 RPG 시뮬레이션에서 ~" 로 시작하는 전문적이고 통찰력 있는 문체를 사용하세요.
        2. 구체적인 수치나 구체적인 피드백을 포함하세요.
        3. 향후 발전 방향에 대한 'Advice'를 한 문장으로 덧붙여주세요.
        4. 한국어로 작성하고 리더십 전문가다운 신뢰감 있는 어조를 유지하세요.
        5. 약 300자 내외로 구성하세요.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setAiAdvice(text || "귀하는 이번 시뮬레이션에서 균형 잡힌 리더십을 보여주었습니다.");
    } catch (e) {
      console.error("AI Advice Fetch Error", e);
      setAiAdvice("귀하는 이번 RPG 시뮬레이션에서 인본주의적 가치와 전략적 효율 사이의 완벽한 균형을 보여주었습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownloadReport = () => {
    alert("💎 리더십 명예 리포트를 PDF로 생성합니다.\n잠시만 기다려주세요...");
    setTimeout(() => { window.print(); }, 1000);
  };

  const renderSkillLines = () => {
    return SKILL_DATA.map(node => {
      if (!node.dependencies) return null;
      return node.dependencies.map(depId => {
        const depNode = SKILL_DATA.find(n => n.id === depId);
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

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
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

      {/* ── 탭 네비게이션 ── */}
      <div className="sticky top-[65px] z-10 bg-[#060B18]/90 backdrop-blur-xl border-b border-white/5 px-4 py-2">
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
          {[
            { key: 'status' as const, label: '리더 프로필', icon: 'person' },
            { key: 'skills' as const, label: '스킬 트리', icon: 'auto_awesome' },
            { key: 'badges' as const, label: '배지', icon: 'workspace_premium' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key
                ? 'bg-[#F2B90D]/15 text-[#F2B90D] border border-[#F2B90D]/20'
                : 'text-slate-600 hover:text-slate-400'
                }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-5 pb-28 space-y-6 relative z-10">

        {/* ════════ 스테이터스 탭 (리더 프로필 복구) ════════ */}
        {activeTab === 'status' && (
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
              {reportProfile && (
                <div className="inline-block relative px-12 py-3 rounded-[2rem] bg-gradient-to-r from-[#F2B90D]/20 to-transparent border border-[#F2B90D]/30 backdrop-blur-md overflow-hidden group shadow-[0_0_30px_rgba(242,185,13,0.2)]">
                  <div className="absolute inset-0 bg-[#F2B90D]/5 blur-xl group-hover:bg-[#F2B90D]/10 transition-all duration-500" />
                  <span className="relative z-10 text-3xl font-black italic text-[#F2B90D] group-hover:text-white transition-colors duration-500">
                    "{reportProfile.title}" <span className="text-lg font-medium not-italic text-slate-400 ml-2">({reportProfile.titleEn})</span>
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

                  {/* 동기화율 뱃지 */}
                  <div className="absolute top-6 right-6 text-right">
                    <p className="text-[9px] font-black text-[#F2B90D]/60 uppercase tracking-widest mb-1">SYNC RATE</p>
                    <p className="text-3xl font-black text-[#F2B90D] drop-shadow-[0_0_10px_rgba(242,185,13,0.5)]">
                      {reportProfile?.syncRate}%
                    </p>
                  </div>

                  {/* 하단 정보 */}
                  <div className="px-7 pb-8">
                    <p className="text-[9px] font-black text-[#F2B90D] uppercase tracking-[0.3em] mb-1.5">CHARACTER PERSONA</p>
                    <h2 className="text-2xl font-black text-white tracking-tighter italic">Project Manager <span className="text-[#F2B90D] italic">JAY</span></h2>
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
                    </div>
                  </div>


                  {/* 역량 레이더 컴포넌트 */}
                  <CompetencyRadar
                    data={reportProfile?.radarData}
                    teamAffinity={reportProfile?.persona?.teamAffinity != null ? Math.round(reportProfile.persona.teamAffinity) : undefined}
                    tacticalRisk={reportProfile?.persona?.riskManagement != null ? Math.round(reportProfile.persona.riskManagement) : undefined}
                  />


                </div>

                {/* 태그 카드 (Row) */}
                <div className="grid grid-cols-3 gap-4">
                  {reportProfile?.tags.map((tag: any, i: number) => (
                    <div key={i} className="bg-[#111A2E]/50 rounded-3xl p-5 border border-white/5 hover:border-[#F2B90D]/30 transition-all group">
                      <div className="size-10 rounded-xl bg-[#F2B90D]/10 flex items-center justify-center text-[#F2B90D] mb-4 border border-[#F2B90D]/20 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-xl">{tag.icon}</span>
                      </div>
                      <h4 className="text-sm font-black text-white mb-2 leading-tight">{tag.title}</h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{tag.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 하단 요약 섹션 */}
            <div className="bg-[#111A2E]/80 backdrop-blur-2xl rounded-[3rem] p-10 border border-white/10 relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#F2B90D] opacity-50" />
              <div className="flex flex-col md:flex-row items-center gap-10">
                <div className="size-20 rounded-full bg-[#F2B90D]/10 flex items-center justify-center border border-[#F2B90D]/20 shrink-0 shadow-[0_0_20px_rgba(242,185,13,0.2)]">
                  <span className="material-symbols-outlined text-4xl text-[#F2B90D] animate-pulse">lightbulb</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black text-white mb-4 italic tracking-tight flex items-center gap-4 justify-center md:justify-start">
                    Summary & Advice
                    <div className="h-px w-20 bg-gradient-to-r from-[#F2B90D]/50 to-transparent" />
                  </h3>
                  <p className={`text-base leading-relaxed font-medium text-slate-300 ${isAiLoading ? 'animate-pulse blur-[1px]' : ''}`}>
                    {aiAdvice}
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-w-[200px]">
                  <button className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#F2B90D] text-[#060B18] font-black text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(242,185,13,0.3)]">
                    <span className="material-symbols-outlined text-lg">share</span>
                    결과 공유하기
                  </button>
                  <button onClick={handleDownloadReport} className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 text-white font-black text-sm border border-white/10 hover:bg-white/10 transition-all">
                    <span className="material-symbols-outlined text-lg">download</span>
                    PDF 다운로드
                  </button>
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
                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest">최근 리더십 로그</h4>
                </div>
                <div className="space-y-4">
                  {recentHistory.map((item) => (
                    <div key={item.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{item.scenarioTitle}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(item.date).toLocaleDateString()}</p>
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
                {SKILL_DATA.map((node) => {
                  const meta = SKILL_CATEGORY_META[node.category];
                  const isUnlocked = node.level > 0;
                  const isSelectable = !node.dependencies || node.dependencies.every(depId => SKILL_DATA.find(n => n.id === depId)!.level > 0);

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
            {/* ── 퀵 스탯 (배지 탭으로 이동) ── */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div onClick={() => navigate('/streak')}
                className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] p-5 rounded-[2rem] border border-white/5 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-amber-500/30">
                <div className="size-11 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400 mb-3 border border-amber-500/20 group-hover:shadow-neon-amber transition-all">
                  <span className="material-symbols-outlined">local_fire_department</span>
                </div>
                <p className="font-bold text-sm">5일 스트릭</p>
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
                {unlockedCount}/{badges.length}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {badges.map((badge) => (
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
                  <h4 className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">현재 효과 (Lv.{selectedNode.level})</h4>
                  <p className="text-xs font-black italic text-accent-neon">"{selectedNode.effect}"</p>
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
    </div>
  );
};

export default Profile;
