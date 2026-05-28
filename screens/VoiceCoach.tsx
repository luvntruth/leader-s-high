import React, { useMemo, useState } from 'react';
import { buildMockExperienceSession } from '../src/lib/letmefree-experience/sessionMock';

const examplePrompts = [
  '요즘 너무 외롭고 혼자 감당하는 것 같아.',
  '팀원에게 피드백을 해야 하는데 문장을 연습하고 싶어.',
  '이번 주 팀 목표가 흐릿하고 실행이 안 돼.',
];

const designPrinciples = ['quiet premium', 'warm editorial', 'Voice atmosphere'];

const familyStyles = {
  selfness_coaching: {
    label: '자기다움 코칭',
    atmosphere: '#F2C6AB',
    atmosphereSoft: '#E9B8C4',
    chip: 'bg-[#F2C6AB]/55 text-[#191512] border-[#E7DED3]',
    panel: 'from-[#FFFDFC] via-[#F9F5EF] to-[#F7E8DA]',
  },
  weness_training: {
    label: '우리다움 훈련',
    atmosphere: '#B9E3D4',
    atmosphereSoft: '#B8D6EA',
    chip: 'bg-[#B9E3D4]/65 text-[#191512] border-[#D6C9BA]',
    panel: 'from-[#FFFDFC] via-[#F9F5EF] to-[#E7F4EE]',
  },
} as const;

const stepLabels: Record<string, string> = {
  exploration: '탐색',
  classification: '분류',
  recommendation: '추천',
  practice: '연습',
  analysis_readout: '분석',
  action_items: '실천',
  reminder_setup: '알림',
};

const VoiceCoach: React.FC = () => {
  const [transcript, setTranscript] = useState(examplePrompts[1]);
  const session = useMemo(() => buildMockExperienceSession(transcript), [transcript]);
  const isSelfness = session.family === 'selfness_coaching';
  const style = familyStyles[session.family];
  const firstQuestion = session.steps.find((step) => step.kind === 'exploration')?.prompt ?? '지금 가장 먼저 정리하고 싶은 장면은 무엇인가요?';

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6F1EA] px-5 py-8 text-[#191512] lg:px-10 lg:py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-24 right-[-8rem] h-80 w-80 rounded-full blur-3xl opacity-60"
          style={{ backgroundColor: style.atmosphere }}
        />
        <div
          className="absolute left-[-8rem] top-1/3 h-96 w-96 rounded-full blur-3xl opacity-45"
          style={{ backgroundColor: style.atmosphereSoft }}
        />
        <div className="absolute bottom-[-10rem] right-1/4 h-80 w-80 rounded-full bg-[#B9E3D4]/35 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-8">
        <header className="grid gap-8 rounded-[2rem] border border-[#E7DED3] bg-[#FFFDFC]/86 p-6 shadow-[0_28px_80px_rgba(28,66,59,0.12)] backdrop-blur md:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {designPrinciples.map((principle) => (
                  <span key={principle} className="rounded-full border border-[#E7DED3] bg-[#F9F5EF] px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-[#746B63]">
                    {principle}
                  </span>
                ))}
              </div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#746B63]">Voice Coach Mock Flow</p>
              <h1 className="max-w-2xl text-4xl font-medium leading-[1.08] tracking-[-0.035em] text-[#191512] lg:text-6xl">
                퇴근길 대화가 끝난 뒤, 리더에게 남는 것.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#3D362F] lg:text-lg">
                실제 음성 API 없이 핵심 경험만 검증합니다. 한 번에 한 질문, 짧은 분석, 작은 실천, 그리고 <strong className="font-semibold text-[#1C423B]">운전이 끝난 뒤</strong> 확인할 알림까지 이어집니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-[#746B63]">
              <span className="rounded-full bg-[#1C423B] px-4 py-2 font-bold text-white">{style.label}</span>
              <span className="rounded-full border border-[#D6C9BA] bg-white px-4 py-2 font-semibold">{session.practiceStyle}</span>
            </div>
          </div>

          <section className={`relative overflow-hidden rounded-[2rem] border border-[#E7DED3] bg-gradient-to-br ${style.panel} p-6 shadow-[0_18px_48px_rgba(45,35,25,0.08)]`}>
            <div className="absolute right-[-3rem] top-[-4rem] h-44 w-44 rounded-full opacity-55 blur-2xl" style={{ backgroundColor: style.atmosphere }} />
            <div className="relative">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#746B63]">Recommended experience</p>
              <h2 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-[#191512]">{session.experienceTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-[#3D362F]">
                {isSelfness
                  ? '감정과 의도를 천천히 정리해, 리더 자신에게 필요한 한 문장을 남깁니다.'
                  : '상황을 정리한 뒤 실제 조직 장면에서 말할 문장을 짧게 리허설합니다.'}
              </p>
              <div className="mt-6 rounded-[1.5rem] border border-[#E7DED3] bg-white/72 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#746B63]">First question</p>
                <p className="mt-2 text-lg font-semibold leading-8 text-[#191512]">{firstQuestion}</p>
              </div>
            </div>
          </section>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="rounded-[2rem] border border-[#E7DED3] bg-[#FFFDFC]/88 p-6 shadow-[0_18px_48px_rgba(45,35,25,0.08)] backdrop-blur">
            <label className="mb-3 block text-xs font-bold uppercase tracking-[0.18em] text-[#746B63]">Mock transcript</label>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="min-h-36 w-full resize-none rounded-[1.25rem] border border-[#D6C9BA] bg-white p-4 text-[15px] leading-7 text-[#191512] outline-none transition focus:border-[#1C423B] focus:ring-4 focus:ring-[#1C423B]/10"
            />
            <div className="mt-4 space-y-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setTranscript(prompt)}
                  className="block w-full rounded-full border border-[#E7DED3] bg-[#F9F5EF] px-4 py-3 text-left text-sm font-semibold leading-6 text-[#3D362F] transition hover:border-[#1C423B]/35 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#1C423B]/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-[#E7DED3] bg-[#FFFDFC]/88 p-5 shadow-[0_18px_48px_rgba(45,35,25,0.08)] backdrop-blur md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#746B63]">Session steps</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#191512]">대화의 리듬</h2>
              </div>
              <span className={`rounded-full border px-4 py-2 text-xs font-bold ${style.chip}`}>{style.label}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {session.steps.map((step, index) => (
                <article key={step.kind} className="rounded-[1.5rem] border border-[#E7DED3] bg-[#F9F5EF] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_48px_rgba(45,35,25,0.08)]">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#746B63]">
                    {String(index + 1).padStart(2, '0')} · {stepLabels[step.kind] ?? step.kind}
                  </p>
                  <h3 className="mb-2 text-base font-semibold leading-6 text-[#191512]">{step.title}</h3>
                  <p className="text-sm leading-7 text-[#3D362F]">{step.prompt}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] border border-[#E7DED3] bg-[#FFFDFC]/88 p-6 shadow-[0_18px_48px_rgba(45,35,25,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#746B63]">Analysis</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#191512]">지금 남겨야 할 세 가지 이하의 해석</h2>
            <div className="mt-5 grid gap-3">
              {session.analysisReadout.map((item) => (
                <p key={item} className="rounded-[1.25rem] border border-[#E7DED3] bg-[#F9F5EF] p-4 text-sm leading-7 text-[#3D362F]">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#D6C9BA] bg-[#111C1A] p-6 text-[#FFFDFC] shadow-[0_28px_80px_rgba(28,66,59,0.16)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C8D2CE]">Action</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">운전 후 바로 할 작은 실천</h2>
            <ul className="mt-5 space-y-3">
              {session.actionItems.map((item) => (
                <li key={item} className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4 text-sm leading-7 text-[#FFFDFC]">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-[1.5rem] border border-[#B9E3D4]/30 bg-[#B9E3D4]/12 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9E3D4]">Reminder</p>
              <p className="mt-2 text-sm leading-7 text-[#C8D2CE]">{session.reminder}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default VoiceCoach;
