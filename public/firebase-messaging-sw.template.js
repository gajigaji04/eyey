/* eslint-disable no-undef */
// 이 파일은 scripts/generate-sw.js 가 .env.local 값을 채워 넣어
// public/firebase-messaging-sw.js 로 자동 생성한다. 직접 수정하지 말고 이 템플릿을 수정할 것.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '__NEXT_PUBLIC_FIREBASE_API_KEY__',
  authDomain: '__NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN__',
  projectId: '__NEXT_PUBLIC_FIREBASE_PROJECT_ID__',
  storageBucket: '__NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__NEXT_PUBLIC_FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// 앱(탭)이 완전히 닫혀 있거나 백그라운드일 때 도착하는 푸시 메시지를 처리한다.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || '안약 알리미';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: (payload.data && payload.data.doseId) || 'eyes-alarm',
    data: payload.data || {},
  });
});

// 알림을 탭하면 앱을 열거나(이미 열려 있으면 포커스) 오늘 화면으로 이동시킨다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ---- 오프라인 지원을 위한 최소한의 캐싱 (앱 셸 캐시) ----
const CACHE_NAME = 'eyes-alarm-shell-v1';
const APP_SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네비게이션 요청은 네트워크 우선, 실패하면 캐시된 앱 셸로 대체한다 (오프라인에서도 화면은 뜨게).
// 그 외 GET 요청은 캐시 우선 + 네트워크 갱신(stale-while-revalidate) 전략을 쓴다.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((res) => res || caches.match(request)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
