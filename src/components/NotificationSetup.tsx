'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSchedule } from '@/context/ScheduleContext';
import { setNotificationsEnabled, saveFcmToken } from '@/lib/firestore';
import { registerAndGetFcmToken, requestNotificationPermission, listenForegroundMessages } from '@/lib/notifications';

/** 알림이 아직 꺼져 있을 때 상단에 뜨는 "알림 켜기" 배너. 권한 요청 + FCM 토큰 등록까지 한 번에 처리한다. */
export default function NotificationSetup() {
  const { user } = useAuth();
  const { settings, refresh } = useSchedule();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 포그라운드(앱이 열려 있는 동안) 도착하는 푸시는 별도로 로컬 알림으로 띄워준다.
    const unsubPromise = listenForegroundMessages();
    return () => {
      unsubPromise.then((unsub) => unsub && unsub());
    };
  }, []);

  if (!settings || settings.notificationsEnabled) return null;

  const enable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        alert('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.');
        return;
      }
      const token = await registerAndGetFcmToken();
      if (token) {
        await saveFcmToken(user.uid, token);
      }
      await setNotificationsEnabled(user.uid, true);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
      <span className="text-amber-800">알림을 켜면 안약 시간을 놓치지 않아요.</span>
      <button
        onClick={enable}
        disabled={busy}
        className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? '설정 중...' : '알림 켜기'}
      </button>
    </div>
  );
}
