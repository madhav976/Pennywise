'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Money } from '@/lib/money';
import { calculateNextExecutionDate } from '@/lib/dates';
import { AccountService } from '@/modules/finance/services/account-service';
import { BudgetService } from '@/modules/finance/services/budget-service';
import { SavingsService } from '@/modules/finance/services/savings-service';
import {
  createAccountAction,
  deleteAccountAction,
  updateAccountAction,
} from '@/app/actions/finance/account-actions';
import {
  createTransactionAction,
  createTransferAction,
  deleteTransactionAction,
  deleteTransferAction,
  updateTransactionAction,
} from '@/app/actions/finance/transaction-actions';
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from '@/app/actions/finance/category-actions';
import {
  createRecurringAction,
  toggleRecurringActiveAction,
} from '@/app/actions/finance/recurring-actions';
import {
  createBudgetAction,
  deleteBudgetAction,
  updateBudgetAction,
} from '@/app/actions/finance/budget-actions';
import {
  contributeToGoalAction,
  createSavingsGoalAction,
  deleteSavingsGoalAction,
  updateSavingsGoalAction,
} from '@/app/actions/finance/savings-actions';
import {
  AccountDTO,
  BudgetDTO,
  CategoryDTO,
  FinancialSummaryDTO,
  RecurringTransactionDTO,
  SavingsContributionDTO,
  SavingsGoalDTO,
  TransactionDTO,
} from '@/types/finance';
import {
  AccountType,
  BudgetPeriod,
  CategoryType,
  PaymentMethod,
  RecurringFrequency,
} from '@/types/database';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = 'pulse_finance_ledger_v1';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function endOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function daysAgoDate(days: number): string {
  return daysAgoIso(days).slice(0, 10);
}

export const DEFAULT_SYSTEM_CATEGORIES: CategoryDTO[] = [
  // Expense Categories (Part 6.E)
  { id: 'cat-exp-food', userId: null, name: 'Food & Dining', categoryType: 'expense', icon: 'utensils', color: '#A99BFF', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-shopping', userId: null, name: 'Shopping', categoryType: 'expense', icon: 'shopping-bag', color: '#F17D8B', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-transport', userId: null, name: 'Transportation', categoryType: 'expense', icon: 'car', color: '#65D6A1', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-entertainment', userId: null, name: 'Entertainment', categoryType: 'expense', icon: 'film', color: '#8A7CF5', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-education', userId: null, name: 'Education', categoryType: 'expense', icon: 'graduation-cap', color: '#38BDF8', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-health', userId: null, name: 'Healthcare', categoryType: 'expense', icon: 'heart-pulse', color: '#F472B6', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-bills', userId: null, name: 'Bills & Utilities', categoryType: 'expense', icon: 'zap', color: '#FBBF24', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-housing', userId: null, name: 'Housing', categoryType: 'expense', icon: 'home', color: '#60A5FA', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-travel', userId: null, name: 'Travel', categoryType: 'expense', icon: 'plane', color: '#34D399', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-personal', userId: null, name: 'Personal Care', categoryType: 'expense', icon: 'sparkles', color: '#C084FC', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-exp-other', userId: null, name: 'Other', categoryType: 'expense', icon: 'more-horizontal', color: '#A09BAE', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  // Income Categories (Part 6.E)
  { id: 'cat-inc-salary', userId: null, name: 'Salary', categoryType: 'income', icon: 'briefcase', color: '#65D6A1', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-inc-freelance', userId: null, name: 'Freelance', categoryType: 'income', icon: 'laptop', color: '#A99BFF', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-inc-business', userId: null, name: 'Business', categoryType: 'income', icon: 'trending-up', color: '#38BDF8', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-inc-investments', userId: null, name: 'Investments', categoryType: 'income', icon: 'pie-chart', color: '#FBBF24', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-inc-gifts', userId: null, name: 'Gifts', categoryType: 'income', icon: 'gift', color: '#F472B6', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'cat-inc-other', userId: null, name: 'Other', categoryType: 'income', icon: 'plus-circle', color: '#A09BAE', isSystem: true, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
];

function createDefaultAccounts(): AccountDTO[] {
  return [
    {
      id: 'acc-kbank-checking',
      userId: 'local-user',
      accountName: 'K Bank Primary Checking',
      accountType: 'checking',
      institutionName: 'K Bank',
      currency: 'USD',
      openingBalance: '14200.0000',
      currentBalance: '16455.1200',
      creditLimit: null,
      availableCredit: null,
      description: 'Primary checking account for salary deposits and everyday expenses',
      color: '#A99BFF',
      icon: 'landmark',
      isActive: true,
      createdAt: daysAgoIso(60),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'acc-pulse-savings',
      userId: 'local-user',
      accountName: 'High-Yield Vault Savings',
      accountType: 'savings',
      institutionName: 'PULSE Reserve',
      currency: 'USD',
      openingBalance: '6000.0000',
      currentBalance: '6850.0000',
      creditLimit: null,
      availableCredit: null,
      description: 'Dedicated high-yield reserve account',
      color: '#65D6A1',
      icon: 'piggy-bank',
      isActive: true,
      createdAt: daysAgoIso(55),
      updatedAt: daysAgoIso(2),
    },
    {
      id: 'acc-cash-wallet',
      userId: 'local-user',
      accountName: 'Digital Cash Wallet',
      accountType: 'digital_wallet',
      institutionName: 'Apple Pay / Pulse Pay',
      currency: 'USD',
      openingBalance: '850.0000',
      currentBalance: '787.8800',
      creditLimit: null,
      availableCredit: null,
      description: 'Instant tap-to-pay digital wallet',
      color: '#8A7CF5',
      icon: 'wallet',
      isActive: true,
      createdAt: daysAgoIso(45),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'acc-platinum-card',
      userId: 'local-user',
      accountName: 'K Bank Platinum Card',
      accountType: 'credit_card',
      institutionName: 'K Bank',
      currency: 'USD',
      openingBalance: '0.0000',
      currentBalance: '576.7600',
      creditLimit: '10000.0000',
      availableCredit: '9423.2400',
      description: 'Rewards credit card with 10,000 USD credit limit',
      color: '#F17D8B',
      icon: 'credit-card',
      isActive: true,
      createdAt: daysAgoIso(40),
      updatedAt: daysAgoIso(1),
    },
  ];
}

function createDefaultTransactions(): TransactionDTO[] {
  return [
    {
      id: 'tx-seed-1',
      userId: 'local-user',
      accountId: 'acc-kbank-checking',
      accountName: 'K Bank Primary Checking',
      categoryId: 'cat-inc-salary',
      categoryName: 'Salary',
      transactionType: 'income',
      amount: '5800.0000',
      currency: 'USD',
      description: 'Monthly Executive Salary Deposit',
      merchantName: 'Acme FinTech Corp',
      paymentMethod: 'bank_transfer',
      transactionDate: daysAgoDate(9),
      notes: 'Base payroll deposit',
      referenceNumber: '#SAL01',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(9),
      updatedAt: daysAgoIso(9),
      deletedAt: null,
    },
    {
      id: 'tx-seed-2',
      userId: 'local-user',
      accountId: 'acc-kbank-checking',
      accountName: 'K Bank Primary Checking',
      categoryId: 'cat-inc-freelance',
      categoryName: 'Freelance',
      transactionType: 'income',
      amount: '2493.0000',
      currency: 'USD',
      description: 'UI Architecture Retainer',
      merchantName: 'Stripe Payout',
      paymentMethod: 'bank_transfer',
      transactionDate: daysAgoDate(5),
      notes: 'Q4 Design Systems Milestone',
      referenceNumber: '#INV94',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(5),
      updatedAt: daysAgoIso(5),
      deletedAt: null,
    },
    {
      id: 'tx-seed-3',
      userId: 'local-user',
      accountId: 'acc-cash-wallet',
      accountName: 'Digital Cash Wallet',
      categoryId: 'cat-exp-food',
      categoryName: 'Food & Dining',
      transactionType: 'expense',
      amount: '30.4400',
      currency: 'USD',
      description: 'Artisan Roast & Breakfast',
      merchantName: 'Starbucks',
      paymentMethod: 'digital_wallet',
      transactionDate: daysAgoDate(1),
      notes: 'Morning coffee',
      referenceNumber: '#73246',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(1),
      updatedAt: daysAgoIso(1),
      deletedAt: null,
    },
    {
      id: 'tx-seed-4',
      userId: 'local-user',
      accountId: 'acc-platinum-card',
      accountName: 'K Bank Platinum Card',
      categoryId: 'cat-exp-shopping',
      categoryName: 'Shopping',
      transactionType: 'expense',
      amount: '196.9800',
      currency: 'USD',
      description: 'Weekly Household & Groceries',
      merchantName: 'Walmart',
      paymentMethod: 'credit_card',
      transactionDate: daysAgoDate(2),
      notes: 'Pantry & home supplies',
      referenceNumber: '#73557',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(2),
      updatedAt: daysAgoIso(2),
      deletedAt: null,
    },
    {
      id: 'tx-seed-5',
      userId: 'local-user',
      accountId: 'acc-platinum-card',
      accountName: 'K Bank Platinum Card',
      categoryId: 'cat-exp-shopping',
      categoryName: 'Shopping',
      transactionType: 'expense',
      amount: '79.5800',
      currency: 'USD',
      description: 'Autumn Capsule Wardrobe',
      merchantName: 'Zara',
      paymentMethod: 'credit_card',
      transactionDate: daysAgoDate(3),
      notes: null,
      referenceNumber: '#95337',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(3),
      updatedAt: daysAgoIso(3),
      deletedAt: null,
    },
    {
      id: 'tx-seed-6',
      userId: 'local-user',
      accountId: 'acc-platinum-card',
      accountName: 'K Bank Platinum Card',
      categoryId: 'cat-exp-bills',
      categoryName: 'Bills & Utilities',
      transactionType: 'expense',
      amount: '234.2500',
      currency: 'USD',
      description: 'Smart Home & Fiber Utility Bundle',
      merchantName: 'Walmart',
      paymentMethod: 'credit_card',
      transactionDate: daysAgoDate(4),
      notes: 'Monthly utilities',
      referenceNumber: '#76295',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(4),
      updatedAt: daysAgoIso(4),
      deletedAt: null,
    },
    {
      id: 'tx-seed-7',
      userId: 'local-user',
      accountId: 'acc-kbank-checking',
      accountName: 'K Bank Primary Checking',
      categoryId: 'cat-exp-transport',
      categoryName: 'Transportation',
      transactionType: 'expense',
      amount: '51.0200',
      currency: 'USD',
      description: 'Airport Express & Ride Share',
      merchantName: 'Robert Fox',
      paymentMethod: 'debit_card',
      transactionDate: daysAgoDate(6),
      notes: null,
      referenceNumber: '#65336',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(6),
      updatedAt: daysAgoIso(6),
      deletedAt: null,
    },
    {
      id: 'tx-seed-8',
      userId: 'local-user',
      accountId: 'acc-platinum-card',
      accountName: 'K Bank Platinum Card',
      categoryId: 'cat-exp-entertainment',
      categoryName: 'Entertainment',
      transactionType: 'expense',
      amount: '65.9500',
      currency: 'USD',
      description: 'Digital Accessories & Media',
      merchantName: 'eBay',
      paymentMethod: 'credit_card',
      transactionDate: daysAgoDate(7),
      notes: null,
      referenceNumber: '#76355',
      transferPairId: null,
      transferRole: null,
      recurringTransactionId: null,
      createdAt: daysAgoIso(7),
      updatedAt: daysAgoIso(7),
      deletedAt: null,
    },
  ];
}

interface StoredBudgetSeed {
  id: string;
  userId: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  amount: string;
  currency: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive: boolean;
  alertThresholdsTriggered: number[];
  createdAt: string;
  updatedAt: string;
}

function createDefaultBudgetSeeds(): StoredBudgetSeed[] {
  const start = startOfCurrentMonthIso();
  const end = endOfCurrentMonthIso();
  return [
    {
      id: 'bgt-overall',
      userId: 'local-user',
      name: 'Monthly Total Spending Cap',
      categoryId: null,
      categoryName: 'Overall Spending',
      amount: '2500.0000',
      currency: 'USD',
      period: 'monthly',
      startDate: start,
      endDate: end,
      description: 'Master monthly expenditure ceiling across all expense categories',
      isActive: true,
      alertThresholdsTriggered: [],
      createdAt: daysAgoIso(25),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'bgt-shopping',
      userId: 'local-user',
      name: 'Shopping & Retail Budget',
      categoryId: 'cat-exp-shopping',
      categoryName: 'Shopping',
      amount: '300.0000',
      currency: 'USD',
      period: 'monthly',
      startDate: start,
      endDate: end,
      description: 'Apparel, retail, and household goods limit',
      isActive: true,
      alertThresholdsTriggered: [50, 80],
      createdAt: daysAgoIso(25),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'bgt-bills',
      userId: 'local-user',
      name: 'Bills & Smart Utilities',
      categoryId: 'cat-exp-bills',
      categoryName: 'Bills & Utilities',
      amount: '350.0000',
      currency: 'USD',
      period: 'monthly',
      startDate: start,
      endDate: end,
      description: 'Electricity, fiber internet, and recurring household bills',
      isActive: true,
      alertThresholdsTriggered: [50],
      createdAt: daysAgoIso(25),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'bgt-food',
      userId: 'local-user',
      name: 'Dining & Coffee',
      categoryId: 'cat-exp-food',
      categoryName: 'Food & Dining',
      amount: '400.0000',
      currency: 'USD',
      period: 'monthly',
      startDate: start,
      endDate: end,
      description: 'Restaurants, cafes, and takeaway meals',
      isActive: true,
      alertThresholdsTriggered: [],
      createdAt: daysAgoIso(25),
      updatedAt: daysAgoIso(1),
    },
  ];
}

function createDefaultSavingsGoals(): SavingsGoalDTO[] {
  const now = new Date();
  const inMonths = (m: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + m, 15));
    return d.toISOString().slice(0, 10);
  };

  const rawGoals = [
    {
      id: 'goal-emergency',
      userId: 'local-user',
      name: '6-Month Emergency Reserve',
      category: 'Emergency Fund',
      targetAmount: '15000.0000',
      initialAmount: '6000.0000',
      currentAmount: '9750.0000',
      currency: 'USD',
      targetDate: inMonths(6),
      description: 'Liquid safety net covering 6 months of core living expenses',
      icon: 'shield',
      color: '#A99BFF',
      status: 'active' as const,
      completedAt: null,
      contributions: [
        {
          id: 'contrib-1',
          goalId: 'goal-emergency',
          userId: 'local-user',
          sourceAccountId: 'acc-kbank-checking',
          sourceAccountName: 'K Bank Primary Checking',
          transactionId: null,
          amount: '2000.0000',
          currency: 'USD',
          contributionDate: daysAgoIso(20),
          notes: 'Monthly reserve allocation',
          createdAt: daysAgoIso(20),
        },
        {
          id: 'contrib-2',
          goalId: 'goal-emergency',
          userId: 'local-user',
          sourceAccountId: 'acc-pulse-savings',
          sourceAccountName: 'High-Yield Vault Savings',
          transactionId: null,
          amount: '1750.0000',
          currency: 'USD',
          contributionDate: daysAgoIso(5),
          notes: 'Bonus sweep contribution',
          createdAt: daysAgoIso(5),
        },
      ],
      createdAt: daysAgoIso(60),
      updatedAt: daysAgoIso(5),
    },
    {
      id: 'goal-travel',
      userId: 'local-user',
      name: 'Kyoto & Tokyo Autumn Retreat',
      category: 'Travel',
      targetAmount: '5500.0000',
      initialAmount: '1200.0000',
      currentAmount: '3850.0000',
      currency: 'USD',
      targetDate: inMonths(4),
      description: 'Flights, ryokan stays, and rail pass for Japan itinerary',
      icon: 'plane',
      color: '#65D6A1',
      status: 'active' as const,
      completedAt: null,
      contributions: [
        {
          id: 'contrib-3',
          goalId: 'goal-travel',
          userId: 'local-user',
          sourceAccountId: 'acc-kbank-checking',
          sourceAccountName: 'K Bank Primary Checking',
          transactionId: null,
          amount: '2650.0000',
          currency: 'USD',
          contributionDate: daysAgoIso(12),
          notes: 'Flight & hotel deposit fund',
          createdAt: daysAgoIso(12),
        },
      ],
      createdAt: daysAgoIso(45),
      updatedAt: daysAgoIso(12),
    },
    {
      id: 'goal-macbook',
      userId: 'local-user',
      name: 'Workstation & Studio Display',
      category: 'Electronics',
      targetAmount: '3200.0000',
      initialAmount: '1500.0000',
      currentAmount: '3200.0000',
      currency: 'USD',
      targetDate: inMonths(1),
      description: 'Upgraded M4 Max workstation hardware',
      icon: 'laptop',
      color: '#8A7CF5',
      status: 'completed' as const,
      completedAt: daysAgoIso(3),
      contributions: [
        {
          id: 'contrib-4',
          goalId: 'goal-macbook',
          userId: 'local-user',
          sourceAccountId: 'acc-kbank-checking',
          sourceAccountName: 'K Bank Primary Checking',
          transactionId: null,
          amount: '1700.0000',
          currency: 'USD',
          contributionDate: daysAgoIso(3),
          notes: 'Final milestone reached',
          createdAt: daysAgoIso(3),
        },
      ],
      createdAt: daysAgoIso(50),
      updatedAt: daysAgoIso(3),
    },
  ];

  return rawGoals.map((g) => {
    const metrics = SavingsService.computeGoalMetrics({
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate,
      status: g.status,
    });
    return {
      ...g,
      remainingAmount: metrics.remainingAmount,
      progressPercentage: metrics.progressPercentage,
      daysRemaining: metrics.daysRemaining,
      estimatedMonthlyRequired: metrics.estimatedMonthlyRequired,
    };
  });
}

function createDefaultRecurring(): RecurringTransactionDTO[] {
  const nextMonth = new Date();
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
  return [
    {
      id: 'rec-salary',
      userId: 'local-user',
      accountId: 'acc-kbank-checking',
      categoryId: 'cat-inc-salary',
      transactionType: 'income',
      targetAccountId: null,
      amount: '5800.0000',
      currency: 'USD',
      description: 'Monthly Executive Salary Deposit',
      merchantName: 'Acme FinTech Corp',
      paymentMethod: 'bank_transfer',
      frequency: 'monthly',
      intervalCount: 1,
      startDate: '2026-01-01',
      endDate: null,
      nextExecutionDate: nextMonth.toISOString().slice(0, 10),
      lastExecutedAt: daysAgoIso(9),
      isActive: true,
      createdAt: daysAgoIso(60),
      updatedAt: daysAgoIso(9),
    },
    {
      id: 'rec-fiber',
      userId: 'local-user',
      accountId: 'acc-platinum-card',
      categoryId: 'cat-exp-bills',
      transactionType: 'expense',
      targetAccountId: null,
      amount: '115.0000',
      currency: 'USD',
      description: 'Gigabit Fiber & Cloud Suite',
      merchantName: 'Verizon / AWS',
      paymentMethod: 'credit_card',
      frequency: 'monthly',
      intervalCount: 1,
      startDate: '2026-01-15',
      endDate: null,
      nextExecutionDate: todayIsoDate(),
      lastExecutedAt: null,
      isActive: true,
      createdAt: daysAgoIso(45),
      updatedAt: daysAgoIso(15),
    },
  ];
}

export interface CreateAccountFormPayload {
  accountName: string;
  accountType: AccountType;
  institutionName?: string;
  currency: string;
  openingBalance: string;
  creditLimit?: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateAccountFormPayload extends Partial<CreateAccountFormPayload> {
  accountId: string;
  isActive?: boolean;
}

export interface CreateTransferFormPayload {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  description: string;
  transactionDate: string;
  notes?: string;
}

export interface CreateTransactionFormPayload {
  transactionType: 'income' | 'expense';
  accountId: string;
  categoryId: string;
  amount: string;
  description: string;
  merchantName?: string;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  notes?: string;
  referenceNumber?: string;
}

export interface UpdateTransactionFormPayload {
  transactionId: string;
  accountId?: string;
  categoryId?: string;
  amount?: string;
  description?: string;
  merchantName?: string;
  paymentMethod?: PaymentMethod;
  transactionDate?: string;
  notes?: string;
}

export interface CreateBudgetFormPayload {
  name: string;
  categoryId: string | null;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface UpdateBudgetFormPayload extends Partial<CreateBudgetFormPayload> {
  budgetId: string;
  isActive?: boolean;
}

export interface CreateGoalFormPayload {
  name: string;
  category: string;
  targetAmount: string;
  initialAmount: string;
  targetDate: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalFormPayload extends Partial<CreateGoalFormPayload> {
  goalId: string;
  status?: SavingsGoalDTO['status'];
}

export interface ContributeGoalFormPayload {
  goalId: string;
  sourceAccountId: string;
  amount: string;
  contributionDate: string;
  notes?: string;
}

export interface CreateRecurringFormPayload {
  transactionType: 'income' | 'expense';
  accountId: string;
  categoryId: string;
  amount: string;
  description: string;
  merchantName?: string;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string | null;
}

interface PulseFinanceContextValue {
  accounts: AccountDTO[];
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  budgets: BudgetDTO[];
  savingsGoals: SavingsGoalDTO[];
  recurringTransactions: RecurringTransactionDTO[];
  summary: FinancialSummaryDTO;
  notifications: InAppNotification[];
  userName: string;
  userEmail: string;
  userAvatarUrl?: string;
  currency: string;
  currencySymbol: string;
  setCurrency: (currency: string) => void;
  formatMoney: (value: number | string) => string;
  dismissNotification: (id: string) => void;
  // Account Actions
  createAccount: (payload: CreateAccountFormPayload) => Promise<{ ok: boolean; message: string }>;
  updateAccount: (payload: UpdateAccountFormPayload) => Promise<{ ok: boolean; message: string }>;
  deleteAccount: (accountId: string) => Promise<{ ok: boolean; message: string }>;
  // Transfer Action
  createTransfer: (payload: CreateTransferFormPayload) => Promise<{ ok: boolean; message: string }>;
  // Transaction Actions
  createTransaction: (payload: CreateTransactionFormPayload) => Promise<{ ok: boolean; message: string }>;
  updateTransaction: (payload: UpdateTransactionFormPayload) => Promise<{ ok: boolean; message: string }>;
  deleteTransaction: (transactionId: string) => Promise<{ ok: boolean; message: string }>;
  duplicateTransaction: (transactionId: string) => Promise<{ ok: boolean; message: string }>;
  // Category Actions
  createCategory: (name: string, type: CategoryType, color?: string) => Promise<{ ok: boolean; message: string }>;
  updateCategory: (categoryId: string, name: string, color?: string) => Promise<{ ok: boolean; message: string }>;
  deleteCategory: (categoryId: string) => Promise<{ ok: boolean; message: string }>;
  // Recurring Actions
  createRecurring: (payload: CreateRecurringFormPayload) => Promise<{ ok: boolean; message: string }>;
  toggleRecurring: (recurringId: string) => Promise<{ ok: boolean; message: string }>;
  cancelRecurring: (recurringId: string) => Promise<{ ok: boolean; message: string }>;
  executeRecurringNow: (recurringId: string) => Promise<{ ok: boolean; message: string }>;
  // Budget Actions
  createBudget: (payload: CreateBudgetFormPayload) => Promise<{ ok: boolean; message: string }>;
  updateBudget: (payload: UpdateBudgetFormPayload) => Promise<{ ok: boolean; message: string }>;
  deleteBudget: (budgetId: string) => Promise<{ ok: boolean; message: string }>;
  duplicateBudget: (budgetId: string) => Promise<{ ok: boolean; message: string }>;
  // Savings Goal Actions
  createGoal: (payload: CreateGoalFormPayload) => Promise<{ ok: boolean; message: string }>;
  updateGoal: (payload: UpdateGoalFormPayload) => Promise<{ ok: boolean; message: string }>;
  deleteGoal: (goalId: string) => Promise<{ ok: boolean; message: string }>;
  contributeToGoal: (payload: ContributeGoalFormPayload) => Promise<{ ok: boolean; message: string }>;
}

const PulseFinanceContext = createContext<PulseFinanceContextValue | null>(null);

export interface PulseFinanceProviderProps {
  children: React.ReactNode;
  initialAccounts?: AccountDTO[];
  initialTransactions?: TransactionDTO[];
  initialCategories?: CategoryDTO[];
  initialBudgets?: BudgetDTO[];
  initialGoals?: SavingsGoalDTO[];
  initialRecurring?: RecurringTransactionDTO[];
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  userCurrency?: string;
}

export function PulseFinanceProvider({
  children,
  initialAccounts = [],
  initialTransactions = [],
  initialCategories = [],
  initialBudgets = [],
  initialGoals = [],
  initialRecurring = [],
  userName = 'Jason Jones',
  userEmail = 'jason.jones@pulse.app',
  userAvatarUrl,
  userCurrency = 'USD',
}: PulseFinanceProviderProps) {
  const [accounts, setAccounts] = useState<AccountDTO[]>(() =>
    initialAccounts.length > 0 ? initialAccounts : createDefaultAccounts()
  );
  const [transactions, setTransactions] = useState<TransactionDTO[]>(() =>
    initialTransactions.length > 0 ? initialTransactions : createDefaultTransactions()
  );
  const [categories, setCategories] = useState<CategoryDTO[]>(() =>
    initialCategories.length > 0 ? initialCategories : DEFAULT_SYSTEM_CATEGORIES
  );
  const [budgetSeeds, setBudgetSeeds] = useState<StoredBudgetSeed[]>(() =>
    initialBudgets.length > 0
      ? initialBudgets.map((b) => ({
          id: b.id,
          userId: b.userId,
          name: b.name,
          categoryId: b.categoryId,
          categoryName: b.categoryName,
          amount: b.amount,
          currency: b.currency,
          period: b.period,
          startDate: b.startDate,
          endDate: b.endDate,
          description: b.description,
          isActive: b.isActive,
          alertThresholdsTriggered: b.alertThresholdsTriggered,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }))
      : createDefaultBudgetSeeds()
  );
  const [rawGoals, setRawGoals] = useState<SavingsGoalDTO[]>(() =>
    initialGoals.length > 0 ? initialGoals : createDefaultSavingsGoals()
  );
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransactionDTO[]
  >(() =>
    initialRecurring.length > 0 ? initialRecurring : createDefaultRecurring()
  );
  const [currency, setCurrency] = useState<string>(userCurrency || 'USD');
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage when running in local/preview mode
  useEffect(() => {
    if (
      initialAccounts.length === 0 &&
      initialTransactions.length === 0 &&
      typeof window !== 'undefined'
    ) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
            setAccounts(parsed.accounts);
          }
          if (Array.isArray(parsed.transactions)) {
            setTransactions(parsed.transactions);
          }
          if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
            setCategories(parsed.categories);
          }
          if (Array.isArray(parsed.budgetSeeds)) {
            setBudgetSeeds(parsed.budgetSeeds);
          }
          if (Array.isArray(parsed.rawGoals)) {
            setRawGoals(parsed.rawGoals);
          }
          if (Array.isArray(parsed.recurringTransactions)) {
            setRecurringTransactions(parsed.recurringTransactions);
          }
          if (typeof parsed.currency === 'string') {
            setCurrency(parsed.currency);
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    setHydrated(true);
  }, [initialAccounts.length, initialTransactions.length]);

  // Persist to localStorage on state changes
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accounts,
          transactions,
          categories,
          budgetSeeds,
          rawGoals,
          recurringTransactions,
          currency,
        })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [
    hydrated,
    accounts,
    transactions,
    categories,
    budgetSeeds,
    rawGoals,
    recurringTransactions,
    currency,
  ]);

  const pushNotification = useCallback(
    (
      title: string,
      message: string,
      severity: InAppNotification['severity'] = 'info'
    ) => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          message,
          severity,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...prev.slice(0, 14),
      ]);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const currencySymbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$';

  const formatMoney = useCallback(
    (value: number | string) => {
      const num = typeof value === 'number' ? value : Number(value) || 0;
      try {
        return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(num);
      } catch {
        return `${currencySymbol} ${num.toFixed(2)}`;
      }
    },
    [currency, currencySymbol]
  );

  // Active non-deleted transactions enriched with accountName and categoryName
  const activeTransactions = useMemo(() => {
    const accountMap = new Map(accounts.map((a) => [a.id, a.accountName]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return transactions
      .filter((tx) => !tx.deletedAt)
      .map((tx) => ({
        ...tx,
        accountName: tx.accountName || accountMap.get(tx.accountId) || 'Account',
        categoryName:
          tx.transactionType === 'transfer'
            ? 'Internal Transfer'
            : tx.categoryName ||
              (tx.categoryId ? categoryMap.get(tx.categoryId) : undefined) ||
              'Uncategorized',
      }))
      .sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime()
      );
  }, [transactions, accounts, categories]);

  // Automatic Budget Expense Tracking (Part 4.D)
  const budgets = useMemo<BudgetDTO[]>(() => {
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    return budgetSeeds.map((seed) => {
      const resolvedCategoryName = seed.categoryId
        ? categoryMap.get(seed.categoryId) || seed.categoryName
        : 'Overall Spending';
      return BudgetService.computeBudgetUtilization(
        {
          ...seed,
          categoryName: resolvedCategoryName,
        },
        activeTransactions
      );
    });
  }, [budgetSeeds, activeTransactions, categories]);

  // Dynamic Savings Goals Metrics (Part 5)
  const savingsGoals = useMemo<SavingsGoalDTO[]>(() => {
    return rawGoals.map((goal) => {
      const metrics = SavingsService.computeGoalMetrics({
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        status: goal.status,
      });
      return {
        ...goal,
        remainingAmount: metrics.remainingAmount,
        progressPercentage: metrics.progressPercentage,
        daysRemaining: metrics.daysRemaining,
        estimatedMonthlyRequired: metrics.estimatedMonthlyRequired,
      };
    });
  }, [rawGoals]);

  // Live Financial Summary derived from the unified ledger (Part 7)
  const summary = useMemo<FinancialSummaryDTO>(() => {
    let totalIncome = Money.zero();
    let totalExpenses = Money.zero();

    const categoryTotals = new Map<string, { name: string; amount: Money }>();
    const paymentTotals = new Map<PaymentMethod, Money>();
    const dailyExpMap = new Map<string, Money>();
    const dailyCashMap = new Map<string, { income: Money; expense: Money }>();

    for (const tx of activeTransactions) {
      const dateKey = tx.transactionDate.slice(0, 10);
      const amt = Money.from(tx.amount);

      if (tx.transactionType === 'income') {
        totalIncome = totalIncome.add(amt);
        const dayEntry = dailyCashMap.get(dateKey) || {
          income: Money.zero(),
          expense: Money.zero(),
        };
        dayEntry.income = dayEntry.income.add(amt);
        dailyCashMap.set(dateKey, dayEntry);
      } else if (tx.transactionType === 'expense') {
        // Transfers are strictly excluded from income and expenses!
        totalExpenses = totalExpenses.add(amt);

        const dayEntry = dailyCashMap.get(dateKey) || {
          income: Money.zero(),
          expense: Money.zero(),
        };
        dayEntry.expense = dayEntry.expense.add(amt);
        dailyCashMap.set(dateKey, dayEntry);

        const prevDayExp = dailyExpMap.get(dateKey) || Money.zero();
        dailyExpMap.set(dateKey, prevDayExp.add(amt));

        const catKey = tx.categoryId || 'uncategorized';
        const catEntry = categoryTotals.get(catKey) || {
          name: tx.categoryName || 'Other',
          amount: Money.zero(),
        };
        catEntry.amount = catEntry.amount.add(amt);
        categoryTotals.set(catKey, catEntry);

        const pmEntry = paymentTotals.get(tx.paymentMethod) || Money.zero();
        paymentTotals.set(tx.paymentMethod, pmEntry.add(amt));
      }
    }

    let totalAssets = Money.zero();
    let totalLiabilities = Money.zero();

    for (const acc of accounts) {
      if (!acc.isActive) continue;
      const bal = Money.from(acc.currentBalance);
      if (AccountService.isLiability(acc.accountType)) {
        totalLiabilities = totalLiabilities.add(bal);
      } else {
        totalAssets = totalAssets.add(bal);
      }
    }

    const netCashFlow = totalIncome.subtract(totalExpenses);
    const netWorth = totalAssets.subtract(totalLiabilities);

    const categoryExpenditure = Array.from(categoryTotals.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        totalAmount: data.amount.toDbString(),
        percentage: totalExpenses.isPositive()
          ? Number(
              data.amount.divide(totalExpenses).multiply(100).toNumber().toFixed(2)
            )
          : 0,
      }))
      .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));

    const paymentMethodExpenditure = Array.from(paymentTotals.entries()).map(
      ([paymentMethod, amt]) => ({
        paymentMethod,
        totalAmount: amt.toDbString(),
        percentage: totalExpenses.isPositive()
          ? Number(amt.divide(totalExpenses).multiply(100).toNumber().toFixed(2))
          : 0,
      })
    );

    const dailyExpenditure = Array.from(dailyExpMap.entries())
      .map(([date, amt]) => ({
        date,
        totalAmount: amt.toDbString(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dailyCashFlow = Array.from(dailyCashMap.entries())
      .map(([date, data]) => ({
        date,
        totalIncome: data.income.toDbString(),
        totalExpenses: data.expense.toDbString(),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: 'this_month',
      startDate: startOfCurrentMonthIso(),
      endDate: endOfCurrentMonthIso(),
      totalIncome: totalIncome.toDbString(),
      totalExpenses: totalExpenses.toDbString(),
      netCashFlow: netCashFlow.toDbString(),
      totalAssets: totalAssets.toDbString(),
      totalLiabilities: totalLiabilities.toDbString(),
      netWorth: netWorth.toDbString(),
      categoryExpenditure,
      paymentMethodExpenditure,
      dailyExpenditure,
      dailyCashFlow,
    };
  }, [activeTransactions, accounts]);

  // Helper to evaluate and fire non-duplicated budget threshold notifications
  const checkBudgetThresholdAlerts = useCallback(
    (nextTransactions: TransactionDTO[]) => {
      setBudgetSeeds((prevSeeds) =>
        prevSeeds.map((seed) => {
          if (!seed.isActive) return seed;
          const computed = BudgetService.computeBudgetUtilization(
            seed,
            nextTransactions
          );
          const { updatedThresholds, newlyTriggered } =
            BudgetService.resolveTriggeredThresholds(
              computed.utilizationPercentage,
              seed.alertThresholdsTriggered
            );

          if (newlyTriggered.length > 0) {
            const highest = Math.max(...newlyTriggered);
            if (highest >= 100) {
              pushNotification(
                `Budget Exceeded: ${seed.name}`,
                `Spending has reached ${computed.utilizationPercentage.toFixed(0)}% of your allocated budget.`,
                'danger'
              );
            } else if (highest >= 80) {
              pushNotification(
                `Approaching Limit: ${seed.name}`,
                `You have used ${computed.utilizationPercentage.toFixed(0)}% of your ${seed.name} budget.`,
                'warning'
              );
            } else if (highest >= 50) {
              pushNotification(
                `Midpoint Reached: ${seed.name}`,
                `You have crossed 50% utilization (${computed.utilizationPercentage.toFixed(0)}%) on ${seed.name}.`,
                'info'
              );
            }
            return {
              ...seed,
              alertThresholdsTriggered: updatedThresholds,
            };
          }
          return seed;
        })
      );
    },
    [pushNotification]
  );

  // =========================================================================
  // ACCOUNT OPERATIONS
  // =========================================================================

  const createAccount = useCallback(
    async (payload: CreateAccountFormPayload) => {
      const name = payload.accountName.trim();
      if (!name) {
        return { ok: false, message: 'Account name is required.' };
      }
      if (
        accounts.some(
          (a) => a.accountName.toLowerCase() === name.toLowerCase()
        )
      ) {
        return {
          ok: false,
          message: 'An account with this name already exists.',
        };
      }

      const opening = Money.from(payload.openingBalance || '0').toDbString();
      const creditLimit = payload.creditLimit
        ? Money.from(payload.creditLimit).toDbString()
        : null;

      let availableCredit: string | null = null;
      if (payload.accountType === 'credit_card' && creditLimit) {
        availableCredit = Money.from(creditLimit)
          .subtract(Money.from(opening))
          .toDbString();
      }

      const newAcc: AccountDTO = {
        id: `acc-${Date.now()}`,
        userId: 'local-user',
        accountName: name,
        accountType: payload.accountType,
        institutionName: payload.institutionName?.trim() || null,
        currency: payload.currency || currency,
        openingBalance: opening,
        currentBalance: opening,
        creditLimit,
        availableCredit,
        description: payload.description?.trim() || null,
        color: payload.color || '#A99BFF',
        icon: payload.icon || 'credit-card',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAccounts((prev) => [...prev, newAcc]);

      // Best-effort sync to Supabase if authenticated
      createAccountAction({
        accountName: name,
        accountType: payload.accountType,
        institutionName: payload.institutionName || null,
        currency: payload.currency || currency,
        openingBalance: opening,
        creditLimit,
        description: payload.description || null,
        color: payload.color || '#A99BFF',
        icon: payload.icon || 'credit-card',
      }).catch(() => {});

      pushNotification(
        'Account Created',
        `${name} has been added with opening balance ${formatMoney(opening)}.`,
        'success'
      );
      return { ok: true, message: 'Account created successfully.' };
    },
    [accounts, currency, formatMoney, pushNotification]
  );

  const updateAccount = useCallback(
    async (payload: UpdateAccountFormPayload) => {
      const existing = accounts.find((a) => a.id === payload.accountId);
      if (!existing) {
        return { ok: false, message: 'Account not found.' };
      }

      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id !== payload.accountId) return acc;
          const updatedCreditLimit =
            payload.creditLimit !== undefined
              ? payload.creditLimit
                ? Money.from(payload.creditLimit).toDbString()
                : null
              : acc.creditLimit;
          const nextType = payload.accountType ?? acc.accountType;
          let availableCredit: string | null = null;
          if (nextType === 'credit_card' && updatedCreditLimit) {
            availableCredit = Money.from(updatedCreditLimit)
              .subtract(Money.from(acc.currentBalance))
              .toDbString();
          }
          return {
            ...acc,
            accountName: payload.accountName?.trim() || acc.accountName,
            accountType: nextType,
            institutionName:
              payload.institutionName !== undefined
                ? payload.institutionName?.trim() || null
                : acc.institutionName,
            creditLimit: updatedCreditLimit,
            availableCredit,
            description:
              payload.description !== undefined
                ? payload.description?.trim() || null
                : acc.description,
            color: payload.color ?? acc.color,
            icon: payload.icon ?? acc.icon,
            isActive:
              payload.isActive !== undefined ? payload.isActive : acc.isActive,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      updateAccountAction({
        accountId: payload.accountId,
        accountName: payload.accountName,
        accountType: payload.accountType,
        institutionName: payload.institutionName,
        creditLimit: payload.creditLimit,
        description: payload.description,
        color: payload.color,
        icon: payload.icon,
        isActive: payload.isActive,
      }).catch(() => {});

      pushNotification('Account Updated', 'Account settings have been saved.', 'success');
      return { ok: true, message: 'Account updated.' };
    },
    [accounts, pushNotification]
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      const target = accounts.find((a) => a.id === accountId);
      if (!target) {
        return { ok: false, message: 'Account not found.' };
      }

      // Soft-delete any associated transactions and remove the account
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.accountId === accountId
            ? { ...tx, deletedAt: new Date().toISOString() }
            : tx
        )
      );
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));

      deleteAccountAction(accountId).catch(() => {});

      pushNotification(
        'Account Removed',
        `${target.accountName} has been deleted.`,
        'info'
      );
      return { ok: true, message: 'Account deleted.' };
    },
    [accounts, pushNotification]
  );

  // =========================================================================
  // ATOMIC MONEY TRANSFER OPERATION (Part 3.C)
  // =========================================================================

  const createTransfer = useCallback(
    async (payload: CreateTransferFormPayload) => {
      if (payload.sourceAccountId === payload.destinationAccountId) {
        return {
          ok: false,
          message: 'Source and destination accounts must be different.',
        };
      }

      const numAmt = Number(payload.amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        return {
          ok: false,
          message: 'Transfer amount must be strictly greater than zero.',
        };
      }

      const sourceAcc = accounts.find((a) => a.id === payload.sourceAccountId);
      const destAcc = accounts.find((a) => a.id === payload.destinationAccountId);

      if (!sourceAcc || !destAcc) {
        return { ok: false, message: 'Both source and destination accounts must exist.' };
      }
      if (!sourceAcc.isActive || !destAcc.isActive) {
        return {
          ok: false,
          message: 'Both accounts must be active to complete a transfer.',
        };
      }
      if (sourceAcc.currency !== destAcc.currency) {
        return {
          ok: false,
          message: `Cannot transfer between unlike currencies (${sourceAcc.currency} and ${destAcc.currency}).`,
        };
      }

      const formattedAmount = Money.from(payload.amount).toDbString();
      const nowIso = new Date().toISOString();
      const txDateIso = payload.transactionDate.includes('T')
        ? payload.transactionDate
        : `${payload.transactionDate}T12:00:00.000Z`;

      const sourceTxId = `tx-trf-src-${Date.now()}`;
      const destTxId = `tx-trf-dst-${Date.now() + 1}`;
      const refCode = `#TRF${String(Date.now()).slice(-4)}`;

      const newSourceBal = AccountService.calculateBalanceDelta(
        sourceAcc.currentBalance,
        sourceAcc.accountType,
        'transfer',
        'source',
        formattedAmount,
        'apply'
      );
      const newDestBal = AccountService.calculateBalanceDelta(
        destAcc.currentBalance,
        destAcc.accountType,
        'transfer',
        'destination',
        formattedAmount,
        'apply'
      );

      const sourceLeg: TransactionDTO = {
        id: sourceTxId,
        userId: 'local-user',
        accountId: sourceAcc.id,
        accountName: sourceAcc.accountName,
        categoryId: null,
        categoryName: 'Internal Transfer',
        transactionType: 'transfer',
        amount: formattedAmount,
        currency: sourceAcc.currency,
        description:
          payload.description.trim() ||
          `Transfer to ${destAcc.accountName}`,
        merchantName: destAcc.accountName,
        paymentMethod: 'bank_transfer',
        transactionDate: txDateIso,
        notes: payload.notes?.trim() || null,
        referenceNumber: refCode,
        transferPairId: destTxId,
        transferRole: 'source',
        recurringTransactionId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
      };

      const destLeg: TransactionDTO = {
        id: destTxId,
        userId: 'local-user',
        accountId: destAcc.id,
        accountName: destAcc.accountName,
        categoryId: null,
        categoryName: 'Internal Transfer',
        transactionType: 'transfer',
        amount: formattedAmount,
        currency: destAcc.currency,
        description:
          payload.description.trim() ||
          `Transfer from ${sourceAcc.accountName}`,
        merchantName: sourceAcc.accountName,
        paymentMethod: 'bank_transfer',
        transactionDate: txDateIso,
        notes: payload.notes?.trim() || null,
        referenceNumber: refCode,
        transferPairId: sourceTxId,
        transferRole: 'destination',
        recurringTransactionId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
      };

      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === sourceAcc.id) {
            const avail =
              acc.accountType === 'credit_card' && acc.creditLimit
                ? Money.from(acc.creditLimit)
                    .subtract(Money.from(newSourceBal))
                    .toDbString()
                : acc.availableCredit;
            return {
              ...acc,
              currentBalance: newSourceBal,
              availableCredit: avail,
              updatedAt: nowIso,
            };
          }
          if (acc.id === destAcc.id) {
            const avail =
              acc.accountType === 'credit_card' && acc.creditLimit
                ? Money.from(acc.creditLimit)
                    .subtract(Money.from(newDestBal))
                    .toDbString()
                : acc.availableCredit;
            return {
              ...acc,
              currentBalance: newDestBal,
              availableCredit: avail,
              updatedAt: nowIso,
            };
          }
          return acc;
        })
      );

      setTransactions((prev) => [destLeg, sourceLeg, ...prev]);

      createTransferAction({
        sourceAccountId: sourceAcc.id,
        destinationAccountId: destAcc.id,
        amount: formattedAmount,
        currency: sourceAcc.currency,
        description: sourceLeg.description,
        paymentMethod: 'bank_transfer',
        transactionDate: txDateIso,
        notes: payload.notes || null,
        referenceNumber: refCode,
      }).catch(() => {});

      pushNotification(
        'Transfer Completed',
        `Transferred ${formatMoney(formattedAmount)} from ${sourceAcc.accountName} to ${destAcc.accountName}.`,
        'success'
      );
      return { ok: true, message: 'Transfer completed atomically.' };
    },
    [accounts, formatMoney, pushNotification]
  );

  // =========================================================================
  // TRANSACTION OPERATIONS (Part 6 & Part 7)
  // =========================================================================

  const createTransaction = useCallback(
    async (payload: CreateTransactionFormPayload) => {
      const numAmt = Number(payload.amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        return { ok: false, message: 'Amount must be greater than zero.' };
      }

      const acc = accounts.find((a) => a.id === payload.accountId);
      if (!acc) {
        return { ok: false, message: 'Selected account not found.' };
      }
      if (!acc.isActive) {
        return {
          ok: false,
          message: 'Cannot record transactions on an inactive account.',
        };
      }

      const cat = categories.find((c) => c.id === payload.categoryId);
      if (!cat) {
        return { ok: false, message: 'Please select a valid category.' };
      }

      const formattedAmount = Money.from(payload.amount).toDbString();
      const nowIso = new Date().toISOString();
      const txDateIso = payload.transactionDate.includes('T')
        ? payload.transactionDate
        : `${payload.transactionDate}T12:00:00.000Z`;

      const newBalance = AccountService.calculateBalanceDelta(
        acc.currentBalance,
        acc.accountType,
        payload.transactionType,
        null,
        formattedAmount,
        'apply'
      );

      const newTx: TransactionDTO = {
        id: `tx-${Date.now()}`,
        userId: 'local-user',
        accountId: acc.id,
        accountName: acc.accountName,
        categoryId: cat.id,
        categoryName: cat.name,
        transactionType: payload.transactionType,
        amount: formattedAmount,
        currency: acc.currency,
        description: payload.description.trim(),
        merchantName: payload.merchantName?.trim() || null,
        paymentMethod: payload.paymentMethod,
        transactionDate: txDateIso,
        notes: payload.notes?.trim() || null,
        referenceNumber:
          payload.referenceNumber?.trim() || `#${String(Date.now()).slice(-5)}`,
        transferPairId: null,
        transferRole: null,
        recurringTransactionId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
      };

      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id !== acc.id) return a;
          const avail =
            a.accountType === 'credit_card' && a.creditLimit
              ? Money.from(a.creditLimit)
                  .subtract(Money.from(newBalance))
                  .toDbString()
              : a.availableCredit;
          return {
            ...a,
            currentBalance: newBalance,
            availableCredit: avail,
            updatedAt: nowIso,
          };
        })
      );

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        if (payload.transactionType === 'expense') {
          setTimeout(() => checkBudgetThresholdAlerts(next), 0);
        }
        return next;
      });

      createTransactionAction({
        accountId: acc.id,
        categoryId: cat.id,
        transactionType: payload.transactionType,
        amount: formattedAmount,
        currency: acc.currency,
        description: newTx.description,
        merchantName: newTx.merchantName,
        paymentMethod: payload.paymentMethod,
        transactionDate: txDateIso,
        notes: newTx.notes,
        referenceNumber: newTx.referenceNumber,
      }).catch(() => {});

      pushNotification(
        payload.transactionType === 'income'
          ? 'Income Recorded'
          : 'Expense Recorded',
        `${newTx.description} (${formatMoney(formattedAmount)}) posted to ${acc.accountName}.`,
        'success'
      );

      return { ok: true, message: 'Transaction recorded.' };
    },
    [accounts, categories, checkBudgetThresholdAlerts, formatMoney, pushNotification]
  );

  const updateTransaction = useCallback(
    async (payload: UpdateTransactionFormPayload) => {
      const existing = transactions.find((t) => t.id === payload.transactionId);
      if (!existing || existing.deletedAt) {
        return { ok: false, message: 'Transaction not found.' };
      }
      if (existing.transactionType === 'transfer') {
        return {
          ok: false,
          message:
            'Transfers are dual-leg records. Delete and re-create the transfer to change accounts or amounts.',
        };
      }

      const oldAcc = accounts.find((a) => a.id === existing.accountId);
      const targetAccId = payload.accountId || existing.accountId;
      const newAcc = accounts.find((a) => a.id === targetAccId);
      if (!oldAcc || !newAcc) {
        return { ok: false, message: 'Linked account not found.' };
      }

      const nextAmount = payload.amount
        ? Money.from(payload.amount).toDbString()
        : existing.amount;
      const nextCatId = payload.categoryId ?? existing.categoryId;
      const nextCat = categories.find((c) => c.id === nextCatId);
      const nextDateIso = payload.transactionDate
        ? payload.transactionDate.includes('T')
          ? payload.transactionDate
          : `${payload.transactionDate}T12:00:00.000Z`
        : existing.transactionDate;
      const nowIso = new Date().toISOString();

      // Reverse old effect then apply new effect (Rule 5 in Part 7)
      setAccounts((prev) =>
        prev.map((acc) => {
          if (oldAcc.id === newAcc.id && acc.id === oldAcc.id) {
            const reverted = AccountService.calculateBalanceDelta(
              acc.currentBalance,
              acc.accountType,
              existing.transactionType,
              null,
              existing.amount,
              'reverse'
            );
            const applied = AccountService.calculateBalanceDelta(
              reverted,
              acc.accountType,
              existing.transactionType,
              null,
              nextAmount,
              'apply'
            );
            return { ...acc, currentBalance: applied, updatedAt: nowIso };
          }
          if (acc.id === oldAcc.id) {
            const reverted = AccountService.calculateBalanceDelta(
              acc.currentBalance,
              acc.accountType,
              existing.transactionType,
              null,
              existing.amount,
              'reverse'
            );
            return { ...acc, currentBalance: reverted, updatedAt: nowIso };
          }
          if (acc.id === newAcc.id) {
            const applied = AccountService.calculateBalanceDelta(
              acc.currentBalance,
              acc.accountType,
              existing.transactionType,
              null,
              nextAmount,
              'apply'
            );
            return { ...acc, currentBalance: applied, updatedAt: nowIso };
          }
          return acc;
        })
      );

      setTransactions((prev) => {
        const next = prev.map((tx) =>
          tx.id === existing.id
            ? {
                ...tx,
                accountId: newAcc.id,
                accountName: newAcc.accountName,
                categoryId: nextCatId,
                categoryName: nextCat?.name || tx.categoryName,
                amount: nextAmount,
                description: payload.description?.trim() ?? tx.description,
                merchantName:
                  payload.merchantName !== undefined
                    ? payload.merchantName?.trim() || null
                    : tx.merchantName,
                paymentMethod: payload.paymentMethod ?? tx.paymentMethod,
                transactionDate: nextDateIso,
                notes:
                  payload.notes !== undefined
                    ? payload.notes?.trim() || null
                    : tx.notes,
                updatedAt: nowIso,
              }
            : tx
        );
        setTimeout(() => checkBudgetThresholdAlerts(next), 0);
        return next;
      });

      updateTransactionAction({
        transactionId: existing.id,
        accountId: newAcc.id,
        categoryId: nextCatId,
        amount: nextAmount,
        description: payload.description,
        merchantName: payload.merchantName,
        paymentMethod: payload.paymentMethod,
        transactionDate: nextDateIso,
        notes: payload.notes,
      }).catch(() => {});

      pushNotification('Transaction Updated', 'Ledger and balances reconciled.', 'success');
      return { ok: true, message: 'Transaction updated.' };
    },
    [accounts, categories, checkBudgetThresholdAlerts, pushNotification, transactions]
  );

  const deleteTransaction = useCallback(
    async (transactionId: string) => {
      const existing = transactions.find((t) => t.id === transactionId);
      if (!existing || existing.deletedAt) {
        return { ok: false, message: 'Transaction not found.' };
      }

      const nowIso = new Date().toISOString();

      if (existing.transactionType === 'transfer') {
        const paired = existing.transferPairId
          ? transactions.find((t) => t.id === existing.transferPairId)
          : undefined;

        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === existing.accountId) {
              const reversed = AccountService.calculateBalanceDelta(
                acc.currentBalance,
                acc.accountType,
                'transfer',
                existing.transferRole,
                existing.amount,
                'reverse'
              );
              return { ...acc, currentBalance: reversed, updatedAt: nowIso };
            }
            if (paired && acc.id === paired.accountId) {
              const reversed = AccountService.calculateBalanceDelta(
                acc.currentBalance,
                acc.accountType,
                'transfer',
                paired.transferRole,
                paired.amount,
                'reverse'
              );
              return { ...acc, currentBalance: reversed, updatedAt: nowIso };
            }
            return acc;
          })
        );

        setTransactions((prev) =>
          prev.map((tx) =>
            tx.id === existing.id || (paired && tx.id === paired.id)
              ? { ...tx, deletedAt: nowIso, updatedAt: nowIso }
              : tx
          )
        );

        deleteTransferAction(existing.id).catch(() => {});
        pushNotification(
          'Transfer Reversed',
          'Both transfer legs were removed and account balances restored.',
          'info'
        );
        return { ok: true, message: 'Transfer reversed and deleted.' };
      }

      // Standard Income / Expense reversal (Rule 6 in Part 7)
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id !== existing.accountId) return acc;
          const reversed = AccountService.calculateBalanceDelta(
            acc.currentBalance,
            acc.accountType,
            existing.transactionType,
            null,
            existing.amount,
            'reverse'
          );
          return { ...acc, currentBalance: reversed, updatedAt: nowIso };
        })
      );

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === existing.id
            ? { ...tx, deletedAt: nowIso, updatedAt: nowIso }
            : tx
        )
      );

      deleteTransactionAction({ transactionId: existing.id }).catch(() => {});
      pushNotification(
        'Transaction Deleted',
        'Account balance and budget utilization have been updated.',
        'info'
      );
      return { ok: true, message: 'Transaction deleted.' };
    },
    [pushNotification, transactions]
  );

  const duplicateTransaction = useCallback(
    async (transactionId: string) => {
      const existing = transactions.find((t) => t.id === transactionId);
      if (!existing || existing.deletedAt) {
        return { ok: false, message: 'Transaction not found.' };
      }
      if (existing.transactionType === 'transfer' || !existing.categoryId) {
        return { ok: false, message: 'Only income or expense transactions can be duplicated.' };
      }

      return createTransaction({
        transactionType: existing.transactionType,
        accountId: existing.accountId,
        categoryId: existing.categoryId,
        amount: existing.amount,
        description: `${existing.description} (Copy)`,
        merchantName: existing.merchantName || undefined,
        paymentMethod: existing.paymentMethod,
        transactionDate: new Date().toISOString(),
        notes: existing.notes || undefined,
      });
    },
    [createTransaction, transactions]
  );

  // =========================================================================
  // CATEGORY OPERATIONS (Part 6.E)
  // =========================================================================

  const createCategory = useCallback(
    async (name: string, type: CategoryType, color = '#A99BFF') => {
      const trimmed = name.trim();
      if (!trimmed) {
        return { ok: false, message: 'Category name is required.' };
      }
      if (
        categories.some(
          (c) =>
            c.categoryType === type &&
            c.name.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        return { ok: false, message: 'Category already exists.' };
      }

      const newCat: CategoryDTO = {
        id: `cat-custom-${Date.now()}`,
        userId: 'local-user',
        name: trimmed,
        categoryType: type,
        icon: 'tag',
        color,
        isSystem: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCategories((prev) => [...prev, newCat]);
      createCategoryAction({
        name: trimmed,
        categoryType: type,
        color,
        icon: 'tag',
      }).catch(() => {});

      pushNotification('Category Added', `Created custom ${type} category "${trimmed}".`, 'success');
      return { ok: true, message: 'Category created.' };
    },
    [categories, pushNotification]
  );

  const updateCategory = useCallback(
    async (categoryId: string, name: string, color?: string) => {
      const target = categories.find((c) => c.id === categoryId);
      if (!target) return { ok: false, message: 'Category not found.' };
      if (target.isSystem) {
        return { ok: false, message: 'Default system categories cannot be modified.' };
      }

      const trimmed = name.trim();
      if (!trimmed) return { ok: false, message: 'Category name is required.' };

      const duplicate = categories.some(
        (c) =>
          c.id !== categoryId &&
          c.categoryType === target.categoryType &&
          c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        return { ok: false, message: 'Another category with this name already exists.' };
      }

      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                name: trimmed,
                color: color ?? c.color,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      updateCategoryAction({
        categoryId,
        name: trimmed,
        color: color ?? target.color ?? undefined,
      }).catch(() => {});

      pushNotification('Category Updated', `Renamed category to "${trimmed}".`, 'info');
      return { ok: true, message: 'Category updated.' };
    },
    [categories, pushNotification]
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      const target = categories.find((c) => c.id === categoryId);
      if (!target) return { ok: false, message: 'Category not found.' };
      if (target.isSystem) {
        return { ok: false, message: 'System default categories cannot be deleted.' };
      }

      const isReferencedByTx = transactions.some(
        (t) => !t.deletedAt && t.categoryId === categoryId
      );
      const isReferencedByBudget = rawBudgets.some(
        (b) => b.categoryId === categoryId
      );
      const isReferencedByRecurring = recurringTransactions.some(
        (r) => r.categoryId === categoryId
      );

      if (isReferencedByTx || isReferencedByBudget || isReferencedByRecurring) {
        return {
          ok: false,
          message: `Cannot delete "${target.name}" while it is still referenced by existing transactions, budgets, or schedules.`,
        };
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      deleteCategoryAction(categoryId).catch(() => {});

      pushNotification('Category Deleted', `Removed custom category "${target.name}".`, 'info');
      return { ok: true, message: 'Category deleted.' };
    },
    [categories, pushNotification, rawBudgets, recurringTransactions, transactions]
  );

  // =========================================================================
  // RECURRING TRANSACTIONS (Part 6.F)
  // =========================================================================

  const createRecurring = useCallback(
    async (payload: CreateRecurringFormPayload) => {
      const numAmt = Number(payload.amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        return { ok: false, message: 'Recurring amount must be greater than zero.' };
      }

      const newRec: RecurringTransactionDTO = {
        id: `rec-${Date.now()}`,
        userId: 'local-user',
        accountId: payload.accountId,
        categoryId: payload.categoryId,
        transactionType: payload.transactionType,
        targetAccountId: null,
        amount: Money.from(payload.amount).toDbString(),
        currency,
        description: payload.description.trim(),
        merchantName: payload.merchantName?.trim() || null,
        paymentMethod: payload.paymentMethod,
        frequency: payload.frequency,
        intervalCount: 1,
        startDate: payload.startDate,
        endDate: payload.endDate || null,
        nextExecutionDate: payload.startDate,
        lastExecutedAt: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRecurringTransactions((prev) => [newRec, ...prev]);
      createRecurringAction({
        accountId: payload.accountId,
        categoryId: payload.categoryId,
        transactionType: payload.transactionType,
        amount: newRec.amount,
        currency,
        description: newRec.description,
        merchantName: newRec.merchantName,
        paymentMethod: payload.paymentMethod,
        frequency: payload.frequency,
        intervalCount: 1,
        startDate: payload.startDate,
        endDate: payload.endDate || null,
      }).catch(() => {});

      pushNotification('Recurring Schedule Created', `Scheduled "${newRec.description}" (${payload.frequency}).`, 'success');
      return { ok: true, message: 'Recurring schedule created.' };
    },
    [currency, pushNotification]
  );

  const toggleRecurring = useCallback(
    async (recurringId: string) => {
      const target = recurringTransactions.find((r) => r.id === recurringId);
      if (!target) return { ok: false, message: 'Schedule not found.' };

      const nextActive = !target.isActive;
      setRecurringTransactions((prev) =>
        prev.map((r) =>
          r.id === recurringId
            ? { ...r, isActive: nextActive, updatedAt: new Date().toISOString() }
            : r
        )
      );
      toggleRecurringActiveAction(recurringId, nextActive).catch(() => {});

      pushNotification(
        nextActive ? 'Schedule Resumed' : 'Schedule Paused',
        `${target.description} is now ${nextActive ? 'active' : 'paused'}.`,
        'info'
      );
      return { ok: true, message: 'Schedule updated.' };
    },
    [pushNotification, recurringTransactions]
  );

  const cancelRecurring = useCallback(
    async (recurringId: string) => {
      setRecurringTransactions((prev) => prev.filter((r) => r.id !== recurringId));
      pushNotification('Schedule Cancelled', 'Recurring schedule removed.', 'info');
      return { ok: true, message: 'Recurring schedule cancelled.' };
    },
    [pushNotification]
  );

  const executeRecurringNow = useCallback(
    async (recurringId: string) => {
      const sched = recurringTransactions.find((r) => r.id === recurringId);
      if (!sched) return { ok: false, message: 'Recurring schedule not found.' };
      if (!sched.isActive) {
        return { ok: false, message: 'Resume this schedule before executing it.' };
      }

      // Prevent duplicate execution on the same scheduled date
      const alreadyGenerated = transactions.some(
        (tx) =>
          !tx.deletedAt &&
          tx.recurringTransactionId === sched.id &&
          tx.transactionDate.slice(0, 10) === sched.nextExecutionDate
      );
      if (alreadyGenerated) {
        return {
          ok: false,
          message: `Transaction for ${sched.nextExecutionDate} was already generated.`,
        };
      }

      if (!sched.categoryId || sched.transactionType === 'transfer') {
        return { ok: false, message: 'Invalid schedule category.' };
      }

      const res = await createTransaction({
        transactionType: sched.transactionType,
        accountId: sched.accountId,
        categoryId: sched.categoryId,
        amount: sched.amount,
        description: sched.description,
        merchantName: sched.merchantName || undefined,
        paymentMethod: sched.paymentMethod,
        transactionDate: `${sched.nextExecutionDate}T12:00:00.000Z`,
        notes: `Auto-generated from ${sched.frequency} recurring schedule`,
      });

      if (!res.ok) return res;

      const nextDateObj = calculateNextExecutionDate(
        new Date(sched.nextExecutionDate),
        sched.frequency,
        sched.intervalCount
      );
      const nextDate = nextDateObj.toISOString().slice(0, 10);

      setRecurringTransactions((prev) =>
        prev.map((r) =>
          r.id === sched.id
            ? {
                ...r,
                nextExecutionDate: nextDate,
                lastExecutedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );

      return { ok: true, message: `Generated transaction and advanced next date to ${nextDate}.` };
    },
    [createTransaction, recurringTransactions, transactions]
  );

  // =========================================================================
  // BUDGET OPERATIONS (Part 4)
  // =========================================================================

  const createBudget = useCallback(
    async (payload: CreateBudgetFormPayload) => {
      const name = payload.name.trim();
      if (!name) return { ok: false, message: 'Budget name is required.' };
      const numAmt = Number(payload.amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        return { ok: false, message: 'Budget limit must be greater than zero.' };
      }
      if (payload.endDate < payload.startDate) {
        return { ok: false, message: 'End date must be on or after start date.' };
      }

      const cat = payload.categoryId
        ? categories.find((c) => c.id === payload.categoryId)
        : null;
      const nowIso = new Date().toISOString();
      const formattedAmount = Money.from(payload.amount).toDbString();

      const newSeed: StoredBudgetSeed = {
        id: `bgt-${Date.now()}`,
        userId: 'local-user',
        name,
        categoryId: payload.categoryId || null,
        categoryName: cat ? cat.name : 'Overall Spending',
        amount: formattedAmount,
        currency,
        period: payload.period,
        startDate: payload.startDate,
        endDate: payload.endDate,
        description: payload.description?.trim() || null,
        isActive: true,
        alertThresholdsTriggered: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setBudgetSeeds((prev) => [newSeed, ...prev]);

      createBudgetAction({
        name,
        categoryId: payload.categoryId || null,
        amount: formattedAmount,
        currency,
        period: payload.period,
        startDate: payload.startDate,
        endDate: payload.endDate,
        description: newSeed.description,
      }).catch(() => {});

      pushNotification(
        'Budget Created',
        `Created "${name}" (${formatMoney(formattedAmount)}).`,
        'success'
      );
      return { ok: true, message: 'Budget created.' };
    },
    [categories, currency, formatMoney, pushNotification]
  );

  const updateBudget = useCallback(
    async (payload: UpdateBudgetFormPayload) => {
      setBudgetSeeds((prev) =>
        prev.map((b) => {
          if (b.id !== payload.budgetId) return b;
          const nextCatId =
            payload.categoryId !== undefined ? payload.categoryId : b.categoryId;
          const cat = nextCatId
            ? categories.find((c) => c.id === nextCatId)
            : null;
          return {
            ...b,
            name: payload.name?.trim() || b.name,
            categoryId: nextCatId,
            categoryName: nextCatId
              ? cat?.name || b.categoryName
              : 'Overall Spending',
            amount: payload.amount
              ? Money.from(payload.amount).toDbString()
              : b.amount,
            period: payload.period ?? b.period,
            startDate: payload.startDate ?? b.startDate,
            endDate: payload.endDate ?? b.endDate,
            description:
              payload.description !== undefined
                ? payload.description?.trim() || null
                : b.description,
            isActive:
              payload.isActive !== undefined ? payload.isActive : b.isActive,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      updateBudgetAction({
        budgetId: payload.budgetId,
        name: payload.name,
        categoryId: payload.categoryId,
        amount: payload.amount,
        period: payload.period,
        startDate: payload.startDate,
        endDate: payload.endDate,
        description: payload.description,
        isActive: payload.isActive,
      }).catch(() => {});

      pushNotification('Budget Updated', 'Budget configuration saved.', 'success');
      return { ok: true, message: 'Budget updated.' };
    },
    [categories, pushNotification]
  );

  const deleteBudget = useCallback(
    async (budgetId: string) => {
      setBudgetSeeds((prev) => prev.filter((b) => b.id !== budgetId));
      deleteBudgetAction(budgetId).catch(() => {});
      pushNotification('Budget Deleted', 'Budget removed.', 'info');
      return { ok: true, message: 'Budget deleted.' };
    },
    [pushNotification]
  );

  const duplicateBudget = useCallback(
    async (budgetId: string) => {
      const existing = budgetSeeds.find((b) => b.id === budgetId);
      if (!existing) return { ok: false, message: 'Budget not found.' };
      return createBudget({
        name: `${existing.name} (Copy)`,
        categoryId: existing.categoryId,
        amount: existing.amount,
        period: existing.period,
        startDate: existing.startDate,
        endDate: existing.endDate,
        description: existing.description || undefined,
      });
    },
    [budgetSeeds, createBudget]
  );

  // =========================================================================
  // SAVINGS GOALS & ATOMIC CONTRIBUTIONS (Part 5)
  // =========================================================================

  const createGoal = useCallback(
    async (payload: CreateGoalFormPayload) => {
      const name = payload.name.trim();
      if (!name) return { ok: false, message: 'Goal name is required.' };
      const targetNum = Number(payload.targetAmount);
      if (isNaN(targetNum) || targetNum <= 0) {
        return { ok: false, message: 'Target amount must be greater than zero.' };
      }

      const target = Money.from(payload.targetAmount);
      const initial = Money.from(payload.initialAmount || '0');
      const isCompleted = initial.greaterThanOrEqualTo(target);
      const nowIso = new Date().toISOString();

      const metrics = SavingsService.computeGoalMetrics({
        targetAmount: target.toDbString(),
        currentAmount: initial.toDbString(),
        targetDate: payload.targetDate,
        status: isCompleted ? 'completed' : 'active',
      });

      const newGoal: SavingsGoalDTO = {
        id: `goal-${Date.now()}`,
        userId: 'local-user',
        name,
        category: payload.category || 'Other',
        targetAmount: target.toDbString(),
        initialAmount: initial.toDbString(),
        currentAmount: initial.toDbString(),
        remainingAmount: metrics.remainingAmount,
        progressPercentage: metrics.progressPercentage,
        currency,
        targetDate: payload.targetDate,
        daysRemaining: metrics.daysRemaining,
        estimatedMonthlyRequired: metrics.estimatedMonthlyRequired,
        description: payload.description?.trim() || null,
        icon: payload.icon || 'target',
        color: payload.color || '#A99BFF',
        status: isCompleted ? 'completed' : 'active',
        completedAt: isCompleted ? nowIso : null,
        contributions: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setRawGoals((prev) => [newGoal, ...prev]);

      createSavingsGoalAction({
        name,
        category: newGoal.category,
        targetAmount: newGoal.targetAmount,
        initialAmount: newGoal.initialAmount,
        currency,
        targetDate: payload.targetDate,
        description: newGoal.description,
        icon: newGoal.icon,
        color: newGoal.color,
      }).catch(() => {});

      pushNotification(
        'Savings Goal Created',
        `Created "${name}" with target ${formatMoney(target.toDbString())}.`,
        'success'
      );
      return { ok: true, message: 'Savings goal created.' };
    },
    [currency, formatMoney, pushNotification]
  );

  const updateGoal = useCallback(
    async (payload: UpdateGoalFormPayload) => {
      const nowIso = new Date().toISOString();
      setRawGoals((prev) =>
        prev.map((g) => {
          if (g.id !== payload.goalId) return g;
          const nextTarget = payload.targetAmount
            ? Money.from(payload.targetAmount).toDbString()
            : g.targetAmount;
          const nextStatus = payload.status ?? g.status;
          return {
            ...g,
            name: payload.name?.trim() || g.name,
            category: payload.category || g.category,
            targetAmount: nextTarget,
            targetDate: payload.targetDate ?? g.targetDate,
            description:
              payload.description !== undefined
                ? payload.description?.trim() || null
                : g.description,
            icon: payload.icon ?? g.icon,
            color: payload.color ?? g.color,
            status: nextStatus,
            completedAt:
              nextStatus === 'completed' && !g.completedAt
                ? nowIso
                : g.completedAt,
            updatedAt: nowIso,
          };
        })
      );

      updateSavingsGoalAction({
        goalId: payload.goalId,
        name: payload.name,
        category: payload.category,
        targetAmount: payload.targetAmount,
        targetDate: payload.targetDate,
        description: payload.description,
        icon: payload.icon,
        color: payload.color,
        status: payload.status,
      }).catch(() => {});

      pushNotification('Savings Goal Updated', 'Goal settings updated.', 'success');
      return { ok: true, message: 'Savings goal updated.' };
    },
    [pushNotification]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      setRawGoals((prev) => prev.filter((g) => g.id !== goalId));
      deleteSavingsGoalAction(goalId).catch(() => {});
      pushNotification('Savings Goal Deleted', 'Goal removed.', 'info');
      return { ok: true, message: 'Savings goal deleted.' };
    },
    [pushNotification]
  );

  const contributeToGoal = useCallback(
    async (payload: ContributeGoalFormPayload) => {
      const numAmt = Number(payload.amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        return { ok: false, message: 'Contribution amount must be greater than zero.' };
      }

      const goal = rawGoals.find((g) => g.id === payload.goalId);
      if (!goal) return { ok: false, message: 'Savings goal not found.' };
      if (goal.status === 'paused') {
        return { ok: false, message: 'Resume this goal before adding contributions.' };
      }

      const sourceAcc = accounts.find((a) => a.id === payload.sourceAccountId);
      if (!sourceAcc) return { ok: false, message: 'Source account not found.' };
      if (!sourceAcc.isActive) {
        return { ok: false, message: 'Cannot contribute from an inactive account.' };
      }

      const contribAmt = Money.from(payload.amount);
      const formattedAmount = contribAmt.toDbString();
      const nowIso = new Date().toISOString();
      const contribDateIso = payload.contributionDate.includes('T')
        ? payload.contributionDate
        : `${payload.contributionDate}T12:00:00.000Z`;

      // 1. Deduct from source account via transfer source leg (does NOT count as expense!)
      const newSourceBal = AccountService.calculateBalanceDelta(
        sourceAcc.currentBalance,
        sourceAcc.accountType,
        'transfer',
        'source',
        formattedAmount,
        'apply'
      );

      const ledgerTxId = `tx-goal-${Date.now()}`;
      const ledgerTx: TransactionDTO = {
        id: ledgerTxId,
        userId: 'local-user',
        accountId: sourceAcc.id,
        accountName: sourceAcc.accountName,
        categoryId: null,
        categoryName: 'Savings Contribution',
        transactionType: 'transfer',
        amount: formattedAmount,
        currency: sourceAcc.currency,
        description: `Savings Goal Contribution: ${goal.name}`,
        merchantName: goal.name,
        paymentMethod: 'bank_transfer',
        transactionDate: contribDateIso,
        notes: payload.notes?.trim() || null,
        referenceNumber: `#SVG${String(Date.now()).slice(-4)}`,
        transferPairId: null,
        transferRole: 'source',
        recurringTransactionId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        deletedAt: null,
      };

      const newContrib: SavingsContributionDTO = {
        id: `contrib-${Date.now()}`,
        goalId: goal.id,
        userId: 'local-user',
        sourceAccountId: sourceAcc.id,
        sourceAccountName: sourceAcc.accountName,
        transactionId: ledgerTxId,
        amount: formattedAmount,
        currency: goal.currency,
        contributionDate: contribDateIso,
        notes: payload.notes?.trim() || null,
        createdAt: nowIso,
      };

      const newSaved = Money.from(goal.currentAmount).add(contribAmt);
      const reachedTarget = newSaved.greaterThanOrEqualTo(
        Money.from(goal.targetAmount)
      );

      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === sourceAcc.id
            ? { ...acc, currentBalance: newSourceBal, updatedAt: nowIso }
            : acc
        )
      );

      setTransactions((prev) => [ledgerTx, ...prev]);

      setRawGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goal.id) return g;
          return {
            ...g,
            currentAmount: newSaved.toDbString(),
            status: reachedTarget ? 'completed' : g.status,
            completedAt:
              reachedTarget && !g.completedAt ? nowIso : g.completedAt,
            contributions: [newContrib, ...(g.contributions || [])],
            updatedAt: nowIso,
          };
        })
      );

      contributeToGoalAction({
        goalId: goal.id,
        sourceAccountId: sourceAcc.id,
        amount: formattedAmount,
        contributionDate: contribDateIso,
        notes: payload.notes || null,
      }).catch(() => {});

      if (reachedTarget) {
        pushNotification(
          `Goal Completed: ${goal.name}!`,
          `Congratulations! You have reached 100% of your ${formatMoney(goal.targetAmount)} target.`,
          'success'
        );
      } else {
        pushNotification(
          'Contribution Added',
          `Added ${formatMoney(formattedAmount)} from ${sourceAcc.accountName} to ${goal.name}.`,
          'success'
        );
      }

      return { ok: true, message: 'Contribution recorded and account balance updated.' };
    },
    [accounts, formatMoney, pushNotification, rawGoals]
  );

  const value = useMemo<PulseFinanceContextValue>(
    () => ({
      accounts,
      transactions: activeTransactions,
      categories,
      budgets,
      savingsGoals,
      recurringTransactions,
      summary,
      notifications,
      userName,
      userEmail,
      userAvatarUrl,
      currency,
      currencySymbol,
      setCurrency,
      formatMoney,
      dismissNotification,
      createAccount,
      updateAccount,
      deleteAccount,
      createTransfer,
      createTransaction,
      updateTransaction,
      deleteTransaction,
      duplicateTransaction,
      createCategory,
      updateCategory,
      deleteCategory,
      createRecurring,
      toggleRecurring,
      cancelRecurring,
      executeRecurringNow,
      createBudget,
      updateBudget,
      deleteBudget,
      duplicateBudget,
      createGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
    }),
    [
      accounts,
      activeTransactions,
      categories,
      budgets,
      savingsGoals,
      recurringTransactions,
      summary,
      notifications,
      userName,
      userEmail,
      userAvatarUrl,
      currency,
      currencySymbol,
      formatMoney,
      dismissNotification,
      createAccount,
      updateAccount,
      deleteAccount,
      createTransfer,
      createTransaction,
      updateTransaction,
      deleteTransaction,
      duplicateTransaction,
      createCategory,
      updateCategory,
      deleteCategory,
      createRecurring,
      toggleRecurring,
      cancelRecurring,
      executeRecurringNow,
      createBudget,
      updateBudget,
      deleteBudget,
      duplicateBudget,
      createGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
    ]
  );

  return (
    <PulseFinanceContext.Provider value={value}>
      {children}
    </PulseFinanceContext.Provider>
  );
}

export function usePulseFinance(): PulseFinanceContextValue {
  const ctx = useContext(PulseFinanceContext);
  if (!ctx) {
    throw new Error('usePulseFinance must be used within a PulseFinanceProvider');
  }
  return ctx;
}
