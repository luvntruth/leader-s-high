
import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { Generation } from '../types';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialScenario = location.state?.scenario;

  const [name, setName] = useState(initialScenario?.memberName || '김철수');
  const [generation] = useState<Generation>(initialScenario?.generation || Generation.GEN_Z);
  const [contextStyle, setContextStyle] = useState(initialScenario?.traits?.context || 50);
  const [driverStyle, setDriverStyle] = useState(initialScenario?.traits?.driver || 50);

  // 시나리오 상황 + 성향 슬라이더를 결합한 초정밀 분석 로직
  const personaBriefing = useMemo(() => {
    if (!initialScenario) return { title: "분석 불가", description: "시나리오 정보가 없습니다.", tip: "기본 설정을 확인해주세요." };
    
    const isDirect = contextStyle < 40;
    const isIndirect = contextStyle > 60;
    const isBalancedContext = !isDirect && !isIndirect;

    const isLogic = driverStyle < 40;
    const isEmotion = driverStyle > 60;
    const isBalancedDriver = !isLogic && !isEmotion;

    const scenarioId = initialScenario.id;
    const category = initialScenario.category;
    
    let title = "";
    let description = "";
    let tip = "";

    // 1. 특정 핵심 시나리오 ID별 상세 로직
    if (scenarioId === 'late-comer') {
      if (isLogic) {
        title = "능력 지상주의 개인주의자";
        description = `실력이 곧 규칙이라고 믿습니다. "일만 잘하면 30분 지각이 왜 문제죠?"라고 당당하게 반문할 태세입니다.`;
        tip = "지각이 팀 전체의 협업 리듬과 비용에 미치는 영향을 데이터로 설득하세요.";
      } else if (isEmotion) {
        title = "인정이 필요한 느슨한 에이스";
        description = "팀 분위기가 편해서 지각도 허용된다고 착각하고 있습니다. 리더의 지적을 '공격'으로 받아들이면 의욕이 확 꺾일 수 있어요.";
        tip = "그의 성과를 먼저 충분히 인정해준 뒤, 팀의 기강이 그에게 거는 기대를 강조하세요.";
      } else {
        title = "성과 중심의 실용적 개인주의자";
        description = "본인의 성과에 자부심이 있으며, 지각을 단순한 습관이 아닌 '유연한 업무 스타일'로 정당화하고 있습니다.";
        tip = "근태 지적에 앞서 그의 성과를 인정하되, 팀의 신뢰 자본(Trust Capital)이 깎이고 있음을 강조하세요.";
      }
    } else if (scenarioId === 'team-clash') {
      if (isIndirect) {
        title = "침묵으로 저항하는 구태 시니어";
        description = "대놓고 반항하기보다 '허허' 웃으면서 뒤에서 한숨을 쉬거나, 맥락 없는 '라떼' 이야기로 리더의 권위를 야금야금 갉아먹습니다.";
        tip = "공개적인 장소보다는 1:1 면담에서 예우를 갖추되, 보고 체계의 명확한 선을 그으세요.";
      } else if (isDirect) {
        title = "경험을 무기로 휘두르는 베테랑";
        description = "자신의 과거 성공 경험이 절대적이라 믿습니다. 리더의 새로운 방식이 '비효율적'이라며 직설적으로 무시할 가능성이 큽니다.";
        tip = "그의 노하우를 존중한다는 점을 명시하고, 새로운 툴이 그의 업무 부담을 어떻게 줄여줄지 논리적으로 접근하세요.";
      } else {
        title = "권위를 시험하는 노련한 실무자";
        description = "리더의 전문성을 은근히 탐색하며, 자신을 통제하려 들 때마다 교묘하게 선을 넘나듭니다.";
        tip = "업무적 전문성을 먼저 증명하고, 리더와 팀원의 명확한 R&R을 정중히 재확인하세요.";
      }
    } else if (scenarioId === 'low-motivation') {
      if (isEmotion) {
        title = "마음의 문을 닫은 감성 에이스";
        description = "업무량보다 '정서적 고립'이 원인일 확률이 높습니다. 리더가 자신을 기계처럼 부린다고 느끼며 깊은 배신감을 품고 있어요.";
        tip = "업무 얘기는 잠시 접어두고, 최근 그가 느꼈을 감정적인 힘듦에 먼저 공감해 주세요.";
      } else if (isLogic) {
        title = "효율을 잃고 냉소적으로 변한 워커홀릭";
        description = "보상 없는 헌신에 지쳤습니다. 이제는 딱 '받은 만큼만 하겠다'는 차가운 논리로 무장하고 이직을 준비 중일지 모릅니다.";
        tip = "그의 성과가 회사 비전에 어떻게 기여했는지 명확한 데이터와 보상 가능성을 언급하세요.";
      } else {
        title = "에너지가 고갈된 침묵의 실행자";
        description = "번아웃의 전조 증상입니다. 질문에 최소한의 대답만 하며, 감정 소모를 극도로 피하고 싶어 합니다.";
        tip = "긴 대화보다는 업무 조정을 제안하거나, 짧고 굵은 격려로 부담을 덜어주세요.";
      }
    } else if (scenarioId === 'feedback-defense') {
      if (isDirect) {
        title = "논리로 무장한 남 탓 전문가";
        description = "피드백을 주자마자 환경 탓, 가이드 탓을 하며 즉각적으로 반박합니다. 본인의 실수를 인정하는 순간 패배한다고 생각해요.";
        tip = "반박할 수 없는 구체적인 상황 증거를 제시하고, '공격'이 아닌 '성장 지원'임을 반복 설명하세요.";
      } else if (isIndirect) {
        title = "피해 의식에 잠긴 예민한 팀원";
        description = "리더의 작은 지적도 본인 인격에 대한 거부로 받아들입니다. 억울한 표정으로 침묵하며 속으로 독기를 품는 스타일입니다.";
        tip = "지적할 내용과 그에 대한 대안을 부드럽게 제시하고, 그의 가능성을 믿는다는 확신을 주어야 합니다.";
      } else {
        title = "자기 객관화가 부족한 방어형";
        description = "지적을 받으면 본능적으로 정당성을 찾으려 합니다. 겉으로는 수긍하는 척하지만 속으로는 동의하지 않을 확률이 큽니다.";
        tip = "본인이 직접 본인의 업무를 평가하게 유도하여 스스로 괴리를 깨닫게 만드세요.";
      }
    } 
    // 2. 그 외 시나리오들을 위한 카테고리별 범용 로직
    else {
      if (category === '갈등 해결') {
        title = isLogic ? "논리적 대립을 즐기는 전략가" : (isEmotion ? "감정적 앙금이 깊은 중재 대상" : "실리 위주의 영리한 타협가");
        description = "자신의 입장을 관철시키기 위해 논리 혹은 감정을 전략적으로 사용하며, 리더의 공정성을 끊임없이 테스트합니다.";
        tip = "누가 옳은지보다 무엇이 팀에 이익인지(Common Interest)를 중심으로 대화를 이끄세요.";
      } else if (category === '성과 관리') {
        title = isDirect ? "결과 지향적 직설가" : (isIndirect ? "과정의 정당성을 따지는 신중파" : "성과 지표에 민감한 현실주의자");
        description = "자신의 기여도가 저평가받는 것에 예민하며, 명확한 가이드라인이 없을 때 불안해하거나 방어적으로 변합니다.";
        tip = "추상적인 단어보다 숫자와 구체적인 행동(Behavior)을 기반으로 피드백하세요.";
      } else if (category === '조직 문화') {
        title = isEmotion ? "관계 중심의 분위기 메이커" : (isLogic ? "원칙 중심의 시스템 옹호자" : "합리적 거리를 유지하는 관찰자");
        description = "팀 내 보이지 않는 위계나 분위기에 민감하게 반응하며, 리더의 언행일치를 주의 깊게 관찰하고 있습니다.";
        tip = "리더가 먼저 솔선수범하는 모습을 보이며, 심리적 안전감을 조성하는 데 주력하세요.";
      } else if (category === '동기 부여') {
        title = isLogic ? "성취 동기가 강한 야망가" : (isEmotion ? "유대감이 중요한 동료애 중심파" : "성장 가능성을 탐색하는 탐험가");
        description = "현재의 일에 의미를 찾지 못하면 급격히 에너지가 떨어집니다. 보상보다는 '성장' 혹은 '연결'을 원하고 있습니다.";
        tip = "팀원의 개인적 비전이 팀의 목표와 어디서 만나는지 접점을 찾아 연결해 주어야 합니다.";
      } else {
        // 완전 기본값
        title = "복합적인 성향의 현실적인 팀원";
        description = "상황에 따라 유연하게 대처하지만, 리더의 진정성이 느껴지지 않을 땐 조용히 방어 기제를 작동시키는 스타일입니다.";
        tip = "경청을 70%, 제안을 30%의 비율로 가져가며 팀원의 진심을 먼저 끌어내세요.";
      }
    }

    return { title, description, tip };
  }, [contextStyle, driverStyle, initialScenario]);

  const startSimulation = (mode: 'voice' | 'text') => {
    const path = mode === 'voice' ? '/voice' : '/simulation';
    navigate(path, { 
      state: { 
        name, 
        generation, 
        contextStyle,
        driverStyle,
        scenario: initialScenario 
      } 
    });
  };

  return (
    <div className="h-screen bg-navy-deep text-white flex flex-col font-display overflow-hidden">
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0A0F1D]/80 backdrop-blur-xl">
        <button onClick={() => navigate('/missions')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <div className="text-center">
            <h2 className="uppercase text-[10px] font-black tracking-[0.3em] text-primary">AI Persona Lab</h2>
            <p className="text-sm font-bold">맞춤형 팀원 프로파일링</p>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-40 hide-scrollbar lg:max-w-2xl lg:mx-auto lg:w-full">
        {/* 팀원 기본 정보 */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
             <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <span className="material-symbols-outlined text-xl">face</span>
             </div>
             <h3 className="text-lg font-bold">훈련 대상 리더십 정보</h3>
          </div>
          <div className="bg-navy-card p-6 rounded-[2rem] border border-white/5 shadow-xl">
            <div className="flex items-center gap-4">
               <div className="size-16 rounded-2xl overflow-hidden border-2 border-primary/30 shrink-0">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00F2FF&color=0A0F1D`} alt="avatar" className="size-full object-cover" />
               </div>
               <div className="flex-1">
                  <input
                    className="w-full bg-navy-deep rounded-xl border-white/10 border px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-lg font-bold mb-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름 입력"
                  />
                  <div className="flex items-center gap-2">
                    <span className="bg-white/5 px-2 py-0.5 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-widest">{generation}</span>
                    <span className="bg-primary/10 px-2 py-0.5 rounded-md text-[9px] font-black text-primary uppercase tracking-widest">{initialScenario?.category}</span>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* AI 정밀 분석 리포트 */}
        <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex items-center gap-3 mb-4">
             <div className="size-10 rounded-xl bg-accent-neon/20 flex items-center justify-center text-accent-neon border border-accent-neon/30">
                <span className="material-symbols-outlined text-xl">analytics</span>
             </div>
             <h3 className="text-lg font-bold">상황별 AI 행동 예측</h3>
          </div>
          <div className="bg-gradient-to-br from-[#161D2F] to-[#0D1525] p-8 rounded-[2.5rem] border border-primary/20 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <span className="material-symbols-outlined text-8xl">clinical_notes</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/30">
                  {personaBriefing.title}
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              <p className="text-[17px] text-white font-bold leading-relaxed mb-6">
                "{personaBriefing.description}"
              </p>
              <div className="bg-[#0A0F1D]/60 p-5 rounded-2xl border border-white/5 flex gap-4 items-start">
                 <div className="size-8 rounded-lg bg-accent-neon/10 flex items-center justify-center text-accent-neon shrink-0">
                    <span className="material-symbols-outlined text-lg">lightbulb</span>
                 </div>
                 <div>
                    <p className="text-[11px] font-black text-accent-neon uppercase tracking-widest mb-1">리더를 위한 전략 한마디</p>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {personaBriefing.tip}
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* 성향 조절 슬라이더 */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-slate-400 border border-white/10">
                   <span className="material-symbols-outlined text-xl">tune</span>
                </div>
                <h3 className="text-lg font-bold">성향 세밀 조정</h3>
             </div>
             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Fine-Tuning DNA</p>
          </div>
          
          <div className="bg-navy-card p-8 rounded-[2.5rem] border border-white/5 space-y-12">
            {/* 말투 스타일 */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                   <p className="text-xs font-bold text-white mb-1">직설적</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Direct</p>
                </div>
                <div className="px-5 text-primary font-black text-[9px] uppercase tracking-widest bg-primary/10 py-1.5 rounded-full border border-primary/20">말투 스타일</div>
                <div className="text-center flex-1">
                   <p className="text-xs font-bold text-white mb-1">완곡함</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Indirect</p>
                </div>
              </div>
              <div className="relative px-2">
                <input
                  type="range"
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-primary cursor-pointer relative z-10"
                  min="0"
                  max="100"
                  value={contextStyle}
                  onChange={(e) => setContextStyle(parseInt(e.target.value))}
                />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
                   {[0, 25, 50, 75, 100].map(v => <div key={v} className="size-1 bg-white/10 rounded-full"></div>)}
                </div>
              </div>
            </div>

            {/* 움직이는 가치 */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                   <p className="text-xs font-bold text-white mb-1">논리/팩트</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Logic</p>
                </div>
                <div className="px-5 text-accent-neon font-black text-[9px] uppercase tracking-widest bg-accent-neon/10 py-1.5 rounded-full border border-accent-neon/20">움직이는 동기</div>
                <div className="text-center flex-1">
                   <p className="text-xs font-bold text-white mb-1">공감/관계</p>
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Emotion</p>
                </div>
              </div>
              <div className="relative px-2">
                <input
                  type="range"
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none accent-accent-neon cursor-pointer relative z-10"
                  min="0"
                  max="100"
                  value={driverStyle}
                  onChange={(e) => setDriverStyle(parseInt(e.target.value))}
                />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
                   {[0, 25, 50, 75, 100].map(v => <div key={v} className="size-1 bg-white/10 rounded-full"></div>)}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 하단 시작 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-navy-deep via-navy-deep to-transparent z-40">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
          <button
            onClick={() => startSimulation('text')}
            className="bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
          >
            <span className="material-symbols-outlined text-sm font-bold">chat</span>
            채팅 세션
          </button>
          <button
            onClick={() => startSimulation('voice')}
            className="bg-primary text-navy-deep font-black text-xs uppercase tracking-widest py-5 rounded-2xl shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm font-bold">mic</span>
            음성 세션
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setup;
