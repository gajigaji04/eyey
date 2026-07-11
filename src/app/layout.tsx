import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: '안약 알리미',
  description: '라식 수술 후 안약 점안 시간을 놓치지 않도록 도와주는 실시간 알림 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '안약 알리미',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2f7ff5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen safe-top">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-md flex-col pb-20">{children}</div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
