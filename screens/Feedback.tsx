
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { createGeminiClient } from '../src/lib/geminiClient';

interface EvaluationData {
  summary: string;
  strengths: { title: string; desc: string }[];
  improvements: { title: string; desc: string }[];
  modelAnswers: { situation: string; bestResponse: string; why: string }[];
  theoryInsight: { 
    theoryName: string; 
    scienceBase: string; 
    practicalApply: string; 
  };
  actionItems: string[];
  coachingSkills: {
    empathyExpression: number;
    questionSkill: number;
    emotionControl: number;
    activeListening: number;
    actionGuidance: number;
  };
  metrics: {
    sbiScore: number;
    empathyIndex: number;
    outcomeSuccess: number;
  };
  radarChart: {
    trust: number;
    motivation: number;
    conflict: number;
    decision: number;
    strategy: number;
  };
}

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { transcript, scenario, sosTipHistory } = location.state || {};
  
  const [isAnalysing, setIsAnalysing] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWithRetry = async (fn: () => Promise<any>, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        console.error(`Attempt ${i + 1} failed:`, err);
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const performEvaluation = async () => {
    if (!transcript || transcript.length === 0) { 
      navigate('/'); 
      return; 
    }
    
    setIsAnalysing(true);
    setError(null);

    try {
      const ai = createGeminiClient();
      const prompt = `
        당신은 대한민국 최고의 리더십 코치입니다. 리더를 위한 시뮬레이션 결과 리포트를 생성하세요.

        대화 기록: ${JSON.stringify(transcript)}
        시나리오: ${scenario?.title} - ${scenario?.description}

        [절대 준수 사항 - 어길 시 시스템 오류로 간주함]
        1. 모든 필드(제목, 설명, 요약 등)는 100% 한국어로만 작성하세요.
        2. 영어를 단 한 단어도 사용하지 마세요. (예: 'Directness' -> '직설적 소통', 'Fairness' -> '공정성' 등으로 번역)
        3. 'Wait', 'Refining', 'Reasoning', 'Okay' 같은 당신의 내부 사고 과정이나 사설을 절대 출력 결과에 포함하지 마세요. 오직 리더를 위한 최종 조언만 담으세요.
        4. '잘한 점(strengths)'과 '개선점(improvements)'은 각각 명확한 제목(title)과 2문장 내의 정제된 한국어 설명(desc)으로 작성하세요.
        5. 이론 명칭(theoryName)은 반드시 한국어 명칭으로만 작성하세요. (예: '심리적 안전감', '자기결정성 이론' 등)
        6. 이론 설명(scienceBase)은 학술적 용어를 배제하고 2문장 이내로 매우 간결하게 한국어로 작성하세요.
        7. 현업 적용 가이드(practicalApply)는 리더가 내일 당장 사무실에서 실천할 수 있는 1개의 구체적 행동 지침을 한국어로 작성하세요.
        8. 모든 결과는 지정된 JSON 스키마를 엄격히 따르며, JSON 데이터 외의 텍스트는 출력하지 마세요.

        [구체성 강화 규칙 - 매우 중요]
        9. 강점과 개선점 분석 시, 반드시 사용자의 실제 발화를 직접 인용("..." 형태)하여 근거를 제시하세요.
           - 좋은 예: "팀장님이 '그 부분이 힘들었겠네요'라고 말한 부분에서 공감 능력이 돋보였습니다."
           - 나쁜 예: "공감 능력이 좋습니다." (근거 없이 일반적)
        10. 모범 스크립트(modelAnswers)의 situation 필드에는 사용자가 실제로 했던 발화를 인용하고, bestResponse에서 그 상황에서의 더 나은 대안을 제시하세요.
        11. summary는 이 리더만의 고유한 대화 패턴을 짚어주세요. "전반적으로 잘했다" 같은 일반적 평가는 금지합니다.
        12. coachingSkills 점수는 대화 기록에서 관찰된 구체적 행동 빈도와 질을 기준으로 0~100 사이로 채점하세요.
      `;

      const response = await fetchWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          // Gemini 3 Pro 모델에서 thinkingBudget: 0 설정 시 발생하는 오류를 방지하기 위해 thinkingConfig를 제거하거나 모델이 스스로 결정하게 둠
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              strengths: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { 
                    title: { type: Type.STRING }, 
                    desc: { type: Type.STRING } 
                  },
                  required: ['title', 'desc']
                }
              },
              improvements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { 
                    title: { type: Type.STRING }, 
                    desc: { type: Type.STRING } 
                  },
                  required: ['title', 'desc']
                }
              },
              modelAnswers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    situation: { type: Type.STRING },
                    bestResponse: { type: Type.STRING },
                    why: { type: Type.STRING }
                  },
                  required: ['situation', 'bestResponse', 'why']
                }
              },
              theoryInsight: {
                type: Type.OBJECT,
                properties: {
                  theoryName: { type: Type.STRING },
                  scienceBase: { type: Type.STRING },
                  practicalApply: { type: Type.STRING }
                },
                required: ['theoryName', 'scienceBase', 'practicalApply']
              },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              coachingSkills: {
                type: Type.OBJECT,
                properties: {
                  empathyExpression: { type: Type.INTEGER },
                  questionSkill: { type: Type.INTEGER },
                  emotionControl: { type: Type.INTEGER },
                  activeListening: { type: Type.INTEGER },
                  actionGuidance: { type: Type.INTEGER }
                },
                required: ['empathyExpression', 'questionSkill', 'emotionControl', 'activeListening', 'actionGuidance']
              },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  sbiScore: { type: Type.INTEGER },
                  empathyIndex: { type: Type.INTEGER },
                  outcomeSuccess: { type: Type.INTEGER }
                }
              },
              radarChart: {
                type: Type.OBJECT,
                properties: {
                  trust: { type: Type.INTEGER },
                  motivation: { type: Type.INTEGER },
                  conflict: { type: Type.INTEGER },
                  decision: { type: Type.INTEGER },
                  strategy: { type: Type.INTEGER }
                }
              }
            },
            required: ['summary', 'strengths', 'improvements', 'modelAnswers', 'theoryInsight', 'actionItems', 'coachingSkills', 'metrics', 'radarChart']
          }
        }
      }));

      const text = response.text;
      if (!text) {
        throw new Error("AI 엔진으로부터 응답을 받지 못했습니다.");
      }

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const evalResult: EvaluationData = JSON.parse(cleanJson);
      setEvaluation(evalResult);

      const historyItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        scenarioTitle: scenario?.title || '자율 시뮬레이션',
        memberName: scenario?.memberName || '팀원',
        transcript: transcript,
        evaluation: evalResult,
        scenario: scenario,
        sosTipHistory: sosTipHistory || [],
        memo: '',
        tags: [] as string[]
      };
      const existing = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
      localStorage.setItem('leadershigh_history', JSON.stringify([historyItem, ...existing]));

    } catch (err: any) {
      console.error("Critical Evaluation Error:", err);
      setError(`심층 리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`);
    } finally {
      setIsAnalysing(false);
    }
  };

  useEffect(() => {
    performEvaluation();
  }, [transcript]);

  if (isAnalysing) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center font-manrope">
        <div className="size-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-10 shadow-neon-cyan"></div>
        <h2 className="text-xl font-black text-gray-900 mb-4 italic uppercase tracking-widest animate-pulse">Analysing Performance...</h2>
        <p className="text-gray-500 text-sm max-w-xs leading-relaxed font-medium">데이터를 분석하여 리더님만의 정밀 리포트를 생성하고 있습니다.</p>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center font-manrope">
        <span className="material-symbols-outlined text-red-500 text-6xl mb-6">error</span>
        <h2 className="text-sm font-bold text-gray-900 mb-6 leading-relaxed max-w-sm">{error || "리포트 데이터를 불러올 수 없습니다."}</h2>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={performEvaluation} 
            className="w-full px-8 py-4 bg-primary text-navy-deep font-black rounded-2xl shadow-neon-cyan active:scale-95 transition-all"
          >
            다시 시도하기
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="w-full px-8 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 text-gray-900 font-manrope pb-32 hide-scrollbar">
      <header className="p-5 bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="text-center">
          <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">ANALYSIS REPORT</h2>
          <p className="text-sm font-bold">리더십 정밀 분석 리포트</p>
        </div>
        <div className="size-10"></div>
      </header>

      <main className="p-6 space-y-12 lg:max-w-4xl lg:mx-auto">
        {/* 요약 카드 */}
        <section className="bg-gradient-to-br from-gray-50 to-white border border-primary/30 p-10 rounded-[3.5rem] shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <span className="material-symbols-outlined text-9xl text-primary">verified_user</span>
          </div>
          <p className="text-2xl font-black leading-[1.6] text-gray-900 italic tracking-tight">"{evaluation.summary}"</p>
          <div className="grid grid-cols-3 gap-6 mt-12 border-t border-gray-200 pt-10">
              {[
                { label: '공감도', value: evaluation.metrics.empathyIndex, color: 'bg-primary' },
                { label: '전달력', value: evaluation.metrics.sbiScore, color: 'bg-accent-neon' },
                { label: '성공률', value: evaluation.metrics.outcomeSuccess, color: 'bg-accent-amber' }
              ].map((m, i) => (
                <div key={i} className="text-center group">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3">{m.label}</p>
                  <div className="text-3xl font-black italic mb-3 tracking-tighter">{m.value}%</div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} shadow-neon-cyan transition-all duration-1000`} style={{ width: `${m.value}%` }}></div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* 잘한 점 & 개선점 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <section className="bg-navy-card p-8 rounded-[3rem] border border-primary/20">
              <h3 className="text-primary font-black text-[11px] uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">thumb_up</span> 잘한 점
              </h3>
              <div className="space-y-8">
                {evaluation.strengths.map((s, i) => (
                  <div key={i}>
                    <h4 className="text-base font-black text-gray-900 mb-2">{s.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                ))}
              </div>
           </section>
           <section className="bg-navy-card p-8 rounded-[3rem] border border-red-500/20">
              <h3 className="text-red-400 font-black text-[11px] uppercase tracking-widest mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span> 개선점
              </h3>
              <div className="space-y-8">
                {evaluation.improvements.map((s, i) => (
                  <div key={i}>
                    <h4 className="text-base font-black text-gray-900 mb-2">{s.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                ))}
              </div>
           </section>
        </div>

        {/* 코칭 역량 점수 */}
        {evaluation.coachingSkills && (
          <section className="bg-navy-card p-8 rounded-[3rem] border border-gray-200">
            <h3 className="text-gray-900 font-black text-[11px] uppercase tracking-widest mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">psychology</span> 코칭 역량 상세 분석
            </h3>
            <div className="space-y-5">
              {[
                { key: 'empathyExpression', label: '공감 표현', icon: 'favorite', color: 'bg-pink-500' },
                { key: 'questionSkill', label: '질문 기술', icon: 'help', color: 'bg-blue-500' },
                { key: 'emotionControl', label: '감정 조절', icon: 'balance', color: 'bg-purple-500' },
                { key: 'activeListening', label: '경청력', icon: 'hearing', color: 'bg-green-500' },
                { key: 'actionGuidance', label: '행동 유도', icon: 'trending_up', color: 'bg-amber-500' },
              ].map((skill) => {
                const value = (evaluation.coachingSkills as any)[skill.key] || 0;
                return (
                  <div key={skill.key} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <span className="material-symbols-outlined text-gray-500 text-sm">{skill.icon}</span>
                      <span className="text-xs font-bold text-gray-600">{skill.label}</span>
                    </div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${skill.color} rounded-full transition-all duration-1000`} style={{ width: `${value}%` }}></div>
                    </div>
                    <span className="text-sm font-black text-gray-900 w-12 text-right">{value}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 골든 스크립트 — 사용자 vs 모범 비교 */}
        <section className="space-y-6">
            <h3 className="text-xl font-black tracking-tight px-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-accent-amber">crown</span> 스크립트 비교 분석
            </h3>
            <div className="space-y-6">
                {evaluation.modelAnswers.map((item, idx) => (
                    <div key={idx} className="bg-[#1C1F26] border border-accent-amber/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
                        {/* 상황 설명 */}
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                              <span className="material-symbols-outlined text-[10px] align-middle mr-1">replay</span>
                              상황 리플레이
                            </p>
                            <p className="text-sm text-gray-600 italic font-medium">"{item.situation}"</p>
                        </div>

                        {/* 비교 레이아웃 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {/* 사용자 실제 발화 */}
                          <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-outlined text-red-400 text-sm">person</span>
                              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">나의 발화</p>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">"{item.situation}"</p>
                          </div>

                          {/* 모범 답변 */}
                          <div className="bg-accent-amber/5 border border-accent-amber/20 p-5 rounded-2xl">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-outlined text-accent-amber text-sm">auto_awesome</span>
                              <p className="text-[10px] font-black text-accent-amber uppercase tracking-widest">추천 답변</p>
                            </div>
                            <p className="text-sm text-gray-900 font-bold leading-relaxed">"{item.bestResponse}"</p>
                          </div>
                        </div>

                        {/* 개선 포인트 */}
                        <div className="bg-gray-100 p-4 rounded-xl flex gap-3 items-start">
                          <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0">lightbulb</span>
                          <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.why}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* 과학적 분석 및 현업 적용 가이드 */}
        <section className="bg-gray-50 border border-gray-200 p-10 rounded-[3.5rem] shadow-card relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-9xl text-accent-neon">psychology</span>
           </div>
           
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-10">Leadership Insight</h3>
           
           <div className="space-y-10 relative z-10">
              <div className="border-l-2 border-primary/30 pl-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-primary font-black text-[10px] uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 italic">
                    이론 근거: {evaluation.theoryInsight.theoryName}
                  </span>
                </div>
                <p className="text-[16px] text-gray-700 font-bold leading-relaxed mb-10">
                  {evaluation.theoryInsight.scienceBase}
                </p>
                
                <div className="bg-gradient-to-br from-primary/5 to-white p-8 rounded-[2.5rem] border border-accent-neon/30 shadow-neon-cyan/20">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="size-8 rounded-lg bg-accent-neon/20 flex items-center justify-center text-accent-neon border border-accent-neon/30">
                        <span className="material-symbols-outlined text-lg font-black">bolt</span>
                     </div>
                     <p className="text-[12px] font-black text-accent-neon uppercase tracking-[0.2em]">현업 적용 가이드</p>
                  </div>
                  <p className="text-base text-gray-900 font-black leading-relaxed italic">
                    "{evaluation.theoryInsight.practicalApply}"
                  </p>
                </div>
              </div>
           </div>
        </section>

        <div className="pt-8">
          <button 
            onClick={() => navigate('/')} 
            className="w-full bg-primary text-navy-deep py-7 rounded-[2rem] font-black shadow-neon-cyan active:scale-[0.98] transition-all text-sm uppercase tracking-[0.3em]"
          >
            분석 완료 및 대시보드 복귀
          </button>
        </div>
      </main>
    </div>
  );
};

export default Feedback;
