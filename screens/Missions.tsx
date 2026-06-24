
import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SCENARIOS, CATEGORIES } from '../constants';
import { DataService } from '../services/dataService';
import { Scenario } from '../types';
import { getCharacterAvatar } from '../services/characterAvatars';
import { createGeminiClient } from '../src/lib/geminiClient';
import { useAuth } from '../contexts/AuthContext';
import { usageService } from '../services/usageService';
import { QuestHexBadge, AvatarWithGrade } from '../components/GameUIComponents';

/* ── 강도 → 퀘스트 메타데이터 ── */
function getQuestMeta(intensity: string) {
  if (intensity === 'high') return { grade: 'S', gradeColor: '#ef4444', gradeBg: 'rgba(239,68,68,0.12)', gradeBorder: 'rgba(239,68,68,0.35)', stars: 3, xp: 80 };
  if (intensity === 'medium') return { grade: 'A', gradeColor: '#FFB800', gradeBg: 'rgba(255,184,0,0.12)', gradeBorder: 'rgba(255,184,0,0.35)', stars: 2, xp: 50 };
  return { grade: 'B', gradeColor: '#10B981', gradeBg: 'rgba(16,185,129,0.12)', gradeBorder: 'rgba(16,185,129,0.35)', stars: 1, xp: 30 };
}

function getCategoryIcon(category: string): string {
  if (category === '성과 관리' || category === '피드백') return 'monitoring';
  if (category === '갈등 해결') return 'diversity_3';
  if (category === '동기 부여') return 'local_fire_department';
  return 'neurology';
}

function getCategoryImageUrl(category: string) {
  if (category === '성과 관리' || category === '피드백') return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800';
  if (category === '갈등 해결') return 'https://images.unsplash.com/photo-1573497620053-ea5310f94a17?auto=format&fit=crop&q=80&w=800';
  if (category === '동기 부여') return 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=811';
  return 'https://images.unsplash.com/photo-1517245385169-45903b715694?auto=format&fit=crop&q=80&w=800';
}

// 연속 학습 일수(스트릭) 계산: 오늘부터 역순으로 연속된 날짜 카운트
function calcStreak(history: any[]): number {
  if (history.length === 0) return 0;
  const days = new Set(
    history
      .map((h: any) => h.timestamp || h.date)
      .filter(Boolean)
      .map((ts: string) => new Date(ts).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

const Missions: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [recommendation, setRecommendation] = useState<{ scenario: Scenario, reason: string } | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [streakDays, setStreakDays] = useState(0);
  const [userRank, setUserRank] = useState({ level: 1, progress: 0 });

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    const ids = new Set<string>(history.map((h: any) => h.scenarioId).filter(Boolean));
    setCompletedIds(ids);
    setStreakDays(calcStreak(history));
    setUserRank(DataService.getUserRank());
  }, []);

  useEffect(() => {
    const fetchRecommendation = async () => {
      const cached = sessionStorage.getItem('leadershigh_daily_rec');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const matchedScenario = SCENARIOS.find(s => s.id === parsed.scenarioId);
          if (matchedScenario) {
            setRecommendation({ scenario: matchedScenario, reason: parsed.reason });
            return;
          }
        } catch (e) {
          console.error("캐시 로드 실패", e);
        }
      }

      setIsAnalysing(true);
      try {
        const weakAreaInfo = DataService.getWeakestAreaInfo();
        const candidateScenarios = SCENARIOS.filter(s =>
          s.category === weakAreaInfo.category ||
          (weakAreaInfo.category === '소통' && s.category === '피드백')
        );
        const targetScenario = candidateScenarios[Math.floor(Math.random() * candidateScenarios.length)] || SCENARIOS[0];

        // ── Gemini AI를 통한 맞춤형 코칭 메시지 생성 ────────────────
        const ai = createGeminiClient();

        const prompt = `
          리더십 교육 게임 'Letmefree'의 AI 리더십 코치 역할을 해주세요.
          사용자의 취약 역량: ${weakAreaInfo.area} (카테고리: ${weakAreaInfo.category}, 현재 점수: ${weakAreaInfo.score})
          추천된 미션: ${targetScenario.title}
          미션 설명: ${targetScenario.description}

          사용자에게 이 미션을 왜 추천하는지, 그리고 이 미션을 통해 어떤 성장을 이룰 수 있는지 
          리더십 전문가다운 전문적이면서도 따뜻한 어조로 딱 한 문장(한국어, 60자 내외)으로 조언해주세요. 
          "~~를 위해 ~~가 필요할 것 같습니다" 혹은 "~~를 통해 ~~한 성과를 얻을 수 있을 거예요" 와 같은 격식 있는 체를 사용하세요.
          답변에 이모지는 포함하지 마세요.
        `;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        const reason = result.text?.trim() || "팀원의 성장을 이끄는 과정에서 리더님의 역량이 한 단계 더 도약할 수 있을 것입니다.";

        const finalRec = { scenario: targetScenario, reason };
        setRecommendation(finalRec);

        // 캐싱 (하루 동안 유지되도록 세션 스토리지 활용)
        sessionStorage.setItem('leadershigh_daily_rec', JSON.stringify({
          scenarioId: targetScenario.id,
          reason: finalRec.reason
        }));

      } catch (error) {
        console.error("AI 추천 생성 중 오류:", error);
        setRecommendation({
          scenario: SCENARIOS[0],
          reason: "팀원들과의 갈등 상황에서 리더님의 유연한 대처 능력이 성장의 돌파구가 될 거예요."
        });
      } finally {
        setIsAnalysing(false);
      }
    };
    fetchRecommendation();
  }, []);

  const filteredScenarios = useMemo(() => {
    if (selectedCategory === '전체') return SCENARIOS;
    return SCENARIOS.filter(s => s.category === selectedCategory || (selectedCategory === '소통' && s.category === '피드백'));
  }, [selectedCategory]);

  const navItems = [
    { name: '팀원 관리', active: false, path: '/team-office' },
    { name: '퀘스트 보드', active: true, path: '/missions' },
    { name: '커스텀 랩', active: false, path: '/custom-lab' }
  ];

  return (
    <div className="h-screen flex flex-col relative overflow-hidden text-white font-manrope bg-[#060b18]">
      {/* ── 상단 글로벌 네비게이션 (데스크톱은 좌측 사이드바가 담당하므로 숨김 — 중복 제거) ── */}
      <nav className="hidden items-center justify-between px-8 py-4 border-b border-white/5 bg-[#0D1526] z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="size-8 rounded-lg bg-orange-500 flex items-center justify-center font-black text-black">L</div>
            <span className="font-black tracking-tight text-lg">Letmefree</span>
          </div>
          <div className="flex items-center gap-8">
            {navItems.map(item => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`text-sm font-bold transition-all ${item.active ? 'text-white border-b-2 border-orange-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-orange-500 text-sm">bolt</span>
            <span className="text-xs font-black">LV. {userRank.level}</span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${userRank.progress}%` }} />
            </div>
          </div>
          <button className="size-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <div className="size-9 rounded-full border-2 border-orange-500/30 overflow-hidden">
            <img src={getCharacterAvatar('리더')} className="size-full object-cover" alt="Profile" />
          </div>
        </div>
      </nav>

      {/* ── 메인 스크롤 영역 ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10 lg:px-10 lg:py-10 hide-scrollbar pb-32">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-black text-white mb-2 tracking-tighter break-keep">퀘스트 보드</h1>
            <p className="text-slate-500 font-bold max-w-xl leading-relaxed text-sm break-keep">오늘의 리더십 훈련 미션을 선택하세요. 리더님의 선택과 대응 방식이 팀원과의 신뢰도와 팀 전체의 성과에 직접적인 영향을 미칩니다.</p>
          </div>
          <div className="flex flex-row sm:flex-row gap-3 sm:gap-4 shrink-0">
            <div className="bg-[#111B2E] border border-white/10 rounded-2xl p-4 flex items-center gap-4 flex-1 sm:flex-initial sm:min-w-[180px]">
              <div className="size-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-orange-500 text-2xl">local_fire_department</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daily Streak</p>
                <p className="text-xl font-black text-white">{streakDays} Days</p>
              </div>
            </div>
            <div className="bg-[#111B2E] border border-white/10 rounded-2xl p-4 flex items-center gap-4 flex-1 sm:flex-initial sm:min-w-[180px]">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-right mb-1">Total Quests</p>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-2xl font-black text-white">{completedIds.size}</span>
                  <span className="text-slate-600 font-bold">/{SCENARIOS.length}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── AI 일일 추천 퀘스트 (Daily Special) ── */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700 delay-100 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-orange-500">stars</span>
            <h2 className="text-xl font-black uppercase tracking-tighter">Daily Special</h2>
            <div className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] font-black text-orange-500">AI CURATED</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isAnalysing ? (
              <div className="col-span-full h-64 rounded-[2rem] border border-white/5 bg-[#111B2E] flex flex-col items-center justify-center gap-4">
                <div className="size-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                <p className="text-slate-500 font-bold">리더님의 최근 전술 트렌드를 분석하는 중...</p>
              </div>
            ) : recommendation ? (
              <>
                {/* 메인 추천 카드 (이미지 강조형) */}
                <div className="relative group cursor-pointer overflow-hidden rounded-[2rem] border border-white/10 bg-[#111B2E]"
                  onClick={() => navigate('/setup', { state: { scenario: recommendation.scenario } })}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1526] via-[#0D1526]/30 to-transparent z-10" />
                  <img
                    src={getCategoryImageUrl(recommendation.scenario.category)}
                    className="w-full h-[300px] object-cover group-hover:scale-105 transition-transform duration-1000 opacity-60"
                    alt="Quest Representation"
                  />
                  <div className="absolute inset-0 z-20 p-10 flex flex-col justify-end">
                    <div className="mb-4">
                      <QuestHexBadge grade={recommendation.scenario.intensity === 'high' ? 'S' : recommendation.scenario.intensity === 'medium' ? 'A' : 'B'} size="lg" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3 group-hover:text-orange-400 transition-colors tracking-tight">{recommendation.scenario.title}</h3>
                    <p className="text-slate-300 text-sm font-medium line-clamp-2 mb-6 max-w-lg">{recommendation.scenario.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Rewards</span>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-orange-500 text-sm">bolt</span>
                            <span className="text-lg font-black text-white">500 XP</span>
                          </div>
                        </div>
                      </div>
                      <button className="px-8 py-3 rounded-2xl bg-orange-500 text-black font-black text-xs hover:bg-white transition-all shadow-xl shadow-orange-500/20 uppercase tracking-wider">Accept Quest</button>
                    </div>
                  </div>
                </div>

                {/* AI 코칭 메시지 카드 */}
                <div className="rounded-[2rem] border border-orange-500/20 bg-orange-500/5 p-10 flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute -right-20 -top-20 size-80 bg-orange-500/5 blur-[100px] rounded-full" />
                  <div className="relative z-10">
                    <div className="size-14 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-8 border border-orange-500/30">
                      <span className="material-symbols-outlined text-orange-500 text-3xl">psychology</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-200 leading-[1.6] mb-8 italic tracking-tight">
                      "{recommendation.reason}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full border-2 border-orange-500/40 overflow-hidden shadow-lg shadow-orange-500/10">
                        <img src={getCharacterAvatar('리더')} className="size-full object-cover" alt="AI Coach" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">AI 리더십 코치</p>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Leadership Analytics V2.0</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* ── 카테고리 필터 시스템 ── */}
        <section className="mb-12">
          <div className="flex mb-10 border-b border-white/5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="relative group py-2 shrink-0 mr-10"
                >
                  <span className={`text-sm font-black tracking-tighter transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                    }`}>
                    {cat.toUpperCase()}
                  </span>
                  {isActive && (
                    <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-transparent rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 퀘스트 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {filteredScenarios.map((scenario, idx) => {
              const meta = getQuestMeta(scenario.intensity);
              const isCleared = completedIds.has(scenario.id);
              const catIcon = getCategoryIcon(scenario.category);
              const originalIndex = SCENARIOS.findIndex(s => s.id === scenario.id);
              const isLocked = !usageService.canAccessScenarioById(
                scenario.id,
                profile?.plan || 'free',
                profile?.selected_scenarios,
              );

              return (
                <div
                  key={scenario.id}
                  onClick={() => isLocked ? navigate('/pricing') : navigate('/setup', { state: { scenario } })}
                  className={`relative group cursor-pointer transition-all duration-500 ${isLocked ? 'opacity-70' : ''}`}
                >
                  <div className={`absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-[2.5rem] transition-opacity duration-500 opacity-0 group-hover:opacity-100`} />

                  <div className={`relative h-full bg-[#111B2E] border border-white/5 rounded-[2.5rem] p-7 overflow-hidden transition-all duration-500 group-hover:translate-y-[-8px] group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] ${isCleared ? 'opacity-80' : ''}`}>
                    {/* 카드 배경 장식 */}
                    <div className="absolute right-[-20%] top-[-10%] size-40 bg-white/2 blur-[40px] rounded-full group-hover:bg-white/5 transition-all" />

                    {/* CLEARED 스탬프 */}
                    {isCleared && !isLocked && (
                      <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center pointer-events-none rounded-[2.5rem] backdrop-blur-[1px]">
                        <div className="rotate-[-12deg] border-[3px] border-emerald-500/80 rounded-2xl px-6 py-3 animate-in zoom-in-125 duration-300">
                          <p className="text-emerald-500 font-black text-2xl tracking-[0.4em] uppercase" style={{ textShadow: '0 0 15px rgba(16,185,129,0.5)' }}>Cleared</p>
                        </div>
                      </div>
                    )}

                    {/* 잠금 오버레이 (Spec v3 §5.3: "요금제 업그레이드" 라벨로 변경) */}
                    {isLocked && (
                      <div className="absolute inset-0 bg-slate-900/60 z-20 flex flex-col items-center justify-center pointer-events-none rounded-[2.5rem] gap-2">
                        <span className="text-3xl">🔒</span>
                        <span className="text-[11px] font-black text-amber-400 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full tracking-wide">요금제 업그레이드</span>
                      </div>
                    )}

                    {/* 상단: 등급 + 아이콘 */}
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <QuestHexBadge grade={meta.grade} size="md" />
                      <div className="size-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-xl text-slate-400 group-hover:text-white transition-colors">{catIcon}</span>
                      </div>
                    </div>

                    {/* 캐릭터 + 제목 */}
                    <div className="mb-6 relative z-10">
                      <div className="flex items-center gap-4 mb-4">
                        <AvatarWithGrade
                          src={getCharacterAvatar(scenario.memberName, scenario.id)}
                          grade={meta.grade}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-black text-white tracking-tight">{scenario.memberName}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{scenario.generation}</p>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-white mb-2 leading-snug group-hover:text-orange-400 transition-colors">{scenario.title}</h3>
                      <p className="text-xs font-medium text-slate-400 line-clamp-3 leading-[1.6]">{scenario.description}</p>
                    </div>

                    {/* 하단: 보상 + 등급 별 */}
                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <span className="material-symbols-outlined text-xs text-orange-500">bolt</span>
                        <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">{meta.xp} XP</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <span key={i} className={`text-sm leading-none ${i < meta.stars ? 'text-orange-400' : 'text-white/5'}`}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 빈 결과 상태 */}
          {filteredScenarios.length === 0 && (
            <div className="py-32 text-center animate-in fade-in duration-500">
              <div className="size-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-8 shadow-inner">
                <span className="material-symbols-outlined text-5xl text-slate-700">search_off</span>
              </div>
              <p className="text-lg font-black text-slate-400 mb-2 uppercase tracking-widest">No Missions Found</p>
              <p className="text-sm font-bold text-slate-600">다른 필터나 등급을 선택하여 새로운 도전을 시작해보세요.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Missions;
