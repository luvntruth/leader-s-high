
export enum Generation {
  GEN_Z = 'Gen Z',
  MILLENNIAL = 'Millennial',
  GEN_X = 'Gen X',
  BOOMER = 'Boomer'
}

export interface Scenario {
  id: string;
  title: string;
  category: string;
  description: string;
  memberName: string;
  generation: Generation;
  traits: {
    context: number; // 0-100 (Low Context/Direct to High Context/Indirect)
    driver: number;  // 0-100 (Logic/Task to Relation/Emotion)
  };
}

export interface TranscriptionItem {
  role: 'user' | 'model';
  text: string;
}
