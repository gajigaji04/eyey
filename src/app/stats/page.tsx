'use client';

import AuthGate from '@/components/AuthGate';
import StatsPanel from '@/components/StatsPanel';

export default function StatsPage() {
  return (
    <AuthGate>
      <div className="flex-1 p-4">
        <h1 className="mb-4 text-xl font-bold text-slate-900">통계</h1>
        <StatsPanel />
      </div>
    </AuthGate>
  );
}
