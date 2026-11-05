/**
 * Safe Parking AI - ONNX Runtime Web 기반 YOLOv8 하이브리드 비전 서비스
 * 
 * 1. 모델 1: /models/hybrid-v1/scooter_detection.onnx (scooter 객체 탐지)
 * 2. 모델 2: /models/hybrid-v1/braille_segmentation.onnx (점자블록 인스턴스 분할)
 */

export {
  loadHybridModels,
  isModelsLoaded,
  runHybridParkingInference,
  // 기존 컴포넌트 호환용 별칭(alias)
  loadHybridModels as loadParkingModel,
  isModelsLoaded as isModelLoaded,
  runHybridParkingInference as classifyParkingImage,
} from './onnxModel';
