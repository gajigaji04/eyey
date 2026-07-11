'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';

// Firebase 콘솔 > 프로젝트 설정에서 발급받은 값을 .env.local 에 채워 넣는다.
// (README의 "Firebase 설정 방법" 참고)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.js는 "use client" 컴포넌트도 최초 HTML을 만들기 위해 서버(Node)에서 한 번 렌더링한다.
// 이 앱의 Firebase 사용은 전부 useEffect/이벤트 핸들러(브라우저에서만 실행)에서 이뤄지므로,
// 서버에서는 초기화 자체를 건너뛰어 아직 .env 값이 없거나 빌드 환경일 때도 크래시하지 않게 한다.
const isBrowser = typeof window !== 'undefined';

export const firebaseApp: FirebaseApp = isBrowser
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : (null as unknown as FirebaseApp);

export const auth: Auth = isBrowser ? getAuth(firebaseApp) : (null as unknown as Auth);
export const db: Firestore = isBrowser ? getFirestore(firebaseApp) : (null as unknown as Firestore);

/** 메시징은 브라우저 환경 + 지원 브라우저에서만 초기화할 수 있다 (SSR 중에는 호출하면 안 됨). */
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!isBrowser) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return getMessaging(firebaseApp);
}
