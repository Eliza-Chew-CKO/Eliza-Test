import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NORAM Sales Dashboard',
  description:
    'Internal NORAM region sales dashboard — track revenue, pipeline, backbook health, VAMP metrics, and rep performance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          {/* Sidebar — fixed width, full height */}
          <Sidebar />

          {/* Main content area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top header bar */}
            <Header />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
