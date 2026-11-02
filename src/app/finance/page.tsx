import React from 'react';
import { FinancePageClient } from '@/components/finance/finance-page-client';

export const metadata = {
  title: 'Finance & Accounts | PULSE',
  description: 'Manage your financial accounts, atomic transfers, and account analytics.',
};

export default function FinancePage() {
  return <FinancePageClient />;
}

