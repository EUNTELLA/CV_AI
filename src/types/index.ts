export type VerdictStatus = 'SAFE' | 'BLOCKED' | 'UNCLEAR';

export interface ModelPrediction {
  blockedProb: number;
  nearProb: number;
  safeProb: number;
  riskProb: number;
  verdict: VerdictStatus;
  inferenceTimeMs: number;
}

export type ModelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; modelName: string }
  | { status: 'error'; message: string };

export interface SampleImage {
  id: string;
  name: string;
  badge: string;
  description: string;
  path: string;
  expectedVerdict: VerdictStatus;
}
