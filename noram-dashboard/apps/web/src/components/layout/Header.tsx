'use client';

import { usePathname } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface HeaderProps {
  title?: string;
}

const PAGE_TITLES: Record<string, string> = {
  '/':             'Executive Overview',
  '/trends':       'Financial Trends',
  '/pipeline':     'Frontbook Pipeline',
  '/backbook':     'Backbook Accounts',
  '/leaderboards': 'Leaderboards',
};

export default function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = title ?? PAGE_TITLES[pathname] ?? 'NORAM Dashboard';
  const today = formatDate(new Date());

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">{pageTitle}</h1>
        <p className="text-xs text-neutral-500">{today}</p>
      </div>

      {/* Right side: date badge + user avatar */}
      <div className="flex items-center gap-4">
        {/* Reporting indicator */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-700">
          <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
          Live
        </span>

        {/* User avatar placeholder */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          aria-label="User menu"
        >
          U
        </button>
      </div>
    </header>
  );
}
