import React from 'react';
import { BudgetsPageClient } from '@/components/budgets/budgets-page-client';

export const metadata = {
  title: 'Budgets & Spending Limits | PULSE',
  description: 'Plan spending limits, track live expense utilization, and receive proactive threshold alerts.',
};

export default function BudgetsPage() {
  return <BudgetsPageClient />;
}

