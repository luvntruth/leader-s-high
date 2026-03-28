import { useEffect, useState } from 'react';
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

// 대화 미리보기 데이터 — 실제 시뮬레이션 느낌
const DEMO_MESSAGES = [
  { role: 'model' as const, text: '...네, 뭐 팀장님이 그렇게 생각하시면 할 말은 없지만요.', trust: 32 },
  { role: 'user' as const, text: '철수씨 입장에서 어떤 점이 가장 힘들었는지 좀 더 이야기해줄 수 있어요?', trust: 32 },
  { role: 'model' as const, text: '...사실 프로젝트 마감 때문에 새벽까지 일한 적이 많은데, 지각 얘기만 나오면 좀 억울하긴 합니다.', trust: 48 },
  { role: 'user' as const, text: '그 부분은 제가 몰랐네요. 새벽까지 일한 건 정말 고생 많았어요.', trust: 48 },
  { role: 'model' as const, text: '감사합니다... 인정받는 느낌이 들어서 조금 마음이 놓이네요.', trust: 65 },
];

function DemoChat() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= DEMO_MESSAGES.length) {
      const resetTimer = setTimeout(() => setVisibleCount(0), 3000);
      return () => clearTimeout(resetTimer);
    }
    const timer = setTimeout(() => setVisibleCount(v => v + 1), 1800);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  const currentTrust = visibleCount > 0 ? DEMO_MESSAGES[Math.min(visibleCount - 1, DEMO_MESSAGES.length - 1)].trust : 25;

  return (
    <div className="w-full max-w-sm mx-auto lg:mx-0">
      <div className="bg-slate-900/80 border border-slate-700/40 rounded-2xl p-4 space-y-3">
        {/* 신뢰도 바 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">신뢰도</span>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              animate={{
                width: `${currentTrust}%`,
                backgroundColor: currentTrust < 40 ? '#ef4444' : currentTrust < 60 ? '#f59e0b' : '#10b981',
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: currentTrust < 40 ? '#ef4444' : currentTrust < 60 ? '#f59e0b' : '#10b981' }}>
            {currentTrust}
          </span>
        </div>

        {/* 메시지들 */}
        <div className="space-y-2 min-h-[180px]">
          {DEMO_MESSAGES.slice(0, visibleCount).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-500/20 text-amber-100 border border-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700/30'
              }`}>
                {msg.role === 'model' && <span className="text-[10px] text-slate-500 block mb-0.5">김철수</span>}
                {msg.text}
              </div>
            </motion.div>
          ))}
          {visibleCount < DEMO_MESSAGES.length && visibleCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex ${DEMO_MESSAGES[visibleCount].role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/20">
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
  );
}

const DIFF_POINTS = [
  { left: '항상 협조적인 AI', right: '적대적→설득됨 7단계 감정', icon: '🎭' },
  { left: '채점 없음', right: '5차원 신뢰도 실시간 채점', icon: '📊' },
  { left: '대화 후 끝', right: '누적 역량 추적 + 성장 경로', icon: '📈' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 이미 로그인된 사용자는 홈으로
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // 랜딩 페이지 조회 이벤트
  useEffect(() => {
    analyticsService.track('landing_view');
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-slate-950 text-white font-manrope"
    >
      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 lg:pt-24 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* 카피 */}
          <motion.div variants={itemVariants} className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-bold tracking-wide">AI 리더십 시뮬레이션</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight leading-tight mb-4">
              팀원과의 어려운 대화,<br />
              <span className="text-amber-400">AI와 먼저 연습하세요</span>
            </h1>
            <p className="text-slate-400 text-sm lg:text-base leading-relaxed max-w-md mx-auto lg:mx-0 mb-8">
              성과 면담, 갈등 조정, 동기부여... 신임 팀장이 가장 어려워하는 대화를
              AI 팀원과 실전처럼 연습하고, 5차원 리더십 피드백을 받으세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => navigate('/onboarding')}
                className="px-8 py-4 bg-amber-500 text-slate-900 font-black rounded-xl text-sm hover:bg-amber-400 active:scale-95 transition-all min-h-[44px]"
              >
                지금 바로 연습해보기 →
              </button>
              <p className="text-slate-500 text-xs self-center">가입 없이 바로 체험</p>
            </div>
          </motion.div>

          {/* 대화 미리보기 */}
          <motion.div variants={itemVariants} className="flex-1 w-full max-w-md">
            <DemoChat />
          </motion.div>
        </div>
      </section>

      {/* ── 차별화 비교표 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <motion.div variants={itemVariants}>
          <h2 className="text-center text-lg font-bold text-slate-300 mb-8">
            ChatGPT에 물어보는 것과 <span className="text-amber-400">뭐가 다른가요?</span>
          </h2>
          <div className="space-y-3">
            {DIFF_POINTS.map((point, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/60 rounded-xl p-4"
              >
                <span className="text-2xl shrink-0">{point.icon}</span>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">범용 AI</span>
                    <span className="text-slate-500 text-sm line-through decoration-slate-700">{point.left}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-500/70 uppercase tracking-wider block mb-0.5">Leader's High</span>
                    <span className="text-white text-sm font-semibold">{point.right}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── 가격 요약 ── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <motion.div variants={itemVariants} className="text-center">
          <h2 className="text-lg font-bold text-slate-300 mb-2">부담 없이 시작하세요</h2>
          <p className="text-slate-500 text-sm mb-8">무료로 3개 시나리오를 체험한 후 결정하세요</p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 text-center">
              <p className="text-slate-400 text-xs mb-1">무료 체험</p>
              <p className="text-2xl font-black text-white">₩0</p>
              <p className="text-slate-500 text-xs mt-1">3개 시나리오</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 text-center relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">인기</span>
              <p className="text-amber-400 text-xs mb-1">프로</p>
              <p className="text-2xl font-black text-white">₩8,900<span className="text-sm font-normal text-slate-400">~</span></p>
              <p className="text-slate-500 text-xs mt-1">20개 시나리오 · 10일~</p>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 text-center">
              <p className="text-cyan-400 text-xs mb-1">울트라</p>
              <p className="text-2xl font-black text-white">₩17,900<span className="text-sm font-normal text-slate-400">~</span></p>
              <p className="text-slate-500 text-xs mt-1">40개 시나리오 · 15일~</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 하단 CTA ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <motion.div variants={itemVariants} className="text-center bg-slate-900/60 border border-slate-800/60 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">이번 주 성과 면담이 있으신가요?</h2>
          <p className="text-slate-400 text-sm mb-6">10분이면 충분합니다. AI 팀원과 먼저 연습해보세요.</p>
          <button
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-amber-500 text-slate-900 font-black rounded-xl text-sm hover:bg-amber-400 active:scale-95 transition-all min-h-[44px]"
          >
            무료로 시작하기 →
          </button>
        </motion.div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="max-w-4xl mx-auto px-6 pb-8 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
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
