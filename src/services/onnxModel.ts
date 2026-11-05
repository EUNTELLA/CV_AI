import * as ort from 'onnxruntime-web';
import type {
  ModelPrediction,
  VerdictStatus,
  DetectedScooter,
  DetectedBraille,
} from '../types';

// WASM 실행 환경 설정 (스레드 1로 제한하여 SharedArrayBuffer 격리 요구사항 완화)
ort.env.wasm.numThreads = 1;

let isWasmConfigured = false;
async function configureWasmPath(): Promise<void> {
  if (isWasmConfigured) return;
  try {
    const probe = await fetch('/ort-wasm-simd-threaded.jsep.mjs', { method: 'HEAD' });
    const contentType = probe.headers.get('content-type') || '';
    if (probe.ok && (contentType.includes('javascript') || !contentType.includes('html'))) {
      ort.env.wasm.wasmPaths = '/';
      console.log('[SafeParkingAI] 로컬 WASM 런타임 모듈 사용 (/)');
      isWasmConfigured = true;
      return;
    }
  } catch {
    // ignore
  }
  // 로컬 파일이 아직 배포 중이거나 index.html로 rewrite되는 경우 동일 버전(1.31.1) CDN 자동 연결
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
  console.log('[SafeParkingAI] ONNX WASM 런타임 CDN(v1.31.1) 자동 폴백 활성화');
  isWasmConfigured = true;
}

let scooterSession: ort.InferenceSession | null = null;
let brailleSession: ort.InferenceSession | null = null;
let modelLoadingPromise: Promise<void> | null = null;

const SCOOTER_MODEL_URL = '/models/hybrid-v1/scooter_detection.onnx';
const BRAILLE_MODEL_URL = '/models/hybrid-v1/braille_segmentation.onnx';
const TARGET_SIZE = 640;
const PROTO_SIZE = 160;

/**
 * 헬퍼: 모델 바이너리 다운로드 및 세션 생성
 */
async function createSessionFromUrl(url: string, name: string): Promise<ort.InferenceSession> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `모델 파일(${url})을 다운로드할 수 없습니다. (HTTP ${res.status}: ${res.statusText})`
    );
  }
  const buffer = await res.arrayBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error(`모델 파일(${url})의 내용이 비어있습니다.`);
  }

  try {
    const session = await ort.InferenceSession.create(new Uint8Array(buffer), {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    console.log(`[SafeParkingAI] ${name} 세션 생성 성공 (입력: ${session.inputNames}, 출력: ${session.outputNames})`);
    return session;
  } catch (err: any) {
    console.error(`[SafeParkingAI] ${name} 세션 생성 실패:`, err);
    throw new Error(`${name} 모델 초기화 실패: ${err?.message || err}`);
  }
}

/**
 * 두 개의 실제 ONNX 모델 동시 로드
 */
export async function loadHybridModels(): Promise<void> {
  if (scooterSession && brailleSession) {
    return;
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    try {
      await configureWasmPath();
      console.log('[SafeParkingAI] 실제 YOLOv8 ONNX 모델 2종 로딩 시작...');
      const [sSess, bSess] = await Promise.all([
        createSessionFromUrl(SCOOTER_MODEL_URL, 'Scooter Detection ONNX'),
        createSessionFromUrl(BRAILLE_MODEL_URL, 'Braille Segmentation ONNX'),
      ]);

      scooterSession = sSess;
      brailleSession = bSess;
      console.log('[SafeParkingAI] 두 모델 로딩 및 준비 완료!');
    } catch (error: any) {
      console.error('[SafeParkingAI] 모델 로딩 오류:', error);
      scooterSession = null;
      brailleSession = null;
      modelLoadingPromise = null;
      throw new Error(
        error?.message || '실제 ONNX 모델을 로드하지 못했습니다. 네트워크와 모델 파일 경로를 확인해 주세요.'
      );
    }
  })();

  return modelLoadingPromise;
}

export function isModelsLoaded(): boolean {
  return scooterSession !== null && brailleSession !== null;
}

/**
 * Letterbox 전처리: 원본 비율을 보존하며 640x640 크기로 맞추고 회색(114, 114, 114) 패딩을 적용
 */
function createLetterboxTensor(
  source: HTMLImageElement | HTMLCanvasElement
): {
  tensor: ort.Tensor;
  scale: number;
  padX: number;
  padY: number;
  origW: number;
  origH: number;
} {
  const origW = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
  const origH = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;

  const scale = Math.min(TARGET_SIZE / origW, TARGET_SIZE / origH);
  const newW = Math.round(origW * scale);
  const newH = Math.round(origH * scale);
  const padX = (TARGET_SIZE - newW) / 2;
  const padY = (TARGET_SIZE - newH) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 캔버스 컨텍스트를 생성할 수 없습니다.');

  // 배경 회색 114 채우기
  ctx.fillStyle = 'rgb(114, 114, 114)';
  ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

  // 원본 비율 유지하여 중앙에 그리기
  ctx.drawImage(source, padX, padY, newW, newH);

  const imgData = ctx.getImageData(0, 0, TARGET_SIZE, TARGET_SIZE);
  const rgba = imgData.data;

  // NCHW [1, 3, 640, 640], float32, 0~1 정규화
  const floatData = new Float32Array(3 * TARGET_SIZE * TARGET_SIZE);
  const planeSize = TARGET_SIZE * TARGET_SIZE;

  for (let i = 0; i < planeSize; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    floatData[i] = r / 255.0; // R
    floatData[planeSize + i] = g / 255.0; // G
    floatData[planeSize * 2 + i] = b / 255.0; // B
  }

  const tensor = new ort.Tensor('float32', floatData, [1, 3, TARGET_SIZE, TARGET_SIZE]);

  return { tensor, scale, padX, padY, origW, origH };
}

// Bounding Box IoU 계산
function computeIoU(b1: [number, number, number, number], b2: [number, number, number, number]): number {
  const x1 = Math.max(b1[0], b2[0]);
  const y1 = Math.max(b1[1], b2[1]);
  const x2 = Math.min(b1[2], b2[2]);
  const y2 = Math.min(b1[3], b2[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const a1 = (b1[2] - b1[0]) * (b1[3] - b1[1]);
  const a2 = (b2[2] - b2[0]) * (b2[3] - b2[1]);
  const union = a1 + a2 - inter;
  return union <= 0 ? 0 : inter / union;
}

// NMS 수행
function applyNMS(
  boxes: [number, number, number, number][],
  scores: number[],
  iouThresh = 0.45
): number[] {
  const indices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const selected: number[] = [];

  while (indices.length > 0) {
    const current = indices.shift()!;
    selected.push(current);
    for (let i = indices.length - 1; i >= 0; i--) {
      if (computeIoU(boxes[current], boxes[indices[i]]) >= iouThresh) {
        indices.splice(i, 1);
      }
    }
  }

  return selected;
}

/**
 * 메인 추론 함수: 두 개의 ONNX 모델을 실행하고 시각화 오버레이 및 위험 관계 분석
 */
export async function runHybridParkingInference(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<ModelPrediction> {
  if (!scooterSession || !brailleSession) {
    throw new Error('AI 모델이 아직 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  }

  const startTime = performance.now();

  // 1. 공통 전처리 (Letterbox + 0~1 정규화)
  const { tensor: inputTensor, scale, padX, padY, origW, origH } = createLetterboxTensor(source);

  // 2. 두 모델 추론 병렬 실행
  const [scooterOutput, brailleOutput] = await Promise.all([
    scooterSession.run({ images: inputTensor }),
    brailleSession.run({ images: inputTensor }),
  ]);

  // ==========================================
  // 3. 모델 1 후처리: Scooter Detection
  // Output: [1, 6, 8400] -> class 0 (scooter) 만 사용
  // ==========================================
  const sData = scooterOutput.output0.data as Float32Array;
  const numAnchors = 8400;
  const sBoxes640: [number, number, number, number][] = [];
  const sScores: number[] = [];
  const sAnchorIndices: number[] = [];

  const SCOOTER_CONF_THRESH = 0.25;

  for (let i = 0; i < numAnchors; i++) {
    const score = sData[4 * numAnchors + i]; // class 0 score
    if (score >= SCOOTER_CONF_THRESH) {
      const cx = sData[i];
      const cy = sData[1 * numAnchors + i];
      const w = sData[2 * numAnchors + i];
      const h = sData[3 * numAnchors + i];
      sBoxes640.push([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]);
      sScores.push(score);
      sAnchorIndices.push(i);
    }
  }

  const sKeep = applyNMS(sBoxes640, sScores, 0.45);
  const detectedScooters: DetectedScooter[] = [];

  for (const k of sKeep) {
    const b640 = sBoxes640[k];
    const score = sScores[k];

    // Letterbox 역변환 -> 원본 좌표
    const origX1 = Math.max(0, Math.min(origW, (b640[0] - padX) / scale));
    const origY1 = Math.max(0, Math.min(origH, (b640[1] - padY) / scale));
    const origX2 = Math.max(0, Math.min(origW, (b640[2] - padX) / scale));
    const origY2 = Math.max(0, Math.min(origH, (b640[3] - padY) / scale));

    // 하단 접지 후보 영역 (박스 하단 20%)
    const groundingY1 = origY1 + (origY2 - origY1) * 0.80;

    detectedScooters.push({
      bbox: [origX1, origY1, origX2, origY2],
      groundingBbox: [origX1, groundingY1, origX2, origY2],
      score,
      isViolating: false,
      isNear: false,
    });
  }

  // ==========================================
  // 4. 모델 2 후처리: Braille Segmentation
  // Output0: [1, 37, 8400], Output1: [1, 32, 160, 160]
  // ==========================================
  const bData0 = brailleOutput.output0.data as Float32Array;
  const protos = brailleOutput.output1.data as Float32Array; // [32, 160, 160]

  const bBoxes640: [number, number, number, number][] = [];
  const bScores: number[] = [];
  const bAnchorIndices: number[] = [];

  const BRAILLE_CONF_THRESH = 0.22;

  for (let i = 0; i < numAnchors; i++) {
    const score = bData0[4 * numAnchors + i]; // class 0: brailleblock
    if (score >= BRAILLE_CONF_THRESH) {
      const cx = bData0[i];
      const cy = bData0[1 * numAnchors + i];
      const w = bData0[2 * numAnchors + i];
      const h = bData0[3 * numAnchors + i];
      bBoxes640.push([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]);
      bScores.push(score);
      bAnchorIndices.push(i);
    }
  }

  const bKeep = applyNMS(bBoxes640, bScores, 0.45);
  const detectedBraille: DetectedBraille[] = [];

  // 160x160 통합 마스크 버퍼 (모든 탐지된 점자블록 인스턴스 결합)
  const combinedMask160 = new Uint8Array(PROTO_SIZE * PROTO_SIZE);
  const protoPlaneSize = PROTO_SIZE * PROTO_SIZE;

  for (const k of bKeep) {
    const b640 = bBoxes640[k];
    const score = bScores[k];
    const anchorIdx = bAnchorIndices[k];

    // Letterbox 역변환
    const origX1 = Math.max(0, Math.min(origW, (b640[0] - padX) / scale));
    const origY1 = Math.max(0, Math.min(origH, (b640[1] - padY) / scale));
    const origX2 = Math.max(0, Math.min(origW, (b640[2] - padX) / scale));
    const origY2 = Math.max(0, Math.min(origH, (b640[3] - padY) / scale));

    detectedBraille.push({
      bbox: [origX1, origY1, origX2, origY2],
      score,
    });

    // 32개 마스크 계수 추출
    const coeffs: number[] = [];
    for (let c = 0; c < 32; c++) {
      coeffs.push(bData0[(5 + c) * numAnchors + anchorIdx]);
    }

    // 160x160 크기에서 Bounding Box 자르기 영역 계산
    const bx1 = Math.max(0, Math.floor(b640[0] * 0.25));
    const by1 = Math.max(0, Math.floor(b640[1] * 0.25));
    const bx2 = Math.min(PROTO_SIZE, Math.ceil(b640[2] * 0.25));
    const by2 = Math.min(PROTO_SIZE, Math.ceil(b640[3] * 0.25));

    // 마스크 계수와 32개 프로토타입의 선형 결합 + Sigmoid + Bbox Crop
    for (let y = by1; y < by2; y++) {
      const rowOffset = y * PROTO_SIZE;
      for (let x = bx1; x < bx2; x++) {
        const pIdx = rowOffset + x;
        let sum = 0;
        for (let c = 0; c < 32; c++) {
          sum += coeffs[c] * protos[c * protoPlaneSize + pIdx];
        }
        // Sigmoid
        const prob = 1 / (1 + Math.exp(-sum));
        if (prob >= 0.5) {
          combinedMask160[pIdx] = 1;
        }
      }
    }
  }

  // ==========================================
  // 5. 공간 관계 및 위험 분석: 하단 접지부 vs 점자블록 마스크
  // ==========================================
  let totalOverlappingPixels = 0;
  let minDistanceToBraille = Infinity;
  let hasViolation = false;
  let hasNear = false;

  const CAUTION_DISTANCE_160 = 12; // 160 공간에서 12픽셀 (약 48px in 640 space)

  // 점자블록 마스크 픽셀 좌표 모음
  const braillePixels: { x: number; y: number }[] = [];
  for (let y = 0; y < PROTO_SIZE; y++) {
    for (let x = 0; x < PROTO_SIZE; x++) {
      if (combinedMask160[y * PROTO_SIZE + x] === 1) {
        braillePixels.push({ x, y });
      }
    }
  }

  for (const scooter of detectedScooters) {
    const gb = scooter.groundingBbox;
    // 640 Letterbox 공간 좌표로 변환
    const g640_x1 = gb[0] * scale + padX;
    const g640_y1 = gb[1] * scale + padY;
    const g640_x2 = gb[2] * scale + padX;
    const g640_y2 = gb[3] * scale + padY;

    // 160 프로토타입 공간 좌표
    const g160_x1 = Math.max(0, Math.floor(g640_x1 * 0.25));
    const g160_y1 = Math.max(0, Math.floor(g640_y1 * 0.25));
    const g160_x2 = Math.min(PROTO_SIZE, Math.ceil(g640_x2 * 0.25));
    const g160_y2 = Math.min(PROTO_SIZE, Math.ceil(g640_y2 * 0.25));

    // 하단 접지부와 점자블록 마스크 간 직접 겹침(침범) 계산
    let scooterOverlapCount = 0;
    for (let y = g160_y1; y < g160_y2; y++) {
      for (let x = g160_x1; x < g160_x2; x++) {
        if (combinedMask160[y * PROTO_SIZE + x] === 1) {
          scooterOverlapCount++;
        }
      }
    }

    if (scooterOverlapCount > 0) {
      scooter.isViolating = true;
      hasViolation = true;
      totalOverlappingPixels += scooterOverlapCount;
      minDistanceToBraille = 0;
    } else if (braillePixels.length > 0) {
      // 겹치지 않는 경우: 점자블록과의 최단 거리 계산
      let scooterMinDist = Infinity;
      for (const bp of braillePixels) {
        const dx = Math.max(0, g160_x1 - bp.x, bp.x - g160_x2);
        const dy = Math.max(0, g160_y1 - bp.y, bp.y - g160_y2);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < scooterMinDist) {
          scooterMinDist = d;
        }
      }

      if (scooterMinDist < minDistanceToBraille) {
        minDistanceToBraille = scooterMinDist;
      }

      if (scooterMinDist <= CAUTION_DISTANCE_160) {
        scooter.isNear = true;
        hasNear = true;
      }
    }
  }

  // ==========================================
  // 6. 최종 판정 (Verdict) 로직
  // ==========================================
  let verdict: VerdictStatus;
  let statusText: string;
  let summary: string;

  if (hasViolation) {
    verdict = 'BLOCKED';
    statusText = '침범 의심: 킥보드 하단 접지부가 점자블록 영역과 겹쳐 있습니다.';
    summary = `킥보드 ${detectedScooters.length}대 중 침범 의심 영역이 확인되었습니다. 안전 구역으로 이동해 주세요.`;
  } else if (detectedScooters.length === 0 && detectedBraille.length === 0) {
    verdict = 'UNCLEAR';
    statusText = '객체 미탐지: 킥보드 및 점자블록이 감지되지 않아 추가 확인이 필요합니다.';
    summary = '사진에서 킥보드 또는 바닥 점자블록이 뚜렷하게 확인되지 않았습니다. 밝은 조명에서 재촬영해 주세요.';
  } else if (detectedScooters.length === 0) {
    verdict = 'UNCLEAR';
    statusText = '킥보드 미탐지: 킥보드가 사진에서 명확하게 감지되지 않았습니다.';
    summary = `점자블록 ${detectedBraille.length}개 영역이 확인되었으나 킥보드가 식별되지 않았습니다.`;
  } else if (detectedBraille.length === 0) {
    // 중요 지침: 두 객체 중 하나라도 탐지되지 않으면 자동 안전 판정 금지!
    verdict = 'UNCLEAR';
    statusText = '점자블록 미탐지: 바닥 점자블록 유무가 확인되지 않아 자동 안전 판정이 불가합니다.';
    summary = `킥보드 ${detectedScooters.length}대가 탐지되었으나 바닥 점자블록이 감지되지 않았습니다. (추가 확인 및 재촬영 권장)`;
  } else if (hasNear) {
    verdict = 'UNCLEAR';
    statusText = '추가 확인 (근접 주의): 킥보드가 점자블록과 매우 인접해 있어 보행 방해 우려가 있습니다.';
    summary = '점자블록과 킥보드 간 안전 거리가 충분하지 않습니다. 통행에 방해가 되지 않도록 이격해 주세요.';
  } else {
    // 둘 다 탐지되었고, 안전 거리가 충분함
    verdict = 'SAFE';
    statusText = '안전 거리 확인 (보조 시연): 킥보드와 점자블록 간 이격 거리가 확보되었습니다.';
    summary = `킥보드 ${detectedScooters.length}대와 점자블록 ${detectedBraille.length}개 영역이 모두 식별되었으며 안전 거리가 유지된 상태입니다.`;
  }

  // ==========================================
  // 7. 시각화 오버레이 캔버스 생성 (빨간 박스 + 노란 반투명 마스크)
  // ==========================================
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = origW;
  overlayCanvas.height = origH;
  const oCtx = overlayCanvas.getContext('2d');
  let overlayImageUrl = '';

  if (oCtx) {
    // 1) 원본 이미지 렌더링
    oCtx.drawImage(source, 0, 0, origW, origH);

    // 2) 점자블록 노란색 반투명 Segmentation 마스크 렌더링
    // 160x160 각 픽셀을 원본 이미지 좌표 사각형으로 그리기
    oCtx.fillStyle = 'rgba(250, 204, 21, 0.45)'; // yellow-400 with 45% alpha
    const cellW = (4 / scale);
    const cellH = (4 / scale);

    for (let y = 0; y < PROTO_SIZE; y++) {
      for (let x = 0; x < PROTO_SIZE; x++) {
        if (combinedMask160[y * PROTO_SIZE + x] === 1) {
          const drawX = (x * 4 - padX) / scale;
          const drawY = (y * 4 - padY) / scale;
          if (drawX >= -cellW && drawX <= origW && drawY >= -cellH && drawY <= origH) {
            oCtx.fillRect(drawX, drawY, cellW + 0.5, cellH + 0.5);
          }
        }
      }
    }

    // 3) 점자블록 Bounding Box 외곽선 (미세한 점선 테두리)
    oCtx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
    oCtx.lineWidth = 1.5;
    oCtx.setLineDash([4, 4]);
    for (let i = 0; i < detectedBraille.length; i++) {
      const [bx1, by1, bx2, by2] = detectedBraille[i].bbox;
      oCtx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
    }
    oCtx.setLineDash([]); // 점선 초기화

    // 4) 킥보드 빨간색 Bounding Box 렌더링
    for (let i = 0; i < detectedScooters.length; i++) {
      const s = detectedScooters[i];
      const [sx1, sy1, sx2, sy2] = s.bbox;
      const sw = sx2 - sx1;
      const sh = sy2 - sy1;

      // 전체 박스: 빨간색
      oCtx.strokeStyle = s.isViolating ? '#ef4444' : s.isNear ? '#f97316' : '#22c55e';
      oCtx.lineWidth = 3;
      oCtx.strokeRect(sx1, sy1, sw, sh);

      // 하단 접지 영역 (밑면 20%) 강조 표시
      const [gx1, gy1, gx2, gy2] = s.groundingBbox;
      oCtx.fillStyle = s.isViolating
        ? 'rgba(239, 68, 68, 0.35)'
        : 'rgba(249, 115, 22, 0.2)';
      oCtx.fillRect(gx1, gy1, gx2 - gx1, gy2 - gy1);

      oCtx.strokeStyle = s.isViolating ? '#b91c1c' : '#ea580c';
      oCtx.lineWidth = 1.5;
      oCtx.setLineDash([3, 3]);
      oCtx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
      oCtx.setLineDash([]);

      // 라벨 배지 그리기
      const statusTag = s.isViolating ? '침범 의심' : s.isNear ? '근접' : '정상';
      const labelText = `🛴 킥보드 ${(s.score * 100).toFixed(1)}% [${statusTag}]`;

      oCtx.font = 'bold 13px system-ui, sans-serif';
      const textMetrics = oCtx.measureText(labelText);
      const textW = textMetrics.width + 12;
      const textH = 22;

      const tagX = sx1;
      const tagY = Math.max(0, sy1 - textH);

      oCtx.fillStyle = s.isViolating ? '#ef4444' : s.isNear ? '#f97316' : '#16a34a';
      oCtx.fillRect(tagX, tagY, textW, textH);

      oCtx.fillStyle = '#ffffff';
      oCtx.fillText(labelText, tagX + 6, tagY + 16);
    }

    // 5) 점자블록 라벨 태그
    if (detectedBraille.length > 0) {
      for (let i = 0; i < detectedBraille.length; i++) {
        const b = detectedBraille[i];
        const [bx1, by1] = b.bbox;
        const bLabel = `🟨 점자블록 ${(b.score * 100).toFixed(1)}%`;
        oCtx.font = 'bold 11px system-ui, sans-serif';
        const tm = oCtx.measureText(bLabel);
        const bw = tm.width + 8;
        const bh = 18;
        const by = Math.max(0, by1 - bh);

        oCtx.fillStyle = 'rgba(202, 138, 4, 0.9)';
        oCtx.fillRect(bx1, by, bw, bh);
        oCtx.fillStyle = '#ffffff';
        oCtx.fillText(bLabel, bx1 + 4, by + 13);
      }
    }

    overlayImageUrl = overlayCanvas.toDataURL('image/jpeg', 0.92);
  }

  const inferenceTimeMs = Math.round(performance.now() - startTime);

  console.log(
    `[SafeParkingAI] 분석 완료 (${inferenceTimeMs}ms) | ` +
    `스쿠터: ${detectedScooters.length}대, 점자블록: ${detectedBraille.length}개 | ` +
    `침범 여부: ${hasViolation}, 최단 거리: ${minDistanceToBraille.toFixed(1)} -> 판정: ${verdict}`
  );

  return {
    scooters: detectedScooters,
    brailleBlocks: detectedBraille,
    verdict,
    statusText,
    summary,
    inferenceTimeMs,
    overlayImageUrl,
    hasViolation,
    needsReview: verdict === 'UNCLEAR',
    isSafe: verdict === 'SAFE',
    overlappingPixels: totalOverlappingPixels,
    minDistanceToBraille: minDistanceToBraille === Infinity ? -1 : minDistanceToBraille,
  };
}
