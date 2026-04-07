
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { createGeminiClient } from '../src/lib/geminiClient';
import { getCharacterAvatar, getCharacterInfo, getAvatarGlowColor } from '../services/characterAvatars';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { analyticsService } from '../services/analyticsService';
import ShareCard from '../components/ShareCard';
import { SCENARIOS } from '../constants';

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

const getRank = (v: number) => {
  if (v >= 90) return { rank: 'S', cls: 'rank-s' };
  if (v >= 75) return { rank: 'A', cls: 'rank-a' };
  if (v >= 60) return { rank: 'B', cls: 'rank-b' };
  if (v >= 40) return { rank: 'C', cls: 'rank-c' };
  return { rank: 'D', cls: 'rank-d' };
};

const FREE_SCENARIOS = ['late-comer', 'boundaries', 'team-clash'];

const Feedback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { transcript, scenario, sosTipHistory } = location.state || {};
  const isPaidPlan = profile?.plan !== 'free';

  const [isFullReport, setIsFullReport] = useState(isPaidPlan);
  const [isAnalysing, setIsAnalysing] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const charInfo = getCharacterInfo(scenario?.id, scenario?.memberName);
  const avatarUrl = getCharacterAvatar(scenario?.memberName || '팀원', scenario?.id);

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
      const briefPromptSuffix = !isFullReport ? `
        [간략 리포트 모드]
        무료 플랜 사용자입니다. 간략 리포트만 생성하세요:
        - summary: 3문장 이내로 핵심만 요약
        - strengths: 최대 1개만
        - improvements: 최대 1개만
        - modelAnswers: 가장 중요한 상황 1개만
        - scienceInsight: null 대신 빈 객체 생성 (theoryName, scienceBase, practicalApply 모두 빈 문자열)
        - coachingSkills: 기본값으로 모두 50
        - radarChart: 기본값으로 모두 50
        - 풀 리포트는 프로 플랜에서 이용 가능합니다.
      ` : '';

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
        13. leadershipType은 대화 패턴을 분석하여 다음 4가지 중 하나를 정확히 선택하세요:
            - "coaching": 질문과 경청 중심으로 팀원의 생각을 이끌어내는 스타일
            - "directing": 명확한 지시와 기준 제시 중심 스타일
            - "delegating": 팀원에게 자율성을 부여하고 신뢰하는 스타일
            - "participating": 함께 논의하고 의견을 구하는 스타일
        14. communicationPattern은 사용자의 전체 발화를 분석하여 각 비율을 0~100으로 채점하세요 (합계 100):
            - questionRatio: 질문형 발화의 비율
            - empathyRatio: 공감/이해 표현의 비율
            - directiveRatio: 지시/명령/요청의 비율
            - listeningRatio: 반영/요약/확인의 비율
        ${briefPromptSuffix}
      `;

      const response = await fetchWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
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
              },
              leadershipType: { type: Type.STRING },
              communicationPattern: {
                type: Type.OBJECT,
                properties: {
                  questionRatio: { type: Type.NUMBER },
                  empathyRatio: { type: Type.NUMBER },
                  directiveRatio: { type: Type.NUMBER },
                  listeningRatio: { type: Type.NUMBER },
                },
                required: ['questionRatio', 'empathyRatio', 'directiveRatio', 'listeningRatio']
              }
            },
            required: ['summary', 'strengths', 'improvements', 'modelAnswers', 'theoryInsight', 'actionItems', 'coachingSkills', 'metrics', 'radarChart', 'leadershipType', 'communicationPattern']
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
      analyticsService.track('report_view', { scenario_id: scenario?.id, is_full: isFullReport }, user?.id);

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

      // DB 저장 (인증된 사용자) — 최신 피드백으로 가장 최근 레코드 업데이트
      if (user) {
        const recentHistory = await dbService.getHistory(user.id, 1);
        if (recentHistory.length > 0) {
          const latest = recentHistory[0];
          await dbService.saveSimulation({
            ...latest,
            feedback: evalResult as unknown as Record<string, unknown>,
            coaching_skills: evalResult.coachingSkills as unknown as Record<string, number>,
            radar_chart: evalResult.radarChart as unknown as Record<string, number>,
            leadership_type: (evalResult as any).leadershipType || null,
            communication_pattern: (evalResult as any).communicationPattern || null,
          }).catch(() => {});
        }
      }

      // localStorage 폴백 (비인증 또는 백업)
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

  // ── 로딩 화면: 대화 결과 분석 중 ──
  if (isAnalysing) {
    return (
      <div className="min-h-[100dvh] bg-[#060B18] command-center-bg flex flex-col items-center justify-center p-8 text-center font-manrope relative overflow-hidden">
        {/* 스캔 라인 */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,242,255,0.03) 2px, rgba(0,242,255,0.03) 4px)' }} />

        {/* 아바타 + 스캔 이펙트 */}
        <div className="relative mb-10">
          <div className="size-28 rounded-full overflow-hidden border-2 border-primary/40 animate-pulse" style={{ boxShadow: '0 0 30px rgba(0,242,255,0.4), 0 0 60px rgba(0,242,255,0.15)' }}>
            <img src={avatarUrl} alt={charInfo.name} className="size-full object-cover bg-navy-card" />
          </div>
          <div className="absolute inset-0 rounded-full animate-hologram-scan opacity-50" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary/20 border border-primary/30 px-3 py-1 rounded-full">
            <span className="text-primary text-[9px] font-black uppercase tracking-widest">Analyzing</span>
          </div>
        </div>

        <h2 className="text-xl font-black text-white mb-3 uppercase tracking-[0.2em]" style={{ textShadow: '0 0 20px rgba(0,242,255,0.5)' }}>
          대화 결과를 분석하고 있습니다
        </h2>
        <p className="text-slate-500 text-xs max-w-xs leading-relaxed font-medium mb-8">
          {charInfo.name} {charInfo.role}와의 대화를 바탕으로 바로 적용할 수 있는 피드백을 정리하고 있습니다.
        </p>
        <div className="flex items-center gap-1.5">
          {[0, 0.15, 0.3, 0.45].map((d, i) => (
            <div key={i} className="size-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── 에러 화면 ──
  if (error || !evaluation) {
    return (
      <div className="min-h-[100dvh] bg-[#060B18] command-center-bg flex flex-col items-center justify-center p-8 text-center font-manrope">
        <div className="size-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
        </div>
        <h2 className="text-sm font-bold text-white mb-2 leading-relaxed max-w-sm">{error || "리포트 데이터를 불러올 수 없습니다."}</h2>
        <p className="text-xs text-slate-500 mb-8">시스템 오류가 발생했습니다. 재시도해주세요.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={performEvaluation}
            className="w-full px-8 py-4 bg-primary text-navy-deep font-black rounded-2xl shadow-neon-cyan active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            재시도
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full px-8 py-4 bg-white/5 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all text-sm"
          >
            기지 복귀
          </button>
        </div>
      </div>
    );
  }

  // ── 전체 평균 점수 계산 ──
  const avgScore = Math.round(
    (evaluation.metrics.empathyIndex + evaluation.metrics.sbiScore + evaluation.metrics.outcomeSuccess) / 3
  );
  const overallRank = getRank(avgScore);

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#060B18] command-center-bg text-white font-manrope pb-[calc(128px+env(safe-area-inset-bottom))] hide-scrollbar">

      {/* ── 무료 플랜 간략 리포트 안내 ── */}
      {!isFullReport && user && (
        <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border-b border-amber-500/20 px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-amber-400 text-xs font-semibold">간략 리포트입니다</p>
            <button onClick={() => navigate('/pricing')} className="px-3 py-1 rounded-lg bg-white/5 text-slate-400 text-[10px] font-bold hover:bg-white/10 transition-colors">
              프로 플랜 보기
            </button>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            먼저 간략 리포트에서 핵심을 확인하고, 더 자세한 분석이나 반복 훈련이 필요할 때만 확장하세요.
          </p>
        </div>
      )}

      {/* ── 게스트: 체험 리포트 안내 배너 ── */}
      {!user && (
        <div className="bg-gradient-to-r from-amber-500/10 to-primary/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between">
          <p className="text-amber-400 text-xs font-semibold">체험 리포트 · 간략 버전</p>
          <span className="text-slate-500 text-[10px]">풀 리포트는 회원 전용</span>
        </div>
      )}

      {/* ── QUEST CLEAR 배너 ── */}
      <section className="relative py-16 px-6 text-center overflow-hidden">
        {/* 배경 글로우 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(0,242,255,0.3), transparent 70%)' }} />
        </div>

        {/* 상단 작은 태그 */}
        <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
          <span className="bg-primary/10 border border-primary/30 text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.3em]">
            {scenario?.category || '리더십 훈련'}
          </span>
        </div>

        {/* QUEST CLEAR */}
        <h1 className="relative z-10 text-5xl md:text-6xl font-black italic uppercase tracking-tight mb-4 animate-quest-clear"
          style={{ textShadow: '0 0 40px rgba(0,242,255,0.5), 0 0 80px rgba(0,242,255,0.2)' }}>
          <span className="text-primary">Quest</span> <span className="text-white">Clear!</span>
        </h1>

        {/* 퀘스트 이름 */}
        <p className="relative z-10 text-sm font-bold text-slate-400 mb-8">
          {scenario?.title || '시뮬레이션'} 완료
        </p>

        {/* 아바타 + 정보 */}
        <div className="relative z-10 flex items-center justify-center gap-4">
          <div className="size-16 rounded-xl overflow-hidden border-2 border-primary/40 shrink-0"
            style={{ boxShadow: '0 0 20px rgba(0,242,255,0.3)' }}>
            <img src={avatarUrl} alt={charInfo.name} className="size-full object-cover bg-navy-card" />
          </div>
          <div className="text-left">
            <p className="text-lg font-black">{charInfo.name} <span className="text-slate-500 text-xs font-medium">{charInfo.role}</span></p>
            <p className="text-xs text-slate-500 font-medium">{scenario?.description?.substring(0, 40)}...</p>
          </div>
        </div>

        {/* 종합 랭크 */}
        <div className="relative z-10 mt-8 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">종합 등급</span>
          <span className={`text-4xl font-black italic ${overallRank.cls}`}>{overallRank.rank}</span>
          <span className="text-sm font-bold text-slate-400">{avgScore}점</span>
        </div>

        {/* 리더십 유형 */}
        {(evaluation as any)?.leadershipType && (
          <div className="relative z-10 mt-4 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">리더십 유형</span>
            <span className="text-2xl">
              {(evaluation as any).leadershipType === 'coaching' ? '🎯' :
               (evaluation as any).leadershipType === 'directing' ? '📋' :
               (evaluation as any).leadershipType === 'delegating' ? '🤝' : '💬'}
            </span>
            <span className="text-sm font-bold text-white">
              {(evaluation as any).leadershipType === 'coaching' ? '코칭형' :
               (evaluation as any).leadershipType === 'directing' ? '지시형' :
               (evaluation as any).leadershipType === 'delegating' ? '위임형' : '참여형'}
            </span>
          </div>
        )}
      </section>

      <main className="px-6 space-y-10 lg:max-w-4xl lg:mx-auto">

        {/* ── 사령관 브리핑 (Summary) ── */}
        <section className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] border border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-8xl text-primary">verified_user</span>
          </div>
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-xs">description</span>
            대화 요약
          </h3>
          <p className="text-lg font-bold leading-[1.8] text-white/90 italic">"{evaluation.summary}"</p>

          {/* 3대 지표 XP바 */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
            {[
              { label: '공감도', value: evaluation.metrics.empathyIndex, icon: 'favorite', color: 'bg-pink-500', glow: 'rgba(236,72,153,0.5)' },
              { label: '전달력', value: evaluation.metrics.sbiScore, icon: 'record_voice_over', color: 'bg-blue-500', glow: 'rgba(59,130,246,0.5)' },
              { label: '성공률', value: evaluation.metrics.outcomeSuccess, icon: 'emoji_events', color: 'bg-amber-500', glow: 'rgba(245,158,11,0.5)' }
            ].map((m, i) => {
              const r = getRank(m.value);
              return (
                <div key={i} className="text-center">
                  <span className="material-symbols-outlined text-lg text-slate-500 mb-1 block">{m.icon}</span>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">{m.label}</p>
                  <div className="text-2xl font-black italic mb-2">{m.value}<span className="text-sm text-slate-600">%</span></div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`}
                      style={{ width: `${m.value}%`, boxShadow: `0 0 8px ${m.glow}`, animation: 'count-up-bar 1.5s ease-out' }} />
                  </div>
                  <span className={`text-[10px] font-black italic mt-1 block ${r.cls}`}>{r.rank}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 크리티컬 히트 / 데미지 리포트 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 잘한 점 → 크리티컬 히트 */}
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-emerald-500/20 battle-card-glow transition-all duration-300">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-6 flex items-center gap-2 text-emerald-400">
              <span className="size-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">bolt</span>
              </span>
              잘한 점
            </h3>
            <div className="space-y-5">
              {evaluation.strengths.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-7 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white mb-1">{s.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 개선점 → 데미지 리포트 */}
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-red-500/20 battle-card-glow transition-all duration-300">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-6 flex items-center gap-2 text-red-400">
              <span className="size-7 rounded-lg bg-red-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">heart_broken</span>
              </span>
              개선할 점
            </h3>
            <div className="space-y-5">
              {evaluation.improvements.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-7 shrink-0 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-[10px] font-black border border-red-500/20">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white mb-1">{s.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── SKILL STATUS (코칭 역량) ── */}
        {evaluation.coachingSkills && (
          <section className="bg-navy-card p-8 rounded-[2.5rem] border border-white/10">
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] mb-7 flex items-center gap-2 text-white">
              <span className="size-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined text-sm">psychology</span>
              </span>
              코칭 역량 요약
            </h3>
            <div className="space-y-4">
              {[
                { key: 'empathyExpression', label: '공감 표현', icon: 'favorite', color: 'bg-pink-500', glow: 'rgba(236,72,153,0.4)' },
                { key: 'questionSkill', label: '질문 기술', icon: 'help', color: 'bg-blue-500', glow: 'rgba(59,130,246,0.4)' },
                { key: 'emotionControl', label: '감정 조절', icon: 'balance', color: 'bg-purple-500', glow: 'rgba(147,51,234,0.4)' },
                { key: 'activeListening', label: '경청력', icon: 'hearing', color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.4)' },
                { key: 'actionGuidance', label: '행동 유도', icon: 'trending_up', color: 'bg-amber-500', glow: 'rgba(245,158,11,0.4)' },
              ].map((skill) => {
                const value = (evaluation.coachingSkills as any)[skill.key] || 0;
                const r = getRank(value);
                return (
                  <div key={skill.key} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <div className="flex items-center gap-2 w-24 shrink-0">
                        <span className="material-symbols-outlined text-slate-500 text-sm">{skill.icon}</span>
                        <span className="text-[11px] font-bold text-slate-300">{skill.label}</span>
                      </div>
                      <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${skill.color} rounded-full`}
                          style={{ width: `${value}%`, boxShadow: `0 0 6px ${skill.glow}`, animation: 'count-up-bar 1.5s ease-out' }} />
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-end">
                        <span className="text-sm font-black text-white">{value}</span>
                        <span className={`text-xs font-black italic ${r.cls}`}>{r.rank}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 전문가 코칭 플레이북 (모범 답변 비교) ── */}
        <section className="space-y-5">
          <h3 className="text-lg font-black tracking-tight px-2 flex items-center gap-3">
            <span className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </span>
            전문가 코칭 플레이북
          </h3>
          <div className="space-y-5">
            {evaluation.modelAnswers.map((item, idx) => (
              <div key={idx} className="bg-[#1C1F26] border border-amber-500/15 p-6 rounded-[2rem] relative overflow-hidden battle-card-glow transition-all duration-300">
                {/* 상황 */}
                <div className="mb-5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">replay</span>
                    상황 리플레이
                  </p>
                  <p className="text-xs text-slate-300 italic font-medium leading-relaxed">"{item.situation}"</p>
                </div>

                {/* 비교 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {/* 나의 발화 */}
                  <div className="bg-red-500/5 border border-red-500/15 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-red-400 text-xs">person</span>
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">나의 발화</p>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">"{item.situation}"</p>
                  </div>

                  {/* 추천 답변 */}
                  <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-400 text-xs">auto_awesome</span>
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">추천 답변</p>
                    </div>
                    <p className="text-xs text-white font-bold leading-relaxed">"{item.bestResponse}"</p>
                  </div>
                </div>

                {/* 코치 코멘트 */}
                <div className="bg-white/5 p-3 rounded-xl flex gap-3 items-start">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0">lightbulb</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{item.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NEW SKILL UNLOCKED (이론 인사이트) ── */}
        <section className="bg-gradient-to-br from-[#0D1525] to-[#161D2F] border border-primary/30 p-8 rounded-[2.5rem] relative overflow-hidden animate-skill-unlock">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-8xl text-primary">auto_awesome</span>
          </div>

          {/* NEW SKILL 배너 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-primary text-xl">school</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-0.5">New Skill Unlocked</p>
              <p className="text-lg font-black text-white">{evaluation.theoryInsight.theoryName}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
            {evaluation.theoryInsight.scienceBase}
          </p>

          {/* 현업 적용 가이드 */}
          <div className="bg-[#0A0F1D]/60 p-5 rounded-2xl border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-7 rounded-lg bg-accent-neon/20 flex items-center justify-center text-accent-neon border border-accent-neon/20">
                <span className="material-symbols-outlined text-sm">bolt</span>
              </div>
              <p className="text-[10px] font-black text-accent-neon uppercase tracking-[0.2em]">현업 적용 가이드</p>
            </div>
            <p className="text-sm text-white font-bold leading-relaxed italic">
              "{evaluation.theoryInsight.practicalApply}"
            </p>
          </div>
        </section>

        {/* ── 액션 아이템 ── */}
        {evaluation.actionItems && evaluation.actionItems.length > 0 && (
          <section className="bg-navy-card p-7 rounded-[2.5rem] border border-white/10">
            <h3 className="font-black text-[11px] uppercase tracking-widest mb-5 flex items-center gap-2 text-white">
              <span className="size-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-sm">checklist</span>
              </span>
              오퍼레이션 목록
            </h3>
            <div className="space-y-3">
              {evaluation.actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="size-5 shrink-0 rounded bg-primary/10 flex items-center justify-center text-primary text-[9px] font-black mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{item}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 무료 플랜: 블러 처리된 풀 리포트 프리뷰 ── */}
        {!isFullReport && evaluation && (
          <section className="px-6 py-8">
            <div className="relative rounded-2xl border border-amber-500/20 overflow-hidden">
              {/* 블러 처리된 프리뷰 콘텐츠 */}
              <div className="p-6 filter blur-sm select-none pointer-events-none">
                <h3 className="text-lg font-bold text-white mb-4">모범 스크립트</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-800/40">
                    <p className="text-slate-400 text-sm">상황: "팀원이 방어적으로 반응할 때..."</p>
                    <p className="text-white text-sm mt-1">모범 답변: "그 부분이 걱정되셨을 수 있겠네요. 제가 이해한 게 맞는지..."</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40">
                    <p className="text-slate-400 text-sm">상황: "팀원이 침묵할 때..."</p>
                    <p className="text-white text-sm mt-1">모범 답변: "혹시 더 말씀하고 싶은 부분이 있으시면..."</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mt-6 mb-4">5차원 역량 레이더 차트</h3>
                <div className="h-48 bg-slate-800/40 rounded-xl flex items-center justify-center">
                  <span className="text-slate-500">레이더 차트 영역</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-6 mb-4">과학적 근거 분석</h3>
                <div className="p-3 rounded-xl bg-slate-800/40">
                  <p className="text-amber-400 text-sm font-semibold">심리적 안전감 이론</p>
                  <p className="text-slate-400 text-sm mt-1">에이미 에드먼드슨의 연구에 따르면...</p>
                </div>
              </div>

              {/* 오버레이 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="text-white font-bold text-lg mb-1">
                  {user ? '풀 리포트로 더 깊이 분석하세요' : '가입하면 전체 결과를 확인할 수 있어요'}
                </h4>
                <p className="text-slate-400 text-xs mb-4 text-center max-w-xs">
                  모범 스크립트, 5차원 역량 분석, 과학적 근거까지<br/>
                  {user ? '프로 플랜에서 확인하세요' : '무료 가입 후 바로 확인하세요'}
                </p>
                {user ? (
                  <button onClick={() => navigate('/pricing')} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm transition-colors">
                    프로 플랜 보기 →
                  </button>
                ) : (
                  <button onClick={() => navigate('/onboarding')} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm transition-colors">
                    무료 체험하기 →
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── 다음 도전 / RETURN TO BASE 버튼 ── */}
        <div className="pt-6 space-y-4">
          {/* 무료 플랜 사용자: 다음 시나리오 안내 */}
          {!isFullReport && (() => {
            const currentIdx = FREE_SCENARIOS.indexOf(scenario?.id);
            const isLastFree = currentIdx === FREE_SCENARIOS.length - 1;
            const hasNext = currentIdx >= 0 && currentIdx < FREE_SCENARIOS.length - 1;
            const nextScenarioId = hasNext ? FREE_SCENARIOS[currentIdx + 1] : null;
            const nextScenario = nextScenarioId ? SCENARIOS.find(s => s.id === nextScenarioId) : null;

            if (isLastFree) {
              return (
                <div className="text-center space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                    <p className="text-amber-400 text-lg font-black mb-2">3개 시나리오를 모두 완료했습니다!</p>
                    <p className="text-slate-400 text-xs">나의 리더십 역량을 종합 분석해보세요.</p>
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-amber-500 text-slate-900 py-5 rounded-[2rem] font-black active:scale-[0.98] transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    나의 리더십 분석 보기
                    <span className="text-lg">&rarr;</span>
                  </button>
                </div>
              );
            }

            if (hasNext && nextScenario) {
              return (
                <button
                  onClick={() => navigate('/setup', { state: { scenario: nextScenario, ...(!user && { guest: true }) } })}
                  className="w-full bg-amber-500 text-slate-900 py-5 rounded-[2rem] font-black active:scale-[0.98] transition-all text-sm tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  다음 도전: {nextScenario.title}
                  <span className="text-lg">&rarr;</span>
                </button>
              );
            }

            return null;
          })()}

          {/* SNS 공유 카드 */}
          {evaluation?.radarChart && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">리더십 카드 공유</h3>
              <ShareCard
                radarChart={evaluation.radarChart}
                leadershipType={(evaluation as any).leadershipType || null}
                userId={user?.id}
              />
            </div>
          )}

          {/* ── 게스트 전환 유도: 전문가 코칭 플레이북 + 요금제 업그레이드 ── */}
          {!user ? (
            <div className="space-y-4">
              {/* 전문가 코칭 플레이북 구매 */}
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">save</span>
                  <h3 className="text-amber-400 font-black text-sm">결과 저장하고 이어보기</h3>
                </div>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  회원가입하면 이번 결과를 저장하고, 나중에 다시 보거나 다음 시나리오를 이어서 체험할 수 있습니다.
                </p>
                <button
                  onClick={() => {
                    localStorage.setItem('leadershigh_guest_transcript', JSON.stringify({
                      transcript,
                      scenario,
                      sosTipHistory,
                    }));
                    navigate('/signup', { state: { from: '/feedback', intent: 'golden-script', transcript, scenario, sosTipHistory, evaluation, guest: true } });
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 text-sm font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  회원가입하고 결과 저장하기
                </button>
              </div>

              {/* 요금제 업그레이드 */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-cyan-400 text-lg">rocket_launch</span>
                  <h3 className="text-cyan-400 font-black text-sm">더 연습이 필요하다면</h3>
                </div>
                <p className="text-slate-400 text-xs mb-4">프로 플랜에서 20개 시나리오, 풀 피드백 리포트, 이전 기록 비교까지 이어서 사용할 수 있습니다.</p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500/80 to-cyan-600/60 text-white text-sm font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                  프로 플랜 보기 →
                </button>
              </div>

              <button
                onClick={() => navigate('/landing')}
                className="w-full py-3 text-slate-500 text-xs hover:text-slate-400 transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="w-full bg-primary text-navy-deep py-6 rounded-[2rem] font-black shadow-neon-cyan active:scale-[0.98] transition-all text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">home</span>
              기지 복귀
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Feedback;
