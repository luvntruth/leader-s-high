import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VOICE_FIRST_HOME_COPY, buildVoiceRecommendationViewModel } from '../components/letmefree/VoiceIntakePanel';

describe('voice-first home intake', () => {
  it('uses the approved voice-first first-fold copy', () => {
    expect(VOICE_FIRST_HOME_COPY.headline).toContain('오늘 어떤 마음으로 운전 중인가요?');
    expect(VOICE_FIRST_HOME_COPY.subcopy).toContain('퇴근길 10분');
    expect(VOICE_FIRST_HOME_COPY.primaryAction).toBe('말하기 시작');
    expect(VOICE_FIRST_HOME_COPY.secondaryAction).toBe('텍스트로 입력');
  });

  it('builds coaching language for selfness recommendations', () => {
    const viewModel = buildVoiceRecommendationViewModel('요즘 너무 외롭고 혼자 감당하는 것 같아');

    expect(viewModel.familyLabel).toBe('자기다움 코칭');
    expect(viewModel.modeLabel).toContain('대화형 코칭');
  });

  it('builds training language for weness recommendations', () => {
    const viewModel = buildVoiceRecommendationViewModel('팀원에게 성과 피드백을 해야 하는데 연습하고 싶어');

    expect(viewModel.familyLabel).toBe('우리다움 훈련');
    expect(viewModel.modeLabel).toMatch(/훈련|리허설|롤플레이/);
  });

  it('wires the voice intake panel into the Home first fold while preserving the legacy scenario fallback', () => {
    const homeSource = readFileSync(resolve(process.cwd(), 'screens/Home.tsx'), 'utf8');

    expect(homeSource).toContain('VoiceIntakePanel');
    expect(homeSource).toContain('questScenarios.map');
  });
});
