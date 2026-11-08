import React from 'react';
import { CheckCircle2, Sparkles, Award, ShieldCheck, Heart } from 'lucide-react';
import type { ModelPrediction } from '../types';

interface ReturnSuccessModalProps {
  isOpen: boolean;
  prediction: ModelPrediction | null;
  onClose: () => void;
  onReset: () => void;
}

export const ReturnSuccessModal: React.FC<ReturnSuccessModalProps> = ({
  isOpen,
  prediction,
  onClose,
  onReset,
}) => {
  if (!isOpen || !prediction || prediction.verdict !== 'SAFE') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 space-y-4">
        {/* Animated Celebration Icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
          <CheckCircle2 className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            시연용 안전 반납 성공
          </div>
          <h2 className="text-xl font-bold text-slate-900 m-0">
            시연용 반납 처리가 완료되었습니다
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            YOLOv8 Detection 및 Segmentation 기반 분석 결과입니다.
          </p>
        </div>

        {/* Simulated Receipt Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between text-slate-500 pb-1.5 border-b border-slate-200">
            <span>AI 인식 결과</span>
            <span className="font-bold text-emerald-700">
              킥보드 {prediction.scooters.length}대 / 점자블록 {prediction.brailleBlocks.length}개
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>하단 접지 침범 여부</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 이상 없음 (미침범)
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>시각장애인 보행로 보호</span>
            <span className="font-semibold text-emerald-700">
              안전 이격 거리 확보
            </span>
          </div>
          <div className="flex justify-between text-slate-500 pt-1.5 border-t border-slate-200">
            <span>매너 안전 마일리지 (시연)</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" /> +100 P
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-left flex items-start gap-2">
          <Heart className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>
            이 화면은 <strong>교육용 프로토타입 가상 반납 화면</strong>입니다. 보조적 비전 분석 결과이며 실제 보행 안전을 보증하지 않습니다.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onReset();
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            새로운 사진으로 다시 테스트
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
