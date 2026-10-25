import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Ban,
  Info,
  Activity,
  ArrowRight,
} from 'lucide-react';
import type { ModelPrediction } from '../types';

interface VerdictCardProps {
  prediction: ModelPrediction;
  onRetake: () => void;
  onCompleteReturn: () => void;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  prediction,
  onRetake,
  onCompleteReturn,
}) => {
  const { blockedProb, nearProb, safeProb, riskProb, verdict, inferenceTimeMs } =
    prediction;

  // 상태별 테마 구성 (빨강: BLOCKED, 노랑: UNCLEAR, 초록: SAFE)
  const isSafe = verdict === 'SAFE';
  const isBlocked = verdict === 'BLOCKED';

  const themeConfig = {
    SAFE: {
      borderColor: 'border-emerald-300',
      bgColor: 'bg-emerald-50/60',
      badgeBg: 'bg-emerald-500',
      badgeText: 'text-white',
      titleColor: 'text-emerald-900',
      subColor: 'text-emerald-700',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      title: '시연용 반납 가능 (Safe 판정)',
      tagline: '교육용 프로토타입 AI 모델이 안전 구역으로 예측한 상태입니다.',
      actionNotice: '※ 본 모델은 검증 정확도 47.83%의 교육용 프로토타입이며, 모델 예측 결과가 실제 보행 안전을 보증하지 않습니다.',
    },
    BLOCKED: {
      borderColor: 'border-rose-300',
      bgColor: 'bg-rose-50/60',
      badgeBg: 'bg-rose-600',
      badgeText: 'text-white',
      titleColor: 'text-rose-900',
      subColor: 'text-rose-700',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      title: '반납 제한 (위험 구역 감지)',
      tagline: '점자블록 침범 또는 인근 보행 방해 위치로 판정되었습니다.',
      actionNotice: '점자블록 위 주차는 시각장애인에게 심각한 안전 위협이 됩니다. 킥보드를 안전 구역으로 이동 후 다시 촬영해 주세요.',
    },
    UNCLEAR: {
      borderColor: 'border-amber-300',
      bgColor: 'bg-amber-50/60',
      badgeBg: 'bg-amber-500',
      badgeText: 'text-slate-900',
      titleColor: 'text-amber-950',
      subColor: 'text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      title: '확인 필요 (재촬영 권장)',
      tagline: '주변 바닥 환경이나 점자블록 유무를 명확히 판별하기 어렵습니다.',
      actionNotice: '조명, 각도 또는 거리를 조정하여 킥보드 바퀴와 주변 바닥이 선명하게 보이도록 다시 촬영해 주세요.',
    },
  }[verdict];

  const StatusIcon = themeConfig.icon;

  return (
    <div
      className={`rounded-2xl border-2 ${themeConfig.borderColor} ${themeConfig.bgColor} p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300`}
    >
      {/* Top Banner: Status & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl bg-white shadow-xs border ${
              isBlocked
                ? 'border-rose-200'
                : isSafe
                ? 'border-emerald-200'
                : 'border-amber-200'
            }`}
          >
            <StatusIcon className={`w-7 h-7 ${themeConfig.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${themeConfig.badgeBg} ${themeConfig.badgeText}`}
              >
                {isSafe ? '정상 판정' : isBlocked ? '위험 판정' : '확인 필요'}
              </span>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-400" />
                추론 {inferenceTimeMs}ms
              </span>
            </div>
            <h2 className={`text-lg sm:text-xl font-bold mt-1 m-0 ${themeConfig.titleColor}`}>
              {themeConfig.title}
            </h2>
            <p className={`text-xs sm:text-sm mt-0.5 m-0 font-medium ${themeConfig.subColor}`}>
              {themeConfig.tagline}
            </p>
          </div>
        </div>

        {/* Risk / Safe Summary Pill */}
        <div className="bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200/80 text-right self-start sm:self-auto shrink-0">
          <div className="text-[11px] font-semibold text-slate-500">
            위험도 (Risk = Blocked + Near)
          </div>
          <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
            <span
              className={`text-xl font-extrabold ${
                riskProb >= 0.5 ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {(riskProb * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">
              {riskProb >= 0.5 ? '(임계치 50% 초과)' : '(안전 기준 충족)'}
            </span>
          </div>
        </div>
      </div>

      {/* Probability Graphs */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
          <span>AI 클래스별 예측 확률 그래프</span>
          <span className="text-[11px] font-normal text-slate-400">
            TensorFlow.js Softmax 출력
          </span>
        </div>

        {/* 1. Blocked Probability Bar (Red) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-rose-700 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
              Blocked (점자블록 직접 침범)
            </span>
            <span className="font-mono font-bold text-rose-700">
              {(blockedProb * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, blockedProb * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Near Probability Bar (Orange/Amber) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-amber-700 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
              Near (점자블록 30cm 이내 근접)
            </span>
            <span className="font-mono font-bold text-amber-700">
              {(nearProb * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, nearProb * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Safe Probability Bar (Emerald Green) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              Safe (안전 구역 주차)
            </span>
            <span className="font-mono font-bold text-emerald-700">
              {(safeProb * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, safeProb * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Decision Logic & Criteria Guide */}
      <div className="text-xs bg-white/70 rounded-xl p-3 border border-slate-200 space-y-1.5 text-slate-600">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>시연 판정 기준 로직</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
          <li>
            <strong className="text-rose-700">반납 제한:</strong> 위험 확률(Risk = Blocked + Near)이{' '}
            <strong>50% 이상</strong>인 경우
          </li>
          <li>
            <strong className="text-emerald-700">반납 가능:</strong> 안전 확률(Safe)이{' '}
            <strong>80% 이상</strong>인 경우
          </li>
          <li>
            <strong className="text-amber-700">재촬영 요청:</strong> 위 두 조건에 해당하지 않는 경계 영역인 경우
          </li>
        </ul>
        <p className="text-[10px] text-slate-400 italic pt-1">
          ※ 본 AI 모델은 검증 정확도 47.83%의 교육용 프로토타입이며, 실제 안전을 보증하는 기준이 아닙니다.
        </p>
      </div>

      {/* Action Guidance & Buttons */}
      <div className="pt-1 space-y-3">
        <div className="text-xs sm:text-sm font-medium text-slate-800 bg-white/90 p-3 rounded-xl border border-slate-200">
          <p className="m-0 leading-relaxed">{themeConfig.actionNotice}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Re-take Button */}
          <button
            onClick={onRetake}
            type="button"
            className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            다시 촬영하기
          </button>

          {/* Complete Return Button (Disabled when not Safe) */}
          <button
            onClick={onCompleteReturn}
            type="button"
            disabled={!isSafe}
            className={`w-full sm:w-1/2 px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              isSafe
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-emerald-600/20 hover:scale-[1.01]'
                : 'bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed opacity-80'
            }`}
            title={
              isSafe
                ? '시연용 반납을 완료합니다'
                : '안전 주차가 확인되지 않아 반납 버튼이 비활성화되었습니다'
            }
          >
            {isSafe ? (
              <>
                <CheckCircle className="w-4 h-4" />
                시연용 반납 완료하기
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 text-slate-400" />
                반납 불가 (안전 구역 필요)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
