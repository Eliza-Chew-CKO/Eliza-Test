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
    'Real-time visibility into North American sales performance, pipeline health, backbook accounts, and rep leaderboards.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-neutral-50 font-sans antialiased">
        <div className="flex h-screen overflow-hidden">
          {/* Fixed-width sidebar */}
          <Sidebar />

          {/* Main content column */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />

            {/* Scrollable page content */}
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
