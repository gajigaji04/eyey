'use client';

import { useEffect, useState } from 'react';
import { DayRecord } from '@/types';
import { timeToMinutes, formatDuration } from '@/lib/dateUtils';

export interface NextDoseInfo {
  doseId: string;
  medId: string;
  scheduledTime: string;
  msRemaining: number;
  label: string; // "1시간 23분" 형태
}

/** 오늘 일정 중 아직 완료되지 않은 다음 안약과, 그때까지 남은 시간을 1초마다 갱신해 반환한다. */
export function useNextDoseCountdown(today: DayRecord | null): NextDoseInfo | null {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!today) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const upcoming = today.doses
    .filter((d) => d.status === 'pending')
    .map((d) => ({ dose: d, minutes: timeToMinutes(d.scheduledTime) }))
    .filter((x) => x.minutes >= nowMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  const next = upcoming[0];
  if (!next) return null;

  const msRemaining = (next.minutes - nowMinutes) * 60_000;

  return {
    doseId: next.dose.id,
    medId: next.dose.medId,
    scheduledTime: next.dose.scheduledTime,
    msRemaining,
    label: formatDuration(msRemaining),
  };
}
