
import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SCENARIOS } from '../constants';
import { getCharacterAvatar } from '../services/characterAvatars';

/* ── 퀘스트 등급 메타 ── */
const getQuestMeta = (intensity: string) => {
  switch (intensity) {
    case '높음': return { grade: 'S', xp: 150, gold: 50, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' };
    case '중간': return { grade: 'A', xp: 120, gold: 0, color: '#FFB800', bg: 'rgba(255,184,0,0.15)', border: 'rgba(255,184,0,0.4)' };
    default: return { grade: 'B', xp: 80, gold: 0, color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' };
  }
};

/* ── 카테고리 영문 라벨 ── */
const getCategoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    '면담': 'SALARY NEGOTIATION',
    '갈등 관리': 'CONFLICT MGMT',
    '피드백': 'FEEDBACK',
    '동기부여': 'MOTIVATION',
    '성과관리': 'REPORTING',
    '코칭': 'COACHING',
    '의사결정': 'DECISION',
    '위기관리': 'CRISIS MGMT',
  };
  return map[cat] || cat.toUpperCase();
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [questFilter, setQuestFilter] = useState<'all' | 'priority' | 'weekly'>('priority');

  /* 더미 유저 스탯 */
  const userStats = {
    level: 12,
    title: '엘리트 리더',
    xp: 45,       // % 기준
    gold: 2450,
    totalMissions: 30,
    streak: 5,
    leadershipPower: 78,
    leadershipGrowth: 5,
  };

  const questScenarios = SCENARIOS.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen pb-24 lg:pb-8 bg-[#0B1120] font-manrope text-white">

      {/* ═══════════════ TOP HEADER BAR ═══════════════ */}
      <header className="sticky top-0 z-50 bg-[#0D1526]/95 backdrop-blur-xl border-b border-white/5">
        <div className="px-5 lg:px-8 py-3 flex items-center justify-between">
          {/* 좌측: 로고 */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-base">shield</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-wider text-white">LEADER'S HIGH</p>
              <p className="text-[8px] font-bold text-slate-500 tracking-[0.25em] uppercase">Command Center</p>
            </div>
          </div>

          {/* 중앙: 프로필 + XP */}
          <div className="hidden lg:flex items-center gap-3">
            <img
              src={getCharacterAvatar('리더', undefined, 'neutral')}
              alt="Avatar"
              className="size-9 rounded-full border-2 border-primary/30"
            />
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-white">{userStats.title}</p>
              <span className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/40 text-[10px] font-black text-primary">
                LV.{userStats.level}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500">XP</span>
                <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${userStats.xp}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 골드 + 아이콘 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-game-gold text-xs">●</span>
              <span className="text-xs font-bold text-white">{userStats.gold.toLocaleString()} G</span>
            </div>
            <button className="size-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-slate-400 text-lg">notifications</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="size-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400 text-lg">settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <div className="px-5 lg:px-8 py-6 space-y-6 flex-1">

        {/* ── CURRENT OBJECTIVE 히어로 ── */}
        <section className="bg-[#111B2E] border border-white/5 rounded-2xl p-7 lg:p-9 relative overflow-hidden">
          {/* 미묘한 배경 그라데이션 */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/3 to-transparent" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Current Objective
            </span>

            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white mb-4 leading-tight">
              팀원 퇴사율 <span className="text-primary">0%</span> 도전
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed max-w-lg mb-1">
              현실적인 갈등 상황과 팀 관리 퀘스트를 통해 <span className="text-white font-bold">진정한 리더</span>로 거듭나세요.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
              게임처럼 익히는 팀장 리더십 시뮬레이션.
            </p>

            <div className="flex items-center gap-3 mt-7">
              <div className="flex -space-x-2">
                {SCENARIOS.slice(0, 3).map((s, i) => (
                  <img
                    key={i}
                    src={getCharacterAvatar(s.memberName, s.id)}
                    alt={s.memberName}
                    className="size-8 rounded-full border-2 border-[#111B2E] bg-slate-700"
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                <span className="text-slate-300 font-bold">3명</span>의 팀원이 당신의 결정을 기다립니다.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2-COLUMN LAYOUT: Player Stats + Active Quests ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ===== LEFT: PLAYER STATS ===== */}
          <div className="lg:col-span-3 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Player Stats</p>

            {/* Total Missions */}
            <div className="bg-[#111B2E] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Missions</p>
                <span className="material-symbols-outlined text-slate-600 text-base">swords</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{userStats.totalMissions}</span>
                <span className="text-xs text-slate-500 font-bold">cleared</span>
              </div>
            </div>

            {/* Current Streak */}
            <div className="bg-[#111B2E] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Current Streak</p>
                <span className="material-symbols-outlined text-game-gold text-base">local_fire_department</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{userStats.streak}</span>
                <span className="text-xs text-slate-500 font-bold">Days</span>
              </div>
            </div>

            {/* Leadership Power */}
            <div className="bg-[#111B2E] border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-emerald-400 text-xs">💚</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leadership Power</p>
                <span className="text-sm font-black text-white ml-auto">{userStats.leadershipPower}<span className="text-slate-600">/100</span></span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary animate-bar-fill"
                  style={{ width: `${userStats.leadershipPower}%` }}
                />
              </div>
              <p className="text-[10px] text-emerald-400 font-bold">
                📈 +{userStats.leadershipGrowth}% from last week
              </p>
            </div>

            {/* View History Log */}
            <button
              onClick={() => navigate('/insights')}
              className="w-full bg-[#111B2E] border border-white/5 rounded-xl p-4 flex items-center justify-center gap-2 hover:border-white/15 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-400 text-base">history</span>
              <span className="text-xs font-bold text-slate-400">View History Log</span>
            </button>
          </div>

          {/* ===== RIGHT: ACTIVE QUESTS ===== */}
          <div className="lg:col-span-9 space-y-4">
            {/* 헤더 + 필터 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">task_alt</span>
                <h3 className="text-base font-black text-white">Active Quests</h3>
              </div>
              <div className="flex gap-1.5">
                {(['all', 'priority', 'weekly'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setQuestFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                      ${questFilter === f
                        ? 'bg-white text-[#0B1120] border border-white'
                        : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/15'
                      }`}
                  >
                    {f === 'all' ? 'All' : f === 'priority' ? 'Priority' : 'Weekly'}
                  </button>
                ))}
              </div>
            </div>

            {/* 퀘스트 카드 2x2 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questScenarios.map((scenario, idx) => {
                const meta = getQuestMeta(scenario.intensity);
                const isFirst = idx === 0;
                return (
                  <div
                    key={scenario.id}
                    className="bg-[#111B2E] border border-white/5 rounded-xl p-5 hover:border-white/15 transition-all group relative overflow-hidden"
                  >
                    {/* 상단: 등급 + 캐릭터 아바타 + 카테고리 + 시간 */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* 등급 뱃지 */}
                      <div className="relative">
                        <img
                          src={getCharacterAvatar(scenario.memberName, scenario.id)}
                          alt={scenario.memberName}
                          className="size-10 rounded-xl"
                        />
                        <span
                          className="absolute -top-1.5 -left-1.5 size-5 rounded-md flex items-center justify-center text-[10px] font-black"
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.grade}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                        >
                          {getCategoryLabel(scenario.category)}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1.5 truncate">{scenario.title}</h4>
                      </div>

                      {isFirst && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 shrink-0">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          2h left
                        </span>
                      )}
                    </div>

                    {/* 설명 */}
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-4 line-clamp-2">
                      {scenario.description}
                    </p>

                    {/* 보상 + CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 font-bold">Rewards:</span>
                        <span className="text-[10px] font-bold text-game-gold">★ {meta.xp} XP</span>
                        {meta.gold > 0 && (
                          <span className="text-[10px] font-bold text-game-hp">♥ {meta.gold} G</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/setup', { state: { scenario } });
                        }}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                          ${isFirst
                            ? 'bg-white text-[#0B1120] hover:bg-slate-200'
                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-white/20'
                          }`}
                      >
                        {isFirst ? 'ACCEPT' : 'DETAILS'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 하단 퀵 액세스 2칸 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/team-office')}
            className="bg-[#111B2E] border border-white/5 rounded-xl p-5 flex items-center gap-5 text-left group hover:border-white/15 transition-all"
          >
            <div className="size-12 rounded-xl bg-accent-purple/15 border border-accent-purple/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-accent-purple text-xl">groups</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">팀 오피스 현황판</p>
              <p className="text-[11px] text-slate-500 mt-0.5">현재 팀원들의 상태와 업무 부하를 실시간으로 확인합니다.</p>
            </div>
            <span className="material-symbols-outlined text-slate-600 text-lg group-hover:translate-x-1 transition-transform">
              arrow_forward_ios
            </span>
          </button>

          <button
            onClick={() => navigate('/custom-lab')}
            className="bg-[#111B2E] border border-white/5 rounded-xl p-5 flex items-center gap-5 text-left group hover:border-white/15 transition-all"
          >
            <div className="size-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">tune</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">나만의 상황 커스텀 설계</p>
              <p className="text-[11px] text-slate-500 mt-0.5">원하는 난이도와 상황을 설정하여 모의 훈련을 진행합니다.</p>
            </div>
            <span className="material-symbols-outlined text-slate-600 text-lg group-hover:translate-x-1 transition-transform">
              arrow_forward_ios
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Home;
