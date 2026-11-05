import React from 'react';
import { Shield, Lock, Cpu, AlertCircle } from 'lucide-react';

export const DisclaimerNotice: React.FC = () => {
  return (
    <section className="bg-slate-100/70 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs text-slate-600 space-y-3">
      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
        <Shield className="w-4 h-4 text-emerald-600" />
        <span>Safe Parking AI 기술 안내 및 개인정보 보호</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>온디바이스 ONNX 추론</span>
          </div>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            ONNX Runtime WebAssembly가 브라우저 내부에서 직접 YOLOv8 탐지 및 세그멘테이션 모델을 병렬 연산합니다.
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>서버 미전송 (로컬 처리)</span>
          </div>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            사용자가 촬영하거나 업로드한 사진은 외부 서버로 전송되지 않으며, 기기 메모리 내에서만 안전하게 연산됩니다.
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>보조적 프로토타입</span>
          </div>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            실제 모빌리티 사의 유료 반납 API와 연결되지 않은 학술·시연용 프로토타입이며 실제 안전을 보증하지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
};
