'use client';

import { usePathname } from 'next/navigation';
import { format } from 'date-fns';

const routeTitles: Record<string, string> = {
  '/':                 'Overview',
  '/financial-trends': 'Financial Trends',
  '/pipeline':         'Pipeline',
  '/backbook':         'Backbook Accounts',
  '/leaderboards':     'Leaderboards',
};

interface HeaderProps {
  /** Override the auto-detected route title */
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = title ?? routeTitles[pathname] ?? 'Dashboard';
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">{pageTitle}</h1>
        <p className="text-xs text-neutral-400">{today}</p>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notification bell placeholder */}
        <button
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* User avatar placeholder */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white select-none">
            U
          </div>
          <span className="text-sm font-medium text-neutral-700">NORAM User</span>
        </div>
      </div>
    </header>
  );
}
