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
        {/* 아이콘 */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 mb-4">
            <span className="text-4xl">🚀</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">무료 체험이 완료되었습니다!</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            3개 시나리오를 모두 경험하셨네요.<br />
            이제 프로 플랜으로 업그레이드하고<br />
            <span className="text-amber-400 font-semibold">본격적인 리더십 성장</span>을 시작하세요.
          </p>
        </div>

        {/* Pro 플랜 하이라이트 */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-6 text-left">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-500 font-black text-lg">프로</span>
            <span className="text-white font-bold text-lg">₩9,900</span>
            <span className="text-slate-400 text-sm">/ 월</span>
          </div>
          <ul className="space-y-3">
            {[
              { icon: '🎯', text: '20개 시나리오 사용', desc: '다양한 리더십 상황을 경험하세요' },
              { icon: '📊', text: '풀 피드백 리포트', desc: '5차원 역량 분석 + 구체적 코칭 포인트' },
              { icon: '📈', text: '이전 기록 보관 및 비교', desc: '회차별 성장 추이를 확인하세요' },
              { icon: '⚡', text: '실시간 즉시 코칭', desc: '대화 중 AI가 실시간으로 힌트 제공' },
              { icon: '🎙️', text: '음성 시뮬레이션', desc: '실제 대화처럼 음성으로 연습' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{item.text}</p>
                  <p className="text-slate-500 text-xs">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 울트라 플랜 간략 안내 */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 mb-8 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-black text-sm">울트라</span>
              <span className="text-white font-bold text-sm">₩29,900 / 월</span>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2 text-xs">
            {['40개 전체 시나리오', '타인과의 결과 비교', 'HR 대시보드', '커스텀 시나리오'].map((f, i) => (
              <li key={i} className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-400">{f}</li>
            ))}
          </ul>
        </div>

        {/* CTA 버튼 */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-sm uppercase tracking-wider transition-colors"
          >
            플랜 비교하고 업그레이드하기
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
