'use client';

import { DoseEvent } from '@/types';
import { MEDICATIONS } from '@/lib/medications';

interface Props {
  dose: DoseEvent;
  isNext: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onUndo: () => void;
  readOnly?: boolean;
}

export default function DoseCard({ dose, isNext, onComplete, onSkip, onUndo, readOnly = false }: Props) {
  const med = MEDICATIONS[dose.medId];
  const done = dose.status === 'done';
  const skipped = dose.status === 'skipped';

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
        isNext
          ? 'border-brand-500 bg-brand-50 animate-pulseRing'
          : done || skipped
          ? 'border-slate-200 bg-slate-50 opacity-70'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/5 text-sm font-bold"
        style={{ backgroundColor: med.color, color: med.textOnColor === 'light' ? '#fff' : '#1f2430' }}
      >
        {med.name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-slate-800">{med.name}</span>
          {isNext && (
            <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">다음</span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {dose.scheduledTime}
          {dose.wasShifted && <span className="ml-1 text-amber-600">(원래 {dose.originalTime} · 자동 조정됨)</span>}
        </div>
      </div>

      {readOnly ? (
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            done ? 'bg-emerald-100 text-emerald-600' : skipped ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {done ? '완료' : skipped ? '건너뜀' : '대기'}
        </span>
      ) : done ? (
        <button onClick={onUndo} className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">
          완료됨 ✓
        </button>
      ) : skipped ? (
        <button onClick={onUndo} className="shrink-0 rounded-full bg-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
          건너뜀 ↺
        </button>
      ) : (
        <div className="flex shrink-0 gap-1.5">
          <button onClick={onSkip} className="rounded-full border border-slate-300 px-2.5 py-1.5 text-xs text-slate-500">
            건너뛰기
          </button>
          <button onClick={onComplete} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white">
            완료
          </button>
        </div>
      )}
    </div>
  );
}
