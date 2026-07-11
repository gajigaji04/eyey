'use client';

import AuthGate from '@/components/AuthGate';
import NextDoseTimer from '@/components/NextDoseTimer';
import NotificationSetup from '@/components/NotificationSetup';
import ProgressRing from '@/components/ProgressRing';
import TodayScheduleList from '@/components/TodayScheduleList';
import { useSchedule } from '@/context/ScheduleContext';
import { useNotificationScheduler } from '@/hooks/useNotificationScheduler';
import { summarizeDay } from '@/lib/stats';

function Dashboard() {
  const { today, settings, loading } = useSchedule();
  useNotificationScheduler(today, settings);

  if (loading || !today) {
    return <div className="flex flex-1 items-center justify-center text-slate-400">일정을 불러오는 중...</div>;
  }

  const stat = summarizeDay(today);

  return (
    <div className="flex-1 space-y-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-slate-400">
            {new Date(today.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="text-xl font-bold text-slate-900">오늘의 안약</h1>
        </div>
        <ProgressRing percent={stat.rate} sublabel="완료율" />
      </header>

      <NotificationSetup />
      <NextDoseTimer today={today} />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-3">
          <p className="text-lg font-bold text-slate-800">{stat.total}</p>
          <p className="text-xs text-slate-400">전체</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-lg font-bold text-emerald-500">{stat.done}</p>
          <p className="text-xs text-slate-400">완료</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-lg font-bold text-slate-400">{stat.total - stat.done - stat.skipped}</p>
          <p className="text-xs text-slate-400">남음</p>
        </div>
      </div>

      <TodayScheduleList />
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
