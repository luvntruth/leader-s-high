
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { createGeminiClient } from '../src/lib/geminiClient';

type TabMode = 'ai' | 'builder';

type Generation = 'Gen Z' | 'Millennial' | 'Gen X';

interface BuilderForm {
  name: string;
  generation: Generation;
  contextStyle: number;
  driverStyle: number;
  initialTrust: number;
  description: string;
  goal: string;
  title: string;
}

const DEFAULT_FORM: BuilderForm = {
  name: '',
  generation: 'Millennial',
  contextStyle: 50,
  driverStyle: 50,
  initialTrust: 45,
  description: '',
  goal: '',
  title: '',
};

const GENERATIONS: Generation[] = ['Gen Z', 'Millennial', 'Gen X'];

const GEN_LABELS: Record<Generation, string> = {
  'Gen Z': 'Gen Z (1997~)',
  'Millennial': 'Millennial (1981~96)',
  'Gen X': 'Gen X (~1980)',
};

// ────────────────────────────────────────────
// Slider sub-component
// ────────────────────────────────────────────
interface SliderFieldProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (v: number) => void;
  accentColor?: string;
}

const SliderField: React.FC<SliderFieldProps> = ({ label, leftLabel, rightLabel, value, onChange, accentColor = '#00e5ff' }) => {
  const pct = value;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black tabular-nums" style={{ color: accentColor }}>{value}</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/10">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}44, ${accentColor})` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-2 border-white shadow-lg transition-all"
          style={{ left: `calc(${pct}% - 8px)`, background: accentColor }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────
const CustomLab: React.FC = () => {
  const navigate = useNavigate();

  // ── Tab state ──────────────────────────────
  const [tab, setTab] = useState<TabMode>('ai');

  // ── AI mode state (original, untouched) ───
  const [messages, setMessages] = useState<{role: 'model' | 'user', text: string}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedScenario, setGeneratedScenario] = useState<any>(null);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Builder mode state ─────────────────────
  const [form, setForm] = useState<BuilderForm>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});
  const [builderScrollRef] = useState<React.RefObject<HTMLDivElement>>(() => React.createRef());

  // ────────────────────────────────────────────
  // AI mode effects (original)
  // ────────────────────────────────────────────
  useEffect(() => {
    const ai = createGeminiClient();
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `
          당신은 리더십 시뮬레이션 시나리오 설계자입니다. 사용자의 고민을 듣고 훈련용 시나리오를 만들어주는 비서 역할입니다.

          [핵심 규칙]
          - 별표(**)나 백틱(\`) 같은 마크다운 기호를 절대 사용하지 마세요. 오직 일반 텍스트와 이모지만 사용하세요.
          - 시뮬레이션을 직접 시작하지 마세요. 당신의 역할은 오직 '시나리오 설계'입니다.
          - 모든 정보(상황, 해결방향, 팀원 성향)가 파악되면 대화 마지막에 반드시 아래 형식의 JSON 데이터를 포함하여 응답하세요.
          - JSON 외의 텍스트는 시나리오 설계가 완료되었다는 안내만 간단히 하세요.

          [JSON 데이터 구조]
          {
            "memberName": "팀원 이름",
            "generation": "Gen Z 또는 Millennial 또는 Gen X",
            "description": "전체적인 상황 요약 (1-2문장)",
            "goal": "리더의 목표"
          }

          [상황 설명 템플릿]
          1. 구체적으로 어떤 상황인가요? (예시: 팀원 간 갈등 상황)
          2. 팀장님은 어떻게 해결되길 원하나요?
          3. 팀원의 특징이나 성향이 있다면 말씀해주세요.
        `,
      }
    });

    const init = async () => {
      setIsLoading(true);
      const startMsg = `안녕하세요! 리더님만의 맞춤형 시뮬레이션을 빠르게 설계해 드릴게요. 😊

아래 내용을 복사해서 채워주시면 더 정확한 설계가 가능합니다.

1. 구체적으로 어떤 상황인가요? (예시: 팀원 간 갈등 상황)
2. 팀장님은 어떻게 해결되길 원하나요?
3. 팀원의 특징이나 성향이 있다면 말씀해주세요.

현재 어떤 고민이 있으신가요?`;

      setMessages([{ role: 'model', text: startMsg }]);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !chatRef.current) return;

    const userText = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputText('');
    setIsLoading(true);

    try {
      const response: GenerateContentResponse = await chatRef.current.sendMessage({ message: userText });
      let modelText = response.text || '';

      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = modelText.match(jsonRegex);

      let chatDisplayMessage = modelText;
      if (jsonMatch) {
        try {
          const scenarioData = JSON.parse(jsonMatch[0]);
          setGeneratedScenario(scenarioData);
          chatDisplayMessage = modelText.replace(jsonRegex, '').trim();
        } catch (e) {
          console.error("JSON 파싱 에러", e);
        }
      }

      const cleanText = chatDisplayMessage
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .replace(/#/g, '')
        .trim();

      if (cleanText) {
        setMessages(prev => [...prev, { role: 'model', text: cleanText }]);
      } else if (jsonMatch) {
        setMessages(prev => [...prev, { role: 'model', text: "상황 파악을 마쳤습니다. 아래 버튼을 눌러 시뮬레이션을 시작해 주세요!" }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "연결 중 오류가 발생했습니다. 다시 말씀해 주시겠어요?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice 모드는 2026-04 런치에서 일시 제외. 텍스트 시뮬레이션만 사용.
  const startCustomSim = () => {
    navigate('/simulation', {
      state: {
        name: generatedScenario?.memberName || '팀원',
        generation: generatedScenario?.generation || 'Gen Z',
        commStyle: 50,
        scenario: {
          title: '맞춤형 챌린지',
          description: generatedScenario?.description || "리더십 시나리오",
          memberName: generatedScenario?.memberName || '팀원',
          generation: generatedScenario?.generation || 'Gen Z',
          goal: generatedScenario?.goal
        }
      }
    });
  };

  // ────────────────────────────────────────────
  // Builder mode handlers
  // ────────────────────────────────────────────
  const setFormField = <K extends keyof BuilderForm>(key: K, value: BuilderForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (formErrors[key as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const handleBuilderStart = () => {
    const errors: { name?: string; description?: string } = {};
    if (!form.name.trim()) errors.name = '캐릭터 이름을 입력해 주세요';
    if (!form.description.trim()) errors.description = '상황 설명을 입력해 주세요';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    const scenarioTitle = form.title.trim() || '맞춤형 챌린지';
    navigate('/simulation', {
      state: {
        name: form.name.trim(),
        generation: form.generation,
        contextStyle: form.contextStyle,
        driverStyle: form.driverStyle,
        initialTrust: form.initialTrust,
        scenario: {
          title: scenarioTitle,
          description: form.description.trim(),
          memberName: form.name.trim(),
          generation: form.generation,
          goal: form.goal.trim(),
        },
      },
    });
  };

  // ────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────
  const trustColor = form.initialTrust < 33 ? '#ff4d6d' : form.initialTrust < 66 ? '#ffd60a' : '#39ff14';
  const trustLabel = form.initialTrust < 33 ? '적대적' : form.initialTrust < 66 ? '중립' : '우호적';

  return (
    <div className="h-screen flex flex-col bg-background-dark text-white overflow-hidden font-manrope">
      {/* ── Header ── */}
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-background-dark/80 backdrop-blur-md shrink-0">
        <button onClick={() => navigate('/')} className="p-2 transition-transform active:scale-90">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] text-accent-neon font-bold uppercase tracking-tighter">AI Scenario Lab</p>
          <h1 className="text-sm font-bold">자율 주제 시나리오 생성</h1>
        </div>
        <div className="w-10" />
      </header>

      {/* ── Mode tabs ── */}
      <div className="shrink-0 px-4 pt-3 pb-0">
        <div className="relative flex bg-white/5 rounded-2xl p-1 gap-1">
          {/* sliding pill */}
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ease-out"
            style={{
              background: 'linear-gradient(135deg, #00e5ff22, #00e5ff11)',
              border: '1px solid #00e5ff44',
              transform: tab === 'ai' ? 'translateX(0)' : 'translateX(calc(100% + 4px))',
            }}
          />
          <button
            onClick={() => setTab('ai')}
            className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors duration-200 ${
              tab === 'ai' ? 'text-accent-neon' : 'text-slate-500'
            }`}
          >
            AI에게 맡기기
          </button>
          <button
            onClick={() => setTab('builder')}
            className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors duration-200 ${
              tab === 'builder' ? 'text-accent-neon' : 'text-slate-500'
            }`}
          >
            직접 만들기
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          TAB: AI mode (original UI, preserved)
      ════════════════════════════════════════ */}
      {tab === 'ai' && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth hide-scrollbar pb-24">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-xl ${
                  m.role === 'user'
                    ? 'bg-primary text-navy-deep font-bold rounded-tr-none'
                    : 'bg-surface-dark border border-white/10 text-slate-200 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-surface-dark border border-white/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
                  <div className="size-1.5 bg-accent-neon rounded-full"></div>
                  <div className="size-1.5 bg-accent-neon/60 rounded-full"></div>
                  <div className="size-1.5 bg-accent-neon/30 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-background-dark/95 border-t border-white/5 backdrop-blur-xl shrink-0">
            {generatedScenario ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-gradient-to-br from-primary/20 to-accent-neon/10 border border-primary/30 p-5 rounded-[2rem] text-center shadow-2xl">
                  <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  </div>
                  <p className="text-[10px] text-accent-neon font-bold mb-1 uppercase tracking-widest">Scenario Ready</p>
                  <h3 className="text-lg font-bold mb-1">{generatedScenario.memberName}님과의 면담</h3>
                  <p className="text-xs text-slate-400 leading-relaxed px-4">{generatedScenario.description}</p>
                </div>
                <button
                  onClick={startCustomSim}
                  className="w-full py-4 bg-primary text-navy-deep rounded-2xl font-bold shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95"
                >
                  시뮬레이션 시작
                </button>
                <button
                  onClick={() => setGeneratedScenario(null)}
                  className="w-full py-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  다시 설계하기
                </button>
              </div>
            ) : (
              <div className="relative flex items-end gap-2 bg-surface-dark border border-white/10 rounded-2xl p-1.5 focus-within:ring-1 focus-within:ring-accent-neon transition-all">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="flex-1 bg-transparent border-none px-4 py-2.5 text-sm text-white focus:outline-none outline-none resize-none hide-scrollbar max-h-[150px]"
                  placeholder="상황을 설명해주세요..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  className="mb-1 size-10 bg-primary text-navy-deep rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50 shrink-0"
                >
                  <span className="material-symbols-outlined font-black">send</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          TAB: Builder mode (new)
      ════════════════════════════════════════ */}
      {tab === 'builder' && (
        <div ref={builderScrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="p-4 pb-32 space-y-4">

            {/* ── Section: 캐릭터 정보 ── */}
            <section className="bg-surface-dark border border-white/8 rounded-3xl p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-6 rounded-lg bg-accent-neon/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-accent-neon text-sm">person</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-accent-neon">캐릭터 정보</span>
              </div>

              {/* 이름 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  팀원 이름 <span className="text-red-400">*</span>
                </label>
                <div className={`flex items-center bg-white/5 border rounded-xl px-4 py-3 transition-all focus-within:ring-1 focus-within:ring-accent-neon ${
                  formErrors.name ? 'border-red-400/60' : 'border-white/10'
                }`}>
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="예: 김민준"
                    value={form.name}
                    onChange={e => setFormField('name', e.target.value)}
                    maxLength={20}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-[10px] text-red-400 font-semibold">{formErrors.name}</p>
                )}
              </div>

              {/* 세대 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">세대</label>
                <div className="grid grid-cols-3 gap-2">
                  {GENERATIONS.map(g => (
                    <button
                      key={g}
                      onClick={() => setFormField('generation', g)}
                      className={`py-2.5 px-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 break-keep leading-tight ${
                        form.generation === g
                          ? 'bg-accent-neon/15 border-accent-neon text-accent-neon shadow-lg shadow-accent-neon/10'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'
                      }`}
                    >
                      {GEN_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Section: 소통 스타일 ── */}
            <section className="bg-surface-dark border border-white/8 rounded-3xl p-5 space-y-6">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">tune</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-primary">소통 스타일</span>
              </div>

              <SliderField
                label="맥락 의존도"
                leftLabel="직설적"
                rightLabel="우회적"
                value={form.contextStyle}
                onChange={v => setFormField('contextStyle', v)}
                accentColor="#00e5ff"
              />
              <SliderField
                label="감정 중심도"
                leftLabel="논리 중심"
                rightLabel="감정 중심"
                value={form.driverStyle}
                onChange={v => setFormField('driverStyle', v)}
                accentColor="#a78bfa"
              />
            </section>

            {/* ── Section: 초기 태도 ── */}
            <section className="bg-surface-dark border border-white/8 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg flex items-center justify-center" style={{ background: `${trustColor}22` }}>
                    <span className="material-symbols-outlined text-sm" style={{ color: trustColor }}>sentiment_neutral</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: trustColor }}>초기 태도</span>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full border" style={{ color: trustColor, borderColor: `${trustColor}44`, background: `${trustColor}11` }}>
                  {trustLabel}
                </span>
              </div>

              <SliderField
                label="적대적 → 우호적"
                leftLabel="적대적"
                rightLabel="우호적"
                value={form.initialTrust}
                onChange={v => setFormField('initialTrust', v)}
                accentColor={trustColor}
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                값이 낮을수록 팀원은 방어적·적대적으로 시작합니다. 난이도에 영향을 미칩니다.
              </p>
            </section>

            {/* ── Section: 시나리오 ── */}
            <section className="bg-surface-dark border border-white/8 rounded-3xl p-5 space-y-5">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-amber-400/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-sm">description</span>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">시나리오</span>
              </div>

              {/* 상황 설명 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  상황 설명 <span className="text-red-400">*</span>
                </label>
                <div className={`bg-white/5 border rounded-xl px-4 py-3 transition-all focus-within:ring-1 focus-within:ring-accent-neon ${
                  formErrors.description ? 'border-red-400/60' : 'border-white/10'
                }`}>
                  <textarea
                    rows={3}
                    className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none resize-none hide-scrollbar leading-relaxed"
                    placeholder="예: 최근 야근이 잦아 번아웃 증세를 보이는 팀원과 업무량 조정에 대해 대화해야 합니다."
                    value={form.description}
                    onChange={e => setFormField('description', e.target.value)}
                    maxLength={300}
                  />
                </div>
                {formErrors.description && (
                  <p className="text-[10px] text-red-400 font-semibold">{formErrors.description}</p>
                )}
              </div>

              {/* 리더의 목표 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">리더의 목표</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-accent-neon transition-all">
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="예: 팀원이 스스로 해결책을 찾도록 돕는다"
                    value={form.goal}
                    onChange={e => setFormField('goal', e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* 시나리오 제목 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                  시나리오 제목
                  <span className="ml-1.5 text-slate-600 normal-case font-normal">(비워두면 '맞춤형 챌린지')</span>
                </label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-accent-neon transition-all">
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                    placeholder="맞춤형 챌린지"
                    value={form.title}
                    onChange={e => setFormField('title', e.target.value)}
                    maxLength={40}
                  />
                </div>
              </div>
            </section>

            {/* ── Preview card ── */}
            {form.name.trim() && (
              <div className="bg-gradient-to-br from-accent-neon/10 to-primary/5 border border-accent-neon/20 rounded-3xl p-5 animate-in fade-in duration-300">
                <p className="text-[10px] text-accent-neon font-black uppercase tracking-widest mb-3">미리보기</p>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                    {form.generation === 'Gen Z' ? '👾' : form.generation === 'Millennial' ? '💼' : '🎯'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-white truncate">{form.name}</p>
                    <p className="text-[11px] text-slate-400">{form.generation} · 신뢰도 {form.initialTrust}</p>
                  </div>
                </div>
                {form.description.trim() && (
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-2">{form.description}</p>
                )}
              </div>
            )}
          </div>

          {/* ── Fixed CTA ── */}
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] bg-background-dark/95 backdrop-blur-xl border-t border-white/5">
            <button
              onClick={handleBuilderStart}
              className="w-full py-4 rounded-2xl font-black text-sm shadow-2xl transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00e5ff, #0077ff)',
                color: '#001a24',
                boxShadow: '0 8px 32px rgba(0,229,255,0.25)',
              }}
            >
              이 캐릭터로 시뮬레이션 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomLab;
