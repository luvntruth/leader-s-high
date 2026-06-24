import { describe, expect, it } from 'vitest';
import {
  evaluateTactic,
  nextCombo,
  tacticFlashLabel,
  getTactics,
  getTacticDef,
  stateHint,
  tacticReason,
  DEFAULT_TACTICS,
} from '../services/tacticService';

describe('tacticService — 전술 적합도', () => {
  it('낮은 신뢰(반발/방어)에서는 공감이 crit, 사실 짚기는 weak', () => {
    expect(evaluateTactic(10, 'empathy')).toBe('crit');
    expect(evaluateTactic(35, 'empathy')).toBe('crit');
    expect(evaluateTactic(10, 'sbi')).toBe('weak');
    expect(evaluateTactic(35, 'sbi')).toBe('weak');
  });

  it('높은 신뢰(열린/합의)에서는 사실 짚기·인정이 crit', () => {
    expect(evaluateTactic(80, 'sbi')).toBe('crit');
    expect(evaluateTactic(95, 'sbi')).toBe('crit');
    expect(evaluateTactic(80, 'acknowledge')).toBe('crit');
  });

  it('중간 관망(≤55)에서는 열린 질문이 crit', () => {
    expect(evaluateTactic(50, 'question')).toBe('crit');
  });

  it('모든 전술·신뢰값에서 유효한 적합도를 반환', () => {
    for (const t of DEFAULT_TACTICS) {
      for (const trust of [0, 20, 40, 55, 70, 85, 100]) {
        expect(['crit', 'good', 'weak']).toContain(evaluateTactic(trust, t.id));
      }
    }
  });
});

describe('tacticService — 콤보', () => {
  it('weak이면 콤보 리셋, 그 외엔 +1', () => {
    expect(nextCombo(3, 'weak')).toBe(0);
    expect(nextCombo(3, 'good')).toBe(4);
    expect(nextCombo(0, 'crit')).toBe(1);
  });
});

describe('tacticService — 플래시 라벨', () => {
  it('weak은 역효과, crit/good은 콤보 2 이상에서 COMBO 표기', () => {
    expect(tacticFlashLabel('weak', 5).tone).toBe('weak');
    expect(tacticFlashLabel('crit', 1).label).toBe('CRITICAL!');
    expect(tacticFlashLabel('crit', 3).label).toContain('COMBO x3');
    expect(tacticFlashLabel('good', 2).label).toContain('COMBO x2');
  });
});

describe('tacticService — 전술 정의', () => {
  it('getTactics는 기본 4종을 반환', () => {
    expect(getTactics('any-scenario')).toHaveLength(4);
    expect(getTactics().map(t => t.id)).toEqual(['empathy', 'sbi', 'question', 'acknowledge']);
  });

  it('getTacticDef는 항상 유효한 정의를 반환', () => {
    expect(getTacticDef('empathy').label).toBe('공감');
  });

  it('모든 전술에 whenToUse(미니 가이드)가 있다', () => {
    for (const t of DEFAULT_TACTICS) {
      expect(typeof t.whenToUse).toBe('string');
      expect(t.whenToUse.length).toBeGreaterThan(0);
    }
  });
});

describe('tacticService — 상태 힌트 / 왜 설명', () => {
  it('stateHint는 모든 신뢰값에서 비어있지 않은 코칭 문구를 반환', () => {
    for (const trust of [0, 20, 40, 55, 70, 85, 100]) {
      expect(stateHint(trust).length).toBeGreaterThan(0);
    }
  });

  it('낮은 신뢰에서 사실 짚기가 weak이면 추궁 위험을 설명', () => {
    const reason = tacticReason(15, 'sbi', 'weak');
    expect(reason).toContain('추궁');
  });

  it('tacticReason은 모든 전술·신뢰·적합도 조합에서 설명을 반환', () => {
    for (const t of DEFAULT_TACTICS) {
      for (const trust of [10, 50, 90]) {
        for (const fit of ['crit', 'good', 'weak'] as const) {
          expect(tacticReason(trust, t.id, fit).length).toBeGreaterThan(0);
        }
      }
    }
  });
});
