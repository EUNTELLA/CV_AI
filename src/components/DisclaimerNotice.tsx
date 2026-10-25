import React from 'react';
import { Shield, Lock, Cpu, AlertCircle } from 'lucide-react';

export const DisclaimerNotice: React.FC = () => {
  return (
    <section className="bg-slate-100/70 border border-slate-200 rounded-2xl p-4 sm:p-5 text-xs text-slate-600 space-y-3">
      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
        <Shield className="w-4 h-4 text-emerald-600" />
        <span>Safe Parking AI 시연 안내 및 개인정보 보호</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>온디바이스 AI 추론</span>
          </div>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            TensorFlow.js GraphModel이 사용자 브라우저 내부에서 직접 이미지를 처리하므로 외부 지연 없이 즉각 분석됩니다.
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>서버 미저장 (로컬 전용)</span>
          </div>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            사용자가 촬영하거나 업로드한 사진은 서버로 전송되거나 저장되지 않으며, 브라우저 메모리 내에서만 임시 유지됩니다.
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>모빌리티 API 미연동</span>
          </div>
          <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
            실제 전동 킥보드 운영사의 유료 반납 API와 연결되지 않은 학술·시연용 프로토타입 프로젝트입니다 (검증 정확도 47.83%).
          </p>
        </div>
      </div>
    </section>
  );
};
