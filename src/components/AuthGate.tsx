'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/** 로그인하지 않은 사용자는 /login으로 보낸다. 하위 페이지 전체를 감싸 인증 게이트 역할을 한다. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
