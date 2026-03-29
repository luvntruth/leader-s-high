
import React, { useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import { supabase } from '../src/lib/supabase';

// ── Mock 데이터 ──────────────────────────────────────────
const MOCK_SCENARIO = {
  id: 'late-comer',
  title: '성과 좋은 만성 지각자',
  category: '성과 관리',
  description: '팀의 핵심 개발자가 매일 30분씩 늦습니다.',
  memberName: '김철수',
  generation: 'GEN_Z',
  intensity: 'low',
  traits: { context: 20, driver: 40 },
};

const MOCK_TRANSCRIPT = [
  { role: 'model', text: '팀장님, 저 왔어요. 회의 많이 진행됐나요?' },
  { role: 'user',  text: '철수씨, 오늘 회의 20분 늦었는데 무슨 일 있었어요?' },
  { role: 'model', text: '아, 지하철이 좀 막혀서요. 크게 놓친 건 없죠?' },
  { role: 'user',  text: '중요한 부분을 놓쳤어요. 최근에 계속 늦는 게 팀에 영향을 주고 있어서 이야기 나누고 싶었어요.' },
  { role: 'model', text: '제가 성과로 메꾸고 있지 않나요? 실제 업무에서 문제가 생긴 건 아니잖아요.' },
  { role: 'user',  text: '성과는 인정해요. 하지만 다른 팀원들이 철수씨 눈치를 보기 시작했어요. 팀 문화에 영향을 주고 있는 것 같아요.' },
  { role: 'model', text: '...그건 생각 못 했네요. 팀원들이 그렇게 느끼는지 몰랐어요.' },
  { role: 'user',  text: '앞으로 어떻게 하면 좋을지 같이 방법을 찾아보면 좋겠어요.' },
  { role: 'model', text: '알겠어요. 일주일 내로 정시 출근을 시도해볼게요. 만약 어려우면 미리 말씀드리겠습니다.' },
];

const MOCK_EVALUATION = {
  summary: '팀원의 방어적 반응에 감정적으로 대응하지 않고, 팀 전체 관점으로 대화를 이끌었습니다. SBI 모델을 활용한 구체적 피드백이 효과적이었습니다.',
  strengths: [
    { title: '공감적 경청', desc: '상대방의 입장을 먼저 인정한 후 문제를 제기하여 방어심을 낮췄습니다.' },
    { title: '구체적 피드백', desc: '추상적 지적 대신 팀원 반응이라는 구체적 영향을 전달했습니다.' },
  ],
  improvements: [
    { title: '해결책 공동 설계', desc: '해결책을 제시하는 것에서 나아가 팀원이 직접 제안하도록 유도할 수 있었습니다.' },
  ],
  modelAnswers: [
    {
      situation: '성과로 메꾸고 있지 않나요?',
      bestResponse: '철수씨 성과가 팀에서 정말 중요하다는 건 저도 알고 있어요. 그래서 더 솔직하게 말씀드리고 싶어요.',
      why: '강점을 먼저 인정(긍정 앵커링)한 뒤 팀 전체의 관점으로 프레임을 전환했습니다.',
    },
  ],
  theoryInsight: {
    theoryName: '자기결정이론 (SDT)',
    scienceBase: '외부 압박보다 자율적 선택이 행동 변화를 이끌어낸다.',
    practicalApply: '규칙을 팀의 공동 가치로 재정의할 때 자발적 변화가 일어납니다.',
  },
  actionItems: ['다음 1:1에서 지각 원인 파악하기', '팀 규범 문서 함께 작성하기'],
  coachingSkills: { empathyExpression: 78, questionSkill: 65, emotionControl: 82, activeListening: 74, actionGuidance: 71 },
  metrics: { sbiScore: 76, empathyIndex: 78, outcomeSuccess: 72 },
  radarChart: { trust: 74, motivation: 68, conflict: 72, decision: 65, strategy: 70 },
};

// ── 섹션 타이틀 ──────────────────────────────────────────
const SectionTitle: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-3">{label}</p>
);

// ── 버튼 ─────────────────────────────────────────────────
type BtnColor = 'amber' | 'cyan' | 'green' | 'purple' | 'red' | 'slate';

const Btn: React.FC<{
  label: string;
  sub?: string;
  color: BtnColor;
  badge?: string;
  onClick: () => void;
}> = ({ label, sub, color, badge, onClick }) => {
  const cls: Record<BtnColor, string> = {
    amber:  'bg-amber-500/10  border-amber-500/30  text-amber-400  hover:bg-amber-500/20',
    cyan:   'bg-cyan-500/10   border-cyan-500/20   text-cyan-400   hover:bg-cyan-500/20',
    green:  'bg-green-500/10  border-green-500/20  text-green-400  hover:bg-green-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20',
    red:    'bg-red-500/10    border-red-500/20    text-red-400    hover:bg-red-500/20',
    slate:  'bg-slate-800/40  border-slate-700/30  text-slate-300  hover:bg-slate-700/40',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${cls[color]} flex items-start justify-between gap-3`}
    >
      <div>
        <p className="font-bold text-sm">{label}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 mt-0.5">{badge}</span>
      )}
    </button>
  );
};

// ── DevPanel 메인 ──────────────────────────────────────────
const DevPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ status: 'idle' | 'running' | 'ok' | 'error'; msg: string }>({ status: 'idle', msg: '' });
  const [profileCheck, setProfileCheck] = useState<{ status: 'idle' | 'running' | 'ok' | 'missing'; msg: string }>({ status: 'idle', msg: '' });

  const testSimulationSave = async () => {
    if (!user) { setDbTestResult({ status: 'error', msg: '로그인이 필요합니다.' }); return; }
    setDbTestResult({ status: 'running', msg: '저장 테스트 중...' });
    try {
      const simId = await dbService.saveSimulation({
        user_id: user.id,
        org_id: null,
        scenario_id: 'dev-test',
        scenario_title: '[DEV] 저장 테스트',
        scenario_category: null,
        character_name: '테스트',
        character_generation: null,
        transcript: [{ role: 'user', text: 'test' }, { role: 'model', text: 'ok' }],
        message_count: 2,
        duration_seconds: 10,
        final_trust: 50,
        trust_history: [50],
        trust_dimensions: null,
        feedback: null,
        coaching_skills: null,
        radar_chart: null,
        leadership_type: null,
        communication_pattern: null,
        memo: '',
        tags: ['dev-test'],
      });
      setDbTestResult({ status: 'ok', msg: `✓ 저장 성공! ID: ${simId?.slice(0, 8)}…` });
    } catch (err: any) {
      setDbTestResult({ status: 'error', msg: err.message || String(err) });
    }
  };

  const checkProfile = async () => {
    if (!user) { setProfileCheck({ status: 'missing', msg: '로그인이 필요합니다.' }); return; }
    setProfileCheck({ status: 'running', msg: '조회 중...' });
    const { data, error } = await supabase.from('profiles').select('id, email, plan, created_at').eq('id', user.id).single();
    if (data) {
      setProfileCheck({ status: 'ok', msg: `✓ 프로필 존재 | plan: ${data.plan} | 가입: ${new Date(data.created_at).toLocaleDateString('ko')}` });
    } else {
      setProfileCheck({ status: 'missing', msg: `✗ 프로필 없음 | ${error?.message || '조회 실패'}` });
    }
  };

  const setPendingPurchase = () => {
    sessionStorage.setItem('leadershigh_pending_purchase', JSON.stringify({
      transcript: MOCK_TRANSCRIPT,
      scenario: MOCK_SCENARIO,
      sosTipHistory: [],
      evaluation: MOCK_EVALUATION,
    }));
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 max-w-lg mx-auto">

      {/* 헤더 */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 mb-4">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-400 text-xs font-bold">DEV · 운영자 테스트 패널</span>
        </div>
        <h1 className="text-white text-xl font-black mb-1">전체 기능 테스트</h1>
        <p className="text-slate-500 text-sm">시뮬레이션 없이 각 화면을 바로 확인합니다</p>
      </div>

      {/* ── 현재 인증 상태 ── */}
      <section className="mb-8">
        <SectionTitle label="현재 인증 상태" />
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 space-y-2 text-xs">
          {user ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">상태</span>
                <span className="text-green-400 font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-green-400" />
                  로그인됨
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">이메일</span>
                <span className="text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">플랜</span>
                <span className={`font-bold ${profile?.plan === 'free' ? 'text-slate-400' : 'text-amber-400'}`}>
                  {profile?.plan || 'free'}
                  {profile?.plan_expires_at && ` (${new Date(profile.plan_expires_at).toLocaleDateString('ko')}까지)`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">User ID</span>
                <button onClick={copyUserId} className="text-slate-500 hover:text-white transition-colors font-mono text-[10px]">
                  {copied ? '✓ 복사됨' : `${user.id.slice(0, 8)}…`}
                </button>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full mt-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-all"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">상태</span>
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-slate-500" />
                  비로그인 (게스트)
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => navigate('/login')}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/20 transition-all"
                >
                  로그인
                </button>
                <button
                  onClick={() => navigate('/signup', { state: { intent: 'golden-script', ...MOCK_SCENARIO && { transcript: MOCK_TRANSCRIPT, scenario: MOCK_SCENARIO, sosTipHistory: [], evaluation: MOCK_EVALUATION } } })}
                  className="flex-1 py-1.5 rounded-lg bg-slate-700/40 border border-slate-600/30 text-slate-300 text-xs hover:bg-slate-600/40 transition-all"
                >
                  회원가입
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── DB 진단 ── */}
      <section className="mb-8">
        <SectionTitle label="DB 진단 (저장 에러 디버깅)" />
        <div className="space-y-3">

          {/* 프로필 존재 확인 */}
          <div>
            <button
              onClick={checkProfile}
              disabled={profileCheck.status === 'running'}
              className="w-full text-left px-4 py-3.5 rounded-xl border transition-all bg-slate-800/40 border-slate-700/30 text-slate-300 hover:bg-slate-700/40 disabled:opacity-50"
            >
              <p className="font-bold text-sm">profiles 행 존재 확인</p>
              <p className="text-xs opacity-60 mt-0.5">simulation_history FK의 기반 — 없으면 저장 실패</p>
            </button>
            {profileCheck.status !== 'idle' && (
              <div className={`mt-1.5 px-3 py-2 rounded-lg text-xs font-mono ${
                profileCheck.status === 'ok' ? 'bg-green-500/10 text-green-400' :
                profileCheck.status === 'running' ? 'bg-slate-800/60 text-slate-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {profileCheck.msg}
              </div>
            )}
          </div>

          {/* 시뮬레이션 저장 테스트 */}
          <div>
            <button
              onClick={testSimulationSave}
              disabled={dbTestResult.status === 'running'}
              className="w-full text-left px-4 py-3.5 rounded-xl border transition-all bg-slate-800/40 border-slate-700/30 text-slate-300 hover:bg-slate-700/40 disabled:opacity-50"
            >
              <p className="font-bold text-sm">simulation_history INSERT 테스트</p>
              <p className="text-xs opacity-60 mt-0.5">실제 DB에 테스트 행 삽입 — 에러 메시지 확인</p>
            </button>
            {dbTestResult.status !== 'idle' && (
              <div className={`mt-1.5 px-3 py-2 rounded-lg text-xs font-mono break-all ${
                dbTestResult.status === 'ok' ? 'bg-green-500/10 text-green-400' :
                dbTestResult.status === 'running' ? 'bg-slate-800/60 text-slate-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {dbTestResult.msg}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── 퍼널 플로우 가이드 ── */}
      <section className="mb-8">
        <SectionTitle label="전체 퍼널 흐름 (순서대로 테스트)" />
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 mb-4">
          <p className="text-slate-400 text-xs leading-relaxed">
            <span className="text-amber-400 font-bold">① 피드백</span>
            {' → '}
            <span className="text-amber-400 font-bold">② 회원가입</span>
            {' → '}
            <span className="text-amber-400 font-bold">③ 구매화면</span>
            {' → '}
            <span className="text-amber-400 font-bold">④ 마이페이지</span>
          </p>
          <p className="text-slate-600 text-[11px] mt-1">각 버튼이 위 순서의 해당 단계를 직접 열어줍니다</p>
        </div>

        <div className="space-y-2.5">
          <Btn
            color="amber"
            label="① 피드백 (게스트 · 간략 리포트)"
            sub="상단 '전문가 코칭 플레이북 구매하기' 배너 확인"
            badge="GUEST"
            onClick={() => navigate('/feedback', {
              state: { transcript: MOCK_TRANSCRIPT, scenario: MOCK_SCENARIO, sosTipHistory: [], isGuest: true },
            })}
          />
          <Btn
            color="amber"
            label="① 피드백 (로그인 · 풀 리포트)"
            sub="무료 플랜 유저 기준 — 배너 + 풀 평가 데이터 확인"
            badge="AUTH"
            onClick={() => navigate('/feedback', {
              state: { transcript: MOCK_TRANSCRIPT, scenario: MOCK_SCENARIO, sosTipHistory: [], evaluation: MOCK_EVALUATION },
            })}
          />
          <Btn
            color="amber"
            label="② 회원가입 (golden-script intent 포함)"
            sub="피드백에서 '구매하기' 클릭 시 오는 화면"
            badge="FUNNEL"
            onClick={() => navigate('/signup', {
              state: {
                intent: 'golden-script',
                transcript: MOCK_TRANSCRIPT,
                scenario: MOCK_SCENARIO,
                sosTipHistory: [],
                evaluation: MOCK_EVALUATION,
              },
            })}
          />
          <Btn
            color="amber"
            label="③ 구매 화면 (mock 데이터 사전 주입)"
            sub="로그인 필요 — sessionStorage에 mock 데이터 저장 후 이동"
            badge="AUTH"
            onClick={() => { setPendingPurchase(); navigate('/purchase/playbook'); }}
          />
          <Btn
            color="amber"
            label="④ 마이페이지 › 구매 플레이북 탭"
            sub="account 탭 → 구매한 플레이북 섹션 확인"
            badge="AUTH"
            onClick={() => navigate('/profile')}
          />
        </div>
      </section>

      {/* ── 개별 화면 ── */}
      <section className="mb-8">
        <SectionTitle label="개별 화면 바로가기" />
        <div className="space-y-2">
          <Btn color="cyan" label="플레이북 샘플 미리보기" sub="구매 후 보이는 화면 — AI 호출 없음" onClick={() => navigate('/dev/playbook-sample', { state: { fromDev: true } })} />
          <Btn color="cyan" label="요금제 페이지" sub="프로 · 울트라 플랜 확인" onClick={() => navigate('/pricing')} />
          <Btn color="cyan" label="랜딩 페이지" sub="로그인 버튼 · 요금제 요약 섹션" onClick={() => navigate('/landing')} />
          <Btn color="cyan" label="온보딩" sub="게스트 시뮬레이션 입구" onClick={() => navigate('/onboarding')} />
          <Btn color="cyan" label="업그레이드 안내" sub="무료 체험 완료 후 화면" onClick={() => navigate('/upgrade')} />
        </div>
      </section>

      {/* ── 시뮬레이션 ── */}
      <section className="mb-8">
        <SectionTitle label="시뮬레이션" />
        <div className="space-y-2">
          <Btn
            color="green"
            label="시나리오 선택 → 시뮬레이션"
            sub="정상 흐름 — Setup 화면부터 시작"
            onClick={() => navigate('/setup')}
          />
          <Btn
            color="green"
            label="시뮬레이션 직접 (mock 시나리오)"
            sub="Setup 건너뛰고 바로 채팅 화면"
            onClick={() => navigate('/simulation', { state: { scenario: MOCK_SCENARIO } })}
          />
          <Btn
            color="green"
            label="히스토리 목록"
            sub="저장된 시뮬레이션 이력 (로그인 필요)"
            badge="AUTH"
            onClick={() => navigate('/history')}
          />
        </div>
      </section>

      {/* ── 게스트 전환 플로우 ── */}
      <section className="mb-8">
        <SectionTitle label="게스트 → 회원 전환 플로우" />
        <div className="space-y-2">
          <Btn
            color="purple"
            label="게스트 전환 회원가입"
            sub="localStorage에 guest_transcript 저장 후 signup (isGuestConversion: true)"
            onClick={() => {
              localStorage.setItem('leadershigh_guest_transcript', JSON.stringify({
                transcript: MOCK_TRANSCRIPT,
                scenario: MOCK_SCENARIO,
                sosTipHistory: [],
              }));
              navigate('/signup', { state: { guest: true } });
            }}
          />
          <Btn
            color="purple"
            label="Signup — intent 없이 직접 접근"
            sub="→ /onboarding 리다이렉트 확인"
            onClick={() => navigate('/signup')}
          />
        </div>
      </section>

      {/* ── 위험 영역 ── */}
      <section className="mb-8">
        <SectionTitle label="데이터 초기화" />
        <div className="space-y-2">
          <Btn
            color="red"
            label="sessionStorage 구매 데이터 삭제"
            sub="leadershigh_pending_purchase 키 제거"
            onClick={() => {
              sessionStorage.removeItem('leadershigh_pending_purchase');
              alert('sessionStorage 삭제 완료');
            }}
          />
          <Btn
            color="red"
            label="localStorage 게스트 데이터 삭제"
            sub="leadershigh_guest_transcript 키 제거"
            onClick={() => {
              localStorage.removeItem('leadershigh_guest_transcript');
              alert('localStorage 삭제 완료');
            }}
          />
        </div>
      </section>

      {/* 홈 */}
      <Btn color="slate" label="← 홈으로" onClick={() => navigate('/')} />

      <p className="text-slate-700 text-xs text-center mt-8">
        DEV ONLY · /dev · 프로덕션에서는 비활성화하세요
      </p>
    </div>
  );
};

export default DevPanel;
