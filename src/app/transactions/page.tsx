import React from 'react';
import { TransactionsPageClient } from '@/components/transactions/transactions-page-client';

export const metadata = {
  title: 'Transactions & Ledger | PULSE',
  description: 'Search, filter, categorize, automate recurring transactions, and export your ledger.',
};

export default function TransactionsPage() {
  return <TransactionsPageClient />;
}

