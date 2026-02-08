
import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { SCENARIOS, CATEGORIES } from '../constants';
import { DataService } from '../services/dataService';
import { GoogleGenAI } from "@google/genai";
import { Scenario } from '../types';

const Missions: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [recommendation, setRecommendation] = useState<{scenario: Scenario, reason: string} | null>(null);

  const fetchWithRetry = async (ai: any, prompt: string, retries = 2) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { 
            temperature: 0.7 
          }
        });
        return response.text;
      } catch (error: any) {
        if (i === retries - 1) throw error;
        // 429 Error (Too Many Requests) - 지수 백오프 적용
        if (error.status === 429) {
          const delay = Math.pow(2, i + 1) * 1500; // 좀 더 긴 대기 시간
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  };

  useEffect(() => {
    const fetchRecommendation = async () => {
      // 캐시 확인: 동일 세션 내에서는 반복적인 API 호출 방지 (429 예방)
      const cached = sessionStorage.getItem('leadershigh_daily_rec');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // 실제 시나리오 객체와 매칭 (참조 무결성 유지)
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
        const candidateScenarios = SCENARIOS.filter(s => s.category === weakAreaInfo.category);
        const targetScenario = candidateScenarios[Math.floor(Math.random() * candidateScenarios.length)] || SCENARIOS[0];
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          리더십 코칭 시스템입니다. 
          현재 리더의 취약 역량은 '${weakAreaInfo.area}'이며, 추천 미션은 '${targetScenario.title}'입니다.
          이 미션이 왜 리더님에게 필요한지, 심리학적 관점을 살짝 섞어서 아주 쉽고 다정한 말투로 딱 2문장으로 설명해주세요.
          "리더님, ~입니다" 형식을 사용하세요.
        `;

        const reason = await fetchWithRetry(ai, prompt);

        if (reason) {
          const recData = { scenario: targetScenario, reason };
          setRecommendation(recData);
          // 세션 스토리지에 캐싱하여 429 에러 방지
          sessionStorage.setItem('leadershigh_daily_rec', JSON.stringify({
            scenarioId: targetScenario.id,
            reason: reason
          }));
        }
      } catch (error) {
        console.warn("AI 추천 엔진 일시적 사용 불가 (429 또는 네트워크 오류). 로컬 엔진으로 전환합니다.");
        const weakAreaInfo = DataService.getWeakestAreaInfo();
        const candidateScenarios = SCENARIOS.filter(s => s.category === weakAreaInfo.category);
        const targetScenario = candidateScenarios[Math.floor(Math.random() * candidateScenarios.length)] || SCENARIOS[0];
        
        const fallbackReasons = [
          "리더님의 최근 역량 데이터를 분석해보니 이 미션이 성장에 가장 큰 돌파구가 될 것 같아요. 함께 도전해볼까요?",
          "지금 리더님께 꼭 필요한 맞춤형 훈련 상황을 준비했습니다. 부담 없이 대화를 시작해보세요!",
          "팀원과의 신뢰 관계를 한 단계 더 높일 수 있는 최적의 시나리오를 골라왔습니다."
        ];
        
        setRecommendation({
          scenario: targetScenario,
          reason: fallbackReasons[Math.floor(Math.random() * fallbackReasons.length)]
        });
      } finally {
        setIsAnalysing(false);
      }
    };

    fetchRecommendation();
  }, []);

  const filteredScenarios = useMemo(() => {
    if (selectedCategory === '전체') return SCENARIOS;
    return SCENARIOS.filter(s => s.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-[#0A0F1D] text-white font-manrope">
      {/* Header */}
      <header className="flex flex-col p-5 gap-5 border-b border-white/5 bg-[#0A0F1D]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-neon-cyan">
              <span className="material-symbols-outlined text-primary text-xl">target</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">미션 보드</h2>
          </div>
          <button className="size-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
        
        {/* Category Chips */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border uppercase tracking-widest ${
                selectedCategory === cat 
                  ? 'bg-primary text-navy-deep border-primary shadow-[0_0_15px_rgba(0,242,255,0.4)]' 
                  : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main List */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32 px-5 pt-6 space-y-8">
        
        {/* AI Smart Recommendation Section */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 mb-4 px-1">
                <span className="material-symbols-outlined text-primary text-sm font-bold">auto_awesome</span>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">나를 위한 인공지능 추천</h3>
            </div>
            
            {isAnalysing ? (
                <div className="bg-navy-card border border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="size-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">맞춤형 미션 분석 중...</p>
                </div>
            ) : recommendation && (
                <div 
                    onClick={() => navigate('/setup', { state: { scenario: recommendation.scenario } })}
                    className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] border border-primary/30 p-8 rounded-[3rem] shadow-2xl group cursor-pointer hover:border-primary transition-all relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-8xl text-primary">psychology</span>
                    </div>
                    
                    <div className="flex items-start justify-between mb-6">
                        <span className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                            {recommendation.scenario.category} • 추천 미션
                        </span>
                        <div className="flex items-center gap-1.5 bg-accent-neon/10 px-2.5 py-1 rounded-full border border-accent-neon/20">
                            <div className="size-1.5 bg-accent-neon rounded-full animate-pulse shadow-neon-cyan"></div>
                            <span className="text-[8px] font-black text-accent-neon uppercase">필수 코스</span>
                        </div>
                    </div>

                    <h4 className="text-2xl font-black mb-3 text-white group-hover:text-primary transition-colors leading-tight">
                        {recommendation.scenario.title}
                    </h4>
                    
                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl mb-6">
                        <p className="text-[13px] text-slate-300 font-medium leading-[1.7] italic">
                            "{recommendation.reason}"
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl overflow-hidden border border-white/10">
                            <img 
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(recommendation.scenario.memberName)}&background=00F2FF&color=0A0F1D`} 
                                alt={recommendation.scenario.memberName} 
                                className="size-full object-cover" 
                            />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">{recommendation.scenario.memberName} 매니저</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{recommendation.scenario.generation}</p>
                        </div>
                        <button className="ml-auto size-12 bg-primary text-navy-deep rounded-2xl flex items-center justify-center shadow-neon-cyan active:scale-90 transition-all">
                            <span className="material-symbols-outlined font-black">play_arrow</span>
                        </button>
                    </div>
                </div>
            )}
        </section>

        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {selectedCategory} <span className="text-primary opacity-60 ml-1">[{filteredScenarios.length}]</span>
          </h3>
          <div className="h-px bg-white/5 flex-1 ml-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScenarios.map(scenario => (
            <div
              key={scenario.id}
              onClick={() => navigate('/setup', { state: { scenario } })}
              className="flex gap-5 p-5 bg-navy-card rounded-[2rem] border border-white/5 shadow-2xl cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98] group relative overflow-hidden"
            >
              {/* Card Accent Decor */}
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-5xl">
                  {scenario.category === '성과 관리' ? 'trending_up' : 
                   scenario.category === '갈등 해결' ? 'forum' :
                   scenario.category === '동기 부여' ? 'bolt' : 'psychology'}
                </span>
              </div>

              <div className="size-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {scenario.category === '성과 관리' ? 'monitoring' : 
                   scenario.category === '갈등 해결' ? 'diversity_3' :
                   scenario.category === '동기 부여' ? 'local_fire_department' : 'neurology'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate pr-2">{scenario.title}</h3>
                </div>
                <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                  {scenario.description}
                </p>
                
                <div className="mt-4 flex items-center gap-3">
                   <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      <span className="material-symbols-outlined text-[10px] text-primary">person</span>
                      <span className="text-[10px] font-bold text-slate-300">{scenario.memberName}</span>
                   </div>
                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{scenario.generation}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredScenarios.length === 0 && (
          <div className="py-24 text-center">
            <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
              <span className="material-symbols-outlined text-4xl text-slate-700">folder_open</span>
            </div>
            <p className="text-slate-500 text-sm font-medium tracking-tight">해당 카테고리의 시나리오가 준비 중입니다.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Missions;
