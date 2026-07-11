'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { href: '/', label: '오늘', icon: '💧' },
  { href: '/calendar', label: '달력', icon: '📅' },
  { href: '/stats', label: '통계', icon: '📊' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
