import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService } from '../services/analyticsService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } },
};

const LANDING_VARIANTS = {
  practice: {
    badge: 'AI 리더십 시뮬레이션',
    titleTop: '팀원과의 어려운 대화,',
    titleAccent: '실전 전에 AI와 먼저 연습하세요',
    description:
      '성과 면담, 갈등 조정, 동기부여 대화까지. 실제처럼 반응하는 AI 팀원과 리허설하고, 대화 직후 바로 피드백을 받으세요.',
    primaryCta: '지금 바로 연습해보기 →',
    secondaryText: '가입 없이 바로 체험',
    bottomTitle: '이번 주 성과 면담이 있으신가요?',
    bottomDescription: '10분이면 충분합니다. AI 팀원과 먼저 연습해보세요.',
    bottomCta: '무료로 시작하기 →',
    proofTitle: '실전 전에 먼저 연습하는 리허설 모드',
  },
  diagnosis: {
    badge: 'AI 리더십 진단',
    titleTop: '대화는 했는데 관계가 더 어색해졌다면,',
    titleAccent: '문제가 무엇인지 먼저 진단하세요',
    description:
      '내 말이 왜 신뢰를 깎았는지, 어떤 표현이 방어심을 키웠는지, 어떻게 바꿔야 하는지 AI 시뮬레이션과 피드백으로 확인하세요.',
    primaryCta: '내 대화 진단받기 →',
    secondaryText: '무료로 바로 진단 시작',
    bottomTitle: '말은 했는데 왜 더 멀어졌을까요?',
    bottomDescription: '실제처럼 재현하고, 무엇이 잘못됐는지 구조적으로 확인해보세요.',
    bottomCta: '지금 진단 시작하기 →',
    proofTitle: '문제 원인을 찾는 진단 모드',
  },
  'new-manager': {
    badge: '신임 팀장 맞춤 훈련',
    titleTop: '처음 팀장이라면,',
    titleAccent: '가장 어려운 건 사람과의 대화입니다',
    description:
      '일은 아는데 사람 대화가 어렵다면, AI 팀원과 실제처럼 연습하고 성과와 관계를 함께 지키는 리더십 대화 방식을 익히세요.',
    primaryCta: '팀장 대화 연습하기 →',
    secondaryText: '이번 주 면담 준비 가능',
    bottomTitle: '팀장 첫 면담, 망치기 전에 연습하세요',
    bottomDescription: '실전 전에 말의 순서와 톤을 다듬으면 결과가 달라집니다.',
    bottomCta: '면담 리허설 시작 →',
    proofTitle: '신임 팀장을 위한 실전 훈련 모드',
  },
} as const;

type LandingVariantKey = keyof typeof LANDING_VARIANTS;

const DEMO_MESSAGES = [
  { role: 'model' as const, text: '...네, 뭐 팀장님이 그렇게 생각하시면 할 말은 없지만요.', trust: 32 },
  { role: 'user' as const, text: '철수씨 입장에서 어떤 점이 가장 힘들었는지 좀 더 이야기해줄 수 있어요?', trust: 32 },
  { role: 'model' as const, text: '...사실 프로젝트 마감 때문에 새벽까지 일한 적이 많은데, 지각 얘기만 나오면 좀 억울하긴 합니다.', trust: 48 },
  { role: 'user' as const, text: '그 부분은 제가 몰랐네요. 새벽까지 일한 건 정말 고생 많았어요.', trust: 48 },
  { role: 'model' as const, text: '감사합니다... 인정받는 느낌이 들어서 조금 마음이 놓이네요.', trust: 65 },
];

const DIFF_POINTS = [
  { left: '항상 협조적인 AI', right: '적대적→설득됨 감정 흐름 반영', icon: '🎭' },
  { left: '채점 없음', right: '신뢰도와 대화 흐름 실시간 분석', icon: '📊' },
  { left: '대화 후 끝', right: '피드백과 성장 포인트까지 연결', icon: '📈' },
];

const VALUE_PILLS = [
  '실전 같은 대화 리허설',
  '대화 직후 바로 피드백',
  '관리자용 리더십 훈련',
];

function DemoChatCard() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= DEMO_MESSAGES.length) {
      const resetTimer = setTimeout(() => setVisibleCount(0), 2800);
      return () => clearTimeout(resetTimer);
    }
    const timer = setTimeout(() => setVisibleCount(v => v + 1), 1600);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  const currentTrust = visibleCount > 0 ? DEMO_MESSAGES[Math.min(visibleCount - 1, DEMO_MESSAGES.length - 1)].trust : 25;
  const trustColor = currentTrust < 40 ? '#ef4444' : currentTrust < 60 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="absolute -inset-6 bg-gradient-to-br from-amber-500/15 via-cyan-400/10 to-indigo-500/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/85 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-bold">Leader&apos;s High</p>
            <p className="text-sm text-slate-200 font-semibold mt-1">리허설 콘솔</p>
          </div>
          <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-300">
            LIVE FEEDBACK
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">신뢰도</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${currentTrust}%`, backgroundColor: trustColor }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: trustColor }}>
                {currentTrust}
              </span>
            </div>
            <p className="text-xs text-slate-500">팀원의 방어심과 수용도가 대화 흐름에 따라 변합니다.</p>
          </div>

          <div className="space-y-2 min-h-[220px]">
            {DEMO_MESSAGES.slice(0, visibleCount).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-amber-500/14 text-amber-50 border-amber-500/25'
                      : 'bg-slate-900 text-slate-200 border-white/8'
                  }`}
                >
                  {msg.role === 'model' && <span className="text-[10px] text-slate-500 block mb-1">김철수</span>}
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {visibleCount < DEMO_MESSAGES.length && visibleCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 px-3 py-2">
                  <div className="flex gap-1">
                    <span className="size-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="size-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const attribution = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      lp: params.get('lp') || undefined,
      utm_source: params.get('utm_source') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
    };
  }, []);
  const variantKey: LandingVariantKey = (attribution.lp && attribution.lp in LANDING_VARIANTS ? attribution.lp : 'practice') as LandingVariantKey;
  const variant = LANDING_VARIANTS[variantKey];

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    analyticsService.track('landing_variant_view', {
      ...attribution,
      variant: variantKey,
      referrer: document.referrer || undefined,
      device: navigator.userAgent,
    });
  }, [variantKey, attribution]);

  const handlePrimaryCta = (placement: 'hero' | 'bottom') => {
    analyticsService.track('cta_click', {
      ...attribution,
      variant: variantKey,
      placement,
      target: '/onboarding',
    });
    navigate('/onboarding');
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-[#0B1020] text-white font-manrope overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.16),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.13),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.08),transparent_24%)]" />

      <section className="relative max-w-6xl mx-auto px-6 pt-16 lg:pt-24 pb-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <motion.div variants={itemVariants} className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 mb-6 backdrop-blur-sm">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-xs font-bold tracking-[0.18em] uppercase">{variant.badge}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[1.03] mb-5 text-white">
              {variant.titleTop}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
                {variant.titleAccent}
              </span>
            </h1>

            <p className="text-slate-300 text-base lg:text-lg leading-7 max-w-xl mx-auto lg:mx-0 mb-8">
              {variant.description}
            </p>

            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8">
              {VALUE_PILLS.map((pill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-300"
                >
                  {pill}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => handlePrimaryCta('hero')}
                className="px-8 py-4 bg-amber-500 text-slate-950 font-black rounded-2xl text-sm hover:bg-amber-400 active:scale-95 transition-all shadow-[0_10px_40px_rgba(245,158,11,0.28)] min-h-[52px]"
              >
                {variant.primaryCta}
              </button>
              <div className="px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-slate-300 min-h-[52px] flex items-center justify-center">
                {variant.secondaryText}
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full">
            <DemoChatCard />
          </motion.div>
        </div>
      </section>

      <section className="relative max-w-5xl mx-auto px-6 pb-16">
        <motion.div variants={itemVariants} className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 lg:p-8">
          <div className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80 font-bold mb-3">Why it feels different</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
              ChatGPT에 물어보는 것과 <span className="text-amber-400">뭐가 다른가요?</span>
            </h2>
            <p className="text-slate-400 text-sm lg:text-base">{variant.proofTitle}</p>
          </div>

          <div className="space-y-4">
            {DIFF_POINTS.map((point, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="grid md:grid-cols-[64px_1fr_1fr] gap-4 items-center rounded-2xl border border-white/8 bg-slate-950/60 p-4 lg:p-5"
              >
                <div className="size-12 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center text-2xl">
                  {point.icon}
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-[0.18em] block mb-1">범용 AI</span>
                  <span className="text-slate-500 text-sm line-through decoration-slate-700">{point.left}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-500/70 uppercase tracking-[0.18em] block mb-1">Leader&apos;s High</span>
                  <span className="text-white text-sm lg:text-base font-semibold">{point.right}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative max-w-5xl mx-auto px-6 pb-16">
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 font-bold mb-3">Pricing</p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">지금은 무료 체험만 확인해도 충분합니다</h2>
          <p className="text-slate-400 text-sm mb-6">이 페이지의 목적은 가격 비교가 아니라, 어떤 메시지가 체험 시작을 가장 잘 만드는지 확인하는 것입니다.</p>

          <div className="max-w-3xl mx-auto mb-6 rounded-[24px] border border-amber-500/15 bg-amber-500/[0.06] p-5 text-left">
            <p className="text-amber-300 text-sm font-bold mb-2">먼저 여기까지만 보면 됩니다</p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• 무료 시나리오 3개 체험</li>
              <li>• 가입 없이 바로 시작</li>
              <li>• 체험 후 필요할 때만 프로 플랜 검토</li>
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-slate-400 text-xs mb-2 uppercase tracking-[0.18em]">무료 체험</p>
              <p className="text-3xl font-black text-white mb-1">₩0</p>
              <p className="text-slate-500 text-sm">3개 시나리오 · 가입 없이 시작</p>
            </div>

            <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/[0.08] p-6 text-center relative shadow-[0_12px_40px_rgba(245,158,11,0.12)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold">
                대표 플랜
              </span>
              <p className="text-amber-300 text-xs mb-2 uppercase tracking-[0.18em]">프로</p>
              <p className="text-3xl font-black text-white mb-1">₩8,900</p>
              <p className="text-slate-300 text-sm">20개 시나리오 · 10일 반복 훈련</p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative max-w-5xl mx-auto px-6 pb-24">
        <motion.div variants={itemVariants} className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.04] to-amber-500/[0.06] p-8 lg:p-10 text-center backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80 font-bold mb-3">Ready to rehearse</p>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">{variant.bottomTitle}</h2>
          <p className="text-slate-300 text-sm lg:text-base mb-7 max-w-2xl mx-auto">{variant.bottomDescription}</p>
          <button
            onClick={() => handlePrimaryCta('bottom')}
            className="px-8 py-4 bg-amber-500 text-slate-950 font-black rounded-2xl text-sm hover:bg-amber-400 active:scale-95 transition-all shadow-[0_10px_40px_rgba(245,158,11,0.28)] min-h-[52px]"
          >
            {variant.bottomCta}
          </button>
        </motion.div>
      </section>

      <footer className="relative max-w-4xl mx-auto px-6 pb-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
          <button onClick={() => navigate('/login')} className="hover:text-slate-400 transition-colors">로그인</button>
          <span>·</span>
          <button onClick={() => navigate('/signup')} className="hover:text-slate-400 transition-colors">회원가입</button>
          <span>·</span>
          <button onClick={() => navigate('/privacy')} className="hover:text-slate-400 transition-colors">개인정보처리방침</button>
          <span>·</span>
          <button onClick={() => navigate('/terms')} className="hover:text-slate-400 transition-colors">이용약관</button>
        </div>
      </footer>
    </motion.div>
  );
}
