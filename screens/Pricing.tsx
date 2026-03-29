import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, PAYMENT_OPTIONS } from '../services/paymentService';

export default function Pricing() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const currentPlan = profile?.plan || 'free';
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const remainingDays = paymentService.getRemainingDays(profile?.plan_expires_at || null);
  const isExpired = profile?.plan !== 'free' && paymentService.isPlanExpired(profile?.plan_expires_at || null);

  const handlePurchase = async (optionId: string) => {
    if (!user || !profile) return;
    const option = PAYMENT_OPTIONS.find(o => o.id === optionId);
    if (!option) return;

    setLoading(optionId);
    setResult(null);

    const res = await paymentService.requestPayment(option, {
      id: user.id,
      email: user.email || profile.email,
    });

    setLoading(null);
    setResult({ ok: res.success, msg: res.message });

    if (res.success) {
      await refreshProfile();
      setTimeout(() => navigate('/'), 2000);
    }
  };

  const proOptions = PAYMENT_OPTIONS.filter(o => o.plan === 'pro');
  const ultraOptions = PAYMENT_OPTIONS.filter(o => o.plan === 'ultra');

  return (
    <div className="min-h-screen bg-slate-950 pb-24 lg:pb-8">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">리더십 훈련, 나에게 맞는 플랜으로</h1>
          <p className="text-slate-400 text-sm">기간제로 부담 없이 시작하세요</p>
          {isExpired && (
            <p className="text-red-400 text-sm mt-2">현재 플랜이 만료되었습니다. 새 플랜을 구매해주세요.</p>
          )}
          {!isExpired && currentPlan !== 'free' && (
            <p className="text-amber-400 text-sm mt-2">현재 {currentPlan === 'pro' ? '프로' : '울트라'} · 남은 기간: {remainingDays}일</p>
          )}
        </motion.div>

        {/* 결제 결과 메시지 */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl text-center text-sm font-semibold ${
              result.ok ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {result.msg}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 무료 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 border bg-slate-800/40 border-slate-700/30"
          >
            <h3 className="text-white font-bold text-lg mb-1">무료 체험</h3>
            <p className="text-slate-500 text-xs mb-4">리더십 훈련 첫 경험</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-black text-white">₩0</span>
            </div>
            <ul className="space-y-2.5 mb-8">
              {['3개 시나리오 체험', '시나리오당 1회 시도', '12턴 시뮬레이션', '간략 피드백 리포트'].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-slate-500 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-3 rounded-xl bg-slate-700/50 text-slate-500 text-sm font-semibold cursor-not-allowed">
              {currentPlan === 'free' ? '현재 플랜' : '무료 체험'}
            </button>
          </motion.div>

          {/* 프로 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl p-6 border bg-amber-500/5 border-amber-500/30"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-900 text-xs font-bold">
              가장 인기
            </div>
            <h3 className="text-amber-400 font-bold text-lg mb-1">프로</h3>
            <p className="text-slate-500 text-xs mb-4">본격 리더십 성장</p>

            <div className="space-y-3 mb-6">
              {proOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handlePurchase(opt.id)}
                  disabled={loading === opt.id}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-500/20 hover:border-amber-500/50 bg-slate-800/40 hover:bg-amber-500/5 transition-all group"
                >
                  <div className="text-left">
                    <span className="text-white text-sm font-bold">₩{opt.amount.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-2">/ {opt.days}일</span>
                  </div>
                  <span className="text-amber-500 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    {loading === opt.id ? '처리 중...' : '결제하기 →'}
                  </span>
                </button>
              ))}
            </div>

            <ul className="space-y-2">
              {['20개 시나리오 · 시나리오당 3회까지 도전 가능', '풀 피드백 리포트', '이전 기록 보관 및 비교', '실시간 즉시 코칭'].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-500 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 울트라 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 border bg-cyan-500/5 border-cyan-500/20"
          >
            <h3 className="text-cyan-400 font-bold text-lg mb-1">울트라</h3>
            <p className="text-slate-500 text-xs mb-4">리더십 마스터</p>

            <div className="space-y-3 mb-6">
              {ultraOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handlePurchase(opt.id)}
                  disabled={loading === opt.id}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 bg-slate-800/40 hover:bg-cyan-500/5 transition-all group"
                >
                  <div className="text-left">
                    <span className="text-white text-sm font-bold">₩{opt.amount.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs ml-2">/ {opt.days}일</span>
                  </div>
                  <span className="text-cyan-400 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    {loading === opt.id ? '처리 중...' : '결제하기 →'}
                  </span>
                </button>
              ))}
            </div>

            <ul className="space-y-2">
              {['40개 전체 시나리오 · 시나리오당 5회까지 도전 가능', '풀 피드백 리포트', '타인과의 결과 비교 리포트', '이전 기록 비교', '커스텀 시나리오'].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-cyan-400 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* 기능 비교 테이블 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16">
          <h2 className="text-xl font-bold text-white text-center mb-8">기능 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">기능</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">무료</th>
                  <th className="text-center py-3 px-4 text-amber-500 font-bold">프로</th>
                  <th className="text-center py-3 px-4 text-cyan-400 font-medium">울트라</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ['시나리오 수', '3개', '20개', '40개'],
                  ['시나리오당 시도', '1회', '최대 3회', '최대 5회'],
                  ['사용 기간', '무제한', '10일 / 20일', '15일 / 25일'],
                  ['피드백 리포트', '간략', '풀 리포트', '풀 리포트'],
                  ['이전 기록 비교', '—', '✓', '✓'],
                  ['타인 결과 비교', '—', '—', '✓'],
                  ['즉시 코칭', '—', '✓', '✓'],
                  ['커스텀 시나리오', '—', '—', '✓'],
                ].map(([feature, free, pro, ultra], idx) => (
                  <tr key={idx} className="border-b border-slate-800/50">
                    <td className="py-3 px-4 text-slate-400">{feature}</td>
                    <td className="py-3 px-4 text-center">{free}</td>
                    <td className="py-3 px-4 text-center font-medium">{pro}</td>
                    <td className="py-3 px-4 text-center">{ultra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="text-center mt-8">
          <button onClick={() => navigate(-1)} className="text-slate-500 text-sm hover:text-slate-400">
            ← 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
