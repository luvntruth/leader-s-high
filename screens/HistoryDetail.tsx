
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useParams } from 'react-router-dom';

type TabType = 'summary' | 'transcript' | 'sos' | 'memo';

const HistoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    const found = history.find((h: any) => h.id === id);
    if (found) {
      setData(found);
      setMemo(found.memo || '');
      setTags(found.tags || []);
    } else {
      navigate('/history');
    }
  }, [id, navigate]);

  // 메모 저장
  const saveMemo = () => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    const idx = history.findIndex((h: any) => h.id === id);
    if (idx >= 0) {
      history[idx].memo = memo;
      history[idx].tags = tags;
      localStorage.setItem('leadershigh_history', JSON.stringify(history));
    }
  };

  // 태그 추가
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      // 즉시 저장
      const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
      const idx = history.findIndex((h: any) => h.id === id);
      if (idx >= 0) {
        history[idx].tags = newTags;
        localStorage.setItem('leadershigh_history', JSON.stringify(history));
      }
    }
  };

  // 태그 삭제
  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    const idx = history.findIndex((h: any) => h.id === id);
    if (idx >= 0) {
      history[idx].tags = newTags;
      localStorage.setItem('leadershigh_history', JSON.stringify(history));
    }
  };

  if (!data) return null;

  const sosHistory = data.sosTipHistory || [];

  const tabs: { key: TabType; label: string; icon: string; count?: number }[] = [
    { key: 'summary', label: '요약', icon: 'summarize' },
    { key: 'transcript', label: '대화', icon: 'chat' },
    { key: 'sos', label: 'SOS 힌트', icon: 'auto_fix_high', count: sosHistory.length },
    { key: 'memo', label: '메모/태그', icon: 'edit_note' },
  ];

  return (
    <div className="h-screen bg-gray-50 text-gray-900 flex flex-col font-manrope overflow-hidden">
      <header className="p-4 border-b border-gray-200 bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="p-2 transition-transform active:scale-90">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold">{data.scenarioTitle}</h1>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest">{data.memberName}님과의 면담 기록</p>
          </div>
          <div className="size-10"></div>
        </div>

        {/* 태그 표시 */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3 px-1">
            {tags.map(tag => (
              <span key={tag} className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                activeTab === tab.key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-gray-100 text-gray-400 border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-primary/20 text-primary text-[8px] px-1.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar pb-10">

        {/* === 요약 탭 === */}
        {activeTab === 'summary' && data.evaluation && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem]">
              <h3 className="text-[10px] font-bold text-primary uppercase mb-3 tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                AI 정밀 분석 요약
              </h3>
              <p className="text-sm font-bold text-gray-700 leading-tight">{data.evaluation.summary}</p>
            </div>

            {/* 코칭 역량 점수 */}
            {data.evaluation.coachingSkills && (
              <div className="bg-navy-card p-5 rounded-2xl border border-gray-200">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">코칭 역량</h3>
                <div className="space-y-3">
                  {[
                    { key: 'empathyExpression', label: '공감 표현', color: 'bg-pink-500' },
                    { key: 'questionSkill', label: '질문 기술', color: 'bg-blue-500' },
                    { key: 'emotionControl', label: '감정 조절', color: 'bg-purple-500' },
                    { key: 'activeListening', label: '경청력', color: 'bg-green-500' },
                    { key: 'actionGuidance', label: '행동 유도', color: 'bg-amber-500' },
                  ].map((skill) => {
                    const value = data.evaluation.coachingSkills[skill.key] || 0;
                    return (
                      <div key={skill.key} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-500 w-16 shrink-0">{skill.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${value}%` }}></div>
                        </div>
                        <span className="text-xs font-black text-gray-900 w-8 text-right">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 메트릭 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '공감도', value: data.evaluation.metrics?.empathyIndex },
                { label: '전달력', value: data.evaluation.metrics?.sbiScore },
                { label: '성공률', value: data.evaluation.metrics?.outcomeSuccess },
              ].map((m, i) => (
                <div key={i} className="bg-gray-100 p-4 rounded-xl text-center border border-gray-200">
                  <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{m.label}</p>
                  <p className="text-xl font-black">{m.value || 0}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === 대화 탭 === */}
        {activeTab === 'transcript' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {data.transcript.map((msg: any, idx: number) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`max-w-[90%] p-5 rounded-[1.5rem] border ${
                   msg.role === 'user'
                     ? 'bg-gray-100 border-primary/20 text-gray-900 rounded-tr-none'
                     : 'bg-gray-100 border-gray-200 text-gray-600 rounded-tl-none'
                 }`}>
                   <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                 </div>
                 <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-2 ${msg.role === 'user' ? 'text-primary' : 'text-gray-400'}`}>
                   {msg.role === 'user' ? 'Leader' : data.memberName}
                 </p>
              </div>
            ))}
          </div>
        )}

        {/* === SOS 힌트 모아보기 탭 === */}
        {activeTab === 'sos' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {sosHistory.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-500 mb-3 block">auto_fix_high</span>
                <p className="text-gray-400 text-sm">이 세션에서는 SOS 힌트를 사용하지 않았습니다.</p>
              </div>
            ) : (
              sosHistory.map((sos: any, idx: number) => (
                <div key={idx} className="bg-navy-card p-5 rounded-2xl border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                      SOS #{idx + 1}
                    </span>
                    <span className="text-[9px] text-gray-400">Turn {sos.turnIndex}</span>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-xl mb-3">
                    <p className="text-sm font-bold text-gray-900 text-center">"{sos.tip.insight}"</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">{sos.tip.suggestion}</p>
                  <div className="space-y-1.5">
                    {sos.tip.magicPhrases?.map((phrase: string, pIdx: number) => (
                      <div key={pIdx} className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-lg">
                        <span className="material-symbols-outlined text-primary text-xs">chat_bubble</span>
                        <p className="text-[11px] text-gray-600">{phrase}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === 메모/태그 탭 === */}
        {activeTab === 'memo' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 메모 */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">edit_note</span>
                메모
              </h3>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onBlur={saveMemo}
                rows={5}
                className="w-full bg-navy-card border border-gray-200 rounded-2xl p-4 text-sm text-gray-900 placeholder-slate-600 outline-none resize-none focus:border-primary/50 transition-colors"
                placeholder="이 세션에 대한 메모를 남겨보세요. (예: 실제 팀원 이름, 적용할 상황, 느낀 점 등)"
              />
              <p className="text-[9px] text-gray-400 mt-1 px-1">포커스를 벗어나면 자동 저장됩니다.</p>
            </div>

            {/* 태그 */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">sell</span>
                태그
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 bg-navy-card border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-slate-600 outline-none focus:border-primary/50 transition-colors"
                  placeholder="태그 입력 후 Enter (예: 김철수, 1:1미팅)"
                />
                <button onClick={addTag} className="px-4 py-2.5 bg-primary/10 text-primary rounded-xl border border-primary/30 text-xs font-bold active:scale-95">
                  추가
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => removeTag(tag)}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20 text-xs font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors group"
                  >
                    #{tag}
                    <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">close</span>
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="text-[11px] text-gray-400">태그가 없습니다. 상황이나 팀원 이름 등을 태그로 추가해보세요.</p>
                )}
              </div>
            </div>

            {/* 추천 태그 */}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">추천 태그</p>
              <div className="flex gap-2 flex-wrap">
                {['1:1미팅', '성과면담', '갈등중재', '피드백', '실전적용', data.memberName].filter(Boolean).map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      if (!tags.includes(suggestion)) {
                        setTagInput(suggestion);
                        const newTags = [...tags, suggestion];
                        setTags(newTags);
                        const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
                        const idx = history.findIndex((h: any) => h.id === id);
                        if (idx >= 0) {
                          history[idx].tags = newTags;
                          localStorage.setItem('leadershigh_history', JSON.stringify(history));
                        }
                        setTagInput('');
                      }
                    }}
                    disabled={tags.includes(suggestion)}
                    className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                      tags.includes(suggestion)
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-primary/30 hover:text-primary active:scale-95'
                    }`}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-background-dark/90 border-t border-gray-200 flex gap-3">
         <button onClick={() => navigate('/')} className="flex-1 py-4 bg-gray-100 border border-gray-200 rounded-2xl font-bold text-xs">홈으로</button>
         <button onClick={() => navigate('/missions')} className="flex-1 py-4 bg-primary text-navy-deep rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest">Next Mission</button>
      </footer>
    </div>
  );
};

export default HistoryDetail;
