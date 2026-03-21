import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { billingService } from '../services/billingService';
import type { PlanType } from '../src/types/database';

const plans: Array<{
  id: PlanType;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  popular?: boolean;
  cta: string;
  priceId?: string;
}> = [
  {
    id: 'free',
    name: '무료',
    price: '₩0',
    period: '월',
    desc: '리더십 훈련 첫 경험',
    features: [
      '3개 시나리오 체험',
      '12턴 시뮬레이션',
      '간략 피드백 리포트',
    ],
    cta: '현재 플랜',
  },
  {
    id: 'pro',
    name: '프로',
    price: '₩9,900',
    period: '월',
    popular: true,
    desc: '본격 리더십 성장',
    features: [
      '20개 시나리오 사용',
      '풀 피드백 리포트',
      '이전 기록 보관 및 비교',
      '실시간 즉시 코칭',
      '음성 시뮬레이션',
      '무제한 히스토리',
    ],
    cta: '프로 시작하기',
    priceId: 'price_pro_monthly',
  },
  {
    id: 'ultra',
    name: '울트라',
    price: '₩29,900',
    period: '월',
    desc: '리더십 마스터',
    features: [
      '40개 전체 시나리오',
      '풀 피드백 리포트',
      '타인과의 결과 비교 리포트',
      '이전 기록 보관 및 비교',
      'HR 관리자 대시보드',
      '조직 리더십 분석',
      '커스텀 시나리오 제작',
    ],
    cta: '울트라 시작하기',
    priceId: 'price_ultra_monthly',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const currentPlan = profile?.plan || 'free';

  const handleSelect = async (plan: typeof plans[number]) => {
    if (plan.id === currentPlan) return;
    if (plan.priceId) {
      await billingService.createCheckoutSession(plan.priceId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24 lg:pb-8">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">합리적인 가격, 확실한 성장</h1>
          <p className="text-slate-400">리더십 훈련에 투자하세요</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-6 border ${
                  plan.popular
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-slate-800/40 border-slate-700/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-900 text-xs font-bold">
                    가장 인기
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-white font-bold text-lg mb-0.5">{plan.name}</h3>
                  <p className="text-slate-500 text-xs mb-3">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm">/ {plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-amber-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelect(plan)}
                  disabled={isCurrent}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                      : plan.popular
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                        : 'bg-slate-700/50 hover:bg-slate-700 text-white border border-slate-600/50'
                  }`}
                >
                  {isCurrent ? '현재 플랜' : plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* 기능 비교 테이블 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <h2 className="text-xl font-bold text-white text-center mb-8">기능 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">기능</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">무료</th>
                  <th className="text-center py-3 px-4 text-amber-500 font-bold">프로</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">울트라</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ['시나리오 수', '3개', '20개', '40개'],
                  ['시뮬레이션 (12턴)', '3회', '월 30회', '무제한'],
                  ['피드백 리포트', '간략', '풀 리포트', '풀 리포트'],
                  ['이전 기록 비교', '—', '✓', '✓'],
                  ['타인 결과 비교', '—', '—', '✓'],
                  ['즉시 코칭', '—', '✓', '✓'],
                  ['음성 시뮬레이션', '—', '✓', '✓'],
                  ['HR 대시보드', '—', '—', '✓'],
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
