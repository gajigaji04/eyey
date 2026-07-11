'use client';

import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingIfSupported } from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** 알림 권한을 요청한다. 이미 허용/거부된 경우 바로 그 값을 반환한다. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * FCM 토큰을 발급받는다.
 * - 반드시 firebase-messaging-sw.js 가 등록된 이후에 호출해야 한다.
 * - 사용자가 알림 권한을 허용한 뒤에만 의미 있는 토큰이 나온다.
 */
export async function registerAndGetFcmToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;
  if (!VAPID_KEY) {
    console.warn('[eyes-alarm] NEXT_PUBLIC_FIREBASE_VAPID_KEY 가 설정되지 않았습니다.');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (err) {
    console.error('[eyes-alarm] FCM 토큰 발급 실패', err);
    return null;
  }
}

/** 앱이 포그라운드(탭이 열려 있는 상태)일 때 도착한 푸시 메시지를 브라우저 알림으로 직접 띄운다. */
export async function listenForegroundMessages(onShow?: (title: string, body: string) => void) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? '안약 알리미';
    const body = payload.notification?.body ?? '';
    onShow?.(title, body);
    showLocalNotification(title, body);
  });
}

/** 브라우저 Notification API로 즉시 로컬 알림을 띄운다 (탭이 열려 있을 때의 즉각적인 피드백용). */
export function showLocalNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
    });
  } else {
    new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
  }
}
