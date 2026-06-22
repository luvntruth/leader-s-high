import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const feedbackSource = readFileSync(resolve(__dirname, '../screens/Feedback.tsx'), 'utf-8');
const analyticsSource = readFileSync(resolve(__dirname, '../services/analyticsService.ts'), 'utf-8');

describe('feedback report-to-Pro bridge contract', () => {
  it('tracks report-to-Pro bridge impressions and CTA clicks', () => {
    expect(analyticsSource).toContain("| 'report_pro_bridge_view'");
    expect(analyticsSource).toContain("| 'report_pro_bridge_click'");
    expect(feedbackSource).toContain("analyticsService.track('report_pro_bridge_view'");
    expect(feedbackSource).toContain("analyticsService.track('report_pro_bridge_click'");
  });

  it('uses outcome-based copy that sells the full report from the completed conversation', () => {
    expect(feedbackSource).toContain('이 대화에서 놓친 3가지');
    expect(feedbackSource).toContain('이번 면담 전에 풀 리포트로 전략 정리하기');
    expect(feedbackSource).toContain('내 답변의 위험 표현 분석');
  });

  it('routes authenticated free users to pricing and guest users to signup with golden-script intent', () => {
    expect(feedbackSource).toContain("source: 'report_pro_bridge'");
    expect(feedbackSource).toContain("navigate('/pricing', { state: { from: '/feedback', bridge: 'report_pro' } })");
    expect(feedbackSource).toContain("intent: 'golden-script'");
  });
});
