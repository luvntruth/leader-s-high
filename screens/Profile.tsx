
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { DataService, Badge, UserRank } from '../services/dataService';

interface RankDetail {
  lv: string;
  name: string;
  definition: string;
  features: string[];
  usage: string;
  actions: string[];
}

const RANK_DETAILS: Record<string, RankDetail> = {
  '루키 리더': {
    lv: 'Lv 1-5',
    name: '루키 리더',
    definition: '리더십의 기초 체력을 다지는 입문 단계입니다. 기본적인 소통과 팀원과의 신뢰 관계 구축에 집중하는 시기입니다.',
    features: ['학습 의욕이 높음', '표준적인 상황에서의 대화 선호', '갈등 상황에서 다소 방어적인 태도'],
    usage: '전체 카테고리의 기초 미션들을 골고루 수행하며 본인만의 소통 스타일(Communication Style)을 발견하는 데 집중하세요.',
    actions: ['일주일 3회 이상 미션 완료하기', '성과 관리 기초 시나리오 5개 클리어', '공감 지수 평균 70점 달성']
  },
  '프로페셔널 매니저': {
    lv: 'Lv 6-10',
    name: '프로페셔널 매니저',
    definition: '팀의 성과를 안정적으로 관리하며, 실무 리더로서의 핵심 역량이 검증된 중급 단계입니다.',
    features: ['갈등 해결 및 피드백 기술 숙달', '결과 중심적 사고와 합리적 의사결정', '팀원별 맞춤형 코칭 시도'],
    usage: '점차 난도가 높아지는 "갈등 해결" 및 "동기 부여" 심화 시나리오를 통해 고난도 대인관계 역량을 강화하세요.',
    actions: ['공감 지수 평균 85점 이상 유지', 'Z세대 팀원 피드백 미션 3회 완료', '연속 5일 학습 스트릭 달성']
  },
  '엘리트 전략가/하모니어': {
    lv: 'Lv 11-15',
    name: '엘리트 전략가/하모니어',
    definition: '본인만의 강점이 독보적으로 발현되어, 조직의 핵심 문제 해결사로 인정받는 상위 15% 리더입니다.',
    features: ['전략적 판단 또는 독보적 심리 지원에 특화', '복잡한 이해관계 조정 능력 탁월', '데이터 기반의 코칭 습관화'],
    usage: '정해진 시나리오를 넘어 "나만의 상황 커스텀 설계(Custom Lab)"를 활용해 실제 현업의 고민을 AI와 시뮬레이션하세요.',
    actions: ['상위 10% 리더 그룹 벤치마킹 지수 달성', 'Custom Lab을 통한 실전 시뮬레이션 5회', '전략 사고 역량 90점 돌파']
  },
  '마스터 디렉터': {
    lv: 'Lv 16+',
    name: '마스터 디렉터',
    definition: '조직 전체의 문화를 선도하고 미래 리더를 육성하는 통찰력을 지닌 최상위 리더십 단계입니다.',
    features: ['비전 제시 및 조직 가치 내재화 탁월', '극한의 스트레스 상황에서도 평정심 유지', '차세대 리더들을 위한 멘토링 가능'],
    usage: '음성 시뮬레이션(Live API)을 통해 실시간 대화의 즉각적인 반응성을 극대화하고, 전사 리더십 인사이트를 관리하세요.',
    actions: ['종합 LQ 지수 950점 돌파', '전사 리더십 벤치마킹 리포트 생성 및 활용', '모든 카테고리 마스터 배지 획득']
  }
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [selectedRankName, setSelectedRankName] = useState<string | null>(null);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    setRecentHistory(history.slice(0, 2));
    setBadges(DataService.getUserBadges());
    setRank(DataService.getUserRank());
  }, []);

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
  const currentRankDetail = selectedRankName ? RANK_DETAILS[selectedRankName] : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-manrope flex flex-col overflow-y-auto">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
            <span className="material-symbols-outlined text-primary">military_tech</span>
          </div>
          <h1 className="text-lg font-bold">리더 프로필</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2"><span className="material-symbols-outlined text-gray-500">notifications</span></button>
          <div className="size-10 rounded-full bg-slate-700 border-2 border-primary overflow-hidden">
            <img 
              src={`https://ui-avatars.com/api/?name=User&background=3182F6&color=FFFFFF`} 
              alt="Avatar" 
              className="size-full object-cover" 
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-24 space-y-8">
        {/* User Rank Card */}
        {rank && (
          <div className="bg-navy-card p-8 rounded-[2.5rem] border border-gray-200 relative overflow-hidden shadow-card">
            <div className="absolute -top-10 -right-10 size-40 bg-primary/10 rounded-full blur-3xl"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-primary text-[10px] font-bold uppercase mb-2 tracking-widest">현재 리더십 랭크</p>
                <h2 className="text-3xl font-extrabold mb-1 tracking-tighter">{rank.title}</h2>
                <p className="text-gray-500 text-sm font-medium">{rank.subTitle}</p>
              </div>
              
              <button 
                onClick={() => {
                  setSelectedRankName(null);
                  setShowRankInfo(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all shadow-[0_0_10px_rgba(49,130,246,0.1)] group"
              >
                <span className="material-symbols-outlined text-sm text-primary font-bold group-hover:scale-110 transition-transform">info</span>
                <span className="text-[10px] font-black text-primary uppercase tracking-tighter">랭크 안내</span>
              </button>
            </div>

            <div className="mt-8 space-y-3 relative z-10">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400 tracking-tight">Level {rank.level} <span className="mx-1 text-gray-500">/</span> Next Level {rank.level + 1}</span>
                <span className="text-primary font-black">{rank.currentXp} / {rank.nextLevelXp} XP</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full shadow-neon-cyan transition-all duration-1000" 
                  style={{width: `${rank.progress}%`}}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Rank Logic Info Modal */}
        {showRankInfo && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowRankInfo(false)}>
             <div 
               className="w-full max-w-sm bg-navy-card rounded-[3rem] p-8 border border-gray-200 shadow-card animate-in zoom-in-95 duration-200 overflow-hidden" 
               onClick={e => e.stopPropagation()}
             >
                {!currentRankDetail ? (
                  /* Rank List View */
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-center mb-6">
                       <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/30 shadow-neon-cyan">
                          <span className="material-symbols-outlined text-primary text-3xl">military_tech</span>
                       </div>
                    </div>
                    <h3 className="text-xl font-black mb-6 text-center italic tracking-tighter uppercase">Leadership Ranking System</h3>
                    <p className="text-[10px] text-center text-gray-400 mb-6 uppercase tracking-widest">각 단계를 클릭하여 상세 가이드를 확인하세요</p>
                    <div className="space-y-3">
                       {Object.keys(RANK_DETAILS).map((key, i) => {
                         const item = RANK_DETAILS[key];
                         return (
                           <button 
                             key={i} 
                             onClick={() => setSelectedRankName(key)}
                             className="w-full flex gap-4 p-4 bg-gray-100 rounded-2xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all group text-left"
                           >
                              <div className="text-[10px] font-black text-primary shrink-0 w-12 pt-0.5">{item.lv}</div>
                              <div className="flex-1">
                                 <p className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">{item.name}</p>
                                 <p className="text-[10px] text-gray-400">{item.definition.slice(0, 22)}...</p>
                              </div>
                              <span className="material-symbols-outlined text-gray-500 text-sm group-hover:text-primary transition-colors">chevron_right</span>
                           </button>
                         );
                       })}
                    </div>
                    <button 
                      onClick={() => setShowRankInfo(false)} 
                      className="w-full mt-8 py-4 bg-gray-100 text-gray-500 font-black text-xs uppercase rounded-xl border border-gray-200"
                    >
                      닫기
                    </button>
                  </div>
                ) : (
                  /* Rank Detail View */
                  <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                    <button 
                      onClick={() => setSelectedRankName(null)}
                      className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest mb-6 hover:translate-x-[-4px] transition-transform"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span> 뒤로가기
                    </button>
                    
                    <div className="mb-6">
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{currentRankDetail.lv}</span>
                      <h3 className="text-2xl font-black italic">{currentRankDetail.name}</h3>
                    </div>

                    <div className="space-y-6 max-h-[400px] overflow-y-auto hide-scrollbar pr-1">
                      <section>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">정의</h4>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{currentRankDetail.definition}</p>
                      </section>

                      <section>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">핵심 특징</h4>
                        <ul className="space-y-1.5">
                          {currentRankDetail.features.map((f, i) => (
                            <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                              <span className="text-primary mt-1 text-[10px]">•</span> {f}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="bg-primary/5 p-5 rounded-2xl border border-primary/20">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">훈련 앱 활용 방안</h4>
                        <p className="text-xs text-gray-600 leading-relaxed italic">"{currentRankDetail.usage}"</p>
                      </section>

                      <section>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Next Level 추천 액션</h4>
                        <div className="space-y-2">
                          {currentRankDetail.actions.map((a, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl border border-gray-200">
                              <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                              <span className="text-xs font-bold text-gray-600">{a}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    <button 
                      onClick={() => setSelectedRankName(null)} 
                      className="w-full mt-8 py-5 bg-primary text-navy-deep font-black text-xs uppercase rounded-2xl shadow-neon-cyan active:scale-95 transition-all"
                    >
                      다른 랭크 확인
                    </button>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Badge Gallery Section */}
        <section>
          <div className="flex justify-between items-center mb-5 px-1">
             <h3 className="text-lg font-bold flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">workspace_premium</span>
               리더십 획득 배지 <span className="text-primary ml-1">{unlockedCount}</span>
             </h3>
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Badge Collection</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {badges.map((badge) => (
              <button 
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`flex flex-col items-center gap-2 transition-all active:scale-90 ${badge.isUnlocked ? 'opacity-100' : 'opacity-20 grayscale'}`}
              >
                <div className={`size-16 rounded-2xl flex items-center justify-center border transition-all ${
                  badge.isUnlocked 
                    ? 'bg-gray-100 border-gray-200 shadow-neon-cyan' 
                    : 'bg-black/20 border-gray-200'
                }`}>
                  <span className={`material-symbols-outlined text-2xl ${badge.isUnlocked ? badge.color : 'text-gray-400'}`}>
                    {badge.icon}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">{badge.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Stats & Streak Detail Links */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/streak')}
            className="bg-gray-100 p-6 rounded-[2rem] border border-gray-200 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-accent-amber/30"
          >
            <div className="size-12 rounded-2xl bg-accent-amber/10 flex items-center justify-center text-accent-amber mb-3 group-hover:shadow-[0_0_15px_rgba(255,184,0,0.2)]">
              <span className="material-symbols-outlined">local_fire_department</span>
            </div>
            <p className="font-bold text-sm">5일 스트릭</p>
          </div>
          <div 
            onClick={() => navigate('/insights')}
            className="bg-gray-100 p-6 rounded-[2rem] border border-gray-200 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all group hover:border-primary/30"
          >
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:shadow-[0_0_15px_rgba(49,130,246,0.2)]">
              <span className="material-symbols-outlined">query_stats</span>
            </div>
            <p className="font-bold text-sm">성과 대시보드</p>
          </div>
        </div>

        {/* Recent History */}
        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-neon">history</span>
              최근 대화 히스토리
            </h3>
            <button onClick={() => navigate('/history')} className="text-[10px] font-bold text-primary uppercase tracking-widest">전체보기</button>
          </div>
          <div className="space-y-3">
            {recentHistory.length > 0 ? (
              recentHistory.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/history/${item.id}`)}
                  className="bg-navy-card p-5 rounded-[2rem] border border-gray-200 flex items-center justify-between active:scale-[0.98] transition-all hover:border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`size-11 rounded-xl flex items-center justify-center ${item.type === 'voice' ? 'bg-primary/20 text-primary' : 'bg-accent-neon/20 text-accent-neon'}`}>
                      <span className="material-symbols-outlined text-xl">{item.type === 'voice' ? 'mic' : 'chat'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[150px]">{item.scenarioTitle}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase">{item.memberName} • {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 text-lg">arrow_forward_ios</span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-gray-100 rounded-[2.5rem] border border-dashed border-gray-200">
                <p className="text-sm text-gray-400 font-medium">아직 저장된 대화가 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedBadge(null)}
        >
          <div 
            className="w-full max-w-sm bg-navy-card rounded-[3rem] p-8 border border-gray-200 shadow-card text-center flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className={`size-24 rounded-[2rem] flex items-center justify-center border mb-6 ${selectedBadge.isUnlocked ? 'bg-gray-100 border-primary/30 shadow-neon-cyan' : 'bg-gray-900/40 border-gray-200'}`}>
              <span className={`material-symbols-outlined text-5xl ${selectedBadge.isUnlocked ? selectedBadge.color : 'text-gray-500'}`}>
                {selectedBadge.icon}
              </span>
            </div>
            <h3 className="text-2xl font-black mb-2">{selectedBadge.name}</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
              {selectedBadge.description}
            </p>
            <div className="w-full bg-gray-100 p-5 rounded-2xl border border-gray-200 mb-8">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">획득 조건</p>
               <p className={`text-sm font-bold ${selectedBadge.isUnlocked ? 'text-primary' : 'text-gray-500'}`}>
                 {selectedBadge.condition}
               </p>
            </div>
            <button 
              onClick={() => setSelectedBadge(null)}
              className="w-full py-4 bg-primary text-navy-deep font-black text-xs uppercase tracking-widest rounded-xl"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Profile;
