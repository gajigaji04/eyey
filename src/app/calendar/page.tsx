'use client';

import AuthGate from '@/components/AuthGate';
import CalendarView from '@/components/CalendarView';

export default function CalendarPage() {
  return (
    <AuthGate>
      <div className="flex-1 p-4">
        <h1 className="mb-4 text-xl font-bold text-slate-900">달력</h1>
        <CalendarView />
      </div>
    </AuthGate>
  );
}
