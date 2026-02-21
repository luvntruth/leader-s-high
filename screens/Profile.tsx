
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { DataService, Badge, UserRank } from '../services/dataService';

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

/* ── 리더십 스킬 트리 (Stitch 디자인 기반) ── */
const SKILL_TREE = [
  { name: '경청의 달인', icon: 'hearing', category: '소통', level: 2, maxLevel: 5, effect: '팀원의 숨은 의도 파악 확률 +20%', color: '#00F2FF' },
  { name: '공감적 대화', icon: 'diversity_3', category: '소통', level: 1, maxLevel: 5, effect: '부정적 대화 차단 특수 선택지 해금', color: '#10B981' },
  { name: '비언어적 소통', icon: 'emoji_people', category: '소통', level: 0, maxLevel: 5, effect: '표정/행동 인식 정확도 +15%', color: '#6366F1' },
  { name: '카리스마 지시', icon: 'record_voice_over', category: '리더십', level: 3, maxLevel: 5, effect: '지시 수용률 +25% 상승', color: '#F59E0B' },
  { name: '전략적 의사결정', icon: 'psychology', category: '리더십', level: 1, maxLevel: 5, effect: '갈등 해결 시 최적 루트 표시', color: '#EF4444' },
  { name: '성장 멘토링', icon: 'school', category: '육성', level: 2, maxLevel: 5, effect: '팀원 성장속도 +30% 가속', color: '#8B5CF6' },
  { name: '심리적 안전감', icon: 'shield_with_heart', category: '육성', level: 0, maxLevel: 5, effect: '팀 신뢰도 회복 속도 +15%', color: '#EC4899' },
];

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
  return { accent: '#00F2FF', glow: 'rgba(0,242,255,0.6)', bg: 'rgba(0,242,255,0.08)', border: 'rgba(0,242,255,0.3)', nebula: 'rgba(0,242,255,0.12)' };
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

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    setRecentHistory(history.slice(0, 2));
    setBadges(DataService.getUserBadges());
    setRank(DataService.getUserRank());
  }, []);

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
  const currentRankDetail = selectedRankName ? RANK_DETAILS[selectedRankName] : null;
  const theme = rank ? getRankTheme(rank.title) : getRankTheme('루키 리더');
  const rankStars = rank ? getRankStars(rank.title) : 1;
  const rankIcon = rank ? getRankIcon(rank.title) : 'military_tech';

  return (
    <div className="min-h-screen bg-[#060B18] text-white font-display flex flex-col overflow-y-auto relative">

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
            { key: 'status' as const, label: '스테이터스', icon: 'person' },
            { key: 'skills' as const, label: '스킬 트리', icon: 'auto_awesome' },
            { key: 'badges' as const, label: '배지', icon: 'workspace_premium' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.key
                  ? 'bg-primary/15 text-primary border border-primary/20'
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

        {/* ════════ 스테이터스 탭 ════════ */}
        {activeTab === 'status' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ── RPG 랭크 카드 ── */}
            {rank && (
              <div
                className="rounded-[2.5rem] p-7 border relative overflow-hidden"
                style={{
                  backgroundColor: 'rgba(15,23,41,0.9)',
                  borderColor: theme.border,
                  boxShadow: `0 0 30px ${theme.glow.replace('0.6', '0.15')}, inset 0 0 60px ${theme.bg}`
                }}
              >
                <div className="absolute -top-12 -right-12 size-48 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: theme.bg }} />

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="size-14 rounded-2xl flex items-center justify-center border"
                    style={{ backgroundColor: theme.bg, borderColor: theme.border, boxShadow: `0 0 20px ${theme.glow}` }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>{rankIcon}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedRankName(null); setShowRankInfo(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm text-slate-400">info</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">랭크 안내</span>
                  </button>
                </div>

                {/* 별점 */}
                <div className="flex items-center gap-1 mb-2 relative z-10">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-lg leading-none"
                      style={{ color: i < rankStars ? theme.accent : 'rgba(255,255,255,0.1)', textShadow: i < rankStars ? `0 0 8px ${theme.glow}` : 'none' }}>
                      ★
                    </span>
                  ))}
                  <span className="text-[10px] font-black uppercase tracking-widest ml-2" style={{ color: theme.accent }}>
                    {rankStars}/5
                  </span>
                </div>

                {/* 레벨 */}
                <div className="flex items-end gap-3 mb-1 relative z-10">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>LEVEL</p>
                    <p className="text-7xl font-black leading-none tracking-tighter" style={{ color: theme.accent, textShadow: `0 0 30px ${theme.glow}` }}>
                      {rank.level}
                    </p>
                  </div>
                  <div className="mb-3">
                    <p className="text-white/30 text-xs font-bold">→ NEXT</p>
                    <p className="text-white/50 text-xl font-black">{rank.level + 1}</p>
                  </div>
                </div>

                <p className="text-2xl font-black mb-1 tracking-tight relative z-10">{rank.title}</p>
                <p className="text-white/40 text-xs font-medium mb-5 relative z-10">{rank.subTitle}</p>

                {/* XP 바 */}
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">EXP</span>
                    <span className="text-xs font-black" style={{ color: theme.accent }}>{rank.currentXp} / {rank.nextLevelXp} XP</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${rank.progress}%`,
                        background: `linear-gradient(90deg, ${theme.accent}99, ${theme.accent})`,
                        boxShadow: `0 0 12px ${theme.glow}, 0 0 6px ${theme.glow}`
                      }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── 퀵 스탯 ── */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* ── 최근 히스토리 ── */}
            <section>
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-accent-neon/20 flex items-center justify-center text-accent-neon border border-accent-neon/20">
                    <span className="material-symbols-outlined text-base">history</span>
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-white">최근 대화 로그</h3>
                </div>
                <button onClick={() => navigate('/history')} className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.accent }}>전체보기</button>
              </div>
              <div className="space-y-2.5">
                {recentHistory.length > 0 ? (
                  recentHistory.map((item) => (
                    <div key={item.id} onClick={() => navigate(`/history/${item.id}`)}
                      className="bg-gradient-to-r from-[#161D2F] to-[#0D1525] p-4 rounded-2xl border border-white/5 flex items-center justify-between active:scale-[0.98] transition-all hover:border-white/10 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center border ${item.type === 'voice' ? 'bg-primary/15 text-primary border-primary/20' : 'bg-accent-neon/15 text-accent-neon border-accent-neon/20'}`}>
                          <span className="material-symbols-outlined text-lg">{item.type === 'voice' ? 'mic' : 'swords'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold truncate max-w-[150px]">{item.scenarioTitle}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase">{item.memberName} • {new Date(item.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-700 text-lg">arrow_forward_ios</span>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white/3 rounded-[2.5rem] border border-dashed border-white/5">
                    <span className="material-symbols-outlined text-3xl text-slate-700 mb-2 block">swords</span>
                    <p className="text-sm text-slate-600 font-bold">전투 기록이 아직 없습니다</p>
                    <p className="text-[9px] text-slate-700 font-bold mt-1 uppercase tracking-widest">Start Your First Quest</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ════════ 스킬 트리 탭 (Stitch 디자인 기반) ════════ */}
        {activeTab === 'skills' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 헤더 */}
            <div className="text-center py-4">
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-2" style={{ textShadow: '0 0 10px rgba(0,242,255,0.4)' }}>
                Leadership Skill Tree
              </p>
              <h2 className="text-2xl font-black italic tracking-tight">리더십 스킬 트리</h2>
              <p className="text-xs text-slate-600 font-medium mt-1">퀘스트를 완료하며 리더십 스킬을 성장시키세요</p>
            </div>

            {/* 카테고리별 스킬 노드 */}
            {['소통', '리더십', '육성'].map((category) => (
              <section key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 border border-white/5">
                    <span className="material-symbols-outlined text-sm">
                      {category === '소통' ? 'chat' : category === '리더십' ? 'star' : 'school'}
                    </span>
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{category} 계열</h3>
                  <div className="h-px bg-white/5 flex-1" />
                </div>

                <div className="space-y-3">
                  {SKILL_TREE.filter(s => s.category === category).map((skill, i) => {
                    const isUnlocked = skill.level > 0;
                    return (
                      <div key={i}
                        className={`bg-gradient-to-br from-[#161D2F] to-[#0D1525] p-5 rounded-[2rem] border transition-all ${isUnlocked ? 'border-white/10 hover:border-white/20' : 'border-white/5 opacity-60'
                          }`}
                        style={isUnlocked ? { boxShadow: `0 0 15px ${skill.color}10` } : {}}
                      >
                        <div className="flex items-start gap-4">
                          {/* 스킬 아이콘 */}
                          <div className="relative shrink-0">
                            <div className="size-12 rounded-2xl flex items-center justify-center border"
                              style={{
                                backgroundColor: isUnlocked ? `${skill.color}15` : 'rgba(255,255,255,0.03)',
                                borderColor: isUnlocked ? `${skill.color}30` : 'rgba(255,255,255,0.05)',
                                boxShadow: isUnlocked ? `0 0 15px ${skill.color}20` : 'none'
                              }}>
                              <span className="material-symbols-outlined text-xl" style={{ color: isUnlocked ? skill.color : '#374151' }}>
                                {skill.icon}
                              </span>
                            </div>
                            {!isUnlocked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-xs text-slate-700">lock</span>
                              </div>
                            )}
                          </div>

                          {/* 스킬 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-sm font-bold text-white">{skill.name}</h4>
                              <span className="text-[9px] font-black uppercase tracking-widest"
                                style={{ color: isUnlocked ? skill.color : '#4B5563' }}>
                                Lv.{skill.level}/{skill.maxLevel}
                              </span>
                            </div>

                            {/* 레벨 게이지 */}
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-2.5">
                              <div className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${(skill.level / skill.maxLevel) * 100}%`,
                                  background: isUnlocked ? `linear-gradient(90deg, ${skill.color}80, ${skill.color})` : 'transparent',
                                  boxShadow: isUnlocked ? `0 0 8px ${skill.color}40` : 'none'
                                }} />
                            </div>

                            {/* 효과 */}
                            <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[10px]" style={{ color: isUnlocked ? skill.color : '#4B5563' }}>
                                {isUnlocked ? 'check_circle' : 'lock'}
                              </span>
                              {skill.effect}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ════════ 배지 탭 ════════ */}
        {activeTab === 'badges' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest mb-6 hover:translate-x-[-4px] transition-transform">
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
