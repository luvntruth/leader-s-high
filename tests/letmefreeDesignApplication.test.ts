import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const voiceCoachSource = readFileSync(resolve(root, 'screens/VoiceCoach.tsx'), 'utf8');
const voiceIntakeSource = readFileSync(resolve(root, 'components/letmefree/VoiceIntakePanel.tsx'), 'utf8');
const combinedSource = `${voiceCoachSource}\n${voiceIntakeSource}`;

describe('Letmefree DESIGN.md visual application', () => {
  it('moves VoiceCoach away from the legacy cyber/game color language', () => {
    const bannedLegacyTokens = [
      '#060B18',
      '#0D1526',
      '#0B1120',
      'text-slate-950',
      'shadow-[0_0_24px',
      'bg-primary text-slate-950',
      'border-white/10 bg-[#0D1526',
    ];

    for (const token of bannedLegacyTokens) {
      expect(combinedSource).not.toContain(token);
    }
  });

  it('applies the warm editorial DESIGN.md palette to VoiceCoach surfaces', () => {
    expect(voiceCoachSource).toContain('#F6F1EA');
    expect(voiceCoachSource).toContain('#191512');
    expect(voiceCoachSource).toContain('#1C423B');
    expect(voiceCoachSource).toContain('#F2C6AB');
    expect(voiceCoachSource).toContain('#B9E3D4');
  });

  it('uses a quiet premium voice-first vocabulary in the redesigned screens', () => {
    expect(combinedSource).toContain('quiet premium');
    expect(combinedSource).toContain('warm editorial');
    expect(combinedSource).toContain('운전이 끝난 뒤');
    expect(combinedSource).toContain('Voice atmosphere');
  });

  it('keeps the redesign focused on coaching outputs rather than dashboard clutter', () => {
    expect(voiceCoachSource).toContain('Analysis');
    expect(voiceCoachSource).toContain('Action');
    expect(voiceCoachSource).toContain('Reminder');
    expect(voiceCoachSource).not.toContain('XP');
    expect(voiceCoachSource).not.toContain('questScenarios');
  });
});
