import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { PennywiseProvider } from '@/context/pennywise-context';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pennywise — AI Personal Expense Tracker',
  description:
    'Mobile-only AI-powered personal finance, receipt scanning, expense analytics, savings goals, and account management.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F7F3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="font-sans antialiased selection:bg-[#DFFF52] selection:text-[#191B19]">
        <PennywiseProvider>{children}</PennywiseProvider>
      </body>
    </html>
  );
}

