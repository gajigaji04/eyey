'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ScheduleProvider } from '@/context/ScheduleContext';

/** PWA 서비스워커(오프라인 지원 + FCM 백그라운드 수신)를 앱 시작 시 한 번 등록한다. */
function useRegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
      console.error('[eyes-alarm] 서비스워커 등록 실패', err);
    });
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  useRegisterServiceWorker();
  return (
    <AuthProvider>
      <ScheduleProvider>{children}</ScheduleProvider>
    </AuthProvider>
  );
}
