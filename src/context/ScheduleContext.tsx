'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { DayRecord, DoseEvent, UserSettings } from '@/types';
import {
  getOrCreateDayRecord,
  getOrCreateUserSettings,
  regenerateDayRecord,
  saveUserPrefs,
  updateDoseStatus,
} from '@/lib/firestore';
import { todayKey } from '@/lib/dateUtils';

interface ScheduleContextValue {
  settings: UserSettings | null;
  today: DayRecord | null;
  loading: boolean;
  refresh: () => Promise<void>;
  completeDose: (doseId: string) => Promise<void>;
  skipDose: (doseId: string) => Promise<void>;
  undoDose: (doseId: string) => Promise<void>;
  updatePrefs: (prefs: UserSettings['prefs']) => Promise<void>;
  regenerateToday: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [today, setToday] = useState<DayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDateKey, setCurrentDateKey] = useState(todayKey());

  const load = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setToday(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const s = await getOrCreateUserSettings(user.uid);
    const date = todayKey();
    const day = await getOrCreateDayRecord(user.uid, date, s.prefs);
    setSettings(s);
    setToday(day);
    setCurrentDateKey(date);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // 자정을 넘기면 날짜 키가 바뀌므로, 1분마다 확인해서 새 날짜가 되면 자동으로 오늘 일정을 새로 만든다.
  // (하루가 바뀌면 자동 초기화 요구사항)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const key = todayKey();
      if (key !== currentDateKey) {
        load();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, currentDateKey, load]);

  const applyStatus = useCallback(
    async (doseId: string, status: DoseEvent['status']) => {
      if (!user) return;
      const date = todayKey();
      const doses = await updateDoseStatus(user.uid, date, doseId, status);
      setToday((prev) => (prev ? { ...prev, doses } : prev));
    },
    [user]
  );

  const value: ScheduleContextValue = useMemo(
    () => ({
      settings,
      today,
      loading,
      refresh: load,
      completeDose: (doseId: string) => applyStatus(doseId, 'done'),
      skipDose: (doseId: string) => applyStatus(doseId, 'skipped'),
      undoDose: (doseId: string) => applyStatus(doseId, 'pending'),
      updatePrefs: async (prefs: UserSettings['prefs']) => {
        if (!user) return;
        await saveUserPrefs(user.uid, prefs);
        setSettings((prev) => (prev ? { ...prev, prefs } : prev));
        // 오늘 이미 생성된 일정은 그대로 두고, 새 설정은 내일부터 자동으로 적용된다.
        // 오늘 일정에도 즉시 반영하려면 regenerateToday()를 명시적으로 호출해야 한다(완료 기록이 초기화되므로).
      },
      regenerateToday: async () => {
        if (!user || !settings) return;
        const date = todayKey();
        const day = await regenerateDayRecord(user.uid, date, settings.prefs);
        setToday(day);
      },
    }),
    [settings, today, loading, applyStatus, load, user]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule은 ScheduleProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
