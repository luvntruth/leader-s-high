
export enum Generation {
  GEN_Z = 'Gen Z',
  MILLENNIAL = 'Millennial',
  GEN_X = 'Gen X',
  BOOMER = 'Boomer'
}

export type ScenarioIntensity = 'low' | 'medium' | 'high';

export interface Scenario {
  id: string;
  title: string;
  category: string;
  description: string;
  memberName: string;
  generation: Generation;
  intensity: ScenarioIntensity; // 갈등 수위: low=일상적, medium=보통, high=극단적
  trustLevel?: number; // 기본 신뢰 지수 (0-100)
  traits: {
    context: number; // 0-100 (Low Context/Direct to High Context/Indirect)
    driver: number;  // 0-100 (Logic/Task to Relation/Emotion)
  };
}

export interface TranscriptionItem {
  role: 'user' | 'model';
  text: string;
}
