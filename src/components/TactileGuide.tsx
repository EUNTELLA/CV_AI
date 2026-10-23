import React from 'react';
import {
  X,
  ShieldCheck,
  Ban,
  CheckCircle2,
} from 'lucide-react';

interface TactileGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TactileGuide: React.FC<TactileGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                점자블록 안전 주차 가이드
              </h2>
              <p className="text-xs text-slate-500 m-0">
                시각장애인의 눈이 되어주는 노란색 점자블록을 지켜주세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Section 1: Types of Tactile Blocks */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              점자블록(안전 유도 블록)의 종류와 의미
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Dot Block */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-bold text-amber-950 text-xs shadow-xs">
                    ●●
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 m-0">
                      점형 블록 (경고 · 정지)
                    </h4>
                    <span className="text-[10px] text-amber-800">
                      위험 인지 / 대기 구역
                    </span>
                  </div>
                </div>
                <p className="text-xs text-amber-900/80 m-0 leading-relaxed">
                  횡단보도 진입로, 계단 앞, 지하철 승강장 등 보행 방향이 바뀌거나
                  위험 요소가 있어 <strong>일단 멈추어야 함</strong>을 알립니다.
                </p>
              </div>

              {/* Line Block */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-bold text-amber-950 text-xs shadow-xs">
                    |||
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 m-0">
                      선형 블록 (방향 유도)
                    </h4>
                    <span className="text-[10px] text-amber-800">
                      보행 진행 방향 지시
                    </span>
                  </div>
                </div>
                <p className="text-xs text-amber-900/80 m-0 leading-relaxed">
                  보행자가 안전하게 직진할 수 있도록 <strong>보행 경로와 방향</strong>을
                  지속해서 안내하는 기준선입니다.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Prohibited Parking Areas */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-rose-600" />
              공유 킥보드 절대 주차 금지 5대 구역
            </h3>
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start gap-2 text-xs text-rose-900">
                <span className="font-bold text-rose-600 min-w-[18px]">1.</span>
                <span>
                  <strong>점자블록 위 및 측면 30cm 이내:</strong> 흰지팡이와 보행을 직접 가로막아 낙상 사고를 유발합니다.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-rose-900">
                <span className="font-bold text-rose-600 min-w-[18px]">2.</span>
                <span>
                  <strong>횡단보도 진입로 및 턱낮춤 구간:</strong> 휠체어와 유아차의 도로 진출입을 방해합니다.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-rose-900">
                <span className="font-bold text-rose-600 min-w-[18px]">3.</span>
                <span>
                  <strong>버스·지하철역 출입구 10m 이내:</strong> 대중교통 이용객의 집중 이동 통로입니다.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-rose-900">
                <span className="font-bold text-rose-600 min-w-[18px]">4.</span>
                <span>
                  <strong>소방시설 5m 이내 및 소방차 전용구역:</strong> 화재 및 비상시 긴급 구호 활동을 저해합니다.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs text-rose-900">
                <span className="font-bold text-rose-600 min-w-[18px]">5.</span>
                <span>
                  <strong>어린이 보호구역 및 좁은 보도(폭 2m 미만):</strong> 보행자 통행권 확보가 최우선입니다.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Recommended Safe Parking Zones */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              올바른 안전 주차 권장 구역
            </h3>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
              <p className="m-0 leading-relaxed">
                ✔ <strong>PM(개인형 이동장치) 및 자전거 전용 거치대</strong> 내부
              </p>
              <p className="m-0 leading-relaxed">
                ✔ 도로와 보도 경계의 <strong>가로수·가로등 사이 여유 공간</strong>
              </p>
              <p className="m-0 leading-relaxed">
                ✔ 건물 외벽 가장자리로서 <strong>보행자의 직선 통행을 방해하지 않는 위치</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
