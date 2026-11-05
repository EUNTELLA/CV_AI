export type VerdictStatus = 'SAFE' | 'BLOCKED' | 'UNCLEAR';

export interface DetectedScooter {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] in original image coordinates
  groundingBbox: [number, number, number, number]; // [x1, y1_ground, x2, y2] bottom ~20%
  score: number;
  isViolating: boolean; // grounding bbox overlaps braille mask
  isNear: boolean; // near braille mask
}

export interface DetectedBraille {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] in original image coordinates
  score: number;
}

export interface ModelPrediction {
  scooters: DetectedScooter[];
  brailleBlocks: DetectedBraille[];
  verdict: VerdictStatus;
  statusText: string;
  summary: string;
  inferenceTimeMs: number;
  overlayImageUrl: string;
  hasViolation: boolean;
  needsReview: boolean;
  isSafe: boolean;
  overlappingPixels: number;
  minDistanceToBraille: number;
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
