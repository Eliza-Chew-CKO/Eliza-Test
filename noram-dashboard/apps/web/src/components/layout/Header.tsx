'use client';

import { usePathname } from 'next/navigation';
import { formatShortDate } from '@/lib/utils';

const routeTitles: Record<string, string> = {
  '/': 'Overview',
  '/trends': 'Financial Trends',
  '/pipeline': 'Frontbook Pipeline',
  '/backbook': 'Backbook Accounts',
  '/leaderboards': 'Leaderboards',
};

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = title ?? routeTitles[pathname] ?? 'Dashboard';
  const today = formatShortDate(new Date());

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 shadow-sm">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">{pageTitle}</h1>
        <p className="text-xs text-neutral-400">As of {today}</p>
      </div>

      {/* Right-hand controls */}
      <div className="flex items-center gap-4">
        {/* Last refreshed indicator */}
        <span className="hidden text-xs text-neutral-400 sm:block">
          Data refreshed daily
        </span>

        {/* User avatar placeholder */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
            title="Logged-in user"
            aria-label="User avatar"
          >
            U
          </div>
        </div>
      </div>
    </header>
  );
}
