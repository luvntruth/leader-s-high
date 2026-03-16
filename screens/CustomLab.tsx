
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { createGeminiClient } from '../src/lib/geminiClient';

const CustomLab: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{role: 'model' | 'user', text: string}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedScenario, setGeneratedScenario] = useState<any>(null);
  const chatRef = useRef<Chat | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const startCustomSim = (mode: 'voice' | 'text') => {
    navigate(mode === 'voice' ? '/voice' : '/simulation', {
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

  return (
    <div className="h-screen flex flex-col bg-background-dark text-white overflow-hidden font-manrope">
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-background-dark/80 backdrop-blur-md">
        <button onClick={() => navigate('/')} className="p-2 transition-transform active:scale-90"><span className="material-symbols-outlined">close</span></button>
        <div className="text-center">
          <p className="text-[10px] text-accent-neon font-bold uppercase tracking-tighter">AI Scenario Lab</p>
          <h1 className="text-sm font-bold">자율 주제 시나리오 생성</h1>
        </div>
        <div className="w-10"></div>
      </header>

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

      <div className="p-4 bg-background-dark/95 border-t border-white/5 backdrop-blur-xl">
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
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => startCustomSim('text')} 
                className="py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                텍스트 시작
              </button>
              <button 
                onClick={() => startCustomSim('voice')} 
                className="py-4 bg-primary text-navy-deep rounded-2xl font-bold shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all active:scale-95"
              >
                음성 시작
              </button>
            </div>
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
    </div>
  );
};

export default CustomLab;
