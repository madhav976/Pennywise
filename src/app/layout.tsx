import type { Metadata } from 'next';
import './globals.css';
import { PulseFinanceProvider } from '@/modules/finance/store/pulse-finance-context';

export const metadata: Metadata = {
  title: 'PULSE – Finance & Personal Tracker',
  description: 'Premium Unified Personal Finance and Life Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-text-primary antialiased selection:bg-accent-primary selection:text-background">
        <PulseFinanceProvider>{children}</PulseFinanceProvider>
      </body>
    </html>
  );
}

