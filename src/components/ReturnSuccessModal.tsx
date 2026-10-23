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
  if (!isOpen || !prediction) return null;

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
            반납이 정상적으로 승인되었습니다!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            점자블록을 방해하지 않는 배려 주차로 보행 약자의 안전을 지켰습니다.
          </p>
        </div>

        {/* Simulated Receipt Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between text-slate-500 pb-1.5 border-b border-slate-200">
            <span>AI 판정 점수</span>
            <span className="font-bold text-emerald-600">
              안전 확률 {(prediction.safeProb * 100).toFixed(1)}% (적합)
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>보행 위험도(Risk)</span>
            <span className="font-mono text-slate-700">
              {(prediction.riskProb * 100).toFixed(1)}% (안전 기준 통과)
            </span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>시각장애인 보행로 보호</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 이상 없음
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
            이 화면은 <strong>시연용 가상 반납 완료 화면</strong>입니다. 실제 모빌리티 사의 결제/반납 서버와는 연동되지 않습니다.
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
