import React from 'react';
import { SavingsPageClient } from '@/components/savings/savings-page-client';

export const metadata = {
  title: 'Savings Goals & Milestones | PULSE',
  description: 'Plan savings goals, contribute from active accounts, and track milestone progress.',
};

export default function SavingsGoalsPage() {
  return <SavingsPageClient />;
}

