
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

/* ── 우주 별 좌표 ── */
const STARS = [
  { top: '3%',  left: '8%',  size: 2,   dur: '2.3s', delay: '0s'   },
  { top: '7%',  left: '72%', size: 1.5, dur: '3.5s', delay: '0.6s' },
  { top: '14%', left: '30%', size: 1,   dur: '2.8s', delay: '1.1s' },
  { top: '20%', left: '90%', size: 2,   dur: '4.0s', delay: '0.3s' },
  { top: '28%', left: '55%', size: 1.5, dur: '2.6s', delay: '1.8s' },
  { top: '36%', left: '5%',  size: 1,   dur: '3.2s', delay: '0.8s' },
  { top: '44%', left: '82%', size: 2,   dur: '2.5s', delay: '1.4s' },
  { top: '52%', left: '18%', size: 1.5, dur: '3.8s', delay: '0.2s' },
  { top: '60%', left: '68%', size: 1,   dur: '2.1s', delay: '0.9s' },
  { top: '68%', left: '40%', size: 2,   dur: '3.3s', delay: '1.7s' },
  { top: '76%', left: '12%', size: 1.5, dur: '2.7s', delay: '0.5s' },
  { top: '84%', left: '78%', size: 1,   dur: '3.9s', delay: '1.2s' },
  { top: '91%', left: '50%', size: 2,   dur: '2.4s', delay: '0.7s' },
  { top: '50%', left: '95%', size: 1.5, dur: '3.1s', delay: '1.5s' },
  { top: '25%', left: '45%', size: 1,   dur: '2.9s', delay: '0.1s' },
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
    <div className="min-h-screen bg-[#060B18] text-white font-manrope flex flex-col overflow-y-auto relative">

      {/* ── 우주 배경: 성운 + 별 ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* 성운 오로라 */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% -10%, ${theme.nebula} 0%, transparent 60%),
                         radial-gradient(ellipse at 80% 80%, rgba(30,20,80,0.4) 0%, transparent 50%),
                         radial-gradient(ellipse at 20% 60%, rgba(0,20,60,0.3) 0%, transparent 40%)`
          }}
        />
        {/* 반짝이는 별들 */}
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
      <header className="p-4 flex items-center justify-between sticky top-0 backdrop-blur-md border-b border-white/5 z-10"
        style={{ backgroundColor: 'rgba(6,11,24,0.85)' }}>
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: theme.bg, borderColor: theme.border, boxShadow: `0 0 12px ${theme.glow}` }}
          >
            <span className="material-symbols-outlined text-xl font-bold" style={{ color: theme.accent }}>{rankIcon}</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">리더 프로필</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2"><span className="material-symbols-outlined text-slate-400">notifications</span></button>
          <div className="size-10 rounded-full border-2 overflow-hidden" style={{ borderColor: theme.accent }}>
            <img src="https://ui-avatars.com/api/?name=Leader&background=00F2FF&color=0A0F1D" alt="Avatar" className="size-full object-cover" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-5 pb-24 space-y-6 relative z-10">

        {/* ── RPG 랭크 카드 ── */}
        {rank && (
          <div
            className="rounded-[2rem] p-6 border relative overflow-hidden"
            style={{
              backgroundColor: 'rgba(15,23,41,0.9)',
              borderColor: theme.border,
              boxShadow: `0 0 30px ${theme.glow.replace('0.6', '0.2')}, inset 0 0 60px ${theme.bg}`
            }}
          >
            {/* 배경 글로우 오브 */}
            <div
              className="absolute -top-12 -right-12 size-48 rounded-full blur-3xl pointer-events-none"
              style={{ backgroundColor: theme.bg }}
            />
            <div
              className="absolute -bottom-8 -left-8 size-32 rounded-full blur-2xl pointer-events-none"
              style={{ backgroundColor: 'rgba(159,122,234,0.05)' }}
            />

            {/* 상단: 아이콘 + 랭크 안내 버튼 */}
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div
                className="size-14 rounded-2xl flex items-center justify-center border"
                style={{ backgroundColor: theme.bg, borderColor: theme.border, boxShadow: `0 0 20px ${theme.glow}` }}
              >
                <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>{rankIcon}</span>
              </div>
              <button
                onClick={() => { setSelectedRankName(null); setShowRankInfo(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-sm text-slate-400">info</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">랭크 안내</span>
              </button>
            </div>

            {/* 별점 */}
            <div className="flex items-center gap-1 mb-2 relative z-10">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="text-lg leading-none"
                  style={{ color: i < rankStars ? theme.accent : 'rgba(255,255,255,0.1)', textShadow: i < rankStars ? `0 0 8px ${theme.glow}` : 'none' }}
                >★</span>
              ))}
              <span className="text-[10px] font-black uppercase tracking-widest ml-2" style={{ color: theme.accent }}>
                {rankStars}/5
              </span>
            </div>

            {/* 레벨 대형 표시 */}
            <div className="flex items-end gap-3 mb-1 relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-0" style={{ color: theme.accent }}>LEVEL</p>
                <p className="text-8xl font-black leading-none tracking-tighter" style={{ color: theme.accent, textShadow: `0 0 30px ${theme.glow}` }}>
                  {rank.level}
                </p>
              </div>
              <div className="mb-3">
                <p className="text-white/40 text-xs font-bold">→ NEXT</p>
                <p className="text-white/60 text-xl font-black">{rank.level + 1}</p>
              </div>
            </div>

            {/* 랭크 타이틀 */}
            <p className="text-2xl font-extrabold mb-1 tracking-tight relative z-10">{rank.title}</p>
            <p className="text-white/40 text-xs font-medium mb-5 relative z-10">{rank.subTitle}</p>

            {/* XP 바 */}
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">EXP</span>
                <span className="text-xs font-black" style={{ color: theme.accent }}>{rank.currentXp} / {rank.nextLevelXp} XP</span>
              </div>
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full rounded-full xp-bar-fill"
                  style={{
                    width: `${rank.progress}%`,
                    background: `linear-gradient(90deg, ${theme.accent}99, ${theme.accent})`,
                    boxShadow: `0 0 12px ${theme.glow}, 0 0 6px ${theme.glow}`
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-white/20">Lv {rank.level}</span>
                <span className="text-[9px] text-white/20">Lv {rank.level + 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── 뱃지 갤러리 ── */}
        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
              <span className="material-symbols-outlined text-base" style={{ color: theme.accent }}>workspace_premium</span>
              <span>배지 컬렉션</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.bg, color: theme.accent, border: `1px solid ${theme.border}` }}>
                {unlockedCount}/{badges.length}
              </span>
            </h3>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Badge Gallery</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className="flex flex-col items-center gap-1.5 transition-all active:scale-90"
              >
                <div className="relative">
                  {/* 육각형 배지 컨테이너 */}
                  <div
                    className={`hexagon size-14 flex items-center justify-center transition-all ${badge.isUnlocked ? 'animate-glow-pulse' : ''}`}
                    style={badge.isUnlocked ? {
                      background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,0.05))`,
                      filter: `drop-shadow(0 0 8px ${theme.glow})`
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      filter: 'grayscale(1)',
                      opacity: 0.25,
                    }}
                  >
                    <span className={`material-symbols-outlined text-xl ${badge.isUnlocked ? badge.color : 'text-slate-600'}`}>
                      {badge.icon}
                    </span>
                  </div>
                  {/* 잠금 아이콘 오버레이 */}
                  {!badge.isUnlocked && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1">
                      <span className="material-symbols-outlined text-[10px] text-slate-600">lock</span>
                    </div>
                  )}
                  {/* 해금 뱃지 빛나는 점 */}
                  {badge.isUnlocked && (
                    <div
                      className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full pulse-cyan"
                      style={{ backgroundColor: theme.accent }}
                    />
                  )}
                </div>
                <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap leading-tight text-center">{badge.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── 퀵 스탯 링크 ── */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => navigate('/streak')}
            className="bg-navy-card/80 p-5 rounded-[1.5rem] border border-white/5 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-accent-amber/30"
          >
            <div className="size-11 rounded-2xl bg-accent-amber/10 flex items-center justify-center text-accent-amber mb-3 group-hover:shadow-neon-amber transition-all">
              <span className="material-symbols-outlined">local_fire_department</span>
            </div>
            <p className="font-bold text-sm">5일 스트릭</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Streak</p>
          </div>
          <div
            onClick={() => navigate('/insights')}
            className="bg-navy-card/80 p-5 rounded-[1.5rem] border border-white/5 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-primary/30"
          >
            <div className="size-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:shadow-neon-cyan transition-all">
              <span className="material-symbols-outlined">query_stats</span>
            </div>
            <p className="font-bold text-sm">성과 대시보드</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Analytics</p>
          </div>
        </div>

        {/* ── 최근 히스토리 ── */}
        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
              <span className="material-symbols-outlined text-base text-accent-neon">history</span>
              최근 대화 로그
            </h3>
            <button onClick={() => navigate('/history')} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.accent }}>전체보기</button>
          </div>
          <div className="space-y-2.5">
            {recentHistory.length > 0 ? (
              recentHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/history/${item.id}`)}
                  className="bg-navy-card/80 p-4 rounded-2xl border border-white/5 flex items-center justify-between active:scale-[0.98] transition-all hover:border-white/10 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${item.type === 'voice' ? 'bg-primary/20 text-primary' : 'bg-accent-neon/20 text-accent-neon'}`}>
                      <span className="material-symbols-outlined text-lg">{item.type === 'voice' ? 'mic' : 'chat'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[150px]">{item.scenarioTitle}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase">{item.memberName} • {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-600 text-lg">arrow_forward_ios</span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                <span className="material-symbols-outlined text-3xl text-slate-600 mb-2 block">history</span>
                <p className="text-sm text-slate-500 font-medium">아직 저장된 대화가 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── 랭크 정보 모달 ── */}
      {showRankInfo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowRankInfo(false)}>
          <div
            className="w-full max-w-sm bg-navy-card rounded-[3rem] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {!currentRankDetail ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-center mb-6">
                  <div className="size-14 rounded-2xl flex items-center justify-center border shadow-neon-cyan" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: theme.accent }}>{rankIcon}</span>
                  </div>
                </div>
                <h3 className="text-xl font-black mb-6 text-center italic tracking-tighter uppercase">Leadership Ranking System</h3>
                <p className="text-[10px] text-center text-slate-500 mb-6 uppercase tracking-widest">각 단계를 클릭하여 상세 가이드 확인</p>
                <div className="space-y-3">
                  {Object.keys(RANK_DETAILS).map((key, i) => {
                    const item = RANK_DETAILS[key];
                    const t = getRankTheme(key);
                    const stars = getRankStars(key);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedRankName(key)}
                        className="w-full flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group text-left"
                      >
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
                <button
                  onClick={() => setShowRankInfo(false)}
                  className="w-full mt-8 py-4 bg-white/5 text-slate-400 font-black text-xs uppercase rounded-xl border border-white/5"
                >
                  닫기
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button
                  onClick={() => setSelectedRankName(null)}
                  className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest mb-6 hover:translate-x-[-4px] transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span> 뒤로가기
                </button>
                <div className="mb-6">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{currentRankDetail.lv}</span>
                  <h3 className="text-2xl font-black italic">{currentRankDetail.name}</h3>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto hide-scrollbar pr-1">
                  <section>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">정의</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{currentRankDetail.definition}</p>
                  </section>
                  <section>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">핵심 특징</h4>
                    <ul className="space-y-1.5">
                      {currentRankDetail.features.map((f, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-primary mt-1 text-[10px]">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="bg-primary/5 p-5 rounded-2xl border border-primary/20">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">훈련 앱 활용 방안</h4>
                    <p className="text-xs text-slate-200 leading-relaxed italic">"{currentRankDetail.usage}"</p>
                  </section>
                  <section>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Next Level 추천 액션</h4>
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
                <button
                  onClick={() => setSelectedRankName(null)}
                  className="w-full mt-8 py-5 bg-primary text-navy-deep font-black text-xs uppercase rounded-2xl shadow-neon-cyan active:scale-95 transition-all"
                >
                  다른 랭크 확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 배지 상세 모달 ── */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-sm bg-navy-card rounded-[3rem] p-8 border border-white/10 shadow-2xl text-center flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className={`hexagon size-24 flex items-center justify-center mb-6 ${selectedBadge.isUnlocked ? 'animate-glow-pulse' : ''}`}
              style={selectedBadge.isUnlocked ? {
                background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,0.05))`,
                filter: `drop-shadow(0 0 16px ${theme.glow})`
              } : {
                background: 'rgba(255,255,255,0.03)',
                filter: 'grayscale(1)',
                opacity: 0.4,
              }}
            >
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">획득 조건</p>
              <p className={`text-sm font-bold ${selectedBadge.isUnlocked ? 'text-primary' : 'text-slate-400'}`}>
                {selectedBadge.condition}
              </p>
            </div>
            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-4 text-navy-deep font-black text-xs uppercase tracking-widest rounded-xl"
              style={{ backgroundColor: theme.accent }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
