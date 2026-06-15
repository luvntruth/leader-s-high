import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { SCENARIOS } from '../constants';
import { getCharacterAvatar } from '../services/characterAvatars';
import { supabase } from '../src/lib/supabase';
import { analyticsService } from '../services/analyticsService';
import { FREE_SCENARIO_IDS } from '../services/usageService';

/**
 * Spec v3 §4-B, §5.9: Pro 플랜 결제 직후 사용자가 40개 중 20개를 선택하는 화면.
 *
 * 진입 경로:
 *  - Pricing 에서 Pro 결제 성공 → navigate('/select-scenarios')
 *  - 직접 URL 접근은 AuthGuard 로 보호
 *
 * 저장:
 *  - supabase.profiles.selected_scenarios (JSONB, string[])
 *  - 완료 시 /onboarding 로 이동
 */
const SELECT_TARGET = 20;

// 무료 체험 3개는 Pro 에서도 보너스로 항상 제공되므로 선택 대상에서 제외.
// → 무료 제외 37개 중에서 20개를 직접 선택 (총 23개 이용).
const SELECTABLE_SCENARIOS = SCENARIOS.filter((s: any) => !(FREE_SCENARIO_IDS as readonly string[]).includes(s.id));

const intensityMeta = (intensity?: string) => {
  if (intensity === 'high') return { grade: 'S', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (intensity === 'medium') return { grade: 'A', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  return { grade: 'B', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)' };
};

const SelectScenarios: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기: 기존 선택값(edit mode) 로드
  useEffect(() => {
    if (profile?.selected_scenarios && profile.selected_scenarios.length > 0) {
      setSelected(new Set(profile.selected_scenarios));
    }
  }, [profile?.selected_scenarios]);

  // 접근 가드: Pro 플랜 아닌 유저는 진입 불가
  useEffect(() => {
    if (!profile) return;
    if (profile.plan !== 'pro') {
      // Free/Ultra 는 선택 불필요 → 홈으로 리다이렉트
      navigate('/', { replace: true });
    }
  }, [profile?.plan, navigate]);

  // 카테고리 필터
  const [activeCategory, setActiveCategory] = useState<string>('전체');
  const categories = useMemo(() => {
    const set = new Set<string>();
    SELECTABLE_SCENARIOS.forEach((s: any) => set.add(s.category));
    return ['전체', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === '전체') return SELECTABLE_SCENARIOS;
    return SELECTABLE_SCENARIOS.filter((s: any) => s.category === activeCategory);
  }, [activeCategory]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= SELECT_TARGET) return prev; // 상한 초과 방지
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user || selected.size !== SELECT_TARGET) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          selected_scenarios: Array.from(selected),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      analyticsService.track('scenario_selection_complete', {
        selected_scenario_ids: Array.from(selected),
        count: selected.size,
      }, user.id);

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e?.message || '저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  const progressPct = Math.round((selected.size / SELECT_TARGET) * 100);
  const remaining = SELECT_TARGET - selected.size;

  return (
    <div className="min-h-screen bg-[#060B18] text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#060B18]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300/80 mb-0.5">
                프로 플랜 시나리오 선택
              </p>
              <h1 className="text-lg sm:text-xl font-black text-white break-keep">
                직접 훈련할 시나리오 {SELECT_TARGET}개를 선택하세요
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 break-keep">
                무료 체험 3개는 그대로 이용 가능 · 고른 {SELECT_TARGET}개를 더해 총 {SELECT_TARGET + 3}개
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500 font-bold">선택</div>
              <div className="text-2xl font-black text-cyan-300 tabular-nums">
                {selected.size} / {SELECT_TARGET}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Category filter */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-slate-400 text-sm mb-5 leading-relaxed">
          각 카드를 눌러 선택/해제하세요. 선택이 완료되면 이번 결제 기간 동안 이 시나리오들을 반복 훈련할 수 있습니다.
          <br />
          <span className="text-slate-500 text-xs">※ 현재 결제 기간 중에는 변경이 불가합니다. 신중히 선택해주세요.</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((scenario: any) => {
            const isSelected = selected.has(scenario.id);
            const canSelect = selected.size < SELECT_TARGET || isSelected;
            const meta = intensityMeta(scenario.intensity);
            return (
              <button
                key={scenario.id}
                onClick={() => toggle(scenario.id)}
                disabled={!canSelect}
                className={`relative text-left p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                    : canSelect
                      ? 'bg-white/[0.03] border-white/10 hover:border-white/25'
                      : 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                }`}
              >
                {/* Selection checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 size-6 rounded-full bg-cyan-400 flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-slate-900 text-sm font-black">check</span>
                  </div>
                )}

                {/* Grade badge */}
                <span
                  className="inline-flex items-center justify-center size-5 rounded-md text-[10px] font-black mb-2"
                  style={{ backgroundColor: meta.bg, color: meta.color }}
                >
                  {meta.grade}
                </span>

                {/* Avatar */}
                <div className="mb-2 flex justify-center">
                  <div className="size-14 rounded-xl overflow-hidden border-2 border-white/10">
                    <img
                      src={getCharacterAvatar(scenario.memberName, scenario.id)}
                      alt={scenario.memberName}
                      className="size-full object-cover"
                    />
                  </div>
                </div>

                {/* Title */}
                <p className="text-[11px] font-black text-white leading-tight mb-0.5 line-clamp-2">
                  {scenario.title}
                </p>
                <p className="text-[9px] text-slate-500 line-clamp-1">
                  {scenario.memberName} · {scenario.category}
                </p>
              </button>
            );
          })}
        </div>
      </main>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#060B18] via-[#060B18] to-transparent pt-8 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="max-w-5xl mx-auto px-4">
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={selected.size !== SELECT_TARGET || saving}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] ${
              selected.size === SELECT_TARGET && !saving
                ? 'bg-gradient-to-r from-cyan-400 to-amber-400 text-slate-900 shadow-xl'
                : 'bg-slate-700/40 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saving
              ? '저장 중...'
              : selected.size === SELECT_TARGET
                ? `${SELECT_TARGET}개 선택 완료 — 시작하기 →`
                : `${remaining}개 더 선택해주세요`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectScenarios;
