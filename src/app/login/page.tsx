'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, loading, signIn, signUp, continueAsGuest } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.replace('/');
    } catch (err: any) {
      setError(translateError(err?.code));
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setBusy(true);
    setError(null);
    try {
      await continueAsGuest();
      router.replace('/');
    } catch (err) {
      setError('게스트 로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-4xl">💧</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">안약 알리미</h1>
        <p className="mt-1 text-sm text-slate-500">라식 수술 후 안약 점안 시간을 놓치지 않도록</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {mode === 'signin' ? '로그인' : '회원가입'}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-3 text-center text-sm text-slate-500"
      >
        {mode === 'signin' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-300">
        <div className="h-px flex-1 bg-slate-200" />
        또는
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={handleGuest}
        disabled={busy}
        className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50"
      >
        게스트로 바로 시작하기
      </button>
    </div>
  );
}

function translateError(code?: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return '이미 가입된 이메일입니다.';
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.';
    case 'auth/weak-password':
      return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    default:
      return '오류가 발생했습니다. 다시 시도해주세요.';
  }
}
