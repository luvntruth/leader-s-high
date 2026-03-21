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
  features: string[];
  popular?: boolean;
  cta: string;
  priceId?: string;
}> = [
  {
    id: 'free',
    name: '스타터',
    price: '₩0',
    period: '월',
    features: [
      '월 5회 시뮬레이션',
      '기본 시나리오 10개',
      '시뮬레이션 후 AI 피드백',
      '기본 성장 리포트',
    ],
    cta: '현재 플랜',
  },
  {
    id: 'pro',
    name: '프로',
    price: '₩9,900',
    period: '월',
    popular: true,
    features: [
      '월 30회 시뮬레이션',
      '전체 40개 시나리오',
      '실시간 즉시 코칭',
      '음성 시뮬레이션',
      '상세 5차원 성장 분석',
      '시뮬레이션 히스토리 무제한',
    ],
    cta: '프로 시작하기',
    priceId: 'price_pro_monthly',
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈',
    price: '₩99,000',
    period: '인·월',
    features: [
      '무제한 시뮬레이션',
      '커스텀 시나리오 제작',
      'HR 관리자 대시보드',
      '조직 리더십 분석',
      '팀별 성과 비교',
      '전용 고객 지원',
      'API 연동',
    ],
    cta: '도입 문의하기',
    priceId: 'price_ent_monthly',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const currentPlan = profile?.plan || 'free';

  const handleSelect = async (plan: typeof plans[number]) => {
    if (plan.id === currentPlan) return;
    if (plan.id === 'enterprise') {
      window.open('mailto:contact@leadershigh.app?subject=엔터프라이즈 도입 문의', '_blank');
      return;
    }
    if (plan.priceId) {
      await billingService.createCheckoutSession(plan.priceId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-12">
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
                  <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
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

        <div className="text-center mt-8">
          <button onClick={() => navigate(-1)} className="text-slate-500 text-sm hover:text-slate-400">
            ← 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
