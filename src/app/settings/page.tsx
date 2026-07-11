'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/context/AuthContext';
import { useSchedule } from '@/context/ScheduleContext';
import { UserSchedulePrefs } from '@/types';
import { MEDICATION_LIST } from '@/lib/medications';
import { setReminderMinutesBefore } from '@/lib/firestore';

function SettingsInner() {
  const { user, signOut } = useAuth();
  const { settings, updatePrefs, regenerateToday, refresh } = useSchedule();
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserSchedulePrefs | null>(settings?.prefs ?? null);
  const [saved, setSaved] = useState(false);

  if (!settings) return <div className="p-4 text-slate-400">불러오는 중...</div>;
  const currentPrefs = prefs ?? settings.prefs;

  const handleChange = (key: keyof UserSchedulePrefs, value: string) => {
    setSaved(false);
    setPrefs({ ...currentPrefs, [key]: value });
  };

  const handleSave = async () => {
    await updatePrefs(currentPrefs);
    setSaved(true);
  };

  const handleApplyToday = async () => {
    if (!confirm('오늘 이미 완료/건너뛴 기록이 사라지고 새 설정으로 오늘 일정이 다시 만들어집니다. 계속할까요?')) return;
    await updatePrefs(currentPrefs);
    await regenerateToday();
  };

  return (
    <div className="flex-1 space-y-6 p-4">
      <h1 className="text-xl font-bold text-slate-900">설정</h1>

      <section className="space-y-3 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-500">생활 패턴</h2>
        <TimeField label="기상" value={currentPrefs.wakeTime} onChange={(v) => handleChange('wakeTime', v)} />
        <TimeField label="점심" value={currentPrefs.lunchTime} onChange={(v) => handleChange('lunchTime', v)} />
        <TimeField label="저녁" value={currentPrefs.dinnerTime} onChange={(v) => handleChange('dinnerTime', v)} />
        <TimeField label="취침" value={currentPrefs.sleepTime} onChange={(v) => handleChange('sleepTime', v)} />

        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white">
            저장 (내일부터 적용)
          </button>
        </div>
        <button onClick={handleApplyToday} className="w-full rounded-xl border border-brand-500 py-2.5 text-sm font-semibold text-brand-600">
          오늘 일정에도 바로 적용하기
        </button>
        {saved && <p className="text-center text-xs text-emerald-500">저장되었습니다.</p>}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-500">알림</h2>
        <div className="flex items-center justify-between text-sm">
          <span>사전 알림 시간</span>
          <select
            value={settings.reminderMinutesBefore}
            onChange={async (e) => {
              if (!user) return;
              await setReminderMinutesBefore(user.uid, Number(e.target.value));
              await refresh();
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            {[0, 3, 5, 10, 15].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? '사용 안 함' : `${m}분 전`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400">
          알림이 꺼져 있다면 대시보드 상단의 &quot;알림 켜기&quot; 배너에서 켤 수 있어요.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-500">안약 색상 안내</h2>
        {MEDICATION_LIST.map((med) => (
          <div key={med.id} className="flex items-center gap-3 text-sm">
            <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: med.color }} />
            <span className="font-medium text-slate-700">{med.name}</span>
            <span className="text-xs text-slate-400">{med.shortDesc}</span>
          </div>
        ))}
      </section>

      <button
        onClick={async () => {
          await signOut();
          router.replace('/login');
        }}
        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm text-slate-500"
      >
        로그아웃
      </button>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
      />
    </label>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsInner />
    </AuthGate>
  );
}
