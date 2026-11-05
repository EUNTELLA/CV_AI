import React, { useRef, useState } from 'react';
import {
  Upload,
  Camera,
  X,
  Sparkles,
  Eye,
  Layers,
} from 'lucide-react';
import type { SampleImage } from '../types';

interface ImageUploaderProps {
  selectedImage: string | null;
  overlayImageUrl?: string | null;
  onImageSelect: (imageUrl: string, sourceName?: string) => void;
  onClearImage: () => void;
  onOpenCamera: () => void;
  isAnalyzing: boolean;
}

const SAMPLE_PRESETS: SampleImage[] = [
  {
    id: 'real_violation',
    name: '점자블록 침범 (실제 사진)',
    badge: '침범 의심 (위험)',
    description: '점자블록 위에 킥보드가 직접 거치된 실제 주차 사진',
    path: '/samples/real_violation.jpg',
    expectedVerdict: 'BLOCKED',
  },
  {
    id: 'real_scooter',
    name: '점자블록 미탐지 (실제 사진)',
    badge: '추가 확인 (주의)',
    description: '킥보드가 있으나 바닥 점자블록이 감지되지 않는 실제 사진',
    path: '/samples/real_scooter.jpg',
    expectedVerdict: 'UNCLEAR',
  },
  {
    id: 'near',
    name: '점자블록 인근 (시연)',
    badge: '추가 확인 (주의)',
    description: '보행 유도 블록 근접 거치 상태',
    path: '/samples/near.png',
    expectedVerdict: 'UNCLEAR',
  },
  {
    id: 'safe',
    name: '안전 구역 주차 (시연)',
    badge: '정상 (초록)',
    description: '점자블록과 충분한 이격 거리를 확보한 구역',
    path: '/samples/safe.png',
    expectedVerdict: 'SAFE',
  },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  selectedImage,
  overlayImageUrl,
  onImageSelect,
  onClearImage,
  onOpenCamera,
  isAnalyzing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelect(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelect(event.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 표시할 이미지: 분석 완료 후 오버레이가 있고 원본 보기가 꺼져있으면 overlayImageUrl 표시
  const displayImage = overlayImageUrl && !showOriginal ? overlayImageUrl : selectedImage;

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main Upload / Preview Area */}
      {!selectedImage ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all bg-white ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/40 shadow-inner'
              : 'border-slate-300 hover:border-slate-400 shadow-xs'
          }`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <Camera className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-800 m-0">
                킥보드 반납 위치 사진 촬영 또는 업로드
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                바닥 점자블록 및 킥보드 거치 상태가 명확히 보이는 사진을 등록해 주세요.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onOpenCamera}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                카메라로 촬영하기
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                앨범에서 사진 선택
              </button>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              ※ 업로드된 사진은 서버로 전송되지 않으며, 기기 브라우저(ONNX WebAssembly) 내에서만 안전하게 분석됩니다.
            </p>
          </div>
        </div>
      ) : (
        /* Preview Card */
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
          <div className="relative aspect-4/3 sm:aspect-16/10 max-h-[400px] w-full flex items-center justify-center bg-black/90">
            {displayImage && (
              <img
                src={displayImage}
                alt="반납 사진 미리보기"
                className="max-h-full max-w-full object-contain"
              />
            )}

            {/* Overlay Indicator Tag */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {overlayImageUrl ? (
                <span className="text-[11px] font-bold text-white bg-slate-900/80 border border-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {showOriginal ? '원본 사진' : 'AI 객체 탐지 & 세그멘테이션 오버레이'}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-white/80 bg-black/50 px-2 py-0.5 rounded-sm backdrop-blur-xs">
                  분석 대기 이미지 (640×640 Letterbox 전처리 예정)
                </span>
              )}
            </div>

            {/* Delete / Change Button */}
            {!isAnalyzing && (
              <button
                onClick={onClearImage}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                title="사진 지우기 / 다시 선택"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Legend Tag when overlay is showing */}
            {overlayImageUrl && !showOriginal && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-xs text-[10px] text-white">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-red-500 inline-block" />
                  킥보드 (빨강 박스)
                </span>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-yellow-400 inline-block" />
                  점자블록 (노란 마스크)
                </span>
              </div>
            )}
          </div>

          {/* Quick Change Bar under preview */}
          <div className="bg-slate-800/95 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              {overlayImageUrl && (
                <button
                  type="button"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
                >
                  {showOriginal ? (
                    <>
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>AI 오버레이 보기</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-slate-300" />
                      <span>원본 사진 보기</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCamera}
                disabled={isAnalyzing}
                className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                재촬영
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="text-slate-300 hover:text-white font-medium cursor-pointer"
              >
                다른 사진 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Demonstration Samples */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 m-0">
              시연용 샘플 사진으로 빠른 테스트
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">원클릭 시연</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SAMPLE_PRESETS.map((preset) => {
            const isSelected = selectedImage === preset.path;
            const badgeColor =
              preset.expectedVerdict === 'SAFE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : preset.expectedVerdict === 'BLOCKED'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onImageSelect(preset.path, preset.name)}
                disabled={isAnalyzing}
                className={`group relative p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-200 mb-2 border border-slate-200/60">
                  <img
                    src={preset.path}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {preset.name}
                    </span>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border ${badgeColor}`}
                  >
                    {preset.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
