export interface AnalysisResult {
  score: number;
  metrics: {
    pace: number;
    fillerWords: number;
    clarity: number;
    vocabulary: number;
  };
  analysis: string;
  strengths: string[];
  improvements: string[];
}

export interface HistoryItem {
  id: string;
  date: string;
  timestamp: Date;
  audioURL: string | null;
  transcript: string;
  analysisResult: AnalysisResult;
  score: number;
  metrics: {
    pace: number;
    fillerWords: number;
    clarity: number;
    vocabulary: number;
  };
}

export interface Exercise {
  id: number;
  title: string;
  prompt: string;
  duration: number;
  icon: any;
  color: string;
}

export interface JSONSchema {
  type: string;
  properties: {
    [key: string]: {
      type: string;
      description: string;
    } | {
      type: string;
      properties: { [key: string]: any };
    } | {
      type: string;
      items: { type: string };
      description: string;
    };
  };
  required: string[];
}
