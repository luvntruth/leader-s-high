export const EXPERIENCE_FAMILIES = ['selfness_coaching', 'weness_training'] as const;

export const EXPERIENCE_AXES = [
  'selfness_affect',
  'selfness_strength',
  'selfness_calling',
  'weness_diversity',
  'weness_feedback',
  'weness_execution',
] as const;

export const EXPERIENCE_MODES = [
  'coaching_dialogue',
  'reflection',
  'roleplay',
  'rehearsal',
  'planning_drill',
  'retrospective_drill',
] as const;

export const IMMERSION_GUARDRAILS = [
  'natural_voice_and_tone',
  'contextually_relevant_answers',
  'no_ai_uncanny_mannerisms',
] as const;

export type ExperienceFamily = (typeof EXPERIENCE_FAMILIES)[number];

export type ExperienceAxis = (typeof EXPERIENCE_AXES)[number];

export type ExperienceMode = (typeof EXPERIENCE_MODES)[number];

export type ImmersionGuardrail = (typeof IMMERSION_GUARDRAILS)[number];

export type ExperienceAuditDecision = 'KEEP' | 'MERGE' | 'REWRITE' | 'DROP' | 'CREATE';

export type LetmefreeExperience = {
  id: string;
  title: string;
  family: ExperienceFamily;
  axis: ExperienceAxis;
  mode: ExperienceMode;
  estimatedMinutes: 3 | 5 | 10 | 15;
  inputTriggers: string[];
  explorationQuestions: string[];
  flow: string[];
  analysisReadoutSchema: string[];
  actionItemSchema: string[];
  reminderRule: string;
  safetyNotes: string[];
  sourceScenarioIds?: string[];
  auditDecision?: ExperienceAuditDecision;
  immersionGuardrails?: ImmersionGuardrail[];
};

export type UserConcernSignal = {
  transcript: string;
  emotions: string[];
  relationshipTarget?: string;
  desiredOutcome?: string;
  conflictType?: string;
  leadershipTask?: string;
  timeContext: 'morning' | 'pre_meeting' | 'post_meeting' | 'evening' | 'unknown';
  preferredMode: 'comfort' | 'clarify' | 'practice' | 'plan' | 'unknown';
};

export type ExperienceRecommendation = {
  family: ExperienceFamily;
  primaryAxis: ExperienceAxis;
  secondaryAxis?: ExperienceAxis;
  recommendedExperienceIds: string[];
  reason: string;
  firstQuestion: string;
};
