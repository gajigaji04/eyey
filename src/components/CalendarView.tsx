'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDayRecordsInRange } from '@/lib/firestore';
import { DayRecord } from '@/types';
import { summarizeDay } from '@/lib/stats';
import { todayKey } from '@/lib/dateUtils';
import DoseCard from './DoseCard';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function CalendarView() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(() => new Date());
  const [records, setRecords] = useState<Record<string, DayRecord>>({});
  const [selectedKey, setSelectedKey] = useState<string>(todayKey());

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0-based

  useEffect(() => {
    if (!user) return;
    const start = toKey(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = toKey(year, month, lastDay);
    getDayRecordsInRange(user.uid, start, end).then((list) => {
      const map: Record<string, DayRecord> = {};
      list.forEach((r) => (map[r.date] = r));
      setRecords(map);
    });
  }, [user, year, month]);

  const cells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push({ key: toKey(year, month, d), day: d });
    return arr;
  }, [year, month]);

  const selectedRecord = records[selectedKey];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-2 py-1 text-slate-400">
          ‹
        </button>
        <h2 className="font-semibold text-slate-800">
          {year}년 {month + 1}월
        </h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-2 py-1 text-slate-400">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const record = records[cell.key];
          const stat = record ? summarizeDay(record) : null;
          const isSelected = cell.key === selectedKey;
          const isToday = cell.key === todayKey();

          return (
            <button
              key={cell.key}
              onClick={() => setSelectedKey(cell.key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${
                isSelected ? 'bg-brand-500 text-white' : isToday ? 'bg-brand-50 text-brand-600' : 'text-slate-700'
              }`}
            >
              <span>{cell.day}</span>
              {stat && stat.total > 0 && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                    stat.rate === 100 ? 'bg-emerald-400' : stat.rate > 0 ? 'bg-amber-400' : 'bg-slate-300'
                  } ${isSelected ? 'opacity-90' : ''}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-500">{selectedKey}</h3>
        {!selectedRecord && <p className="text-sm text-slate-400">이 날짜의 기록이 없습니다.</p>}
        {selectedRecord && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              완료 {summarizeDay(selectedRecord).done} / 전체 {summarizeDay(selectedRecord).total} · 완료율{' '}
              {summarizeDay(selectedRecord).rate}%
            </p>
            {selectedRecord.doses.map((dose) => (
              <DoseCard key={dose.id} dose={dose} isNext={false} readOnly onComplete={() => {}} onSkip={() => {}} onUndo={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
