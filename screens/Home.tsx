import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import { SCENARIOS } from '../constants';
import { getCharacterAvatar } from '../services/characterAvatars';
import { useAuth } from '../contexts/AuthContext';
import { usageService } from '../services/usageService';
import { dbService } from '../services/dbService';
import {
  ShieldCheck,
  BellRing,
  Cog,
  Flame,
  TrendingUp,
  History,
  Sword,
  ChevronRight,
  Users,
  Settings2,
  BadgeCheck
} from 'lucide-react';

/* Quest reward meta by intensity */
const getQuestMeta = (intensity: string) => {
  switch (intensity) {
    case '높음': return { grade: 'S', xp: 150, gold: 50, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', iconColor: '#ef4444' };
    case '중간': return { grade: 'A', xp: 120, gold: 0, color: '#FFB800', bg: 'rgba(255,184,0,0.15)', border: 'rgba(255,184,0,0.4)', iconColor: '#FFB800' };
    default: return { grade: 'B', xp: 80, gold: 0, color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', iconColor: '#10B981' };
  }
};

/* Category label mapping */
const getCategoryLabel = (cat: string) => {
  const map: Record<string, string> = {
    면담: '연봉 협상',
    갈등: '갈등 관리',
    피드백: '피드백',
    동기부여: '동기부여',
    보고: '성과 보고',
    코칭: '코칭',
    의사결정: '의사결정',
    위기관리: '위기관리',
  };
  return map[cat] || cat;
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [simCount, setSimCount] = useState(0);

  useEffect(() => {
    if (!user || !profile) return;
    dbService.getSimulationCount(user.id).then(setSimCount).catch(() => {});
  }, [user, profile]);

  /* User stats — DB 기반 + 폴백 */
  const userStats = {
    level: Math.floor(simCount / 2) + 1,
    title: simCount < 5 ? '루키 리더' : simCount < 10 ? '프로페셔널 매니저' : '엘리트 리더',
    xp: (simCount * 235) % 100,
    gold: simCount * 80,
    totalMissions: simCount,
    streak: 5,
    leadershipPower: Math.min(100, 50 + simCount * 3),
    leadershipGrowth: 5,
  };

  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeGrade, setActiveGrade] = useState('전체');

  const filteredScenarios = SCENARIOS.filter(s => {
    const categoryMatch = activeCategory === '전체' || s.category.includes(activeCategory);
    const gradeMatch = activeGrade === '전체' || getQuestMeta(s.intensity).grade === activeGrade;
    return categoryMatch && gradeMatch;
  });

  const questScenarios = filteredScenarios.slice(0, 4);

  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroParallax = useTransform(scrollYProgress, [0, 0.3], [0, prefersReducedMotion ? 0 : -24]);
  const cardParallax = useTransform(scrollYProgress, [0, 0.5], [0, prefersReducedMotion ? 0 : -14]);

  const iconClasses = {
    primary: 'size-5 text-primary',
    muted: 'size-4.5 text-slate-400',
    stat: 'size-5 text-slate-600',
    sectionLabel: 'text-[10px] font-black text-slate-500 uppercase tracking-[0.22em]'
  };

  const motionProfile = prefersReducedMotion
    ? {
      stagger: 0,
      delayStart: 0,
      riseDuration: 0.01,
      riseEasing: 'linear' as const,
      cardDuration: 0.01,
    }
    : {
      stagger: 0.1,
      delayStart: 0.04,
      riseDuration: 0.52,
      riseEasing: [0.22, 1, 0.36, 1] as const,
      cardDuration: 0.64,
    };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: motionProfile.stagger, delayChildren: motionProfile.delayStart }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0, filter: 'blur(4px)' },
    visible: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: { duration: motionProfile.riseDuration, ease: motionProfile.riseEasing as any }
    }
  };

  const questCardVariants: Variants = {
    hidden: { y: 26, opacity: 0, filter: 'blur(4px)' },
    visible: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 130,
        damping: 18,
        mass: 0.84,
        duration: motionProfile.cardDuration
      }
    }
  };

  const progressVariants: Variants = {
    hidden: { opacity: 0.25, scaleX: 0 },
    visible: {
      opacity: 1,
      scaleX: 1,
      transition: { duration: 1.15, ease: motionProfile.riseEasing as any }
    }
  };

  const shimmerMotion = prefersReducedMotion
    ? {
      barSweep: { duration: 0.01 },
      heroGlow: { duration: 0.01 },
    }
    : {
      barSweep: { duration: 2.2, repeat: Infinity, repeatDelay: 0.9, ease: 'linear' as const },
      heroGlow: { duration: 24, repeat: Infinity, ease: 'linear' as const },
    };

  const categoryOptions = ['전체', '요구사항', '갈등', '피드백', '코칭'];
  const gradeOptions = ['전체', 'S', 'A', 'B'];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col min-h-screen pb-24 lg:pb-8 bg-[#0B1120] font-manrope text-white"
    >

      {/* 무료 플랜 안내 배너 */}
      {profile?.plan === 'free' && (
        <motion.div variants={itemVariants} className="mx-4 mt-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 text-xs font-semibold">무료 체험</span>
            <button onClick={() => navigate('/pricing')} className="text-amber-500 text-xs font-bold hover:text-amber-400">업그레이드 →</button>
          </div>
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${Math.min(100, (simCount / 3) * 100)}%`,
              background: simCount >= 3 ? '#ef4444' : simCount >= 2 ? '#f59e0b' : '#22c55e'
            }} />
          </div>
          <p className="text-slate-400 text-[10px] mt-1.5">{simCount}/3 시나리오 사용 · {simCount >= 3 ? '프로로 업그레이드하세요' : `${3 - simCount}개 남음`}</p>
        </motion.div>
      )}

      {/* Top header bar */}
      <motion.header variants={itemVariants} className="sticky top-0 z-50 bg-[#0D1526]/95 backdrop-blur-xl border-b border-white/5">
        <div className="px-5 lg:px-8 py-3 flex items-center justify-between">
          {/* 좌측: 로고 */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <ShieldCheck className={iconClasses.primary} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-wider text-white uppercase">Leader's High</p>
              <p className="text-[8px] font-bold text-slate-500 tracking-[0.25em]">지휘 센터</p>
            </div>
          </div>

          {/* Center: profile + XP */}
          <div className="hidden lg:flex items-center gap-3">
            <img
              src={getCharacterAvatar('리더', undefined, 'neutral')}
              alt="Avatar"
              className="size-9 rounded-full border-2 border-primary/30 active:scale-95 transition-transform cursor-pointer"
            />
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-white tracking-tight">{userStats.title}</p>
              <span className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/40 text-[10px] font-black text-primary">
                LV.{userStats.level}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">XP</span>
                <div className="relative w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ x: '-130%' }}
                    animate={{ x: '260%' }}
                    transition={shimmerMotion.barSweep}
                    className="absolute inset-y-0 w-1/3 bg-white/25 blur-sm opacity-70"
                  />
                  <motion.div
                    variants={progressVariants}
                    initial="hidden"
                    animate="visible"
                    style={{ width: `${userStats.xp}%`, transformOrigin: 'left', }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: gold + actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-game-gold text-[10px]">G</span>
              <span className="text-xs font-bold text-white tabular-nums">{userStats.gold.toLocaleString()} G</span>
            </div>
            <button className="size-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 relative">
              <BellRing className={iconClasses.muted} />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary border-2 border-[#0D1526]" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="size-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
            >
              <Cog className={iconClasses.muted} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <motion.div variants={itemVariants} className="px-5 lg:px-8 py-6 space-y-6 flex-1">

        {/* Current objective hero */}
        <motion.section
          variants={itemVariants}
          className="relative overflow-hidden border border-white/5 rounded-3xl p-7 lg:p-10 min-h-[240px] flex flex-col justify-center group"
          style={{
            y: heroParallax,
            backgroundImage: `linear-gradient(to right, rgba(13, 21, 38, 0.98), rgba(13, 21, 38, 0.6)), url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay and ambient glow */}
          <div className="absolute inset-0 backdrop-blur-[0.5px] group-hover:backdrop-blur-0 transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-transparent opacity-60" />
          <motion.div
            style={{ y: cardParallax }}
            className="absolute -left-44 top-6 size-80 rounded-full bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-[80px] opacity-60"
            animate={{ rotate: 360 }}
            transition={shimmerMotion.heroGlow}
          />

          <div className="relative z-10">
            <motion.span
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6"
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              오늘의 임무가 당신을 바꾼다
            </motion.span>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl lg:text-5xl font-black tracking-tight text-white mb-5 leading-[1.1]"
            >
              어려운 대화,<br /><span className="text-primary italic">지금 연습하세요</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-slate-400 text-sm lg:text-base leading-relaxed max-w-xl mb-1 font-medium">
                팀원과의 갈등, 피드백, 동기부여...
                <span className="text-white font-bold underline decoration-primary/50 underline-offset-4"> 그 순간이 진짜 리더를 만듭니다.</span>
              </p>
              <p className="text-slate-500 text-xs lg:text-sm font-medium tracking-wide">
                AI 시뮬레이션으로 당신만의 리더십 언어를 찾아보세요.
              </p>
            </motion.div>
          </div>

          {/* Decorative gradient shape */}
          <div className="absolute -bottom-24 -right-24 size-64 bg-primary/20 rounded-full blur-[100px]" />
        </motion.section>

        {/* Two-column layout: Player stats + Active quests */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >

          {/* ===== LEFT: PLAYER STATS ===== */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="lg:col-span-3 space-y-5"
          >
            <p className={`${iconClasses.sectionLabel} px-1`}>역량 요약</p>

            {/* Total missions */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02, translateY: -2 }}
              onClick={() => alert(`[성과 리포트]\n완료한 미션: ${userStats.totalMissions}\n현재 칭호: ${userStats.title}`)}
              className="bg-[#111B2E]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 cursor-pointer hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-500 tracking-widest group-hover:text-primary transition-colors">누적 미션</p>
                <BadgeCheck className={`${iconClasses.stat} group-hover:text-primary group-hover:scale-110 transition-all`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{userStats.totalMissions}</span>
                <span className="text-xs text-slate-500 font-bold italic group-hover:text-slate-300 transition-colors tracking-widest">완료</span>
              </div>
            </motion.div>

            {/* Daily streak */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02, translateY: -2 }}
              onClick={() => alert(`[활동 기록]\n현재 ${userStats.streak}일 연속으로 학습 중입니다.\n꾸준함이 리더십을 만듭니다.`)}
              className="bg-[#111B2E]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 cursor-pointer hover:border-game-gold/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-500 tracking-widest group-hover:text-game-gold transition-colors">연속 기록</p>
                <Flame className="size-5 text-game-gold animate-bounce-slow" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{userStats.streak}</span>
                <span className="text-xs text-slate-500 font-bold italic group-hover:text-slate-300 transition-colors tracking-widest">일 연속</span>
              </div>
            </motion.div>

            {/* Leadership Power */}
            <motion.div
              variants={itemVariants}
              className="bg-[#111B2E]/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="size-4 text-emerald-400" />
                <p className="text-[10px] font-black text-slate-400 tracking-widest">리더십 파워</p>
                <span className="text-sm font-black text-white ml-auto">{userStats.leadershipPower}<span className="text-slate-600">/100</span></span>
              </div>
              <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
                <motion.div
                  initial={{ x: '-130%' }}
                  animate={{ x: '260%' }}
                  transition={shimmerMotion.barSweep}
                  className="absolute inset-y-0 w-1/3 bg-white/20 blur-sm opacity-75"
                />
                <motion.div
                  variants={progressVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ width: `${userStats.leadershipPower}%`, transformOrigin: 'left' }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-primary shadow-[0_0_15px_rgba(242,185,13,0.3)]"
                />
              </div>
              <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <span className="size-1 rounded-full bg-emerald-400 animate-ping" />
                +{userStats.leadershipGrowth}% 효율 상승
              </p>
            </motion.div>

            {/* View History Log */}
            <motion.button
              variants={itemVariants}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/insights')}
              className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-white/10 hover:border-white/10 transition-all font-bold"
            >
              <History className="size-4 text-slate-400" />
              <span className="text-xs text-slate-400 tracking-tight">미션 기록 보기</span>
            </motion.button>
          </motion.div>

          {/* ===== RIGHT: ACTIVE QUESTS ===== */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="lg:col-span-9 space-y-5"
          >
            {/* Header + filters */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sword className="size-4.5 text-primary" />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">오늘의 도전 과제</h3>
                </div>
                <button
                  onClick={() => navigate('/missions')}
                  className="group flex items-center gap-1 text-[11px] font-black text-primary uppercase tracking-wider hover:text-white transition-all"
                >
                  전체 보기 <ChevronRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Filter set */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 py-1">
                {/* 카테고리 (가로형) */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar shrink-0 pb-1">
                  {categoryOptions.map((cat) => (
                    <motion.button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      layout
                      className={`px-5 py-2 rounded-xl border transition-all shrink-0 text-xs font-bold
                       ${activeCategory === cat
                          ? 'bg-primary border-primary text-[#0B1120]'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10'}`}
                    >
                      {cat}
                    </motion.button>
                  ))}
                </div>

                {/* Grade filter */}
                <div className="flex bg-[#0D1526] p-1.5 rounded-2xl border border-white/10 shrink-0 shadow-inner">
                  {gradeOptions.map((label) => (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ y: -1 }}
                      key={label}
                      onClick={() => setActiveGrade(label)}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all tracking-tight
                         ${activeGrade === label
                          ? 'bg-white/10 text-white shadow-lg'
                          : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quest cards 2x2 grid */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {questScenarios.map((scenario, idx) => {
                const meta = getQuestMeta(scenario.intensity);
                const isFirst = idx === 0;
                const originalIndex = SCENARIOS.findIndex(s => s.id === scenario.id);
                const isLocked = !usageService.canAccessScenario(originalIndex, profile?.plan || 'free');
                return (
                  <motion.div
                    key={scenario.id}
                    variants={questCardVariants}
                    whileInView="visible"
                    initial="hidden"
                    viewport={{ once: true, amount: 0.2 }}
                    whileHover={{ translateY: isLocked ? 0 : -4 }}
                    className={`bg-[#111B2E]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 transition-all group relative overflow-hidden ${isLocked ? 'opacity-60 grayscale cursor-pointer' : 'hover:border-primary/20'}`}
                    onClick={isLocked ? () => navigate('/pricing') : undefined}
                  >
                    {/* Lock overlay for PRO-only scenarios */}
                    {isLocked && (
                      <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl">🔒</span>
                          <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-widest">PRO</span>
                        </div>
                      </div>
                    )}
                    <motion.div
                      initial={{ x: '-100%', opacity: 0 }}
                      whileInView={{ x: '140%', opacity: 0.35 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 w-2/5 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                    {/* Top: grade + avatar + category + time */}
                    <div className="flex items-start gap-4 mb-5">
                      {/* Grade badge + avatar */}
                      <div className="relative shrink-0">
                        <div className="size-14 rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-primary/20 transition-all">
                          <img
                            src={getCharacterAvatar(scenario.memberName, scenario.id)}
                            alt={scenario.memberName}
                            className="size-full object-cover"
                          />
                        </div>
                        <span
                          className="absolute -top-2 -left-2 size-6 rounded-lg flex items-center justify-center text-[11px] font-black shadow-lg"
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                            backdropFilter: 'blur(4px)'
                          }}
                        >
                          {meta.grade}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md"
                            style={{ color: meta.color, backgroundColor: meta.bg }}
                          >
                            {getCategoryLabel(scenario.category)}
                          </span>
                          {isFirst && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              2시간 남음
                            </span>
                          )}
                        </div>
                        <h4 className="text-[15px] font-black text-white leading-tight group-hover:text-primary transition-colors">{scenario.title}</h4>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 line-clamp-2 font-medium">
                      {scenario.description}
                    </p>

                    {/* 보상 + CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="size-1.5 rounded-full bg-game-gold" />
                          <span className="text-[11px] font-black text-game-gold tabular-nums transition-all group-hover:scale-110">{meta.xp} XP</span>
                        </div>
                        {meta.gold > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="size-1.5 rounded-full bg-game-hp" />
                            <span className="text-[11px] font-black text-game-hp tabular-nums transition-all group-hover:scale-110">{meta.gold} G</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLocked) {
                            navigate('/pricing');
                          } else {
                            navigate('/setup', { state: { scenario } });
                          }
                        }}
                        className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95
                          ${isLocked
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : isFirst
                              ? 'bg-primary text-[#0B1120] hover:shadow-primary/20'
                              : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                          }`}
                      >
                        {isLocked ? '🔒 PRO' : isFirst ? '미션 시작' : '상세 보기'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom utility cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 5 }}
            onClick={() => navigate('/team-office')}
            className="bg-[#111B2E]/50 border border-white/5 rounded-2xl p-6 flex items-center gap-6 text-left group hover:border-accent-purple/30 transition-all shadow-lg"
          >
            <div className="size-14 rounded-2xl bg-accent-purple/15 border border-accent-purple/20 flex items-center justify-center shrink-0 group-hover:bg-accent-purple/25 transition-all">
              <Users className="size-7 text-accent-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-white tracking-tight">HQ Operations</p>
              <p className="text-[12px] text-slate-500 mt-1 font-medium leading-normal">팀원 상태, 업무량, 우선순위를 실시간으로 확인합니다.</p>
            </div>
            <ChevronRight className="size-5 text-slate-600 group-hover:text-accent-purple group-hover:translate-x-1 transition-all" />
          </motion.button>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 5 }}
            onClick={() => navigate('/custom-lab')}
            className="bg-[#111B2E]/50 border border-white/5 rounded-2xl p-6 flex items-center gap-6 text-left group hover:border-primary/30 transition-all shadow-lg"
          >
            <div className="size-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-all">
              <Settings2 className="size-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-white tracking-tight">맞춤 시나리오 설계</p>
              <p className="text-[12px] text-slate-500 mt-1 font-medium leading-normal">상황과 성향을 조정해 고난도 훈련 미션을 생성합니다.</p>
            </div>
            <ChevronRight className="size-5 text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </motion.button>
        </motion.div>

      </motion.div>
    </motion.div>
  );
};

export default Home;
