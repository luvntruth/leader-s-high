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
            이제 플랜을 선택하고 <span className="text-amber-400 font-semibold">본격적인 리더십 성장</span>을 시작하세요.
          </p>
        </div>

        {/* 프로 플랜 */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-4 text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500 font-black text-base">프로</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">인기</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">₩8,900</p>
              <p className="text-slate-400 text-xs">10일</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">₩13,500</p>
              <p className="text-slate-400 text-xs">20일</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {[
              '20개 시나리오 · 시나리오당 최대 3회',
              '풀 피드백 리포트 · 이전 기록 비교',
              '실시간 즉시 코칭 · 음성 시뮬레이션',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-amber-500 mt-0.5 text-xs">✓</span>{f}
              </li>
            ))}
          </ul>
        </div>

        {/* 울트라 플랜 */}
        <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-cyan-400 font-black text-base">울트라</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">₩17,900</p>
              <p className="text-slate-400 text-xs">15일</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg">₩24,500</p>
              <p className="text-slate-400 text-xs">25일</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {[
              '40개 전체 시나리오 · 시나리오당 최대 5회',
              '타인과의 결과 비교 리포트',
              'HR 대시보드 · 커스텀 시나리오',
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-300">
                <span className="text-cyan-400 mt-0.5 text-xs">✓</span>{f}
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
