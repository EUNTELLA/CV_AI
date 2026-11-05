import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Ban,
  Activity,
  ArrowRight,
  Layers,
  HelpCircle,
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
  const {
    scooters,
    brailleBlocks,
    verdict,
    statusText,
    summary,
    inferenceTimeMs,
    hasViolation,
    overlappingPixels,
  } = prediction;

  const isSafe = verdict === 'SAFE';
  const isBlocked = verdict === 'BLOCKED';

  const themeConfig = {
    SAFE: {
      borderColor: 'border-emerald-300',
      bgColor: 'bg-emerald-50/70',
      badgeBg: 'bg-emerald-600',
      badgeText: 'text-white',
      titleColor: 'text-emerald-950',
      subColor: 'text-emerald-800',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      title: '정상 주차 판정 (시연용 반납 가능)',
      tagline: '킥보드와 점자블록이 모두 인식되었으며 충분한 이격 거리가 확보되었습니다.',
    },
    BLOCKED: {
      borderColor: 'border-rose-400',
      bgColor: 'bg-rose-50/70',
      badgeBg: 'bg-rose-600',
      badgeText: 'text-white',
      titleColor: 'text-rose-950',
      subColor: 'text-rose-800',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      title: '침범 의심 (반납 차단)',
      tagline: '킥보드 하단 접지부가 점자블록 마스크와 겹치는 것으로 분석되었습니다.',
    },
    UNCLEAR: {
      borderColor: 'border-amber-300',
      bgColor: 'bg-amber-50/70',
      badgeBg: 'bg-amber-500',
      badgeText: 'text-slate-950',
      titleColor: 'text-amber-950',
      subColor: 'text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      title: '추가 확인 필요 (재촬영 권장)',
      tagline: '점자블록에 근접해 있거나, 대상 객체 중 일부가 탐지되지 않았습니다.',
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
                {isBlocked ? '침범 의심 (위험)' : isSafe ? '정상 판정' : '추가 확인 (주의)'}
              </span>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-400" />
                ONNX 추론 {inferenceTimeMs}ms
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

        {/* Quick Summary Pill */}
        <div className="bg-white/90 backdrop-blur-xs px-3.5 py-2.5 rounded-xl border border-slate-200/80 self-start sm:self-auto shrink-0 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500">
            AI 객체 인식 결과
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs font-bold">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              킥보드 {scooters.length}대
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              점자블록 {brailleBlocks.length}개
            </span>
          </div>
        </div>
      </div>

      {/* Detection & Spatial Relationship Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Scooter Detection Card */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
              킥보드 탐지 (Scooter BBox)
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-rose-50 text-rose-700 border border-rose-200">
              {scooters.length > 0 ? `${scooters.length}대 감지` : '미탐지'}
            </span>
          </div>

          {scooters.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {scooters.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60"
                >
                  <span className="font-medium text-slate-700">
                    #{idx + 1} 킥보드
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-600">
                      신뢰도 {(s.score * 100).toFixed(1)}%
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                        s.isViolating
                          ? 'bg-rose-100 text-rose-800'
                          : s.isNear
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.isViolating ? '하단 침범' : s.isNear ? '근접' : '안전'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 m-0 py-2 text-center">
              사진에서 킥보드가 감지되지 않았습니다.
            </p>
          )}
        </div>

        {/* Braille Segmentation Card */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
              점자블록 분할 (Braille Mask)
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">
              {brailleBlocks.length > 0 ? `${brailleBlocks.length}개 영역` : '미탐지'}
            </span>
          </div>

          {brailleBlocks.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {brailleBlocks.map((b, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60"
                >
                  <span className="font-medium text-slate-700">
                    #{idx + 1} 점자블록
                  </span>
                  <span className="font-mono text-slate-600">
                    신뢰도 {(b.score * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 m-0 py-2 text-center">
              바닥 점자블록이 감지되지 않았습니다.
            </p>
          )}
        </div>
      </div>

      {/* Spatial Relationship Detailed Report */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>공간 관계 분석: 킥보드 하단 접지부 vs 점자블록 마스크</span>
        </div>
        <p className="text-xs text-slate-600 m-0 leading-relaxed font-medium">
          {statusText}
        </p>
        <p className="text-[11px] text-slate-500 m-0">
          {summary}
        </p>

        {hasViolation && (
          <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <span className="font-bold text-rose-700">⚠️ 침범 감지:</span>
            <span>
              킥보드 바퀴/스탠드 하단 접지 영역 내 점자블록 마스크 픽셀 겹침 ({overlappingPixels}px)
            </span>
          </div>
        )}
      </div>

      {/* Auxiliary Warning & Criteria */}
      <div className="text-xs bg-white/80 rounded-xl p-3 border border-slate-200 space-y-1 text-slate-600">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>보조적 인공지능 탐지 안내</span>
        </div>
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          • 본 서비스는 YOLOv8 Detection 및 Segmentation 모델을 활용한 <strong>보조적인 위험 탐지 프로토타입</strong>이며, 실제 보행 안전을 법적으로 보증하지 않습니다.
        </p>
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          • 점자블록 또는 킥보드가 감지되지 않은 경우, 안전을 보장할 수 없으므로 <strong>자동 안전 판정을 금지</strong>하고 추가 확인을 요청합니다.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
        <button
          onClick={onRetake}
          type="button"
          className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-slate-600" />
          다시 촬영하기
        </button>

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
              : '안전 이격이 확인되지 않아 반납 버튼이 비활성화되었습니다.'
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
  );
};
