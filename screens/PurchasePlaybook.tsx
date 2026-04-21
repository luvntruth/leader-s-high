
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, REPORT_PAYMENT_OPTION } from '../services/paymentService';
import { dbService } from '../services/dbService';
import { supabase } from '../src/lib/supabase';

const STORAGE_KEY = 'leadershigh_pending_purchase';

interface PurchaseData {
  transcript: Array<{ role: string; text: string }>;
  scenario: {
    id: string;
    title: string;
    category: string;
    description: string;
    memberName: string;
    generation: string;
  } | null;
  sosTipHistory: string[];
  evaluation: Record<string, unknown> | null;
}

export default function PurchasePlaybook() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [data, setData] = useState<PurchaseData | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [savedSimId, setSavedSimId] = useState<string | null>(null);

  useEffect(() => {
    // location.state 우선, 없으면 sessionStorage
    const state = location.state as any;
    if (state?.transcript) {
      setData(state as PurchaseData);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setData(JSON.parse(stored));
      } else {
        navigate('/', { replace: true });
      }
    }
  }, []);

  const handlePurchase = async () => {
    if (!user || !data) return;
    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      // 0. 신규 가입 직후 race condition 방지: profiles 행 생성 대기 (최대 3초)
      for (let i = 0; i < 6; i++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        if (profile) break;
        await new Promise(r => setTimeout(r, 500));
      }

      // 1. 시뮬레이션 DB 저장 (simulationId 확보)
      const simId = await dbService.saveSimulation({
        user_id: user.id,
        org_id: null,
        scenario_id: data.scenario?.id || 'guest',
        scenario_title: data.scenario?.title || '시뮬레이션',
        scenario_category: data.scenario?.category || null,
        character_name: data.scenario?.memberName || '팀원',
        character_generation: data.scenario?.generation || null,
        transcript: (data.transcript || []) as any,
        message_count: (data.transcript || []).length,
        duration_seconds: null,
        final_trust: null,
        trust_history: [],
        trust_dimensions: null,
        feedback: data.evaluation || null,
        coaching_skills: (data.evaluation as any)?.coachingSkills || null,
        radar_chart: (data.evaluation as any)?.radarChart || null,
        leadership_type: null,
        communication_pattern: null,
        memo: '',
        tags: [],
      });

      if (!simId) throw new Error('시뮬레이션 저장에 실패했습니다. 다시 시도해주세요.');
      setSavedSimId(simId);

      // 2. PortOne 결제
      const result = await paymentService.purchaseReport(simId, {
        id: user.id,
        email: user.email || '',
      });

      if (!result.success) {
        setPurchaseError(result.message);
        return;
      }

      // 3. 성공 처리
      sessionStorage.removeItem(STORAGE_KEY);
      setSuccess(true);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : '구매 중 오류가 발생했습니다.');
    } finally {
      setIsPurchasing(false);
    }
  };

  // ── 성공 화면 ──────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-amber-400 text-3xl">auto_awesome</span>
        </div>
        <h2 className="text-white font-black text-xl mb-2">플레이북이 저장됐어요!</h2>
        <p className="text-slate-400 text-sm mb-2">
          <span className="text-amber-400 font-bold">{data?.scenario?.title || '시뮬레이션'}</span> 전문가 코칭 플레이북이<br />
          마이페이지에 저장되었습니다.
        </p>
        <p className="text-slate-600 text-xs mb-8">마이페이지 → 구매 플레이북에서 언제든 다시 볼 수 있어요.</p>

        <div className="w-full max-w-sm space-y-3">
          {/* Spec v3 §5.7: 성공 화면 2-button (마이페이지 · 홈) */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-black text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">menu_book</span>
            마이페이지에서 플레이북 보기
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl bg-slate-800/60 border border-slate-700/40 text-white font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">home</span>
            홈으로
          </button>
          <button
            onClick={() => navigate('/setup')}
            className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors py-2"
          >
            다른 시나리오 체험하러 가기 →
          </button>
        </div>
      </div>
    );
  }

  // ── 데이터 로딩 중 ──────────────────────────────
  if (!data) {
    return (
      <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 구매 화면 ──────────────────────────────────
  return (
    <div className="min-h-screen bg-[#060B18] text-white pb-16 overflow-y-auto">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[#060B18]/95 backdrop-blur border-b border-slate-700/30 px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <span className="text-white font-bold text-sm">전문가 코칭 플레이북 구매</span>
      </div>

      <div className="max-w-sm mx-auto px-5 py-8 space-y-6">
        {/* 시나리오 정보 */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">대상 시나리오</p>
          <p className="text-white font-bold text-sm">{data.scenario?.title || '시뮬레이션'}</p>
          <p className="text-slate-500 text-xs mt-0.5">{data.scenario?.category || ''}</p>
        </div>

        {/* 플레이북 구성 */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/25 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-amber-400 text-lg">auto_awesome</span>
            <h2 className="text-amber-400 font-black text-sm">전문가 코칭 플레이북</h2>
          </div>
          <ul className="space-y-3 mb-5">
            {[
              { icon: 'route', title: '3단계 대화 전략', desc: '어떤 말을, 어떤 순서로 해야 하는지 단계별 가이드' },
              { icon: 'forum', title: '상황별 핵심 문장', desc: '내 대화에서 가장 중요했던 순간의 실전 스크립트' },
              { icon: 'psychology', title: '심리적 트리거 분석', desc: '상대방의 반응을 바꾸는 언어 패턴 해설' },
              { icon: 'workspace_premium', title: '리더십 코치 총평', desc: '전문 코치 시각의 심층 피드백 + 다음 연습 방향' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="size-7 shrink-0 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-[14px]">{item.icon}</span>
                </span>
                <div>
                  <p className="text-white text-xs font-bold">{item.title}</p>
                  <p className="text-slate-500 text-[11px]">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* 가격 */}
          <div className="flex items-center justify-between py-3 border-t border-amber-500/15">
            <span className="text-slate-400 text-xs">플레이북 1건</span>
            <span className="text-amber-400 font-black text-lg">₩{REPORT_PAYMENT_OPTION.amount.toLocaleString()}</span>
          </div>
        </div>

        {/* 에러 메시지 */}
        {purchaseError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {purchaseError}
          </div>
        )}

        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
          <p className="text-white text-sm font-bold mb-1">먼저 간략 리포트에서 가치를 확인하셨죠.</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            이 플레이북은 무료 리포트의 다음 단계입니다. 실제 면담에서 바로 쓸 수 있는 문장과 전략이 더 필요할 때만 구매하면 됩니다.
          </p>
        </div>

        {/* 구매 버튼 */}
        <button
          onClick={handlePurchase}
          disabled={isPurchasing}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-black text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPurchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              결제 처리 중...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">credit_card</span>
              ₩{REPORT_PAYMENT_OPTION.amount.toLocaleString()} 결제하기
            </>
          )}
        </button>

        <p className="text-slate-600 text-[11px] text-center">
          구매 후 마이페이지 &gt; 히스토리에서 언제든 다시 확인하실 수 있습니다.
        </p>

        <button
          onClick={() => navigate('/setup')}
          className="w-full text-slate-500 text-xs hover:text-slate-400 transition-colors text-center py-2"
        >
          지금은 건너뛰고 시나리오 더 체험하기 →
        </button>
      </div>
    </div>
  );
}
