
import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SCENARIOS, CATEGORIES } from '../constants';
import { DataService } from '../services/dataService';
import { Scenario } from '../types';
import { getCharacterAvatar } from '../services/characterAvatars';
import { createGeminiClient } from '../src/lib/geminiClient';

/* ── 강도 → 퀘스트 메타데이터 ── */
function getQuestMeta(intensity: string) {
  if (intensity === 'high') return { grade: 'S', gradeColor: '#ef4444', gradeBg: 'rgba(239,68,68,0.12)', gradeBorder: 'rgba(239,68,68,0.35)', stars: 3, xp: 80 };
  if (intensity === 'medium') return { grade: 'A', gradeColor: '#FFB800', gradeBg: 'rgba(255,184,0,0.12)', gradeBorder: 'rgba(255,184,0,0.35)', stars: 2, xp: 50 };
  return { grade: 'B', gradeColor: '#10B981', gradeBg: 'rgba(16,185,129,0.12)', gradeBorder: 'rgba(16,185,129,0.35)', stars: 1, xp: 30 };
}

function getCategoryIcon(category: string): string {
  if (category === '성과 관리') return 'monitoring';
  if (category === '갈등 해결') return 'diversity_3';
  if (category === '동기 부여') return 'local_fire_department';
  return 'neurology';
}

const Missions: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedIntensity, setSelectedIntensity] = useState<'전체' | 'low' | 'medium' | 'high'>('전체');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [recommendation, setRecommendation] = useState<{ scenario: Scenario, reason: string } | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    const ids = new Set<string>(history.map((h: any) => h.scenarioId).filter(Boolean));
    setCompletedIds(ids);
  }, []);

  const fetchWithRetry = async (ai: any, prompt: string, retries = 2) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { temperature: 0.7 } });
        return response.text;
      } catch (error: any) {
        if (i === retries - 1) throw error;
        if (error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i + 1) * 1500));
          continue;
        }
        throw error;
      }
    }
  };

  useEffect(() => {
    const fetchRecommendation = async () => {
      const cached = sessionStorage.getItem('leadershigh_daily_rec');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const matchedScenario = SCENARIOS.find(s => s.id === parsed.scenarioId);
          if (matchedScenario) { setRecommendation({ scenario: matchedScenario, reason: parsed.reason }); return; }
        } catch (e) { console.error("캐시 로드 실패", e); }
      }
      setIsAnalysing(true);
      try {
        const weakAreaInfo = DataService.getWeakestAreaInfo();
        const candidateScenarios = SCENARIOS.filter(s => s.category === weakAreaInfo.category);
        const targetScenario = candidateScenarios[Math.floor(Math.random() * candidateScenarios.length)] || SCENARIOS[0];
        const ai = createGeminiClient();
        const prompt = `리더십 코칭 시스템입니다. 현재 리더의 취약 역량은 '${weakAreaInfo.area}'이며, 추천 미션은 '${targetScenario.title}'입니다. 이 미션이 왜 리더님에게 필요한지, 심리학적 관점을 살짝 섞어서 아주 쉽고 다정한 말투로 딱 2문장으로 설명해주세요. "리더님, ~입니다" 형식을 사용하세요.`;
        const reason = await fetchWithRetry(ai, prompt);
        if (reason) {
          setRecommendation({ scenario: targetScenario, reason });
          sessionStorage.setItem('leadershigh_daily_rec', JSON.stringify({ scenarioId: targetScenario.id, reason }));
        }
      } catch (error) {
        console.warn("AI 추천 엔진 일시적 사용 불가. 로컬 엔진으로 전환합니다.");
        const weakAreaInfo = DataService.getWeakestAreaInfo();
        const candidateScenarios = SCENARIOS.filter(s => s.category === weakAreaInfo.category);
        const targetScenario = candidateScenarios[Math.floor(Math.random() * candidateScenarios.length)] || SCENARIOS[0];
        const fallbackReasons = [
          "리더님의 최근 역량 데이터를 분석해보니 이 미션이 성장에 가장 큰 돌파구가 될 것 같아요. 함께 도전해볼까요?",
          "지금 리더님께 꼭 필요한 맞춤형 훈련 상황을 준비했습니다. 부담 없이 대화를 시작해보세요!",
          "팀원과의 신뢰 관계를 한 단계 더 높일 수 있는 최적의 시나리오를 골라왔습니다."
        ];
        setRecommendation({ scenario: targetScenario, reason: fallbackReasons[Math.floor(Math.random() * fallbackReasons.length)] });
      } finally {
        setIsAnalysing(false);
      }
    };
    fetchRecommendation();
  }, []);

  const filteredScenarios = useMemo(() => {
    let result = SCENARIOS;
    if (selectedCategory !== '전체') result = result.filter(s => s.category === selectedCategory);
    if (selectedIntensity !== '전체') result = result.filter(s => s.intensity === selectedIntensity);
    return result;
  }, [selectedCategory, selectedIntensity]);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden text-white font-manrope quest-board-bg">

      {/* ── 헤더: 퀘스트 게시판 스타일 ── */}
      <header className="flex flex-col p-5 gap-4 border-b border-primary/10 backdrop-blur-xl sticky top-0 z-20"
        style={{ backgroundColor: 'rgba(6,11,24,0.92)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent-amber/10 p-2.5 rounded-xl border border-accent-amber/30 shadow-neon-amber">
              <span className="material-symbols-outlined text-accent-amber text-xl">push_pin</span>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Quest Board</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">리더십 퀘스트 게시판</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/30">
              <div className="size-1.5 rounded-full bg-accent-green animate-pulse"></div>
              <span className="text-[9px] font-black text-accent-green uppercase">{SCENARIOS.length} 퀘스트</span>
            </div>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border uppercase tracking-widest ${selectedCategory === cat
                ? 'bg-accent-amber text-navy-deep border-accent-amber shadow-neon-amber'
                : 'bg-white/5 text-slate-500 border-white/5 hover:border-accent-amber/30 hover:text-slate-300'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 난이도 필터 */}
        <div className="flex gap-2 items-center">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest shrink-0">등급</span>
          {([['전체', '전체 등급', ''], ['low', 'B등급', '#10B981'], ['medium', 'A등급', '#FFB800'], ['high', 'S등급', '#ef4444']] as const).map(([value, label, color]) => (
            <button
              key={value}
              onClick={() => setSelectedIntensity(value as any)}
              className={`px-3 py-1 rounded-md text-[10px] font-black whitespace-nowrap transition-all border ${selectedIntensity === value
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/5 text-slate-600 border-white/5 hover:border-white/20 hover:text-slate-400'
                }`}
              style={selectedIntensity === value && color ? { color, borderColor: `${color}50`, backgroundColor: `${color}15` } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── 메인 퀘스트 목록 ── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-5 pt-8 space-y-8">

        {/* ── AI 일일 추천 퀘스트 ── */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2 mb-5 px-1">
            <span className="material-symbols-outlined text-accent-amber text-sm">auto_awesome</span>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">오늘의 필수 퀘스트</h3>
            <div className="h-px flex-1 bg-white/5 ml-2"></div>
          </div>

          {isAnalysing ? (
            <div className="bg-navy-card/80 border border-accent-amber/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
              <div className="size-10 border-2 border-accent-amber/20 border-t-accent-amber rounded-full animate-spin"></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">퀘스트 배정 중...</p>
            </div>
          ) : recommendation && (() => {
            const meta = getQuestMeta(recommendation.scenario.intensity);
            return (
              <div
                onClick={() => navigate('/setup', { state: { scenario: recommendation.scenario } })}
                className="relative quest-pin rounded-[2rem] border cursor-pointer group transition-all overflow-visible"
                style={{
                  backgroundColor: 'rgba(15,23,41,0.95)',
                  borderColor: meta.gradeBorder,
                  boxShadow: `0 0 30px ${meta.gradeBg}, 0 8px 32px rgba(0,0,0,0.5)`,
                  marginTop: '8px',
                }}
              >
                {/* 상단 배너 */}
                <div className="px-6 pt-6 pb-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-black px-3 py-1 rounded-md uppercase tracking-widest"
                        style={{ color: meta.gradeColor, backgroundColor: meta.gradeBg, border: `1px solid ${meta.gradeBorder}` }}
                      >
                        {meta.grade}등급
                      </span>
                      <span className="text-[9px] font-black px-2 py-1 rounded-full bg-white/5 text-slate-400 uppercase tracking-widest border border-white/5">
                        {recommendation.scenario.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className="text-sm leading-none" style={{ color: i < meta.stars ? meta.gradeColor : 'rgba(255,255,255,0.1)' }}>★</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 퀘스트 내용 */}
                <div className="p-6 pt-4">
                  {/* 캐릭터 아바타 + 이름 */}
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={getCharacterAvatar(recommendation.scenario.memberName, recommendation.scenario.id)}
                      alt={recommendation.scenario.memberName}
                      className="size-12 rounded-2xl border-2 bg-slate-700"
                      style={{ borderColor: meta.gradeBorder }}
                    />
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">대상 팀원</p>
                      <p className="text-sm font-black text-white">{recommendation.scenario.memberName}</p>
                      <p className="text-[10px] text-slate-500">{recommendation.scenario.generation}</p>
                    </div>
                  </div>
                  <h4 className="text-xl font-black mb-3 text-white group-hover:text-primary transition-colors leading-tight">
                    {recommendation.scenario.title}
                  </h4>

                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl mb-5">
                    <p className="text-[12px] text-slate-300 font-medium leading-[1.7] italic">
                      "{recommendation.reason}"
                    </p>
                  </div>

                  {/* 보상 + 실행 */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: meta.gradeBg, border: `1px solid ${meta.gradeBorder}` }}>
                        <span className="material-symbols-outlined text-sm" style={{ color: meta.gradeColor }}>bolt</span>
                        <span className="text-[10px] font-black" style={{ color: meta.gradeColor }}>+{meta.xp} XP</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/20">
                        <span className="material-symbols-outlined text-sm text-accent-amber">workspace_premium</span>
                        <span className="text-[10px] font-black text-accent-amber">배지 기회</span>
                      </div>
                    </div>
                    <button
                      className="size-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-2xl font-black"
                      style={{ backgroundColor: meta.gradeColor, color: '#060B18', boxShadow: `0 0 20px ${meta.gradeBg}` }}
                    >
                      <span className="material-symbols-outlined font-black">play_arrow</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ── 전체 퀘스트 리스트 ── */}
        <div>
          <div className="flex items-center justify-between px-1 mb-5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {selectedCategory}
              <span className="text-primary opacity-60 ml-2">[{filteredScenarios.length}]</span>
            </h3>
            <div className="h-px bg-white/5 flex-1 ml-4"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">All Quests</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {filteredScenarios.map(scenario => {
              const meta = getQuestMeta(scenario.intensity);
              const isCleared = completedIds.has(scenario.id);
              const catIcon = getCategoryIcon(scenario.category);

              return (
                <div
                  key={scenario.id}
                  onClick={() => navigate('/setup', { state: { scenario } })}
                  className="relative quest-pin rounded-[1.5rem] border cursor-pointer group transition-all duration-300 overflow-visible hover:scale-[1.02] hover:-translate-y-1"
                  style={{
                    backgroundColor: 'rgba(15,23,41,0.9)',
                    borderColor: isCleared ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)',
                    marginTop: '8px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 32px ${meta.gradeBg}, 0 0 20px ${meta.gradeBg}`; e.currentTarget.style.borderColor = meta.gradeBorder; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = isCleared ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'; }}
                >
                  {/* CLEARED 스탬프 */}
                  {isCleared && (
                    <div className="absolute inset-0 rounded-[1.5rem] bg-black/50 z-10 flex items-center justify-center pointer-events-none">
                      <div className="rotate-[-12deg] border-[3px] border-accent-green/70 rounded-lg px-5 py-2 animate-stamp-in" style={{ animation: 'stamp-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                        <p className="text-accent-green font-black text-lg tracking-[0.3em] uppercase" style={{ textShadow: '0 0 12px rgba(16,185,129,0.5)' }}>Cleared</p>
                      </div>
                    </div>
                  )}

                  {/* 카드 내부 */}
                  <div className="p-5">
                    {/* 상단: 등급 + 난이도 별 */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest"
                          style={{ color: meta.gradeColor, backgroundColor: meta.gradeBg, border: `1px solid ${meta.gradeBorder}` }}
                        >
                          {meta.grade}등급
                        </span>
                        <div
                          className="size-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: meta.gradeBg }}
                        >
                          <span className="material-symbols-outlined text-sm" style={{ color: meta.gradeColor }}>{catIcon}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <span key={i} className="text-xs leading-none" style={{ color: i < meta.stars ? meta.gradeColor : 'rgba(255,255,255,0.1)' }}>★</span>
                        ))}
                      </div>
                    </div>

                    {/* 퀘스트 제목 */}
                    <h3 className="text-[15px] font-black text-white mb-1.5 group-hover:text-primary transition-colors leading-tight">
                      {scenario.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium mb-4">
                      {scenario.description}
                    </p>

                    {/* 팀원 정보 + 보상 */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={getCharacterAvatar(scenario.memberName, scenario.id)}
                          alt={scenario.memberName}
                          className="size-8 rounded-xl bg-slate-700 border border-white/10"
                        />
                        <div>
                          <span className="text-[10px] font-bold text-slate-300 block leading-tight">{scenario.memberName}</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{scenario.generation}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: meta.gradeBg, border: `1px solid ${meta.gradeBorder}` }}>
                        <span className="material-symbols-outlined text-[10px]" style={{ color: meta.gradeColor }}>bolt</span>
                        <span className="text-[9px] font-black" style={{ color: meta.gradeColor }}>+{meta.xp} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredScenarios.length === 0 && (
            <div className="py-24 text-center">
              <div className="size-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20 animate-pulse">
                <span className="material-symbols-outlined text-4xl text-primary/40">lock</span>
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">새로운 퀘스트 개방 중...</p>
              <p className="text-[11px] text-slate-600 font-medium">다른 등급의 퀘스트를 먼저 클리어하면 잠금이 해제됩니다.</p>
              <div className="mt-6 flex items-center justify-center gap-1">
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} className="size-2 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Missions;
