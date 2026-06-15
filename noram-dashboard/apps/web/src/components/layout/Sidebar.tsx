'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Executive Summary', href: '#executive-summary', icon: '📊' },
  { label: 'Financial Trends', href: '#financial-trends', icon: '📈' },
  { label: 'Frontbook & Pipeline', href: '#frontbook-pipeline', icon: '🔀' },
  { label: 'Backbook & Accounts', href: '#backbook-account', icon: '🏢' },
  { label: 'Leaderboards', href: '#leaderboards', icon: '🏆' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-800">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest">NORAM</p>
        <h1 className="text-lg font-bold text-white mt-0.5">Business Dashboard</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
