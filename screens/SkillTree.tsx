
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { DataService, UserRank } from '../services/dataService';

/* ── 스킬 노드 데이터 구조 ── */
interface SkillNode {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    category: 'communication' | 'leadership' | 'development';
    level: number;
    maxLevel: number;
    description: string;
    effect: string;
    nextXp: number;
    dependencies?: string[]; // 선행 스킬 ID
    x: number; // 맵 좌표 (%)
    y: number;
}

const SKILL_DATA: SkillNode[] = [
    // 소통 계열 (Cyan)
    { id: 'listen', name: '경청의 달인', nameEn: 'ACTIVE LISTENING', icon: 'hearing', category: 'communication', level: 2, maxLevel: 5, x: 20, y: 30, description: '팀원의 발언 뒤에 숨겨진 의도와 감정을 정확히 파악하는 능력입니다.', effect: '심리 분석 정확도 +20%', nextXp: 120 },
    { id: 'empathy', name: '공감적 대화', nameEn: 'EMPATHIC TALK', icon: 'diversity_3', category: 'communication', level: 1, maxLevel: 5, x: 20, y: 50, description: '상대방의 감정에 공감하며 신뢰를 쌓는 대화 기술입니다.', effect: '신뢰도 회복 속도 +15%', nextXp: 150, dependencies: ['listen'] },
    { id: 'nonverbal', name: '비언어적 소통', nameEn: 'BODY LANGUAGE', icon: 'emoji_people', category: 'communication', level: 0, maxLevel: 5, x: 20, y: 70, description: '말하지 않아도 표정과 몸짓으로 전해지는 메시지를 읽습니다.', effect: '돌발 대사 해금 확률 +10%', nextXp: 200, dependencies: ['empathy'] },

    // 리더십 계열 (Amber)
    { id: 'command', name: '카리스마 지시', nameEn: 'CHARISMA', icon: 'record_voice_over', category: 'leadership', level: 3, maxLevel: 5, x: 50, y: 30, description: '강력한 장악력으로 팀원에게 명확한 방향을 제시하는 능력입니다.', effect: '지시 수용률 +25%', nextXp: 180 },
    { id: 'decisive', name: '전략적 의사결정', nameEn: 'STRATEGIC', icon: 'psychology', category: 'leadership', level: 1, maxLevel: 5, x: 50, y: 50, description: '복잡한 상황에서도 최적의 루트를 빠르게 판단하여 결정합니다.', effect: '갈등 해결 보너스 XP +20%', nextXp: 220, dependencies: ['command'] },

    // 육성 계열 (Purple)
    { id: 'mentor', name: '성장 멘토링', nameEn: 'MENTORING', icon: 'school', category: 'development', level: 2, maxLevel: 5, x: 80, y: 30, description: '팀원의 잠재력을 끌어내어 전문성을 강화시키는 육성 능력입니다.', effect: '팀원 성장속도 +30%', nextXp: 140 },
    { id: 'safety', name: '심리적 안전감', nameEn: 'PSY SAFETY', icon: 'shield_with_heart', category: 'development', level: 0, maxLevel: 5, x: 80, y: 50, description: '팀원들이 실패를 두려워하지 않고 아이디어를 낼 수 있는 환경을 만듭니다.', effect: '팀 번아웃 확률 -15%', nextXp: 250, dependencies: ['mentor'] },
];

const CATEGORY_META = {
    communication: { label: '소통 계열', color: '#00F2FF', glow: 'rgba(0,242,255,0.4)', bg: 'rgba(0,242,255,0.1)' },
    leadership: { label: '리더십 계열', color: '#FFB800', glow: 'rgba(255,184,0,0.4)', bg: 'rgba(255,184,0,0.1)' },
    development: { label: '육성 계열', color: '#A855F7', glow: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.1)' },
};

const SkillTree: React.FC = () => {
    const navigate = useNavigate();
    const [rank, setRank] = useState<UserRank | null>(null);
    const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setRank(DataService.getUserRank());
        setTimeout(() => setIsReady(true), 100);
    }, []);

    // 연결선 렌더링을 위한 함수
    const renderLines = () => {
        return SKILL_DATA.map(node => {
            if (!node.dependencies) return null;
            return node.dependencies.map(depId => {
                const depNode = SKILL_DATA.find(n => n.id === depId);
                if (!depNode) return null;

                const isUnlocked = node.level > 0 && depNode.level > 0;
                return (
                    <line
                        key={`${depId}-${node.id}`}
                        x1={`${depNode.x}%`} y1={`${depNode.y}%`}
                        x2={`${node.x}%`} y2={`${node.y}%`}
                        stroke={isUnlocked ? CATEGORY_META[node.category].color : 'rgba(255,255,255,0.05)'}
                        strokeWidth="2"
                        strokeDasharray={isUnlocked ? '0' : '5,5'}
                        className={isUnlocked ? 'animate-pulse' : ''}
                        style={{ transition: 'all 1s ease' }}
                    />
                );
            });
        });
    };

    return (
        <div className="min-h-screen bg-[#060B18] text-white flex flex-col relative overflow-hidden">

            {/* ── 배경: 네뷸라 효과 ── */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-[-10%] left-[-10%] size-[60%] rounded-full blur-[120px] bg-primary/10 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] size-[50%] rounded-full blur-[100px] bg-purple-600/10 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* ── 헤더 ── */}
            <header className="p-6 flex items-center justify-between sticky top-0 backdrop-blur-md border-b border-white/5 z-20"
                style={{ backgroundColor: 'rgba(6,11,24,0.8)' }}>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 size-10 rounded-xl flex items-center justify-center border border-primary/30 shadow-neon-cyan">
                        <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter">LEADERSHIP SKILL TREE</h1>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-accent-neon animate-pulse" />
                            Strategic Capability Map v2.0
                        </p>
                    </div>
                </div>

                {rank && (
                    <div className="hidden sm:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Current Rank</p>
                            <p className="text-sm font-black text-primary uppercase">{rank.title}</p>
                        </div>
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="text-lg font-black text-primary">{rank.level}</span>
                        </div>
                    </div>
                )}
            </header>

            {/* ── 스킬 트리 맵 ── */}
            <main className="flex-1 relative overflow-auto p-10 cursor-grab active:cursor-grabbing select-none">
                <div className="min-w-[1000px] min-h-[600px] relative">

                    {/* SVG 연결선 레이어 */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {renderLines()}
                    </svg>

                    {/* 스킬 노드 레이어 */}
                    {SKILL_DATA.map((node) => {
                        const meta = CATEGORY_META[node.category];
                        const isUnlocked = node.level > 0;
                        const isSelectable = !node.dependencies || node.dependencies.every(depId => SKILL_DATA.find(n => n.id === depId)!.level > 0);

                        return (
                            <div
                                key={node.id}
                                className={`absolute transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2 ${isReady ? 'opacity-100' : 'opacity-0 scale-50'
                                    }`}
                                style={{ top: `${node.y}%`, left: `${node.x}%` }}
                            >
                                <button
                                    onClick={() => setSelectedNode(node)}
                                    className={`flex flex-col items-center group relative ${isUnlocked ? 'cursor-pointer' : isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                >
                                    {/* 노드 모양 */}
                                    <div className={`size-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all duration-300 relative ${isUnlocked
                                            ? 'bg-[#0f172a] shadow-lg'
                                            : isSelectable
                                                ? 'bg-[#0f172a]/50 border-white/20'
                                                : 'bg-black/20 border-white/5 opacity-40'
                                        }`}
                                        style={isUnlocked ? { borderColor: meta.color, boxShadow: `0 0 20px ${meta.glow}` } : {}}>

                                        {/* 선행 스킬 잠금 아이콘 */}
                                        {!isUnlocked && !isSelectable && (
                                            <span className="absolute -top-1 -right-1 material-symbols-outlined text-[12px] text-slate-600 bg-[#060B18] rounded-full p-0.5 border border-white/10">lock</span>
                                        )}

                                        <span className={`material-symbols-outlined text-3xl transition-transform group-hover:scale-110 ${isUnlocked ? '' : 'text-slate-600'
                                            }`} style={isUnlocked ? { color: meta.color, filter: `drop-shadow(0 0 8px ${meta.glow})` } : {}}>
                                            {node.icon}
                                        </span>

                                        {/* 레벨 배지 */}
                                        {isUnlocked && (
                                            <div className="absolute -bottom-2 -right-2 size-6 rounded-lg flex items-center justify-center border border-white/20 text-[10px] font-black bg-[#0F1729]"
                                                style={{ color: meta.color }}>
                                                {node.level}
                                            </div>
                                        )}
                                    </div>

                                    {/* 노드 라벨 */}
                                    <div className="mt-4 text-center">
                                        <p className={`text-xs font-black tracking-tight ${isUnlocked ? 'text-white' : 'text-slate-600'}`}>{node.name}</p>
                                        <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isUnlocked ? '' : 'text-slate-700'}`}
                                            style={{ color: isUnlocked ? `${meta.color}CC` : '' }}>{node.nameEn}</p>
                                    </div>

                                    {/* 활성 애니메이션 링 */}
                                    {isUnlocked && (
                                        <div className="absolute inset-0 size-16 rounded-[1.5rem] animate-ping opacity-20 pointer-events-none"
                                            style={{ backgroundColor: meta.color }} />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* ── 노드 상세 모달 ── */}
            {selectedNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setSelectedNode(null)}>
                    <div className="w-full max-w-sm bg-[#0D1525] rounded-[3rem] border p-8 shadow-2xl relative overflow-hidden"
                        style={{ borderColor: CATEGORY_META[selectedNode.category].color + '40' }}
                        onClick={e => e.stopPropagation()}>

                        {/* 배경 데코 */}
                        <div className="absolute top-[-100px] right-[-100px] size-[200px] rounded-full blur-[80px] opacity-20"
                            style={{ backgroundColor: CATEGORY_META[selectedNode.category].color }} />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="size-16 rounded-2xl flex items-center justify-center border-2 bg-[#060B18]"
                                    style={{ borderColor: CATEGORY_META[selectedNode.category].color, boxShadow: `0 0 20px ${CATEGORY_META[selectedNode.category].glow}` }}>
                                    <span className="material-symbols-outlined text-4xl" style={{ color: CATEGORY_META[selectedNode.category].color }}>
                                        {selectedNode.icon}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: CATEGORY_META[selectedNode.category].color }}>
                                        {CATEGORY_META[selectedNode.category].label}
                                    </p>
                                    <h3 className="text-2xl font-black italic tracking-tighter">{selectedNode.name}</h3>
                                    <div className="flex gap-1 mt-1">
                                        {Array.from({ length: selectedNode.maxLevel }).map((_, i) => (
                                            <div key={i} className="size-1.5 rounded-full"
                                                style={{ backgroundColor: i < selectedNode.level ? CATEGORY_META[selectedNode.category].color : 'rgba(255,255,255,0.1)' }} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <section>
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">스킬 설명</h4>
                                    <p className="text-sm text-slate-300 font-medium leading-relaxed">{selectedNode.description}</p>
                                </section>

                                <section className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <h4 className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">현재 효과 (Lv.{selectedNode.level})</h4>
                                    <p className="text-sm font-black italic text-accent-neon">"{selectedNode.effect}"</p>
                                </section>

                                <section>
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">다음 레벨 강화</h4>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group hover:border-primary/50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                <span className="material-symbols-outlined text-lg">bolt</span>
                                            </div>
                                            <div className="text-left font-black">
                                                <p className="text-[10px] text-slate-500 uppercase">Upgrade Cost</p>
                                                <p className="text-sm text-primary">{selectedNode.nextXp} XP</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors">chevron_right</span>
                                    </div>
                                </section>
                            </div>

                            <button
                                onClick={() => setSelectedNode(null)}
                                className="w-full mt-8 py-5 bg-white/5 text-slate-400 font-black text-xs uppercase rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 하단 내비게이션 안내 (모바일용) ── */}
            <div className="lg:hidden absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <span className="material-symbols-outlined text-xs text-primary animate-bounce">pan_tool_alt</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Drag to Explore Map</span>
            </div>
        </div>
    );
};

export default SkillTree;
