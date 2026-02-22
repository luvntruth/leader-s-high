import React from 'react';
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar
} from 'recharts';

interface CompetencyRadarProps {
    data?: any[];
    themeColor?: string;
    teamAffinity?: number;   // 외부에서 계산된 팀 친화도 (0~100)
    tacticalRisk?: number;   // 외부에서 계산된 전술 위기 대응도 (0~100)
}

const CompetencyRadar: React.FC<CompetencyRadarProps> = ({
    data = [],
    themeColor = '#F2B90D',
    teamAffinity: teamAffinityProp,
    tacticalRisk: tacticalRiskProp,
}) => {
    if (!data || data.length === 0) return null;

    // 총점: 전체 평균
    const totalScore = Math.round(data.reduce((acc: number, cur: any) => acc + cur.A, 0) / data.length || 0);

    // props로 넘어온 값 우선 사용, 없으면 data에서 flexible하게 추출
    const teamAffinity = teamAffinityProp ?? Math.round(
        (data.find((d: any) => d.subject === '소통 능력')?.A * 0.4 || 0) +
        (data.find((d: any) => d.subject === '안정성')?.A * 0.3 || 0) +
        (data.find((d: any) => d.subject === '공감 능력')?.A * 0.3 || 0)
    );

    const tacticalRisk = tacticalRiskProp ?? Math.round(
        (data.find((d: any) => d.subject === '결단력')?.A * 0.6 || 0) +
        (data.find((d: any) => d.subject === '혁신성')?.A * 0.4 || 0)
    );

    return (
        <div className="space-y-12">
            {/* 레이더 차트 영역 */}
            <div className="h-[280px] w-full relative">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F2B90D]/5 to-transparent rounded-full blur-3xl opacity-30" />
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                        data={data}
                    >
                        <PolarGrid stroke="#ffffff10" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '900' }}
                        />
                        <Radar
                            name="Competency"
                            dataKey="A"
                            stroke={themeColor}
                            fill={themeColor}
                            fillOpacity={0.5}
                            animationDuration={1500}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* 수치 바 영역 */}
            <div className="space-y-6">
                {/* 1. Total Leadership Score */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-[#F2B90D] uppercase tracking-widest mb-0.5">Total Leadership Score</p>
                            <p className="text-[9px] text-slate-500 font-bold">5개 핵심 역량 평균치</p>
                        </div>
                        <p className="text-xl font-black text-white italic tracking-tighter">
                            {totalScore}
                            <span className="text-xs text-slate-500 not-italic ml-1">/ 100</span>
                        </p>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F2B90D] shadow-[0_0_10px_rgba(242,185,13,0.5)] transition-all duration-1000"
                            style={{ width: `${totalScore}%` }} />
                    </div>
                </div>

                {/* 2. Team Affinity */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Team Affinity</p>
                            <p className="text-[9px] text-slate-500 font-bold">소통 및 신뢰도 기반 팀 융화력</p>
                        </div>
                        <p className="text-lg font-black text-white italic tracking-tighter">
                            {teamAffinity}%
                        </p>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F2B90D]/60 transition-all duration-1000"
                            style={{ width: `${teamAffinity}%` }} />
                    </div>
                </div>

                {/* 3. Tactical Risk Management */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Tactical Risk Management</p>
                            <p className="text-[9px] text-slate-500 font-bold">전략적 판단 및 위기 대처 능력</p>
                        </div>
                        <p className="text-lg font-black text-white italic tracking-tighter">
                            {tacticalRisk}%
                        </p>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F2B90D]/40 transition-all duration-1000"
                            style={{ width: `${tacticalRisk}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetencyRadar;
