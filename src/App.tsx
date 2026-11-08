import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Loader2,
  ShieldAlert,
  Play,
  ExternalLink,
} from 'lucide-react';

import type { ModelState, ModelPrediction } from './types';
import { loadHybridModels, runHybridParkingInference } from './services/onnxModel';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { VerdictCard } from './components/VerdictCard';
import { CameraModal } from './components/CameraModal';
import { TactileGuide } from './components/TactileGuide';
import { ReturnSuccessModal } from './components/ReturnSuccessModal';
import { DisclaimerNotice } from './components/DisclaimerNotice';

export const App: React.FC = () => {
  // State
  const [modelState, setModelState] = useState<ModelState>({ status: 'idle' });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);

  const [demoReturn, setDemoReturn] = useState<'idle' | 'ready' | 'complete'>('idle');

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Ref to image element used for inference
  const previewImgRef = useRef<HTMLImageElement>(null);
  const analysisVersion = useRef(0);

  // 1. 컴포넌트 마운트 시 실제 YOLOv8 ONNX 모델 2종 로드
  useEffect(() => {
    let isMounted = true;

    async function initModels() {
      setModelState({ status: 'loading' });
      try {
        await loadHybridModels();
        if (isMounted) {
          setModelState({
            status: 'ready',
            modelName: 'YOLOv8 Hybrid v1 (Scooter Det + Braille Seg)',
          });
          console.log('[SafeParkingAI] ONNX 모델 2종 초기화 완료');
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[SafeParkingAI] 모델 로딩 에러:', err);
          setModelState({
            status: 'error',
            message:
              err?.message ||
              '모델 파일(/models/hybrid-v1/scooter_detection.onnx 및 braille_segmentation.onnx) 로드 실패',
          });
        }
      }
    }

    initModels();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. 이미지 선택 핸들러
  const handleImageSelect = (imageUrl: string, sourceName?: string) => {
    analysisVersion.current += 1;
    setIsAnalyzing(false);
    setIsSuccessModalOpen(false);
    setSelectedImage(imageUrl);
    setSelectedImageName(sourceName || '사용자 등록 사진');
    setPrediction(null); // 이전 분석 결과 초기화
    setAnalysisError(null);
  };

  // 3. 사진 초기화 핸들러
  const handleClearImage = () => {
    analysisVersion.current += 1;
    setIsAnalyzing(false);
    setIsSuccessModalOpen(false);
    setSelectedImage(null);
    setSelectedImageName('');
    setPrediction(null);
    setAnalysisError(null);
  };

  // 4. AI 분석 실행 (YOLOv8 Detection + Segmentation 추론)
  const handleStartAnalysis = async () => {
    if (!selectedImage || !previewImgRef.current) {
      setAnalysisError('분석할 이미지를 먼저 선택해 주세요.');
      return;
    }

    if (modelState.status !== 'ready') {
      setAnalysisError(
        'AI 모델이 아직 로드되지 않았습니다. 모델이 완전히 로드된 후 다시 시도해 주세요.'
      );
      return;
    }

    const version = ++analysisVersion.current;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 이미지 완전 로드 대기
      const img = previewImgRef.current;
      await img.decode();
      if (version !== analysisVersion.current) return;

      // ONNX Runtime Web 기반 하이브리드 추론 실행
      const result = await runHybridParkingInference(img);
      if (version !== analysisVersion.current) return;
      setPrediction(result);
    } catch (err: any) {
      if (version !== analysisVersion.current) return;
      console.error('[SafeParkingAI] 추론 오류:', err);
      setAnalysisError(
        err?.message || '이미지 분석 중 오류가 발생했습니다. 다시 시도해 주세요.'
      );
      setPrediction(null);
    } finally {
      if (version === analysisVersion.current) setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Hidden image element strictly used for extraction */}
      {selectedImage && (
        <img
          ref={previewImgRef}
          src={selectedImage}
          alt="ONNX Input Source"
          crossOrigin="anonymous"
          className="hidden"
        />
      )}

      {/* Global Header */}
      <Header
        modelState={modelState}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5 sm:py-7 space-y-6">
        {/* Model Error Alert (Strictly NO fake predictions) */}
        {modelState.status === 'error' && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>실제 AI 모델 로딩 실패 안내</span>
            </div>
            <p className="text-xs text-rose-800 m-0 leading-relaxed font-mono">
              {modelState.message}
            </p>
            <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-xs space-y-1">
              <p className="font-bold text-rose-900 m-0">확인 필요한 모델 파일:</p>
              <ul className="list-disc list-inside text-rose-800 text-[11px] m-0 pl-1">
                <li><code>/models/hybrid-v1/scooter_detection.onnx</code></li>
                <li><code>/models/hybrid-v1/braille_segmentation.onnx</code></li>
              </ul>
            </div>
            <p className="text-[11px] text-rose-700 font-semibold m-0">
              ※ Safe Parking AI는 MOCK 모델이나 가짜 예측값으로 대체하지 않으며, 실제 모델이 로드되지 않으면 분석을 실행하지 않습니다.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {/* Intro Hero Section */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/10 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              공유 킥보드 반납 전 확인
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white m-0">
              여기에 반납해도 될까요? <br />
              사진으로 반납 가능 여부를 확인하세요
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed m-0 pt-1">
              킥보드와 주변 바닥이 보이도록 촬영해 주세요. 점자블록 침범 여부를 확인해
              반납 가능, 반납 불가, 재촬영 필요로 안내합니다.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">시연 모드 · 예시 결과</span>
            <button type="button" onClick={() => setDemoReturn(demoReturn === 'idle' ? 'ready' : 'idle')}
              className="text-sm font-semibold text-emerald-700 cursor-pointer">
              {demoReturn === 'idle' ? '반납 가능 시연하기' : '시연 종료'}
            </button>
          </div>
          {demoReturn !== 'idle' && (
            <div role="status" aria-live="polite" className="rounded-xl bg-emerald-50 p-4 space-y-3">
              <h2 className="text-2xl font-extrabold text-emerald-900 m-0">
                {demoReturn === 'complete' ? '시연용 반납 완료' : '반납 가능'}
              </h2>
              <p className="text-sm text-emerald-800 m-0">발표용 예시 화면입니다. 실제 AI 분석이나 반납 처리 결과가 아닙니다.</p>
              <button type="button" disabled={demoReturn === 'complete'} onClick={() => setDemoReturn('complete')}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 cursor-pointer">
                {demoReturn === 'complete' ? '반납이 완료되었습니다 (시연)' : '시연용 반납 완료하기'}
              </button>
            </div>
          )}
        </section>

        {/* Prediction Verdict Card */}
        {prediction && (
          <VerdictCard
            prediction={prediction}
            onRetake={() => {
              handleClearImage();
              setIsCameraOpen(true);
            }}
            onCompleteReturn={() => {
              if (prediction.verdict === 'SAFE') setIsSuccessModalOpen(true);
            }}
          />
        )}

        {/* Image Uploader & Preset Samples */}
        <section className="space-y-4">
          {selectedImage && selectedImageName && (
            <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-slate-100/90 text-slate-600 border border-slate-200">
              <span className="font-medium truncate">선택된 이미지: {selectedImageName}</span>
              <span className="text-[11px] text-slate-400 shrink-0">사진 선택됨</span>
            </div>
          )}
          <ImageUploader
            selectedImage={selectedImage}
            overlayImageUrl={prediction?.overlayImageUrl}
            onImageSelect={handleImageSelect}
            onClearImage={handleClearImage}
            onOpenCamera={() => setIsCameraOpen(true)}
            isAnalyzing={isAnalyzing}
          />
        </section>

        {/* Start Analysis CTA Button */}
        {selectedImage && !prediction && (
          <div className="pt-1">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || modelState.status !== 'ready'}
              type="button"
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${
                isAnalyzing || modelState.status !== 'ready'
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-600/25 active:scale-[0.99]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>반납 가능 여부 확인 중...</span>
                </>
              ) : modelState.status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>반납 확인 준비 중...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>반납 가능 여부 확인하기</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              사진 확인 → 반납 가능 여부 확인 → 가능할 때 시연용 반납 완료
            </p>
          </div>
        )}

        {/* Analysis Progress Loading State */}
        {isAnalyzing && (
          <div className="rounded-2xl p-6 bg-white border border-emerald-200 shadow-sm text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 m-0">
                이 위치에 반납할 수 있는지 확인하고 있어요
              </h3>
              <p className="text-xs text-slate-500 m-0">
                킥보드와 점자블록의 위치를 확인하고 있습니다. 잠시 기다려 주세요.
              </p>
            </div>
            <div className="h-1.5 w-48 mx-auto bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Analysis Error Message */}
        {analysisError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Tactile Paving Quick Summary Card */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              점자블록 안전 주차 핵심 수칙
            </h3>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              상세보기
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-slate-600 m-0 leading-relaxed">
            시각장애인은 노란색 점자블록(점형: 정지/주의, 선형: 직진)을 흰지팡이로 짚으며 보행합니다.
            블록 위나 근접하게 주차된 킥보드는 심각한 충돌 및 전도 사고로 이어집니다.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 font-medium border border-rose-100">
              ❌ 점자블록 위 거치 절대 금지
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-medium border border-emerald-100">
              ✔ 자전거 거치대 등 전용 구역 주차
            </div>
          </div>
        </section>

        {/* Disclaimers & Security Info */}
        <DisclaimerNotice />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 mt-8 text-center text-xs text-slate-500">
        <div className="max-w-xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-700 m-0">
            Safe Parking AI — 모두를 위한 안전한 보행 환경
          </p>
          <p className="text-[11px] text-slate-400 m-0">
            Built with React, Vite, TypeScript, Tailwind CSS & ONNX Runtime Web (YOLOv8)
          </p>
          <p className="text-[10px] text-slate-400 m-0">
            본 프로젝트는 실제 모빌리티 사의 반납 API와 연결되지 않은 독립 시연용 서비스입니다.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => handleImageSelect(dataUrl, '직접 촬영한 사진')}
      />

      <TactileGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ReturnSuccessModal
        isOpen={isSuccessModalOpen}
        prediction={prediction}
        onClose={() => setIsSuccessModalOpen(false)}
        onReset={() => {
          handleClearImage();
        }}
      />
    </div>
  );
};

export default App;
