
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useParams } from 'react-router-dom';
import { dbService } from '../services/dbService';
import type { SimulationRecord } from '../src/types/database';

type TabType = 'summary' | 'transcript' | 'sos' | 'memo';

type DataSource = 'supabase' | 'local';

interface NormalizedRecord {
  id: string;
  scenarioTitle: string;
  memberName: string;
  transcript: Array<{ role: 'user' | 'model'; text: string }>;
  evaluation: {
    summary?: string;
    coachingSkills?: Record<string, number>;
    metrics?: { empathyIndex?: number; sbiScore?: number; outcomeSuccess?: number };
    [k: string]: unknown;
  } | null;
  sosTipHistory: Array<{ tip: { insight: string; suggestion: string; magicPhrases?: string[] }; turnIndex: number }>;
  memo: string;
  tags: string[];
}

/** Supabase SimulationRecord → UI 기대 필드로 정규화 */
function fromSupabase(r: SimulationRecord): NormalizedRecord {
  const fb = (r.feedback || {}) as Record<string, unknown>;
  return {
    id: r.id,
    scenarioTitle: r.scenario_title,
    memberName: r.character_name,
    transcript: Array.isArray(r.transcript) ? r.transcript : [],
    evaluation: {
      summary: (fb.summary as string) || undefined,
      coachingSkills: r.coaching_skills || undefined,
      metrics: (fb.metrics as NormalizedRecord['evaluation']) as any || undefined,
      ...fb,
    },
    // 현재 스키마에 sosTipHistory 컬럼이 없음 — feedback 안에 들어있으면 읽음, 없으면 빈 배열
    sosTipHistory: Array.isArray(fb.sosTipHistory)
      ? (fb.sosTipHistory as NormalizedRecord['sosTipHistory'])
      : [],
    memo: r.memo || '',
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
}

/** Legacy localStorage 항목을 그대로 수용 */
function fromLocal(raw: any): NormalizedRecord {
  return {
    id: raw.id,
    scenarioTitle: raw.scenarioTitle || raw.scenario_title || '',
    memberName: raw.memberName || raw.character_name || '',
    transcript: Array.isArray(raw.transcript) ? raw.transcript : [],
    evaluation: raw.evaluation || null,
    sosTipHistory: Array.isArray(raw.sosTipHistory) ? raw.sosTipHistory : [],
    memo: raw.memo || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

const HistoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<NormalizedRecord | null>(null);
  const [source, setSource] = useState<DataSource>('local');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [memo, setMemo] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) { navigate('/history'); return; }

      // 1순위: Supabase (UUID 형식이든 아니든 시도)
      try {
        const rec = await dbService.getHistoryById(id);
        if (rec && !cancelled) {
          const norm = fromSupabase(rec);
          setData(norm);
          setSource('supabase');
          setMemo(norm.memo);
          setTags(norm.tags);
          setLoading(false);
          return;
        }
      } catch {
        /* fallthrough to localStorage */
      }

      // 2순위: localStorage (guest 또는 마이그레이션 전 데이터)
      try {
        const local = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
        const found = local.find((h: any) => h.id === id);
        if (found && !cancelled) {
          const norm = fromLocal(found);
          setData(norm);
          setSource('local');
          setMemo(norm.memo);
          setTags(norm.tags);
          setLoading(false);
          return;
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) {
        setLoading(false);
        navigate('/history');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  /** memo/tags 저장 — source 별로 분기 */
  const persist = async (nextMemo: string, nextTags: string[]) => {
    if (!id) return;
    if (source === 'supabase') {
      try {
        await dbService.updateHistoryMemo(id, nextMemo, nextTags);
      } catch (e) {
        console.error('[HistoryDetail] memo/tag DB 저장 실패:', e);
      }
      return;
    }
    // local
    try {
      const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
      const idx = history.findIndex((h: any) => h.id === id);
      if (idx >= 0) {
        history[idx].memo = nextMemo;
        history[idx].tags = nextTags;
        localStorage.setItem('leadershigh_history', JSON.stringify(history));
      }
    } catch (e) {
      console.error('[HistoryDetail] memo/tag localStorage 저장 실패:', e);
    }
  };

  const saveMemo = () => { persist(memo, tags); };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const newTags = [...tags, trimmed];
    setTags(newTags);
    setTagInput('');
    persist(memo, newTags);
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    persist(memo, newTags);
  };

  if (loading) {
    return (
      <div className="h-screen bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">기록 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sosHistory = data.sosTipHistory || [];

  const tabs: { key: TabType; label: string; icon: string; count?: number }[] = [
    { key: 'summary', label: '요약', icon: 'summarize' },
    { key: 'transcript', label: '대화', icon: 'chat' },
    { key: 'sos', label: 'SOS 힌트', icon: 'auto_fix_high', count: sosHistory.length },
    { key: 'memo', label: '메모/태그', icon: 'edit_note' },
  ];

  return (
    <div className="h-screen bg-[#0A0F1D] text-white flex flex-col font-manrope overflow-hidden">
      <header className="p-4 border-b border-white/5 bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="p-2 transition-transform active:scale-90">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <div className="text-center">
            <h1 className="text-sm font-bold">{data.scenarioTitle}</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest">{data.memberName}님과의 면담 기록</p>
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
              className={`flex-1 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 transition-all ${
                activeTab === tab.key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-white/5 text-slate-500 border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              <span className="leading-none">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-primary/20 text-primary text-[8px] px-1.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 hide-scrollbar pb-10">

        {/* === 요약 탭 === */}
        {activeTab === 'summary' && data.evaluation && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {data.evaluation.summary && (
              <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem]">
                <h3 className="text-[10px] font-bold text-primary uppercase mb-3 tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">auto_awesome</span>
                  AI 정밀 분석 요약
                </h3>
                <p className="text-sm font-bold text-slate-100 leading-tight">{data.evaluation.summary}</p>
              </div>
            )}

            {/* 코칭 역량 점수 */}
            {data.evaluation.coachingSkills && (
              <div className="bg-navy-card p-5 rounded-2xl border border-white/10">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">코칭 역량</h3>
                <div className="space-y-3">
                  {[
                    { key: 'empathyExpression', label: '공감 표현', color: 'bg-pink-500' },
                    { key: 'questionSkill', label: '질문 기술', color: 'bg-blue-500' },
                    { key: 'emotionControl', label: '감정 조절', color: 'bg-purple-500' },
                    { key: 'activeListening', label: '경청력', color: 'bg-green-500' },
                    { key: 'actionGuidance', label: '행동 유도', color: 'bg-amber-500' },
                  ].map((skill) => {
                    const value = data.evaluation?.coachingSkills?.[skill.key] || 0;
                    return (
                      <div key={skill.key} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 w-16 shrink-0">{skill.label}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${skill.color} rounded-full`} style={{ width: `${value}%` }}></div>
                        </div>
                        <span className="text-xs font-black text-white w-8 text-right">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 메트릭 */}
            {data.evaluation.metrics && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: '공감도', value: data.evaluation.metrics?.empathyIndex },
                  { label: '전달력', value: data.evaluation.metrics?.sbiScore },
                  { label: '성공률', value: data.evaluation.metrics?.outcomeSuccess },
                ].map((m, i) => (
                  <div key={i} className="bg-white/5 p-3 sm:p-4 rounded-xl text-center border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1 break-keep">{m.label}</p>
                    <p className="text-lg sm:text-xl font-black">{m.value || 0}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 평가 데이터가 전혀 없을 때 안내 */}
        {activeTab === 'summary' && !data.evaluation && (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-700 mb-3 block">info</span>
            <p className="text-slate-500 text-sm">이 시뮬레이션은 AI 분석이 저장되지 않았습니다.</p>
          </div>
        )}

        {/* === 대화 탭 === */}
        {activeTab === 'transcript' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {data.transcript.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-16">대화 기록이 없습니다.</p>
            ) : data.transcript.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                 <div className={`max-w-[90%] p-5 rounded-[1.5rem] border ${
                   msg.role === 'user'
                     ? 'bg-[#161D2F] border-primary/20 text-white rounded-tr-none'
                     : 'bg-white/5 border-white/5 text-slate-200 rounded-tl-none'
                 }`}>
                   <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                 </div>
                 <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-2 ${msg.role === 'user' ? 'text-primary' : 'text-slate-500'}`}>
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
                <span className="material-symbols-outlined text-4xl text-slate-700 mb-3 block">auto_fix_high</span>
                <p className="text-slate-500 text-sm">이 세션에서는 SOS 힌트를 사용하지 않았습니다.</p>
              </div>
            ) : (
              sosHistory.map((sos, idx: number) => (
                <div key={idx} className="bg-navy-card p-5 rounded-2xl border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                      SOS #{idx + 1}
                    </span>
                    <span className="text-[9px] text-slate-500">Turn {sos.turnIndex}</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl mb-3">
                    <p className="text-sm font-bold text-white text-center">"{sos.tip.insight}"</p>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{sos.tip.suggestion}</p>
                  <div className="space-y-1.5">
                    {sos.tip.magicPhrases?.map((phrase: string, pIdx: number) => (
                      <div key={pIdx} className="flex items-center gap-2 bg-white/5 p-2.5 rounded-lg">
                        <span className="material-symbols-outlined text-primary text-xs">chat_bubble</span>
                        <p className="text-[11px] text-slate-300">{phrase}</p>
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
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">edit_note</span>
                메모
              </h3>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onBlur={saveMemo}
                rows={5}
                className="w-full bg-navy-card border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-slate-600 outline-none resize-none focus:border-primary/50 transition-colors"
                placeholder="이 세션에 대한 메모를 남겨보세요. (예: 실제 팀원 이름, 적용할 상황, 느낀 점 등)"
              />
              <p className="text-[9px] text-slate-600 mt-1 px-1">
                포커스를 벗어나면 자동 저장됩니다. {source === 'supabase' ? '(계정에 저장)' : '(브라우저 로컬 저장)'}
              </p>
            </div>

            {/* 태그 */}
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">sell</span>
                태그
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 bg-navy-card border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-primary/50 transition-colors"
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
                  <p className="text-[11px] text-slate-600">태그가 없습니다. 상황이나 팀원 이름 등을 태그로 추가해보세요.</p>
                )}
              </div>
            </div>

            {/* 추천 태그 */}
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">추천 태그</p>
              <div className="flex gap-2 flex-wrap">
                {['1:1미팅', '성과면담', '갈등중재', '피드백', '실전적용', data.memberName].filter(Boolean).map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      if (!tags.includes(suggestion)) {
                        const newTags = [...tags, suggestion];
                        setTags(newTags);
                        persist(memo, newTags);
                        setTagInput('');
                      }
                    }}
                    disabled={tags.includes(suggestion)}
                    className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                      tags.includes(suggestion)
                        ? 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-primary/30 hover:text-primary active:scale-95'
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

      <footer className="p-3 sm:p-4 mb-16 lg:mb-0 bg-background-dark/90 border-t border-white/5 flex gap-2 sm:gap-3">
         <button onClick={() => navigate('/')} className="flex-1 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs">홈으로</button>
         <button onClick={() => navigate('/missions')} className="flex-1 py-3 sm:py-4 bg-primary text-navy-deep rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest">Next Mission</button>
      </footer>
    </div>
  );
};

export default HistoryDetail;
