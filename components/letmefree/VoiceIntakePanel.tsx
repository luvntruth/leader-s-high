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
  const isSelfness = viewModel.recommendation.family === 'selfness_coaching';

  return (
    <div className="relative z-10 max-w-5xl text-[#191512]">
      <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-[#F2C6AB]/45 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-10 top-16 h-64 w-64 rounded-full bg-[#B9E3D4]/40 blur-3xl" aria-hidden="true" />

      <span className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-[#E7DED3] bg-[#F9F5EF]/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#746B63]">
        <span className="size-2 rounded-full bg-[#1C423B]" />
        {VOICE_FIRST_HOME_COPY.badge}
      </span>

      <div className="relative grid grid-cols-1 items-end gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-[#E7DED3] bg-[#FFFDFC]/90 p-6 shadow-[0_28px_80px_rgba(28,66,59,0.12)] backdrop-blur lg:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#746B63]">quiet premium · warm editorial · Voice atmosphere</p>
          <h1 className="mb-5 max-w-2xl text-4xl font-medium leading-[1.08] tracking-[-0.035em] text-[#191512] lg:text-6xl">
            {VOICE_FIRST_HOME_COPY.headline}
          </h1>
          <p className="mb-6 max-w-xl text-base leading-8 text-[#3D362F] lg:text-lg">
            {VOICE_FIRST_HOME_COPY.subcopy} 운전 중에는 화면을 붙잡지 않고, <strong className="font-semibold text-[#1C423B]">운전이 끝난 뒤</strong> 작게 실행할 문장만 남깁니다.
          </p>
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => { window.location.hash = '#/voice-coach'; }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1C423B] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_48px_rgba(28,66,59,0.22)] transition hover:bg-[#12302B] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#1C423B]/15"
            >
              <span aria-hidden="true">●</span>
              {VOICE_FIRST_HOME_COPY.primaryAction}
            </button>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D6C9BA] bg-white px-5 py-3 text-sm font-bold text-[#191512] transition hover:bg-[#F9F5EF] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#1C423B]/10">
              {VOICE_FIRST_HOME_COPY.secondaryAction}
            </button>
          </div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#746B63]">
            Mock transcript
          </label>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder={VOICE_FIRST_HOME_COPY.placeholder}
            className="min-h-28 w-full max-w-2xl resize-none rounded-[1.25rem] border border-[#D6C9BA] bg-white p-4 text-sm leading-7 text-[#191512] placeholder:text-[#A59C92] outline-none transition focus:border-[#1C423B] focus:ring-4 focus:ring-[#1C423B]/10"
          />
        </div>

        <div className="rounded-[2rem] border border-[#E7DED3] bg-[#FFFDFC]/90 p-5 shadow-[0_18px_48px_rgba(45,35,25,0.08)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#746B63]">추천 경험</span>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${isSelfness ? 'border-[#D6C9BA] bg-[#F2C6AB]/50 text-[#191512]' : 'border-[#D6C9BA] bg-[#B9E3D4]/60 text-[#191512]'}`}>
              {viewModel.familyLabel}
            </span>
          </div>
          <h2 className="mb-2 text-2xl font-semibold tracking-[-0.02em] text-[#191512]">{viewModel.axisLabel}</h2>
          <p className="mb-4 text-sm leading-7 text-[#3D362F]">{viewModel.modeLabel}</p>
          <p className="mb-4 rounded-[1.25rem] border border-[#E7DED3] bg-[#F9F5EF] p-4 text-sm leading-7 text-[#3D362F]">
            {viewModel.recommendation.reason}
          </p>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#746B63]">첫 탐색 질문</p>
          <p className="mb-4 text-base font-semibold leading-7 text-[#191512]">{viewModel.recommendation.firstQuestion}</p>
          <ul className="space-y-2">
            {viewModel.recommendedTitles.map((title) => (
              <li key={title} className="rounded-[1rem] border border-[#E7DED3] bg-white px-3 py-2 text-sm leading-6 text-[#3D362F]">
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
