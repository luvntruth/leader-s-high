
import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SCENARIOS } from '../constants';
import { getCharacterAvatar, getCharacterInfo } from '../services/characterAvatars';
import { Scenario } from '../types';

/* ── 시나리오별 감정 말풍선 ── */
const THOUGHT_MAP: Record<string, { emoji: string; thought: string; color: string }> = {
  'late-comer':                 { emoji: '⏰', thought: '또 늦겠다...',         color: '#FFB800' },
  'team-clash':                 { emoji: '💥', thought: '이번 미팅이 걱정돼',   color: '#ef4444' },
  'feedback-defense':           { emoji: '🛡️', thought: '제 방식이 맞아요',     color: '#9F7AEA' },
  'quiet-resignation':          { emoji: '💔', thought: '더 이상 못 버텨...',   color: '#ef4444' },
  'overtime-refusal':           { emoji: '😤', thought: '칼퇴는 당연한 거야',   color: '#f97316' },
  'credit-stealer':             { emoji: '💰', thought: '이 성과는 내 거야',    color: '#FFB800' },
  'perfectionist':              { emoji: '✨', thought: '완벽해야만 해',         color: '#00F2FF' },
  'silent-struggle':            { emoji: '🔇', thought: '아무도 몰랐으면...',   color: '#6366f1' },
  'burnout':                    { emoji: '🔥', thought: '너무 지쳤어',           color: '#ef4444' },
  'gen-z-conflict':             { emoji: '🎮', thought: '꼰대 문화는 싫어',     color: '#10B981' },
  'new-hire-lost':              { emoji: '❓', thought: '뭘 어떻게 해야 하지?', color: '#94a3b8' },
  'presentation-anxiety':       { emoji: '😰', thought: '발표가 너무 떨려',     color: '#9F7AEA' },
  'always-last-minute':         { emoji: '⚡', thought: '마감 직전이 베스트',   color: '#FFB800' },
  'meeting-rambler':            { emoji: '💬', thought: '할 말이 아직 많아',    color: '#00F2FF' },
  'eighty-percent-finisher':    { emoji: '📋', thought: '80%면 됐지 않나?',     color: '#10B981' },
  'upward-feedback-averse':     { emoji: '🚫', thought: '그런 말은 아랫사람이', color: '#f97316' },
  'perfectionist-report-delay': { emoji: '📊', thought: '조금만 더 다듬어야',  color: '#9F7AEA' },
};

/* ── 강도 메타 ── */
function getIntensityMeta(intensity: string) {
  if (intensity === 'high') return { label: 'S등급', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', xp: 80 };
  if (intensity === 'medium') return { label: 'A등급', color: '#FFB800', bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.3)', xp: 50 };
  return { label: 'B등급', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', xp: 30 };
}

const TeamOffice: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /* 시나리오별로 캐릭터 정보 합치기 */
  const members = SCENARIOS.map(s => {
    const info = getCharacterInfo(s.id, s.memberName);
    const thought = THOUGHT_MAP[s.id] ?? { emoji: '💭', thought: '...', color: '#94a3b8' };
    const avatarUrl = getCharacterAvatar(s.memberName, s.id);
    const intensity = getIntensityMeta(s.intensity);
    return { scenario: s, info, thought, avatarUrl, intensity };
  });

  const selected = selectedMember ? members.find(m => m.scenario.id === selectedMember) : null;

  return (
    <div className="min-h-screen bg-[#060B18] text-white font-manrope flex flex-col overflow-hidden relative">

      {/* ── 오피스 분위기 배경 ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 수평 줄 오피스 패턴 */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,242,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,242,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        {/* 왼쪽 하단 암비언트 */}
        <div className="absolute bottom-0 left-0 size-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,242,255,0.04) 0%, transparent 70%)' }} />
        {/* 오른쪽 상단 암비언트 */}
        <div className="absolute top-0 right-0 size-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(159,122,234,0.05) 0%, transparent 70%)' }} />
      </div>

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(6,11,24,0.92)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="size-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight uppercase">Team Office</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">팀원 현황판</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/30">
          <div className="size-1.5 rounded-full bg-accent-green animate-pulse"></div>
          <span className="text-[9px] font-black text-accent-green uppercase">{members.length}명 재직 중</span>
        </div>
      </header>

      {/* ── 팀원 그리드 ── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar px-4 pt-6 pb-32 relative z-10">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center mb-6">
          팀원을 선택해 대화를 시작하세요
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {members.map(({ scenario, info, thought, avatarUrl, intensity }) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedMember(scenario.id)}
              onMouseEnter={() => setHoveredId(scenario.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative flex flex-col items-center pt-6 pb-4 px-3 rounded-[1.5rem] border transition-all active:scale-95 text-center group"
              style={{
                backgroundColor: hoveredId === scenario.id ? 'rgba(15,23,41,0.95)' : 'rgba(15,23,41,0.7)',
                borderColor: hoveredId === scenario.id ? intensity.border : 'rgba(255,255,255,0.06)',
                boxShadow: hoveredId === scenario.id ? `0 0 20px ${intensity.bg}` : 'none',
              }}
            >
              {/* 등급 뱃지 */}
              <div
                className="absolute top-3 left-3 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest"
                style={{ color: intensity.color, backgroundColor: intensity.bg, border: `1px solid ${intensity.border}` }}
              >
                {intensity.label}
              </div>

              {/* 생각 말풍선 */}
              <div
                className="absolute -top-3 right-3 max-w-[90px] px-2 py-1 rounded-xl rounded-br-none text-[8px] font-bold leading-tight z-10 whitespace-nowrap"
                style={{
                  backgroundColor: 'rgba(15,23,41,0.95)',
                  border: `1px solid ${thought.color}40`,
                  color: thought.color,
                }}
              >
                {thought.emoji} {thought.thought}
              </div>

              {/* 아바타 */}
              <div
                className="size-16 rounded-2xl overflow-hidden border-2 mb-3 transition-all"
                style={{
                  borderColor: hoveredId === scenario.id ? intensity.color : 'rgba(255,255,255,0.1)',
                  boxShadow: hoveredId === scenario.id ? `0 0 16px ${intensity.bg}` : 'none',
                }}
              >
                <img
                  src={avatarUrl}
                  alt={info.name}
                  className="size-full object-cover"
                  style={{ background: 'rgba(15,23,41,1)' }}
                />
              </div>

              {/* 이름 + 직책 */}
              <p className="text-[11px] font-black text-white truncate w-full">{info.name}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{info.role}</p>

              {/* XP */}
              <div className="mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]" style={{ color: intensity.color }}>bolt</span>
                <span className="text-[9px] font-black" style={{ color: intensity.color }}>+{intensity.xp} XP</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* ── 팀원 선택 상세 모달 ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="w-full max-w-sm rounded-[2.5rem] border overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
            style={{ backgroundColor: '#0F1729', borderColor: selected.intensity.border }}
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="p-6 flex items-center gap-4 border-b border-white/5">
              <div
                className="size-16 rounded-2xl overflow-hidden border-2 shrink-0"
                style={{ borderColor: selected.intensity.color, boxShadow: `0 0 20px ${selected.intensity.bg}` }}
              >
                <img src={selected.avatarUrl} alt={selected.info.name} className="size-full object-cover" style={{ background: 'rgba(15,23,41,1)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest"
                    style={{ color: selected.intensity.color, backgroundColor: selected.intensity.bg, border: `1px solid ${selected.intensity.border}` }}
                  >
                    {selected.intensity.label}
                  </span>
                </div>
                <h3 className="text-lg font-black">{selected.info.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selected.info.role} · {selected.scenario.generation}</p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="size-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* 생각 말풍선 */}
            <div className="px-6 pt-5 pb-2">
              <div
                className="flex items-start gap-3 p-4 rounded-2xl border"
                style={{ backgroundColor: `${selected.thought.color}08`, borderColor: `${selected.thought.color}25` }}
              >
                <span className="text-xl mt-0.5">{selected.thought.emoji}</span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: selected.thought.color }}>속마음</p>
                  <p className="text-sm font-bold text-slate-300 italic">"{selected.thought.thought}"</p>
                </div>
              </div>
            </div>

            {/* 시나리오 설명 */}
            <div className="px-6 py-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">시나리오</h4>
              <p className="text-sm font-black text-white mb-1">{selected.scenario.title}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{selected.scenario.description}</p>
            </div>

            {/* 보상 + 시작 버튼 */}
            <div className="px-6 pb-8 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: selected.intensity.bg, border: `1px solid ${selected.intensity.border}` }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: selected.intensity.color }}>bolt</span>
                  <span className="text-xs font-black" style={{ color: selected.intensity.color }}>+{selected.intensity.xp} XP</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-amber/10 border border-accent-amber/20">
                  <span className="material-symbols-outlined text-sm text-accent-amber">workspace_premium</span>
                  <span className="text-[10px] font-black text-accent-amber">배지 기회</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/setup', { state: { scenario: selected.scenario } })}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
                style={{
                  backgroundColor: selected.intensity.color,
                  color: '#060B18',
                  boxShadow: `0 0 20px ${selected.intensity.bg}`
                }}
              >
                <span className="material-symbols-outlined text-lg font-black">play_arrow</span>
                대화 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamOffice;
