import React, { useMemo, useState } from 'react';
import { recommendExperience } from '../../src/lib/letmefree-experience/recommendExperience';
import { EXPERIENCES } from '../../src/lib/letmefree-experience/experienceLibrary';
import type { ExperienceRecommendation } from '../../src/lib/letmefree-experience/types';

export const VOICE_FIRST_HOME_COPY = {
  badge: 'VOICE-FIRST REFLECTION COACH',
  headline: '오늘 어떤 마음으로 운전 중인가요?',
  subcopy: '퇴근길 10분, 리더가 자기 자신과 팀을 더 선명하게 만나는 대화.',
  primaryAction: '말하기 시작',
  secondaryAction: '텍스트로 입력',
  placeholder: '예: 오늘 팀원과 대화가 마음에 걸려. 뭐라고 말해야 할지 모르겠어.',
} as const;

export type VoiceRecommendationViewModel = {
  recommendation: ExperienceRecommendation;
  familyLabel: '자기다움 코칭' | '우리다움 훈련';
  axisLabel: string;
  modeLabel: string;
  recommendedTitles: string[];
};

const axisLabels: Record<ExperienceRecommendation['primaryAxis'], string> = {
  selfness_affect: '정서조율 / 리더의 외로움',
  selfness_strength: '강점 / 핵심역량',
  selfness_calling: '소명 / 의도 / 욕망',
  weness_diversity: '다양성 / 존중 / 조율',
  weness_feedback: '피드백 / 피드포워드',
  weness_execution: '목표 / 실행 / 회고',
};

export const buildVoiceRecommendationViewModel = (transcript: string): VoiceRecommendationViewModel => {
  const recommendation = recommendExperience(transcript);
  const recommendedTitles = recommendation.recommendedExperienceIds.map((id) => {
    return EXPERIENCES.find((experience) => experience.id === id)?.title ?? id;
  });
  const isSelfness = recommendation.family === 'selfness_coaching';

  return {
    recommendation,
    familyLabel: isSelfness ? '자기다움 코칭' : '우리다움 훈련',
    axisLabel: axisLabels[recommendation.primaryAxis],
    modeLabel: isSelfness ? 'AI와 함께하는 대화형 코칭' : '코칭 후 시나리오 훈련/리허설',
    recommendedTitles,
  };
};

const defaultTranscript = '오늘 팀원과 대화가 마음에 걸려. 뭐라고 말해야 할지 모르겠어.';

const VoiceIntakePanel: React.FC = () => {
  const [transcript, setTranscript] = useState(defaultTranscript);
  const viewModel = useMemo(() => buildVoiceRecommendationViewModel(transcript), [transcript]);

  return (
    <div className="relative z-10 max-w-4xl">
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {VOICE_FIRST_HOME_COPY.badge}
      </span>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-end">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white mb-5 leading-[1.08]">
            {VOICE_FIRST_HOME_COPY.headline}
          </h1>
          <p className="text-slate-300 text-sm lg:text-base leading-relaxed max-w-xl mb-5 font-medium">
            {VOICE_FIRST_HOME_COPY.subcopy}
          </p>
          <div className="flex flex-wrap gap-3 mb-5">
            <button className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-slate-950 text-sm font-black shadow-[0_0_24px_rgba(242,185,13,0.24)] active:scale-95 transition-transform">
              <span aria-hidden="true">●</span>
              {VOICE_FIRST_HOME_COPY.primaryAction}
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm font-bold active:scale-95 transition-transform">
              {VOICE_FIRST_HOME_COPY.secondaryAction}
            </button>
          </div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.22em] mb-2">
            Mock transcript
          </label>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder={VOICE_FIRST_HOME_COPY.placeholder}
            className="w-full max-w-2xl min-h-24 rounded-2xl bg-[#0B1120]/75 border border-white/10 p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary/60"
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0B1120]/70 backdrop-blur-md p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.22em]">추천 경험</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-300">{viewModel.familyLabel}</span>
          </div>
          <h2 className="text-xl font-black text-white mb-2">{viewModel.axisLabel}</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">{viewModel.modeLabel}</p>
          <p className="rounded-2xl bg-white/5 border border-white/5 p-4 text-sm text-slate-200 leading-relaxed mb-4">
            {viewModel.recommendation.reason}
          </p>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">첫 탐색 질문</p>
          <p className="text-sm text-white font-semibold leading-relaxed mb-4">{viewModel.recommendation.firstQuestion}</p>
          <ul className="space-y-2">
            {viewModel.recommendedTitles.map((title) => (
              <li key={title} className="rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2 text-xs text-slate-300">
                {title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceIntakePanel;
