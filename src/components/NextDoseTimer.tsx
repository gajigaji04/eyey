'use client';

import { DayRecord } from '@/types';
import { useNextDoseCountdown } from '@/hooks/useCountdown';
import { MEDICATIONS } from '@/lib/medications';

export default function NextDoseTimer({ today }: { today: DayRecord | null }) {
  const next = useNextDoseCountdown(today);

  if (!next) {
    return (
      <div className="rounded-2xl bg-emerald-500 p-5 text-white shadow-sm">
        <p className="text-sm font-medium opacity-90">오늘 남은 안약</p>
        <p className="mt-1 text-xl font-bold">오늘 안약을 모두 완료했습니다 🎉</p>
      </div>
    );
  }

  const med = MEDICATIONS[next.medId as keyof typeof MEDICATIONS];

  return (
    <div className="rounded-2xl bg-brand-600 p-5 text-white shadow-sm">
      <p className="text-sm font-medium opacity-90">다음 안약까지 남은 시간</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight">{next.label}</span>
        <span className="text-sm opacity-90">
          {med.name} · {next.scheduledTime}
        </span>
      </div>
    </div>
  );
}
