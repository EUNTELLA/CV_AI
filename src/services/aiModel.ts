import * as tf from '@tensorflow/tfjs';
import type { ModelPrediction, VerdictStatus } from '../types';

let cachedModel: tf.GraphModel | null = null;
let modelLoadingPromise: Promise<tf.GraphModel> | null = null;

const MODEL_URL = '/model/model.json';
const INPUT_SIZE = 224;

/**
 * TensorFlow.js GraphModel 로드
 * - /model/model.json 위치에서 tf.loadGraphModel()로 로드합니다.
 * - 이미 로드된 경우 캐시된 인스턴스를 재사용합니다.
 */
export async function loadParkingModel(): Promise<tf.GraphModel> {
  if (cachedModel) {
    return cachedModel;
  }

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    try {
      await tf.ready();
      console.log(`[SafeParkingAI] TensorFlow.js 백엔드 준비 완료: ${tf.getBackend()}`);
      
      const model = await tf.loadGraphModel(MODEL_URL);
      console.log('[SafeParkingAI] GraphModel 로드 성공:', MODEL_URL);
      cachedModel = model;
      return model;
    } catch (error) {
      console.error('[SafeParkingAI] 모델 로딩 실패:', error);
      cachedModel = null;
      modelLoadingPromise = null;
      throw new Error(
        `AI 모델(/model/model.json)을 로드할 수 없습니다. 모델 파일 및 가중치 파일(group1-shard1of1.bin)의 경로와 네트워크 상태를 확인해 주세요.`
      );
    }
  })();

  return modelLoadingPromise;
}

/**
 * 모델 로드 완료 여부 확인
 */
export function isModelLoaded(): boolean {
  return cachedModel !== null;
}

/**
 * 입력 이미지를 분류하여 예측 확률 및 반납 판정 결과를 반환합니다.
 * 
 * - 입력 이미지 크기: 224×224
 * - 입력: RGB 이미지, float32, 픽셀 범위 0~255
 * - 정규화는 모델 내부에 포함되어 있으므로 JS에서 다시 정규화하지 않습니다.
 * - 출력 순서: Blocked, Near, Safe
 * - 메모리 누수 방지를 위해 모든 임시 Tensor를 즉시 dispose합니다.
 */
export async function classifyParkingImage(
  imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<ModelPrediction> {
  if (!cachedModel) {
    throw new Error(
      'AI 모델이 아직 로드되지 않았습니다. 모델 로딩이 완료된 후 다시 시도해 주세요.'
    );
  }

  const startTime = performance.now();
  let inputTensor: tf.Tensor | null = null;
  let predictionTensor: tf.Tensor | null = null;

  try {
    // 1. 픽셀 추출 -> 224x224 리사이즈 -> float32 [0..255] -> [1, 224, 224, 3]
    inputTensor = tf.tidy(() => {
      const fromPixels = tf.browser.fromPixels(imageElement); // [H, W, 3], uint8
      const resized = tf.image.resizeBilinear(fromPixels, [INPUT_SIZE, INPUT_SIZE]); // [224, 224, 3]
      const floatVal = resized.toFloat(); // float32, 0~255 (모델 내부에서 정규화)
      return floatVal.expandDims(0); // [1, 224, 224, 3]
    });

    // 2. 모델 추론
    const output = cachedModel.predict(inputTensor);
    predictionTensor = Array.isArray(output) ? output[0] : (output as tf.Tensor);

    // 3. 확률 추출: [Blocked, Near, Safe]
    const probs = await predictionTensor.data();
    const inferenceTimeMs = Math.round(performance.now() - startTime);

    if (probs.length < 3) {
      throw new Error(`모델 출력 형태가 올바르지 않습니다. 기대: 3개 클래스, 실제: ${probs.length}개`);
    }

    const blockedProb = Math.max(0, Math.min(1, probs[0]));
    const nearProb = Math.max(0, Math.min(1, probs[1]));
    const safeProb = Math.max(0, Math.min(1, probs[2]));

    // 4. 결과 판정 기준 적용:
    // Risk 확률 = Blocked 확률 + Near 확률
    // Risk 확률이 0.5 이상이면 반납 제한 (BLOCKED)
    // Safe 확률이 0.8 이상이면 시연용 반납 가능 (SAFE)
    // 그 외에는 재촬영 요청 (UNCLEAR)
    const riskProb = Math.min(1, blockedProb + nearProb);

    let verdict: VerdictStatus;
    if (riskProb >= 0.5) {
      verdict = 'BLOCKED';
    } else if (safeProb >= 0.8) {
      verdict = 'SAFE';
    } else {
      verdict = 'UNCLEAR';
    }

    console.log(
      `[SafeParkingAI] 분석 완료 (${inferenceTimeMs}ms) | ` +
      `Blocked: ${(blockedProb * 100).toFixed(1)}%, ` +
      `Near: ${(nearProb * 100).toFixed(1)}%, ` +
      `Safe: ${(safeProb * 100).toFixed(1)}% | ` +
      `Risk: ${(riskProb * 100).toFixed(1)}% -> 판정: ${verdict}`
    );

    return {
      blockedProb,
      nearProb,
      safeProb,
      riskProb,
      verdict,
      inferenceTimeMs,
    };
  } finally {
    // 5. 메모리 정리: 생성된 텐서 해제
    if (inputTensor) {
      inputTensor.dispose();
    }
    if (predictionTensor) {
      predictionTensor.dispose();
    }
  }
}
