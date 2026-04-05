import { motion } from 'framer-motion';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

export default function UpgradePrompt() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg text-center"
      >
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 mb-4">
            <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">무료 체험이 완료되었습니다!</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            3개 시나리오를 모두 경험하셨네요.<br />
            지금 바로 결제할 필요는 없습니다. 반복 훈련이 더 필요할 때만 프로 플랜으로 확장하세요.
          </p>
        </div>

        {/* 프로 플랜 */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500 font-black text-base">프로</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">대표 플랜</span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center mb-4">
            <p className="text-white font-bold text-lg">₩8,900</p>
            <p className="text-slate-400 text-xs">10일</p>
          </div>
          <ul className="space-y-1.5 text-sm">
            {[
              '20개 시나리오 · 시나리오당 최대 3회',
              '풀 피드백 리포트 · 이전 기록 비교',
              '실시간 즉시 코칭',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-amber-500 mt-0.5 text-xs">✓</span>{f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-sm uppercase tracking-wider transition-colors"
          >
            플랜 선택하기
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl text-slate-500 text-xs hover:text-slate-400 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
