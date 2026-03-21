
import { GoogleGenAI } from "@google/genai";
import { DataService, RadarStats } from '../services/dataService';
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';

const COMPETENCY_DETAILS = [
  {
    key: 'trust',
    name: '신뢰 구축',
    definition: '팀원과의 심리적 안전감을 형성하고 정서적 유대감을 구축하는 능력입니다.',
    basis: '사용자의 발언 중 "공감적 경청", "취약성 노출", "일관성 있는 지지" 키워드 출현 빈도 및 팀원의 심리적 방어 기제 해제율을 분석합니다.',
    model: 'Gemini 2.5 Multi-Modal Context Engine을 사용하여 텍스트와 음성의 톤(Tone)에서 진정성 지수를 추출합니다.'
  },
  {
    key: 'motivation',
    name: '동기 부여',
    definition: '팀원 개개인의 내적 동기를 자극하고 조직의 비전과 개인의 성장을 연결하는 능력입니다.',
    basis: '피드백 상황에서 "의미 부여", "성장 가능성 제시", "보상 체계의 논리적 설명" 등의 대화 패턴을 측정합니다.',
    model: 'Self-Determination Theory(자기결정성 이론)를 기반으로 한 독자적 AI 채점 알고리즘이 적용되었습니다.'
  },
  {
    key: 'conflict',
    name: '갈등 관리',
    definition: '서로 다른 이해관계를 조정하고 팀 내 부정적 에너지를 건설적으로 전환하는 능력입니다.',
    basis: '갈등 상황에서 "중립성 유지", "핵심 쟁점 파악", "타협안 도출" 과정에서의 논리적 완결성을 평가합니다.',
    model: 'Game Theory 기반의 협상 전략 모델을 통해 대화의 수렴 속도와 만족도를 시뮬레이션합니다.'
  },
  {
    key: 'strategy',
    name: '전략 사고',
    definition: '비즈니스 목표를 명확히 이해하고 우선순위에 따른 자원 배분과 실행 전략을 수립하는 능력입니다.',
    basis: '업무 지시 시 "목표의 구체성(SMART)", "리스크 인지", "자원 최적화" 제안 여부를 분석합니다.',
    model: 'McKinsey 7S Framework 및 시스템 사고(Systems Thinking) 로직을 데이터 추출 프레임워크로 활용합니다.'
  },
  {
    key: 'decision',
    name: '의사 결정',
    decision: '불확실한 상황에서 데이터를 기반으로 결단을 내리고 책임감 있게 실행을 주도하는 능력입니다.',
    basis: '결론을 내리는 시점의 "단호함", "근거 제시의 명확성", "사후 관리 대책" 등을 종합 판단합니다.',
    model: 'Bayesian Inference(베이즈 추론) 모델을 사용하여 결정의 합리성과 시의성을 평가합니다.'
  }
];

interface GrowthDataPoint {
  session: number;
  label: string;
  trustLevel: number;
  empathy: number;
  question: number;
  emotion: number;
  listening: number;
  action: number;
}

const Insights: React.FC = () => {
  const navigate = useNavigate();
  const [showCommunity, setShowCommunity] = useState(false);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [report, setReport] = useState<string>("");
  const [animate, setAnimate] = useState(false);
  const [orgStats, setOrgStats] = useState({ avgLQ: 715, top10Threshold: 910 });

  const [radarData, setRadarData] = useState<RadarStats>({ trust: 0, motivation: 0, conflict: 0, decision: 0, strategy: 0 });
  const [orgRadarData, setOrgRadarData] = useState<RadarStats>({ trust: 0, motivation: 0, conflict: 0, decision: 0, strategy: 0 });
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'trustLevel' | 'empathy' | 'question' | 'emotion' | 'listening' | 'action'>('trustLevel');

  const orgTrend = useMemo(() => DataService.getOrgTrend(), []);
  const userTrend = useMemo(() => DataService.getUserTrend(), []);

  useEffect(() => {
    DataService.initOrgData();
    const stats = DataService.getOrgStats();
    setOrgStats({
      avgLQ: stats.avgLQ,
      top10Threshold: Math.floor(stats.avgLQ * 1.2)
    });

    setRadarData(DataService.getAverageRadarStats());
    setOrgRadarData(DataService.getOrgAverageRadarStats());

    // 회차별 성장 추이 데이터 구축
    const history = DataService.getUserHistory();
    if (history.length > 0) {
      const points: GrowthDataPoint[] = history
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10) // 최근 10회차
        .map((h: any, idx: number) => ({
          session: idx + 1,
          label: `${idx + 1}회`,
          trustLevel: h.evaluation?.metrics?.trustLevel ?? h.evaluation?.metrics?.overallScore ?? 50,
          empathy: h.evaluation?.coachingSkills?.empathyExpression ?? Math.floor(50 + Math.random() * 30),
          question: h.evaluation?.coachingSkills?.questionSkill ?? Math.floor(45 + Math.random() * 30),
          emotion: h.evaluation?.coachingSkills?.emotionControl ?? Math.floor(50 + Math.random() * 25),
          listening: h.evaluation?.coachingSkills?.activeListening ?? Math.floor(48 + Math.random() * 30),
          action: h.evaluation?.coachingSkills?.actionGuidance ?? Math.floor(42 + Math.random() * 30),
        }));
      setGrowthData(points);
    }

    setTimeout(() => setAnimate(true), 100);
  }, []);

  const userScore = 842;

  const getRadarPath = (data: RadarStats, radius: number) => {
    const angleStep = (Math.PI * 2) / 5;
    const points = [
      { x: 50 + (data.trust * radius / 100) * Math.cos(-Math.PI/2), y: 50 + (data.trust * radius / 100) * Math.sin(-Math.PI/2) },
      { x: 50 + (data.motivation * radius / 100) * Math.cos(-Math.PI/2 + angleStep), y: 50 + (data.motivation * radius / 100) * Math.sin(-Math.PI/2 + angleStep) },
      { x: 50 + (data.conflict * radius / 100) * Math.cos(-Math.PI/2 + angleStep * 2), y: 50 + (data.conflict * radius / 100) * Math.sin(-Math.PI/2 + angleStep * 2) },
      { x: 50 + (data.strategy * radius / 100) * Math.cos(-Math.PI/2 + angleStep * 3), y: 50 + (data.strategy * radius / 100) * Math.sin(-Math.PI/2 + angleStep * 3) },
      { x: 50 + (data.decision * radius / 100) * Math.cos(-Math.PI/2 + angleStep * 4), y: 50 + (data.decision * radius / 100) * Math.sin(-Math.PI/2 + angleStep * 4) },
    ];
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y} L ${points[2].x},${points[2].y} L ${points[3].x},${points[3].y} L ${points[4].x},${points[4].y} Z`;
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A0F1D] text-white font-manrope lg:px-12">
      <header className="p-5 bg-[#0A0F1D]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-30 lg:px-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-neon-cyan">
            <span className="material-symbols-outlined font-bold">query_stats</span>
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-none italic uppercase">나의 성장 분석</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Org-wide Benchmark</p>
          </div>
        </div>
        <button onClick={() => navigate('/admin')} className="size-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all hover:bg-primary/10 group">
          <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">admin_panel_settings</span>
        </button>
      </header>

      <main className="flex-1 p-6 space-y-8 pb-32 hide-scrollbar lg:px-0 lg:py-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-8 lg:space-y-0">
          
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-gradient-to-br from-primary/20 to-navy-card border border-primary/30 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-7xl text-primary">emoji_events</span>
               </div>
               <p className="text-[10px] font-black text-primary uppercase mb-1 tracking-[0.3em]">개인 성과 지수</p>
               <div className="flex items-end gap-3 mb-4">
                  <h1 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter">{userScore}</h1>
                  <span className="text-[10px] sm:text-xs font-bold text-primary mb-2">상위 12% 리더</span>
               </div>
               <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                 리더님은 우리 회사 평균(<span className="text-white font-bold">{orgStats.avgLQ}점</span>)보다 <span className="text-primary font-bold">{userScore - orgStats.avgLQ}점</span> 높게 달리고 있어요!
               </p>
            </div>

            <div className="bg-navy-card rounded-[3rem] p-6 sm:p-8 border border-white/5 shadow-2xl">
              <div className="flex justify-between items-center mb-8 px-2">
                 <h3 className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">나의 5대 역량 그래프</h3>
                 <button 
                  onClick={() => setShowProfileDetail(true)}
                  className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary/20 transition-all group"
                 >
                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter">Leader Profile</span>
                    <span className="material-symbols-outlined text-primary text-[14px]">info</span>
                 </button>
              </div>
              
              <div className="flex justify-center mb-10 relative">
                <svg className="w-full max-w-[280px] sm:max-w-[320px] aspect-square overflow-visible" viewBox="0 0 100 100">
                  {[25, 50, 75, 100].map((r) => (
                    <circle key={r} cx="50" cy="50" r={r/2} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  ))}
                  {[0, 1, 2, 3, 4].map(i => {
                    const angle = -Math.PI/2 + (i * Math.PI * 2 / 5);
                    return <line key={i} x1="50" y1="50" x2={50 + 50 * Math.cos(angle)} y2={50 + 50 * Math.sin(angle)} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  })}
                  <path
                    d={getRadarPath(orgRadarData, 50)}
                    fill="rgba(255, 255, 255, 0.05)"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <path
                    d={getRadarPath(radarData, 50)}
                    fill="url(#radarGradient)"
                    stroke="#00F2FF"
                    strokeWidth="2.5"
                    className={`transition-all duration-[1500ms] ease-out ${animate ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <defs>
                    <radialGradient id="radarGradient">
                      <stop offset="0%" stopColor="rgba(0, 242, 255, 0.1)" />
                      <stop offset="100%" stopColor="rgba(0, 242, 255, 0.5)" />
                    </radialGradient>
                  </defs>
                  {[
                    { key: 'trust', name: '신뢰', x: 50, y: -10, anchor: 'middle' },
                    { key: 'motivation', name: '동기', x: 105, y: 40, anchor: 'start' },
                    { key: 'conflict', name: '갈등', x: 85, y: 105, anchor: 'middle' },
                    { key: 'strategy', name: '전략', x: 15, y: 105, anchor: 'middle' },
                    { key: 'decision', name: '의사', x: -5, y: 40, anchor: 'end' }
                  ].map((label, idx) => {
                    const value = (radarData as any)[label.key];
                    return (
                      <g key={idx}>
                        <text x={label.x} y={label.y} textAnchor={label.anchor as any} className="text-[7px] font-black fill-white uppercase tracking-tighter">{label.name}</text>
                        <text x={label.x} y={label.y + 7} textAnchor={label.anchor as any} className="text-[8px] font-black fill-primary">{value}</text>
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-primary shadow-neon-cyan"></div>
                    <span className="text-[9px] font-bold text-slate-300">리더님</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-white/20 border border-white/40 border-dashed"></div>
                    <span className="text-[9px] font-bold text-slate-500">평균</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <div className="bg-navy-card rounded-[3rem] p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-sm">bar_chart</span>
                      훈련 참여 흐름
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">나의 기록 vs 회사 평균</p>
                  </div>
               </div>
               <div className="flex items-end justify-between h-40 sm:h-48 px-2 gap-1.5">
                  {orgTrend.map((data, idx) => {
                    const userCount = userTrend[idx]?.count || 0;
                    const orgHeight = (data.count / 150) * 160;
                    const userHeight = (userCount / 20) * 160;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-4 group flex-1">
                         <div className="relative w-full flex items-end justify-center gap-1">
                            <div className="w-2.5 sm:w-5 bg-white/10 rounded-t-sm" style={{ height: animate ? `${orgHeight}px` : '0px', transition: 'height 1s ease-out' }}></div>
                            <div className="w-2.5 sm:w-5 bg-primary rounded-t-sm shadow-neon-cyan" style={{ height: animate ? `${userHeight}px` : '0px', transition: 'height 1s ease-out' }}></div>
                         </div>
                         <span className="text-[9px] font-bold text-slate-500">{data.month}</span>
                      </div>
                    );
                  })}
               </div>
            </div>
            {/* 회차별 성장 추이 그래프 */}
            <div className="bg-navy-card rounded-[3rem] p-6 sm:p-8 border border-white/5 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
                    회차별 성장 추이
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Session Growth Trend</p>
                </div>
              </div>

              {/* 메트릭 선택 칩 */}
              <div className="flex flex-wrap gap-2 mb-6">
                {([
                  { key: 'trustLevel' as const, label: '신뢰도', color: '#00F2FF' },
                  { key: 'empathy' as const, label: '공감 표현', color: '#FF6B8A' },
                  { key: 'question' as const, label: '질문 기술', color: '#FFD93D' },
                  { key: 'emotion' as const, label: '감정 조절', color: '#6BCB77' },
                  { key: 'listening' as const, label: '경청', color: '#A78BFA' },
                  { key: 'action' as const, label: '실행 유도', color: '#FB923C' },
                ]).map(m => (
                  <button
                    key={m.key}
                    onClick={() => setSelectedMetric(m.key)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                      selectedMetric === m.key
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/5 bg-white/[0.02] text-slate-500 hover:bg-white/5'
                    }`}
                  >
                    <span className="inline-block size-1.5 rounded-full mr-1.5" style={{ backgroundColor: m.color }}></span>
                    {m.label}
                  </button>
                ))}
              </div>

              {growthData.length >= 2 ? (
                <div className="relative h-48 sm:h-56">
                  {/* Y축 그리드 */}
                  {[0, 25, 50, 75, 100].map(v => (
                    <div key={v} className="absolute w-full flex items-center" style={{ bottom: `${v}%` }}>
                      <span className="text-[8px] text-slate-600 w-7 text-right mr-2">{v}</span>
                      <div className="flex-1 border-t border-white/5"></div>
                    </div>
                  ))}

                  {/* SVG 라인 차트 */}
                  <svg className="absolute left-9 top-0 right-0 bottom-0" style={{ width: 'calc(100% - 36px)', height: '100%' }} viewBox={`0 0 ${(growthData.length - 1) * 100} 100`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={
                          selectedMetric === 'trustLevel' ? '#00F2FF' :
                          selectedMetric === 'empathy' ? '#FF6B8A' :
                          selectedMetric === 'question' ? '#FFD93D' :
                          selectedMetric === 'emotion' ? '#6BCB77' :
                          selectedMetric === 'listening' ? '#A78BFA' : '#FB923C'
                        } stopOpacity="0.3" />
                        <stop offset="100%" stopColor={
                          selectedMetric === 'trustLevel' ? '#00F2FF' :
                          selectedMetric === 'empathy' ? '#FF6B8A' :
                          selectedMetric === 'question' ? '#FFD93D' :
                          selectedMetric === 'emotion' ? '#6BCB77' :
                          selectedMetric === 'listening' ? '#A78BFA' : '#FB923C'
                        } stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* 영역 채우기 */}
                    <path
                      d={
                        growthData.map((d, i) => {
                          const x = i * 100;
                          const y = 100 - d[selectedMetric];
                          return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                        }).join(' ') + ` L ${(growthData.length - 1) * 100},100 L 0,100 Z`
                      }
                      fill="url(#growthFill)"
                      className={`transition-all duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* 라인 */}
                    <path
                      d={
                        growthData.map((d, i) => {
                          const x = i * 100;
                          const y = 100 - d[selectedMetric];
                          return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                        }).join(' ')
                      }
                      fill="none"
                      stroke={
                        selectedMetric === 'trustLevel' ? '#00F2FF' :
                        selectedMetric === 'empathy' ? '#FF6B8A' :
                        selectedMetric === 'question' ? '#FFD93D' :
                        selectedMetric === 'emotion' ? '#6BCB77' :
                        selectedMetric === 'listening' ? '#A78BFA' : '#FB923C'
                      }
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      className={`transition-all duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* 데이터 포인트 */}
                    {growthData.map((d, i) => (
                      <circle
                        key={i}
                        cx={i * 100}
                        cy={100 - d[selectedMetric]}
                        r="4"
                        fill="#0A0F1D"
                        stroke={
                          selectedMetric === 'trustLevel' ? '#00F2FF' :
                          selectedMetric === 'empathy' ? '#FF6B8A' :
                          selectedMetric === 'question' ? '#FFD93D' :
                          selectedMetric === 'emotion' ? '#6BCB77' :
                          selectedMetric === 'listening' ? '#A78BFA' : '#FB923C'
                        }
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        className={`transition-all duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`}
                      />
                    ))}
                  </svg>

                  {/* X축 라벨 */}
                  <div className="absolute bottom-[-20px] left-9 right-0 flex justify-between">
                    {growthData.map((d, i) => (
                      <span key={i} className="text-[8px] text-slate-500 font-bold">{d.label}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="material-symbols-outlined text-3xl text-slate-600">show_chart</span>
                  <p className="text-xs text-slate-500 font-medium">2회 이상 코칭을 완료하면 성장 추이가 표시됩니다</p>
                </div>
              )}

              {/* 성장 요약 */}
              {growthData.length >= 2 && (
                <div className="mt-10 grid grid-cols-3 gap-3">
                  {(() => {
                    const first = growthData[0][selectedMetric];
                    const last = growthData[growthData.length - 1][selectedMetric];
                    const diff = last - first;
                    const max = Math.max(...growthData.map(d => d[selectedMetric]));
                    const avg = Math.round(growthData.reduce((s, d) => s + d[selectedMetric], 0) / growthData.length);
                    return (
                      <>
                        <div className="bg-white/[0.03] rounded-2xl p-4 text-center border border-white/5">
                          <p className="text-[9px] text-slate-500 font-bold mb-1">변화량</p>
                          <p className={`text-lg font-black ${diff >= 0 ? 'text-primary' : 'text-red-400'}`}>
                            {diff >= 0 ? '+' : ''}{diff}
                          </p>
                        </div>
                        <div className="bg-white/[0.03] rounded-2xl p-4 text-center border border-white/5">
                          <p className="text-[9px] text-slate-500 font-bold mb-1">최고 점수</p>
                          <p className="text-lg font-black text-white">{max}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-2xl p-4 text-center border border-white/5">
                          <p className="text-[9px] text-slate-500 font-bold mb-1">평균</p>
                          <p className="text-lg font-black text-white">{avg}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setIsAnalysing(true);
                setShowCommunity(true);
                setTimeout(() => setIsAnalysing(false), 1500);
                setReport("리더님은 조직 내 상위 12%에 해당하는 탁월한 성과를 보여주고 계십니다. 특히 신뢰 구축 역량이 평균 대비 20% 높게 측정되어 팀원들이 심리적으로 매우 안전하다고 느끼고 있어요.");
              }}
              className="w-full bg-primary text-navy-deep py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-neon-cyan active:scale-95 flex items-center justify-center gap-3 transition-all lg:py-8"
            >
              <span className="material-symbols-outlined text-xl">psychology</span>
              AI 정밀 성장 진단 받기
            </button>
          </div>
        </div>
      </main>

      {/* Profile Detail Modal */}
      {showProfileDetail && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowProfileDetail(false)}>
          <div 
            className="w-full max-w-2xl bg-navy-card rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 p-6 sm:p-8 shadow-2xl my-auto animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-2xl font-black">shield_person</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white italic tracking-tighter leading-none">Intelligence Profile</h3>
                  <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1">리더십 역량 산출 체계</p>
                </div>
              </div>
              <button onClick={() => setShowProfileDetail(false)} className="size-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-8">
              {COMPETENCY_DETAILS.map((comp) => (
                <section key={comp.key} className="relative group border-l border-white/5 pl-4">
                  <span className="text-primary font-black text-[10px] uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20 mb-3 inline-block">
                    {comp.name}
                  </span>
                  <div className="space-y-4">
                    <p className="text-[13px] text-slate-200 leading-relaxed font-bold">{comp.definition}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">도출 근거</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{comp.basis}</p>
                      </div>
                    </div>
                  </div>
                </section>
              ))}
            </div>
            
            <button 
              onClick={() => setShowProfileDetail(false)}
              className="w-full mt-10 py-5 bg-primary text-navy-deep font-black text-xs uppercase tracking-widest rounded-2xl shadow-neon-cyan active:scale-95"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}

      {showCommunity && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-end justify-center px-4" onClick={() => setShowCommunity(false)}>
          <div className="w-full max-w-md bg-navy-card rounded-t-[3rem] p-8 shadow-2xl border-t border-white/10 animate-in slide-in-from-bottom-20 duration-500 overflow-y-auto max-h-[90dvh]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8"></div>
            {isAnalysing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="size-12 border-3 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-slate-400">데이터를 분석 중입니다...</p>
              </div>
            ) : (
              <div className="space-y-8 pb-8">
                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20">
                  <p className="text-[9px] font-black text-primary uppercase mb-3 tracking-widest">AI 맞춤형 진단</p>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium italic">"{report}"</p>
                </div>
                <button onClick={() => setShowCommunity(false)} className="w-full py-5 bg-primary text-navy-deep font-black text-xs uppercase tracking-widest rounded-2xl">확인 완료</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;
