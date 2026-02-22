
import React from 'react';

/* ════════════════════════════════════════════
   GameUIComponents — 게임풍 UI 공통 컴포넌트
   ════════════════════════════════════════════ */

/* ── HP / Trust 바 ── */
interface HPBarProps {
    value: number;       // 0 ~ 100
    max?: number;
    label?: string;
    colorClass?: string; // tailwind bg-색상 (기본: 자동 — 높을수록 초록, 낮을수록 빨강)
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    animate?: boolean;
}

export const HPBar: React.FC<HPBarProps> = ({
    value, max = 100, label, colorClass, size = 'md', showValue = true, animate = true
}) => {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const isCritical = pct < 30;
    const autoColor = pct >= 60 ? 'bg-game-xp' : pct >= 30 ? 'bg-accent-amber' : 'bg-game-hp';
    const bg = colorClass || autoColor;
    const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

    return (
        <div className={`w-full transition-all duration-500 ${isCritical ? 'pulse-red rounded-xl p-2 -m-2 border border-red-500/0' : ''}`}>
            {(label || showValue) && (
                <div className="flex items-center justify-between mb-1.5 px-1">
                    {label && (
                        <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isCritical ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                            {isCritical && <span className="material-symbols-outlined text-[10px]">warning</span>}
                            {label}
                        </span>
                    )}
                    {showValue && <span className={`text-[10px] font-black tabular-nums ${isCritical ? 'text-red-400' : 'text-slate-400'}`}>{value}/{max}</span>}
                </div>
            )}
            <div className={`${heights[size]} rounded-full bg-white/5 overflow-hidden relative border border-white/5`}>
                <div
                    className={`h-full rounded-full ${bg} ${animate ? 'animate-bar-fill' : ''} relative shadow-[0_0_15px_rgba(0,0,0,0.3)]`}
                    style={{ width: `${pct}%`, transformOrigin: 'left' }}
                >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                </div>
                {/* 세그먼트 마크 */}
                {size !== 'sm' && (
                    <div className="absolute inset-0 flex">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="flex-1 border-r border-white/5 last:border-r-0" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


/* ── XP / 보상 뱃지 ── */
interface XPBadgeProps {
    xp: number;
    colorClass?: string;
    icon?: string;
}

export const XPBadge: React.FC<XPBadgeProps> = ({ xp, colorClass = 'text-game-xp', icon = 'bolt' }) => (
    <div className={`game-badge ${colorClass}`}
        style={{
            backgroundColor: 'currentColor',
            WebkitBackgroundClip: 'unset',
        }}
    >
        <div className="flex items-center gap-1 text-navy-deep">
            <span className="material-symbols-outlined text-[11px]">{icon}</span>
            <span>+{xp} XP</span>
        </div>
    </div>
);


/* ── 퀘스트 등급 뱃지 ── */
interface QuestGradeBadgeProps {
    grade: 'S' | 'A' | 'B' | string;
    size?: 'sm' | 'md' | 'lg';
}

const GRADE_STYLES: Record<string, { color: string; bg: string; border: string; glow: string }> = {
    S: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', glow: '0 0 12px rgba(239,68,68,0.3)' },
    A: { color: '#FFB800', bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.35)', glow: '0 0 12px rgba(255,184,0,0.3)' },
    B: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', glow: '0 0 12px rgba(16,185,129,0.3)' },
};

export const QuestGradeBadge: React.FC<QuestGradeBadgeProps> = ({ grade, size = 'md' }) => {
    const style = GRADE_STYLES[grade] || GRADE_STYLES['B'];
    const sizes = { sm: 'text-[9px] px-2 py-0.5', md: 'text-[10px] px-2.5 py-1', lg: 'text-xs px-3 py-1.5' };

    return (
        <span
            className={`font-black rounded-md uppercase tracking-widest ${sizes[size]} shadow-sm`}
            style={{
                color: style.color,
                backgroundColor: style.bg,
                border: `1px solid ${style.border}`,
                boxShadow: `inset 0 0 10px ${style.border}`,
            }}
        >
            {grade}등급
        </span>
    );
};

/* ── 육각형/마름모 프리미엄 등급 배지 ── */
export const QuestHexBadge: React.FC<{ grade: string, size?: 'sm' | 'md' | 'lg' }> = ({ grade, size = 'md' }) => {
    const style = GRADE_STYLES[grade] || GRADE_STYLES['B'];
    const sizes = {
        sm: 'size-6 text-[10px]',
        md: 'size-10 text-sm',
        lg: 'size-14 text-xl'
    };

    return (
        <div className={`relative ${sizes[size]} flex items-center justify-center font-black group`}>
            {/* 육각형 배경 (CSS Polygon) */}
            <div
                className="absolute inset-0 transition-all duration-500"
                style={{
                    backgroundColor: style.bg,
                    border: `2px solid ${style.border}`,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    boxShadow: `0 0 15px ${style.border}`,
                }}
            />
            {/* 내부 글로우 */}
            <div
                className="absolute inset-1 opacity-40 animate-pulse"
                style={{
                    backgroundColor: style.color,
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                }}
            />
            <span className="relative z-10" style={{ color: style.color, textShadow: `0 0 8px ${style.color}80` }}>
                {grade}
            </span>
        </div>
    );
};

/* ── 등급 뱃지가 포함된 아바타 (보스 요청 스타일) ── */
interface AvatarWithGradeProps {
    src: string;
    grade: string;
    size?: 'sm' | 'md' | 'lg';
    glowColor?: string;
}

export const AvatarWithGrade: React.FC<AvatarWithGradeProps> = ({
    src, grade, size = 'md', glowColor
}) => {
    const frameSizes = { sm: 'size-16', md: 'size-24', lg: 'size-32' };
    const badgePositions = { sm: '-top-1 -left-1 scale-[0.7]', md: '-top-2 -left-2', lg: '-top-3 -left-3 scale-[1.3]' };

    return (
        <div className={`relative ${frameSizes[size]} group`}>
            {/* 아바타 프레임 */}
            <div
                className="absolute inset-0 rounded-2xl bg-[#1e293b] border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 group-hover:border-primary/50"
                style={{ boxShadow: glowColor ? `0 0 30px ${glowColor}40` : 'none' }}
            >
                <img src={src} alt="Avatar" className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" />

                {/* 하단 그라데이션 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
            </div>

            {/* 등급 뱃지 오버레이 (Hex Badge) */}
            <div className={`absolute ${badgePositions[size]} z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]`}>
                <QuestHexBadge grade={grade} size="sm" />
            </div>

            {/* 장식용 코너 라인 */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br-lg" />
        </div>
    );
};


/* ── 게임 섹션 헤더 ── */
interface GameSectionHeaderProps {
    title: string;
    subtitle?: string;
    icon?: string;
    iconColor?: string;
    count?: number;
    rightElement?: React.ReactNode;
}

export const GameSectionHeader: React.FC<GameSectionHeaderProps> = ({
    title, subtitle, icon, iconColor = 'text-primary', count, rightElement
}) => (
    <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
            {icon && (
                <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className={`material-symbols-outlined text-base ${iconColor}`}>{icon}</span>
                </div>
            )}
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
                    {count !== undefined && (
                        <span className="text-[9px] font-black text-primary/60">[{count}]</span>
                    )}
                </div>
                {subtitle && <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {rightElement}
            <div className="h-px flex-1 min-w-[40px] bg-white/5" />
        </div>
    </div>
);


/* ── 미니 레이더 차트 (SVG) ── */
interface StatsRadarMiniProps {
    stats: { label: string; value: number }[];  // value 0~100
    size?: number;
    color?: string;
}

export const StatsRadarMini: React.FC<StatsRadarMiniProps> = ({
    stats, size = 120, color = 'rgba(0,242,255,0.6)'
}) => {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 16;
    const n = stats.length;

    const getPoint = (i: number, val: number) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const dist = (val / 100) * r;
        return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
    };

    const dataPoints = stats.map((s, i) => getPoint(i, s.value));
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
            {/* 배경 링 */}
            {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                <polygon
                    key={i}
                    points={Array.from({ length: n }).map((_, j) => {
                        const p = getPoint(j, scale * 100);
                        return `${p.x},${p.y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                />
            ))}
            {/* 축 라인 */}
            {stats.map((_, i) => {
                const p = getPoint(i, 100);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
            })}
            {/* 데이터 영역 */}
            <polygon points={dataPath.replace(/[MLZ]/g, ' ').trim()} fill={color.replace('0.6', '0.1')} stroke={color} strokeWidth="2" />
            {/* 데이터 점 */}
            {dataPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
            ))}
            {/* 라벨 */}
            {stats.map((s, i) => {
                const p = getPoint(i, 130);
                return (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-slate-500 text-[8px] font-bold"
                    >
                        {s.label}
                    </text>
                );
            })}
        </svg>
    );
};


/* ── 네온 구분선 ── */
interface NeonDividerProps {
    className?: string;
    color?: 'cyan' | 'amber' | 'purple';
}

export const NeonDivider: React.FC<NeonDividerProps> = ({ className = '', color = 'cyan' }) => {
    const colors = {
        cyan: 'rgba(0,242,255,0.2)',
        amber: 'rgba(255,184,0,0.2)',
        purple: 'rgba(159,122,234,0.2)',
    };
    return (
        <div
            className={`w-full h-px ${className}`}
            style={{ background: `linear-gradient(90deg, transparent, ${colors[color]}, transparent)` }}
        />
    );
};


/* ── 스탯 인라인 표시 ── */
interface StatInlineProps {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
}

export const StatInline: React.FC<StatInlineProps> = ({ icon, label, value, color = 'text-primary' }) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
        <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-white ml-auto">{value}</span>
    </div>
);


/* ── 게임 버튼 ── */
interface GameButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    fullWidth?: boolean;
    disabled?: boolean;
    className?: string;
}

export const GameButton: React.FC<GameButtonProps> = ({
    children, onClick, variant = 'primary', size = 'md', icon, fullWidth, disabled, className = ''
}) => {
    const variants = {
        primary: 'bg-primary text-navy-deep shadow-neon-cyan hover:brightness-110',
        secondary: 'bg-white/5 text-slate-300 border border-white/10 hover:border-primary/30 hover:text-white',
        danger: 'bg-game-hp/20 text-game-hp border border-game-hp/30 hover:bg-game-hp/30',
        gold: 'bg-game-gold text-navy-deep shadow-neon-gold hover:brightness-110',
    };
    const sizes = {
        sm: 'px-4 py-2 text-[10px] rounded-xl',
        md: 'px-6 py-3.5 text-xs rounded-2xl',
        lg: 'px-8 py-5 text-sm rounded-2xl',
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        ${variants[variant]} ${sizes[size]}
        font-black uppercase tracking-widest
        transition-all duration-200 active:scale-[0.97]
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
        flex items-center justify-center gap-2
      `}
        >
            {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
            {children}
        </button>
    );
};

/* ── 전술 원형 타이머 ── */
interface TacticalCircularTimerProps {
    value: number; // 0 ~ 100
    label: string;
    subLabel?: string;
    color?: string;
}

export const TacticalCircularTimer: React.FC<TacticalCircularTimerProps> = ({
    value, label, subLabel, color = '#00F2FF'
}) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative size-24 flex items-center justify-center">
            <svg className="size-full transform -rotate-90">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle
                    cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" className="transition-all duration-1000 ease-linear"
                    style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{subLabel}</span>
                <span className="text-xl font-black tabular-nums tracking-tighter" style={{ color }}>{label}</span>
            </div>
        </div>
    );
};


/* ── 전술 액션 카드 ── */
interface TacticalActionCardProps {
    title: string;
    desc: string;
    icon: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    color?: string;
    stats?: { label: string; value: string; color?: string }[];
}

export const TacticalActionCard: React.FC<TacticalActionCardProps> = ({
    title, desc, icon, active, disabled, onClick, color = '#00F2FF', stats
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            relative flex flex-col p-4 rounded-[1.5rem] border transition-all duration-300 text-left group
            ${active ? 'bg-white/10 scale-[1.02]' : 'bg-[#0f172a]/80 hover:bg-white/5'}
            ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{ borderColor: active ? color : 'rgba(255,255,255,0.08)', boxShadow: active ? `0 0 20px ${color}30` : 'none' }}
    >
        <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 transition-colors group-hover:border-white/20">
                <span className="material-symbols-outlined text-xl" style={{ color: active ? color : '#94a3b8' }}>{icon}</span>
            </div>
            {active && <div className="size-2 rounded-full animate-ping" style={{ backgroundColor: color }} />}
        </div>

        <h4 className="text-xs font-black mb-1 group-hover:text-white transition-colors" style={{ color: active ? color : 'white' }}>{title}</h4>
        <p className="text-[10px] text-slate-500 font-bold leading-tight mb-4 min-h-[2.5em]">{desc}</p>

        {stats && (
            <div className="flex gap-3 mt-auto pt-3 border-t border-white/5">
                {stats.map((s, i) => (
                    <div key={i} className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{s.label}</span>
                        <span className="text-[9px] font-black" style={{ color: s.color || 'white' }}>{s.value}</span>
                    </div>
                ))}
            </div>
        )}

        {/* Corner Accent */}
        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className={`w-3 h-3 border-t border-r rounded-tr-sm`} style={{ borderColor: color }} />
        </div>
    </button>
);

interface TacticalTrendChartProps {
    data: number[];
    color?: string;
    height?: number;
}

export const TacticalTrendChart: React.FC<TacticalTrendChartProps> = ({ data, color = '#00F2FF', height = 60 }) => {
    if (data.length < 2) {
        // 데이터가 부족할 때 기본 라인 표시
        data = [50, 50, 50, 50, 50];
    }

    const max = 100;
    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: height - (d / max) * height
    }));

    const pathData = points.reduce((acc, p, i, a) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        // Control points for smooth curve
        const cp1x = a[i - 1].x + (p.x - a[i - 1].x) / 2;
        return `${acc} C ${cp1x},${a[i - 1].y} ${cp1x},${p.y} ${p.x},${p.y}`;
    }, "");

    const areaData = `${pathData} L 100,${height} L 0,${height} Z`;

    return (
        <div className="w-full relative overflow-hidden h-[60px]">
            <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaData} fill="url(#chartGradient)" className="transition-all duration-1000" />
                <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className="transition-all duration-1000" />

                {/* Horizontal Baseline */}
                <line x1="0" y1={height} x2="100" y2={height} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
            </svg>

            {/* Value Markers (Optional tooltips simplified to subtle dots) */}
            <div className="absolute inset-0 flex justify-between items-end px-1">
                {data.map((_, i) => (
                    <div key={i} className="w-px h-full bg-white/5" />
                ))}
            </div>
        </div>
    );
};
