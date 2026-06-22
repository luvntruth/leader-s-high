import React from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SCENARIOS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { getCharacterAvatar } from '../services/characterAvatars';
import { analyticsService } from '../services/analyticsService';
import { FREE_SCENARIO_IDS } from '../services/usageService';
import PlansSection from '../components/PlansSection';

const CURATED = [
  { id: 'late-comer', grade: 'B', difficulty: '쉬움', color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
  { id: 'boundaries', grade: 'A', difficulty: '보통', color: '#FFB800', bg: 'rgba(255,184,0,0.15)', border: 'rgba(255,184,0,0.4)' },
  { id: 'team-clash', grade: 'S', difficulty: '도전', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 24, opacity: 0, filter: 'blur(4px)' },
  visible: {
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any },
  },
};

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const displayName = profile?.display_name || '리더';
  // 가입 직후 진입 시 환영 배너 노출 (Signup 에서 state.justSignedUp 전달)
  const [showWelcome, setShowWelcome] = React.useState<boolean>(Boolean(location.state?.justSignedUp));

  const firstScenario = SCENARIOS.find(s => s.id === 'late-comer');

  React.useEffect(() => {
    analyticsService.track('onboarding_start', analyticsService.withAttribution({
      screen: 'onboarding',
      guest: !user,
      free_scenarios: FREE_SCENARIO_IDS,
    }), user?.id);
  }, [user]);

  // 환영 배너는 한 번만 — history state 를 비워 새로고침/뒤로가기 시 재노출 방지
  React.useEffect(() => {
    if (!showWelcome) return;
    window.history.replaceState({}, '');
    const t = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(t);
  }, [showWelcome]);

  return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex flex-col min-h-screen bg-slate-950 font-manrope text-white"
      >
      {/* 가입 완료 환영 배너 — 가입 직후 1회 노출 */}
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="sticky top-0 z-30 mx-auto w-full max-w-6xl px-6 pt-4"
        >
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 shadow-lg backdrop-blur-md">
            <span>🎉</span>
            <span>가입 완료! 아래에서 무료 체험을 시작하고, 더 필요하면 플랜을 확인해 보세요.</span>
          </div>
        </motion.div>
      )}

      {/* Hero section */}
      <motion.div variants={itemVariants} className="px-6 pt-16 lg:pt-24 pb-10 lg:pb-12 text-center relative max-w-6xl mx-auto w-full">
        <div className="absolute top-0 right-0 flex items-center gap-2">
          {user ? (
            <button
              onClick={() => navigate('/profile')}
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 hover:bg-white/[0.08] transition-colors"
            >
              마이페이지
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login', { state: { from: '/onboarding' } })}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 hover:bg-white/[0.08] transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => navigate('/signup', { state: { from: '/onboarding', intent: 'direct' } })}
                className="px-3 py-2 rounded-xl bg-amber-500 text-xs font-bold text-slate-900 hover:bg-amber-400 transition-colors"
              >
                회원가입
              </button>
            </>
          )}
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8 lg:mb-10"
        >
          <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 text-sm lg:text-base font-bold tracking-wide">무료 체험 3개 시나리오</span>
        </motion.div>

        <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 lg:mb-5 leading-tight">
          환영합니다, <span className="text-amber-400">{displayName}</span>님
        </h1>
        <p className="text-slate-400 text-base lg:text-2xl leading-relaxed max-w-3xl mx-auto font-medium">
          어려운 팀원 대화를 AI와 먼저 연습하고, 오늘 바로 써먹을 수 있는 피드백을 받아보세요.
        </p>
      </motion.div>

      {/* Scenario cards */}
      <motion.div variants={containerVariants} className="px-6 pb-8 lg:pb-10 space-y-4 lg:space-y-5 flex-1 max-w-6xl mx-auto w-full">
        <motion.p variants={itemVariants} className="text-xs lg:text-sm font-black text-slate-500 uppercase tracking-[0.22em] px-1 mb-2">
          지금 바로 시작할 수 있는 시나리오
        </motion.p>

        {CURATED.map((curated, idx) => {
          const scenario = SCENARIOS.find(s => s.id === curated.id);
          if (!scenario) return null;

          const avatarUrl = getCharacterAvatar(scenario.memberName, scenario.id);

          return (
            <motion.div
              key={curated.id}
              variants={itemVariants}
              whileHover={{ translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/setup', { state: { scenario, ...(!user && { guest: true }) } })}
              className="relative bg-[#111B2E]/60 backdrop-blur-md border border-white/5 rounded-2xl lg:rounded-[1.75rem] p-5 lg:p-7 cursor-pointer hover:border-amber-500/20 transition-all group overflow-hidden"
            >
              {/* Shimmer */}
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                whileInView={{ x: '200%', opacity: 0.3 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: idx * 0.15 }}
                className="pointer-events-none absolute inset-0 w-2/5 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              />

              <div className="flex items-center gap-4">
                {/* Avatar + grade badge */}
                <div className="relative shrink-0">
                  <div className="size-14 lg:size-16 rounded-xl lg:rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-amber-500/20 transition-all">
                    <img
                      src={avatarUrl}
                      alt={scenario.memberName}
                      className="size-full object-cover"
                    />
                  </div>
                  <span
                    className="absolute -top-2 -left-2 size-6 rounded-lg flex items-center justify-center text-[11px] font-black shadow-lg"
                    style={{
                      backgroundColor: curated.bg,
                      color: curated.color,
                      border: `1px solid ${curated.border}`,
                    }}
                  >
                    {curated.grade}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] lg:text-xs font-black uppercase tracking-[0.12em] px-2.5 py-1 rounded-md"
                      style={{ color: curated.color, backgroundColor: curated.bg }}
                    >
                      {curated.difficulty}
                    </span>
                  </div>
                  <h4 className="text-lg lg:text-2xl font-black text-white leading-tight group-hover:text-amber-400 transition-colors truncate">
                    {scenario.title}
                  </h4>
                  <p className="text-sm lg:text-base text-slate-500 mt-0.5 lg:mt-1 font-medium">{scenario.memberName}</p>
                </div>

                {/* Arrow */}
                <div className="shrink-0 size-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                  <span className="text-slate-500 group-hover:text-amber-400 transition-colors text-sm">&rsaquo;</span>
                </div>
              </div>

              {/* Step number */}
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-black text-slate-600">{idx + 1}/3</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA button */}
      <motion.div variants={itemVariants} className="px-6 pb-12 lg:pb-16 max-w-6xl mx-auto w-full">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => firstScenario && navigate('/setup', { state: { scenario: firstScenario, ...(!user && { guest: true }) } })}
          className="w-full py-5 lg:py-6 rounded-2xl lg:rounded-[1.75rem] bg-amber-500 text-slate-900 font-black text-base lg:text-lg uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
        >
          {user ? '시뮬레이션 시작하기' : '무료 체험 시작하기'}
          <span className="text-lg">&rarr;</span>
        </motion.button>
      </motion.div>

      {/* 유료 플랜 — 스크롤하면 무료 체험 아래로 자연스럽게 이어짐 */}
      <motion.section variants={itemVariants} className="border-t border-white/5 bg-[#0B1020] px-6 pt-14 lg:pt-20 pb-20 lg:pb-24">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80 font-bold mb-3">Continue only if you need more</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.03em] leading-tight text-white mb-4 break-keep">
              더 많은 시나리오를 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">반복 훈련</span>하고 싶다면
            </h2>
            <p className="text-slate-400 text-sm lg:text-base leading-7">
              무료 체험으로 가치를 확인한 뒤, 반복 훈련과 풀 리포트가 필요할 때만 플랜을 선택하세요.
            </p>
          </div>
          <PlansSection source="onboarding" loginRedirect="/onboarding" />
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Onboarding;
