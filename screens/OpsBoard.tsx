import React, { useMemo, useState } from 'react';

const STORAGE_KEY = 'boss_roki_ops_board_v1';

type ColumnId = 'inbox' | 'this-week' | 'in-progress' | 'blocked' | 'done';

type Owner = 'boss' | 'roki' | 'shared';

interface TaskCard {
  id: string;
  title: string;
  purpose: string;
  status: ColumnId;
  lastUpdate: string;
  nextAction: string;
  owner: Owner;
  needsDecision: boolean;
}

const COLUMNS: { id: ColumnId; label: string; tone: string }[] = [
  { id: 'inbox', label: 'Inbox', tone: 'text-slate-300' },
  { id: 'this-week', label: 'This Week', tone: 'text-cyan-300' },
  { id: 'in-progress', label: 'In Progress', tone: 'text-amber-300' },
  { id: 'blocked', label: 'Blocked', tone: 'text-rose-300' },
  { id: 'done', label: 'Done', tone: 'text-emerald-300' },
];

const SEED_TASKS: TaskCard[] = [
  {
    id: 'oauth-fix',
    title: 'Google OAuth 로그인 안정화',
    purpose: '로그인 후 다시 로그인 화면으로 돌아가는 문제 해결',
    status: 'in-progress',
    lastUpdate: 'HashRouter callback 및 auth race 원인 추적 완료',
    nextAction: 'Supabase 설정 mismatch 여부와 실제 프로덕션 흐름 재확인',
    owner: 'roki',
    needsDecision: false,
  },
  {
    id: 'ad-launch',
    title: 'Leaders High 광고 집행',
    purpose: '오늘 안에 실제 유입 데이터 받기',
    status: 'this-week',
    lastUpdate: '퍼널 QA와 톤 정렬 대부분 완료',
    nextAction: 'OAuth 안정화 후 광고 집행 여부 확정',
    owner: 'shared',
    needsDecision: true,
  },
  {
    id: 'ops-board',
    title: 'Boss-Roki Ops Board MVP',
    purpose: '채팅 대신 상태 공유/작업 운영판 만들기',
    status: 'in-progress',
    lastUpdate: 'MVP 설계 시작',
    nextAction: '보드 UI와 로컬 상태 저장 구현',
    owner: 'roki',
    needsDecision: false,
  },
];

function loadTasks(): TaskCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TASKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_TASKS;
  } catch {
    return SEED_TASKS;
  }
}

function saveTasks(tasks: TaskCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

const ownerLabel: Record<Owner, string> = {
  boss: '보스',
  roki: '로키',
  shared: '공동',
};

const ownerTone: Record<Owner, string> = {
  boss: 'bg-slate-700/50 text-slate-200',
  roki: 'bg-cyan-500/15 text-cyan-300',
  shared: 'bg-amber-500/15 text-amber-300',
};

const OpsBoard: React.FC = () => {
  const [tasks, setTasks] = useState<TaskCard[]>(loadTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id ?? null);

  const selectedTask = useMemo(
    () => tasks.find(task => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const moveTask = (taskId: string, direction: -1 | 1) => {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    const currentIndex = COLUMNS.findIndex(col => col.id === task.status);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;

    const updated = tasks.map(item =>
      item.id === taskId
        ? {
            ...item,
            status: COLUMNS[nextIndex].id,
            lastUpdate: `상태 변경: ${COLUMNS[nextIndex].label}`,
          }
        : item
    );

    setTasks(updated);
    saveTasks(updated);
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-white p-5 md:p-8">
      <div className="max-w-[1500px] mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300 font-black mb-2">Boss-Roki Internal Ops</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Ops Board MVP</h1>
            <p className="text-slate-400 text-sm mt-2">긴 채팅 대신, 지금 무엇이 진행 중인지 한눈에 보는 초경량 운영판.</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">활성 작업 {tasks.length}개</div>
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
              의사결정 필요 {tasks.filter(task => task.needsDecision).length}개
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_0.8fr] gap-6 items-start">
          <section className="overflow-x-auto pb-2">
            <div className="grid grid-cols-5 gap-4 min-w-[1100px]">
              {COLUMNS.map(column => {
                const columnTasks = tasks.filter(task => task.status === column.id);
                return (
                  <div key={column.id} className="bg-white/5 border border-white/10 rounded-3xl p-4 min-h-[520px]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className={`text-sm font-black uppercase tracking-widest ${column.tone}`}>{column.label}</h2>
                      <span className="text-[11px] text-slate-500 font-bold">{columnTasks.length}</span>
                    </div>
                    <div className="space-y-3">
                      {columnTasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`w-full text-left rounded-2xl p-4 border transition-all ${selectedTaskId === task.id ? 'bg-cyan-500/10 border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.08)]' : 'bg-[#0B1220] border-white/5 hover:border-white/15'}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="text-sm font-bold leading-snug">{task.title}</h3>
                            {task.needsDecision && <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-black">결정</span>}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed mb-3">{task.purpose}</p>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`px-2 py-1 rounded-lg font-bold ${ownerTone[task.owner]}`}>{ownerLabel[task.owner]}</span>
                            <span className="text-slate-500">{task.lastUpdate}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="bg-white/5 border border-white/10 rounded-3xl p-5 sticky top-6">
            {selectedTask ? (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-black mb-2">Task Detail</p>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">{selectedTask.title}</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl bg-[#0B1220] border border-white/5 p-3">
                    <p className="text-slate-500 mb-1">오너</p>
                    <p className="font-bold">{ownerLabel[selectedTask.owner]}</p>
                  </div>
                  <div className="rounded-2xl bg-[#0B1220] border border-white/5 p-3">
                    <p className="text-slate-500 mb-1">상태</p>
                    <p className="font-bold">{COLUMNS.find(col => col.id === selectedTask.status)?.label}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0B1220] border border-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black mb-2">목적</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedTask.purpose}</p>
                </div>

                <div className="rounded-2xl bg-[#0B1220] border border-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black mb-2">마지막 업데이트</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedTask.lastUpdate}</p>
                </div>

                <div className="rounded-2xl bg-[#0B1220] border border-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 font-black mb-2">다음 액션</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedTask.nextAction}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => moveTask(selectedTask.id, -1)}
                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-colors"
                  >
                    ← 이전
                  </button>
                  <button
                    onClick={() => moveTask(selectedTask.id, 1)}
                    className="flex-1 py-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 text-cyan-300 text-sm font-bold hover:bg-cyan-500/20 transition-colors"
                  >
                    다음 →
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">작업을 선택하세요.</div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OpsBoard;
