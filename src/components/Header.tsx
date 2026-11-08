import React from 'react';
import { ShieldAlert, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import type { ModelState } from '../types';

interface HeaderProps {
  modelState: ModelState;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ modelState, onOpenGuide }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 m-0">
                Safe Parking AI
              </h1>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 tracking-wider">
                YOLOv8 ONNX
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0 font-medium">
              모두를 위한 안전한 보행 환경
            </p>
          </div>
        </div>

        {/* Model Status & Guide Button */}
        <div className="flex items-center gap-2">
          {/* Model State Pill */}
          <div className="hidden sm:flex items-center text-xs px-2.5 py-1 rounded-full border">
            {modelState.status === 'ready' && (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>YOLOv8 ONNX 준비완료</span>
              </span>
            )}
            {modelState.status === 'loading' && (
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border-blue-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>ONNX 모델 로딩 중...</span>
              </span>
            )}
            {modelState.status === 'error' && (
              <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border-rose-200">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>모델 로드 실패</span>
              </span>
            )}
            {modelState.status === 'idle' && (
              <span className="text-slate-500">초기화 대기 중</span>
            )}
          </div>

          {/* Guide Button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="점자블록 안전 주차 가이드"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span className="hidden xs:inline">주차 가이드</span>
          </button>
        </div>
      </div>

      {/* Mobile status banner when loading or error */}
      {modelState.status === 'loading' && (
        <div className="sm:hidden bg-blue-50 border-t border-blue-100 px-4 py-1.5 text-center text-xs text-blue-700 flex items-center justify-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>YOLOv8 ONNX AI 모델 로딩 중...</span>
        </div>
      )}
      {modelState.status === 'error' && (
        <div className="sm:hidden bg-rose-50 border-t border-rose-100 px-4 py-1.5 text-center text-xs text-rose-700 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          <span>ONNX 모델 로딩 실패 (/models/hybrid-v1/)</span>
        </div>
      )}
    </header>
  );
};
