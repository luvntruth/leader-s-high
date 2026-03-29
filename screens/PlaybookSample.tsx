
import React, { useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';

// ── 샘플 플레이북 데이터 (실제 구매 후 AI가 생성하는 결과물 형태) ──
const SAMPLE_PLAYBOOK = [
  {
    situation: '제가 성과로 메꾸고 있지 않나요? 실제 업무에서 문제가 생긴 건 아니잖아요.',
    myResponse: '성과는 인정해요. 하지만 다른 팀원들이 철수씨 눈치를 보기 시작했어요.',
    bestResponse: '철수씨 성과가 팀에서 정말 중요하다는 건 저도 알고 있어요. 그래서 더 솔직하게 말씀드리고 싶어요. 지각이 반복될 때 다른 팀원들이 "우리는 왜 지켜야 하지?"라고 느끼기 시작했거든요. 성과와 별개로, 팀 기준을 함께 만들어가는 게 리더십의 역할이라 생각해서요.',
    why: '방어적 반응에 정면 대응하는 대신, 상대방의 강점을 먼저 인정(긍정 앵커링)한 뒤 팀 전체의 관점으로 프레임을 전환했습니다. "너 때문에"가 아닌 "팀이 느끼는 것"으로 주어를 바꾸면 방어심이 낮아집니다.',
    coachTip: '자기결정이론 관점에서, 규칙을 외부 압박이 아닌 팀의 공동 가치로 재정의할 때 자발적 변화가 일어납니다.',
  },
  {
    situation: '크게 놓친 건 없죠? 지하철이 좀 막혀서요.',
    myResponse: '중요한 부분을 놓쳤어요. 최근에 계속 늦는 게 팀에 영향을 주고 있어요.',
    bestResponse: '네, 오늘 오전에 Q3 로드맵 우선순위 결정을 했어요. 철수씨 의견이 들어갔으면 더 좋았을 텐데 아쉬웠어요. 잠깐 시간 내서 결정 내용 공유하고, 혹시 다른 시각이 있는지 들어볼 수 있을까요?',
    bestResponse2: undefined,
    why: 'SBI 모델(상황-행동-영향)의 핵심은 비난 없이 사실을 구체화하는 것입니다. "계속 늦는다"는 추상적 지적 대신, 오늘 회의의 구체적 손실을 짚으면 상대방이 방어할 여지가 줄어듭니다. 동시에 의견을 구하는 방식으로 존중을 표현합니다.',
    coachTip: '"늦었다"는 사실보다 "그로 인해 무엇이 빠졌는가"를 구체화하면 대화가 과거 책임 추궁이 아닌 미래 해결로 자연스럽게 이동합니다.',
  },
  {
    situation: '앞으로 어떻게 하면 좋을지 같이 방법을 찾아보면 좋겠어요.',
    myResponse: '앞으로 어떻게 하면 좋을지 같이 방법을 찾아보면 좋겠어요.',
    bestResponse: '제가 한 가지 제안을 드려도 될까요? 만약 어떤 날 출근이 어려울 것 같으면, 전날 저에게 짧게 메시지 주시면 어떨까요? 그러면 팀 일정을 미리 조율할 수 있고, 철수씨도 부담이 덜 할 것 같아요. 어떻게 생각하세요?',
    why: '해결책을 일방적으로 지시하지 않고 제안 형태("~면 어떨까요?")로 제시하면 상대방의 자율성을 지키면서도 구체적인 행동 변화를 유도할 수 있습니다. 마지막 질문으로 주도권을 넘기는 것이 핵심입니다.',
    coachTip: '코칭의 황금률: 변화를 강요하지 말고 상대방이 스스로 선택하게 하라. 선택한 해결책은 훨씬 강한 실행력을 갖습니다.',
  },
];

const STRATEGY_STEPS = [
  { step: '1단계', title: '사실 확인 & 공감 표현', desc: '지각 사실을 직접 언급하되, 감정적 단어 없이 구체적 상황만 짚기. "오늘 20분 늦었어요"가 "자꾸 늦네요"보다 방어심을 낮춥니다.' },
  { step: '2단계', title: '영향 가시화', desc: '개인 행동이 팀에 미치는 영향을 수치나 사례로 구체화하기. "팀 분위기"보다 "오늘 Q3 결정에 의견을 못 넣었어요"가 훨씬 설득력 있습니다.' },
  { step: '3단계', title: '자율적 해결 도출', desc: '해결책을 제시하되 강요하지 않기. "어떻게 하면 좋을까요?"로 끝맺으면 상대방이 주도적으로 해결에 참여합니다.' },
];

export default function PlaybookSample() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // dev 진입점 확인 — DevPanel에서 fromDev: true 없이 접근하면 홈으로
    if (!(location.state as any)?.fromDev) {
      navigate('/', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060B18] text-white pb-24 overflow-y-auto">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[#060B18]/95 backdrop-blur border-b border-amber-500/20 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dev')} className="text-slate-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-base">auto_awesome</span>
          <span className="text-amber-400 font-black text-sm">전문가 코칭 플레이북</span>
          <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">SAMPLE</span>
        </div>
        <span className="ml-auto text-slate-500 text-xs">성과 좋은 만성 지각자</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* 3단계 전략 개요 */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-cyan-400 text-lg">route</span>
            <h2 className="text-base font-black text-white">3단계 대화 전략</h2>
          </div>
          <div className="space-y-3">
            {STRATEGY_STEPS.map((s, i) => (
              <div key={i} className="flex gap-4 bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
                <div className="shrink-0 w-16 text-center">
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{s.step}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-1">{s.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 상황별 핵심 문장 */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-amber-400 text-lg">forum</span>
            <h2 className="text-base font-black text-white">상황별 핵심 문장</h2>
            <span className="text-slate-500 text-xs">· 그대로 쓸 수 있는 실전 스크립트</span>
          </div>
          <div className="space-y-6">
            {SAMPLE_PLAYBOOK.map((item, idx) => (
              <div key={idx} className="bg-[#1C1F26] border border-amber-500/15 rounded-[1.5rem] overflow-hidden">
                {/* 상황 */}
                <div className="px-5 py-4 border-b border-white/5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">replay</span>
                    상대방 발화
                  </p>
                  <p className="text-sm text-slate-300 italic leading-relaxed">"{item.situation}"</p>
                </div>

                {/* 내 발화 vs 추천 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">
                  <div className="p-4 bg-red-500/5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="size-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-400 text-[10px]">close</span>
                      </span>
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">내가 한 말</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">"{item.myResponse}"</p>
                  </div>
                  <div className="p-4 bg-amber-500/5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="size-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-400 text-[10px]">auto_awesome</span>
                      </span>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">추천 스크립트</p>
                    </div>
                    <p className="text-sm text-white font-bold leading-relaxed">"{item.bestResponse}"</p>
                  </div>
                </div>

                {/* 심리 트리거 분석 */}
                <div className="px-5 py-4 bg-white/[0.02] border-t border-white/5">
                  <div className="flex gap-2 items-start mb-2">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5 shrink-0">psychology</span>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">심리적 트리거 분석</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.why}</p>
                    </div>
                  </div>
                </div>

                {/* 코치 총평 */}
                <div className="px-5 py-3 bg-cyan-500/5 border-t border-cyan-500/10">
                  <div className="flex gap-2 items-start">
                    <span className="material-symbols-outlined text-cyan-400 text-sm mt-0.5 shrink-0">lightbulb</span>
                    <p className="text-xs text-cyan-300/80 leading-relaxed font-medium">{item.coachTip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 리더십 코치 총평 */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-600/30 rounded-[1.5rem] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-400 text-xl">workspace_premium</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">리더십 코치 총평</p>
              <p className="text-sm font-bold text-white">이 대화에서 발견된 핵심 패턴</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            이번 대화에서 가장 눈에 띄는 점은 <strong className="text-white">사실 언급 후 바로 해결책으로 점프하는 패턴</strong>입니다. 상대방의 방어심이 완전히 내려오기 전에 솔루션을 제시하면 "지시받는다"는 느낌을 줄 수 있습니다.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            다음번엔 <strong className="text-white">"어떻게 느꼈어요?"라는 질문 하나</strong>를 중간에 넣어보세요. 상대방이 스스로 영향을 인지하게 되면 변화의 주도권이 상대방에게 넘어갑니다.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs text-amber-400 font-bold">다음 시뮬레이션에서 연습할 것</p>
            <p className="text-xs text-slate-300 mt-1">중간 공감 질문 삽입 → "그 상황에서 어떤 생각이 들었어요?" 패턴 연습</p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center space-y-3">
          <p className="text-slate-500 text-xs">이것은 샘플입니다. 실제 구매 시 내 대화 기록 기반으로 생성됩니다.</p>
          <button
            onClick={() => navigate('/signup', { state: { from: '/feedback', intent: 'golden-script' } })}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-black text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            회원가입 후 내 플레이북 구매하기 · ₩3,900
          </button>
          <button onClick={() => navigate('/dev')} className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
            ← 테스트 패널로
          </button>
        </div>

      </div>
    </div>
  );
}
