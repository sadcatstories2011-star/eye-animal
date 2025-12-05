export interface AnimalDetails {
  commonName: string;
  scientificName: string;
  description: string;
  habitat: string;
  diet: string;
  funFact: string;
  conservationStatus: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}
