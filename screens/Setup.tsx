import React, { useMemo, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { getCharacterAvatar, getCharacterInfo } from '../services/characterAvatars';
import { getMissionBriefing } from '../services/missionBriefings';
import { SCENARIOS } from '../constants';
import { analyticsService } from '../services/analyticsService';
import CompetencyRadar from '../components/CompetencyRadar';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = location.state?.guest === true;

  // 게스트 모드: late-comer 시나리오 자동 배정 → 바로 시뮬레이션으로
  useEffect(() => {
    if (isGuest) {
      const guestScenario = SCENARIOS.find(s => s.id === 'late-comer');
      if (guestScenario) {
        analyticsService.track('guest_sim_start', analyticsService.withAttribution({ scenario_id: 'late-comer' }));
        navigate('/simulation', {
          state: { scenario: guestScenario, initialTrust: 65, guest: true },
          replace: true,
        });
      }
    }
  }, [isGuest, navigate]);

  const scenario = location.state?.scenario;
  const briefing = useMemo(() => getMissionBriefing(scenario?.id), [scenario?.id]);
  const characterInfo = useMemo(() => getCharacterInfo(scenario?.id, scenario?.memberName), [scenario?.id, scenario?.memberName]);

  const avatar = getCharacterAvatar(characterInfo.name, scenario?.id);
  // Scenario 타입에 trustLevel 없음 → intensity에서 도출 (시나리오 난이도에 따라 초기 신뢰도 다름)
  // 시나리오 난이도에 따라 초기 신뢰도 설정 (S등급=어려움, B등급=쉬움)
  const trustLevel = scenario?.intensity === 'high' ? 25 : scenario?.intensity === 'low' ? 65 : 45;

  const handleStart = () => {
    navigate('/simulation', { state: { scenario, initialTrust: trustLevel } });
  };

  const handleBack = () => {
    navigate(-1);
  };

  // 신뢰도 원형 차트 색상 결정
  const getTrustColor = (level: number) => {
    if (level >= 80) return '#4ade80'; // Green
    if (level >= 40) return '#facc15'; // Yellow
    return '#f87171'; // Red
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-primary/30">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-bold tracking-tighter text-sm">기지로 돌아가기</span>
        </button>
        <div className="text-right">
          <h1 className="text-4xl font-black italic tracking-tighter text-white/90">인사 기록 파일</h1>
          <p className="text-sm text-primary font-bold tracking-[0.2em] uppercase">Security Clearance: Level 4</p>
        </div>
      </div>

      {/* Main Grid: 3 Columns */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

        {/* Left Column: Profile & Trust (3/12) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -mr-12 -mt-12 transition-all group-hover:bg-primary/20"></div>

            <div className="relative mb-6">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-white/5 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] shadow-inner">
                <img
                  src={avatar}
                  alt={characterInfo.name}
                  className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-black px-3 py-1 text-[10px] font-black rounded-md shadow-lg italic">
                {characterInfo.role || '팀원'}
              </div>
            </div>

            <div className="space-y-1 mb-8">
              <h2 className="text-2xl font-black tracking-tighter">{characterInfo.name}</h2>
              <p className="text-xs text-white/40 font-medium">소속 부서: {scenario?.category || '작전본부'}</p>
            </div>

            {/* Trust Level Circular Gauge */}
            <div className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col items-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64" cy="64" r="58"
                    className="stroke-[#222] fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64" cy="64" r="58"
                    className="fill-none transition-all duration-1000 ease-out"
                    stroke={getTrustColor(trustLevel)}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={(2 * Math.PI * 58) * (1 - trustLevel / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black italic tracking-tighter" style={{ color: getTrustColor(trustLevel) }}>{trustLevel}%</span>
                  <span className="text-[10px] text-white/30 font-bold tracking-widest">신뢰 지수</span>
                </div>
              </div>
              <div className="text-center mt-4 p-4 border-t border-white/5">
                <p className="text-sm text-white/80 leading-relaxed break-keep">
                  리더와 팀원 간의 축적된 상호 신뢰도를 의미합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Competency Radar (5/12) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex-grow flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-2xl">analytics</span>
              <h2 className="text-xl font-black italic tracking-tighter text-white/90">역량 분석 레이더</h2>
            </div>

            <div className="bg-black/20 rounded-2xl p-8 mb-8 flex flex-col items-center justify-center min-h-[400px]">
              <CompetencyRadar
                data={[
                  { subject: '성과', A: briefing.competencyData.performance, fullMark: 100 },
                  { subject: '스트레스', A: briefing.competencyData.stress, fullMark: 100 },
                  { subject: '잠재력', A: briefing.competencyData.potential, fullMark: 100 },
                  { subject: '충성도', A: briefing.competencyData.loyalty, fullMark: 100 },
                  { subject: '소통', A: briefing.competencyData.communication, fullMark: 100 },
                ]}
                teamAffinity={Math.round(briefing.competencyData.communication * 0.5 + briefing.competencyData.loyalty * 0.5)}
                tacticalRisk={Math.round(briefing.competencyData.performance * 0.6 + briefing.competencyData.potential * 0.4)}
              />
              <p className="mt-6 text-xs text-white/30 font-bold italic tracking-wider">
                ※ 모든 역량 지표는 수치가 높을수록 우수함을 의미합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-bold text-white/50">성과</span>
                  <span className="text-2xl font-black italic text-primary">{briefing.competencyData.performance}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${briefing.competencyData.performance}%` }} />
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-5 border border-white/5 group/tip relative">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-bold text-white/50">회복 탄력성</span>
                  <span className="text-2xl font-black italic text-primary">{briefing.competencyData.stress}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${briefing.competencyData.stress}%` }} />
                </div>
                {/* 보조 설명 툴팁 스타일 */}
                <div className="absolute -top-10 left-0 w-full opacity-0 group-hover/tip:opacity-100 transition-opacity bg-primary text-black text-[10px] font-bold py-1 px-2 rounded pointer-events-none text-center">
                  높을수록 위기 상황에서도 평정심을 잘 유지함
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-bold text-white/50">성장 잠재력</span>
                  <span className="text-2xl font-black italic text-primary">{briefing.competencyData.potential}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${briefing.competencyData.potential}%` }} />
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-bold text-white/50">충성도</span>
                  <span className="text-2xl font-black italic text-primary">{briefing.competencyData.loyalty}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${briefing.competencyData.loyalty}%` }} />
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-bold text-white/50">소통</span>
                  <span className="text-2xl font-black italic text-primary">{briefing.competencyData.communication}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${briefing.competencyData.communication}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status Summary & History (4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Psychological State */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary to-transparent"></div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-base">psychology</span>
              <h3 className="text-sm font-black tracking-[0.2em] text-white/80">요원 상태 요약</h3>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-white/40 mb-2 tracking-wider">현재 심리 상태</h4>
                <p className="text-base font-medium leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 text-white/90">
                  "{briefing.statusSummary.psychState}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-green-500/60 mb-2 tracking-wider">주요 강점</h4>
                  <ul className="space-y-2">
                    {briefing.statusSummary.strengths.map((s, i) => (
                      <li key={i} className="text-xs flex items-center gap-2 text-white/80">
                        <span className="w-1 h-1 rounded-full bg-green-500"></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-500/60 mb-2 tracking-wider">주요 약점</h4>
                  <ul className="space-y-2">
                    {briefing.statusSummary.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs flex items-center gap-2 text-white/80">
                        <span className="w-1 h-1 rounded-full bg-red-500"></span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-blue-500/60 mb-2 tracking-wider">3개년 성과 지표</h4>
                <div className="flex gap-2 flex-wrap">
                  {briefing.statusSummary.performance.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 font-bold">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interaction History */}
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-2xl">history</span>
              <h2 className="text-xl font-black italic tracking-tighter text-white/90">최근 상호작용 기록</h2>
            </div>

            <div className="space-y-4">
              {briefing.history?.map((h, i) => (
                <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-6 relative hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-black italic text-primary">{h.type === 'Feedback' ? '피드백' : h.type}</span>
                    <span className="text-sm font-bold text-white/30 tracking-tighter">{h.date}</span>
                  </div>
                  <p className="text-base text-white/80 leading-relaxed italic">
                    "{h.text}"
                  </p>
                </div>
              )) || (
                  <div className="h-40 flex flex-col items-center justify-center text-white/20 border border-dashed border-white/10 rounded-xl">
                    <span className="material-symbols-outlined text-4xl mb-3">cloud_off</span>
                    <span className="text-sm font-bold">기록된 데이터가 없습니다</span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Start Button */}
      <div className="max-w-7xl mx-auto mt-8 flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl border border-primary/20 shadow-xl">
        <div className="mb-4 md:mb-0">
          <h3 className="text-xl font-black tracking-tighter italic text-white/90">분석을 마치시고 작전을 개시하시겠습니까?</h3>
          <p className="text-sm text-white/70 leading-relaxed max-w-md">
            요원의 저항 기제를 완화하고 목표 합의를 이끌어낼 지휘 준비가 되셨다면 작전을 개시해주세요.
          </p>
        </div>
        <button
          onClick={handleStart}
          className="w-full md:w-auto px-12 py-4 bg-primary text-black font-black italic tracking-tighter rounded-xl hover:bg-[#00d8e8] hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,242,255,0.3)] flex items-center justify-center gap-3 group"
        >
          <span>작전 개시</span>
          <span className="material-symbols-outlined font-black group-hover:translate-x-2 transition-transform">bolt</span>
        </button>
      </div>
    </div>
  );
};

export default Setup;
