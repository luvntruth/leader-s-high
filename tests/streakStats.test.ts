import { describe, expect, it } from 'vitest';

import { computeStreakStats } from '../screens/StreakDetail';

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysAgo = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d;
};

describe('computeStreakStats', () => {
  const today = new Date(2026, 6, 7); // 2026-07-07 (화)

  it('기록이 없으면 전부 0 — 신규 사용자에게 가짜 기록이 보이지 않아야 함', () => {
    const stats = computeStreakStats(new Set(), today);
    expect(stats.current).toBe(0);
    expect(stats.longest).toBe(0);
    expect(stats.totalDays).toBe(0);
    expect(stats.weekActivity).toEqual([false, false, false, false, false, false, false]);
  });

  it('오늘 포함 연속 3일 완주 → 현재 스트릭 3', () => {
    const days = new Set([0, 1, 2].map(n => key(daysAgo(today, n))));
    const stats = computeStreakStats(days, today);
    expect(stats.current).toBe(3);
    expect(stats.longest).toBe(3);
    expect(stats.totalDays).toBe(3);
  });

  it('오늘 활동이 없어도 어제까지의 스트릭은 유지 (오늘은 아직 기회가 있음)', () => {
    const days = new Set([1, 2].map(n => key(daysAgo(today, n))));
    expect(computeStreakStats(days, today).current).toBe(2);
  });

  it('하루 건너뛰면 현재 스트릭은 끊기지만 최장 기록은 남는다', () => {
    // 5~3일 전 3연속 + 오늘 1회 → current 1, longest 3
    const days = new Set([0, 3, 4, 5].map(n => key(daysAgo(today, n))));
    const stats = computeStreakStats(days, today);
    expect(stats.current).toBe(1);
    expect(stats.longest).toBe(3);
    expect(stats.totalDays).toBe(4);
  });

  it('이번 주 활동 플래그는 일요일 시작 기준으로 채워진다', () => {
    // today = 화요일. 일(2일 전)·화(오늘) 활동
    const days = new Set([key(daysAgo(today, 2)), key(today)]);
    const stats = computeStreakStats(days, today);
    expect(stats.weekActivity[0]).toBe(true);  // 일
    expect(stats.weekActivity[1]).toBe(false); // 월
    expect(stats.weekActivity[2]).toBe(true);  // 화
  });
});
