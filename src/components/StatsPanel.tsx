'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDayRecordsInRange, getRecentDayRecords } from '@/lib/firestore';
import { averageRate, calcStreak, summarizeDays } from '@/lib/stats';
import { addDays, todayKey } from '@/lib/dateUtils';
import { DailyStat } from '@/types';
import WeeklyBarChart from './WeeklyBarChart';

export default function StatsPanel() {
  const { user } = useAuth();
  const [weekStats, setWeekStats] = useState<DailyStat[]>([]);
  const [monthStats, setMonthStats] = useState<DailyStat[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = todayKey();

    getDayRecordsInRange(user.uid, addDays(today, -6), today).then((records) => {
      setWeekStats(summarizeDays(records));
    });

    getDayRecordsInRange(user.uid, addDays(today, -29), today).then((records) => {
      setMonthStats(summarizeDays(records));
    });

    getRecentDayRecords(user.uid, 90).then((records) => {
      setStreak(calcStreak(records));
    });
  }, [user]);

  const weekAvg = averageRate(weekStats);
  const monthAvg = averageRate(monthStats);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-3 gap-2 text-center">
        <StatTile label="연속 성공일" value={`${streak}일`} highlight />
        <StatTile label="주간 평균" value={`${weekAvg}%`} />
        <StatTile label="월간 평균" value={`${monthAvg}%`} />
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">최근 7일 완료율</h2>
        {weekStats.length === 0 ? (
          <p className="text-sm text-slate-400">아직 기록이 없어요.</p>
        ) : (
          <WeeklyBarChart stats={weekStats} />
        )}
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">최근 30일 요약</h2>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-lg font-bold text-slate-800">{monthStats.length}</p>
            <p className="text-xs text-slate-400">기록일</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-500">{monthStats.filter((s) => s.rate === 100).length}</p>
            <p className="text-xs text-slate-400">100% 달성일</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{monthAvg}%</p>
            <p className="text-xs text-slate-400">평균 완료율</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${highlight ? 'bg-brand-500 text-white' : 'bg-white text-slate-800'}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className={`text-xs ${highlight ? 'text-brand-100' : 'text-slate-400'}`}>{label}</p>
    </div>
  );
}
