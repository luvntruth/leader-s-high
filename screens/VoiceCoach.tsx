import React, { useMemo, useState } from 'react';
import { buildMockExperienceSession } from '../src/lib/letmefree-experience/sessionMock';

const examplePrompts = [
  '요즘 너무 외롭고 혼자 감당하는 것 같아.',
  '팀원에게 피드백을 해야 하는데 문장을 연습하고 싶어.',
  '이번 주 팀 목표가 흐릿하고 실행이 안 돼.',
];

const VoiceCoach: React.FC = () => {
  const [transcript, setTranscript] = useState(examplePrompts[1]);
  const session = useMemo(() => buildMockExperienceSession(transcript), [transcript]);
  const isSelfness = session.family === 'selfness_coaching';

  return (
    <div className="min-h-screen bg-[#060B18] text-white px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[2rem] border border-white/10 bg-[#0D1526] p-6 lg:p-8 shadow-2xl">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-primary">VOICE COACH MOCK FLOW</p>
          <h1 className="mb-3 text-3xl font-black tracking-tight lg:text-5xl">추천 후 대화가 끝까지 이어지는지 봅니다</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-400">
            실제 STT/TTS 없이, Letmefree의 핵심 흐름만 검증하는 화면입니다. 한 번에 한 질문, 짧은 분석, 작은 실천, 운전 후 알림까지 확인합니다.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0D1526]/80 p-6">
            <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Mock transcript</label>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="mb-4 min-h-32 w-full rounded-2xl border border-white/10 bg-[#060B18] p-4 text-sm leading-6 text-slate-100 placeholder:text-slate-600 focus:border-primary/60 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setTranscript(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:border-primary/40 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#101B30] to-[#070C18] p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-950">
                {isSelfness ? '자기다움 코칭' : '우리다움 훈련'}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-300">{session.practiceStyle}</span>
            </div>
            <h2 className="mb-2 text-2xl font-black">{session.experienceTitle}</h2>
            <p className="mb-5 text-sm leading-7 text-slate-400">
              {isSelfness
                ? 'AI와 사용자가 천천히 대화하며 감정과 의도를 정리하는 코칭 흐름입니다.'
                : '코칭으로 상황을 정리한 뒤 실제 조직 장면에서 말할 문장을 훈련하는 흐름입니다.'}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {session.steps.map((step, index) => (
                <article key={step.kind} className="rounded-2xl border border-white/5 bg-white/[0.04] p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">{index + 1}. {step.kind}</p>
                  <h3 className="mb-2 text-sm font-black text-white">{step.title}</h3>
                  <p className="text-xs leading-6 text-slate-400">{step.prompt}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-[#0D1526]/80 p-6 lg:col-span-2">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Analysis readout</p>
            <div className="space-y-3">
              {session.analysisReadout.map((item) => (
                <p key={item} className="rounded-2xl bg-white/[0.04] p-4 text-sm leading-7 text-slate-200">{item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-primary/20 bg-primary/10 p-6">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-primary">Action & reminder</p>
            <ul className="mb-5 space-y-3">
              {session.actionItems.map((item) => (
                <li key={item} className="text-sm leading-6 text-slate-100">• {item}</li>
              ))}
            </ul>
            <p className="rounded-2xl bg-[#060B18]/60 p-4 text-xs leading-6 text-slate-300">{session.reminder}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VoiceCoach;
