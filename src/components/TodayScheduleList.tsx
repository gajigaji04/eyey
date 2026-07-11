'use client';

import { useSchedule } from '@/context/ScheduleContext';
import { useNextDoseCountdown } from '@/hooks/useCountdown';
import DoseCard from './DoseCard';

export default function TodayScheduleList() {
  const { today, completeDose, skipDose, undoDose } = useSchedule();
  const next = useNextDoseCountdown(today);

  if (!today) return null;

  const remaining = today.doses.filter((d) => d.status === 'pending');
  const finished = today.doses.filter((d) => d.status !== 'pending');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500">남은 안약 ({remaining.length})</h2>
        <div className="space-y-2">
          {remaining.length === 0 && (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400">남은 안약이 없어요.</p>
          )}
          {remaining.map((dose) => (
            <DoseCard
              key={dose.id}
              dose={dose}
              isNext={next?.doseId === dose.id}
              onComplete={() => completeDose(dose.id)}
              onSkip={() => skipDose(dose.id)}
              onUndo={() => undoDose(dose.id)}
            />
          ))}
        </div>
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">완료한 안약 ({finished.length})</h2>
          <div className="space-y-2">
            {finished.map((dose) => (
              <DoseCard
                key={dose.id}
                dose={dose}
                isNext={false}
                onComplete={() => completeDose(dose.id)}
                onSkip={() => skipDose(dose.id)}
                onUndo={() => undoDose(dose.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
