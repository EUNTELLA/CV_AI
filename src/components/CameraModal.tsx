import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, SwitchCamera, AlertCircle, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);

  // 카메라 시작
  const startCamera = async (mode: 'environment' | 'user') => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('[Camera] 접근 실패:', err);
      setCameraError(
        '카메라에 접근할 수 없습니다. 브라우저 카메라 권한을 확인하거나 사진 업로드 기능을 이용해 주세요.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  // 카메라 전환 (전면/후면)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // 사진 촬영
  const handleShutter = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      // 정방형 1:1 또는 원본 해상도 유지
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        onCapture(dataUrl);
        onClose();
      }
    } catch (err) {
      console.error('[Camera] 캡처 실패:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">반납 사진 촬영</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          title="닫기"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Viewfinder Window */}
      <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-slate-950 border-2 border-white/20 shadow-2xl flex items-center justify-center my-auto">
        {cameraError ? (
          <div className="p-6 text-center text-rose-200">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-400" />
            <p className="text-sm font-medium leading-relaxed">{cameraError}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="mt-4 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs text-white flex items-center gap-2 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 다시 시도
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-emerald-400/40 m-6 rounded-xl flex flex-col justify-between p-3">
              <div className="flex justify-between text-[11px] font-medium text-emerald-300/80 bg-black/40 px-2 py-1 rounded-sm w-fit">
                <span>바닥 점자블록 및 킥보드 전체를 포함해 주세요</span>
              </div>
              <div className="flex justify-center">
                <div className="h-0.5 w-16 bg-emerald-400/60 rounded-full" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex items-center justify-around py-4 z-10">
        {/* Camera Switch */}
        <button
          onClick={toggleFacingMode}
          disabled={!stream}
          className="p-3.5 rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-40 transition-colors cursor-pointer"
          title="전면/후면 카메라 전환"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>

        {/* Shutter Button */}
        <button
          onClick={handleShutter}
          disabled={!stream || isCapturing}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-black/40"
          title="촬영하기"
        >
          <div className="w-full h-full rounded-full bg-white hover:bg-emerald-400 transition-colors flex items-center justify-center">
            <Camera className="w-6 h-6 text-slate-900" />
          </div>
        </button>

        {/* Spacer to keep shutter centered */}
        <div className="w-12 h-12" />
      </div>
    </div>
  );
};
