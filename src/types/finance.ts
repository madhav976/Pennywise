import {
  AccountType,
  BudgetPeriod,
  CategoryType,
  PaymentMethod,
  RecurringFrequency,
  SavingsGoalStatus,
  TransactionType,
} from './database';

export interface AccountDTO {
  id: string;
  userId: string;
  accountName: string;
  accountType: AccountType;
  institutionName: string | null;
  currency: string;
  openingBalance: string;
  currentBalance: string;
  creditLimit: string | null;
  availableCredit?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDTO {
  id: string;
  userId: string | null;
  name: string;
  categoryType: CategoryType;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDTO {
  id: string;
  userId: string;
  accountId: string;
  accountName?: string;
  categoryId: string | null;
  categoryName?: string;
  transactionType: TransactionType;
  amount: string;
  currency: string;
  description: string;
  merchantName: string | null;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  notes: string | null;
  referenceNumber: string | null;
  transferPairId: string | null;
  transferRole: 'source' | 'destination' | null;
  recurringTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedTransactionsDTO {
  transactions: TransactionDTO[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FinancialSummaryDTO {
  period: string;
  startDate: string;
  endDate: string;
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
  totalAssets: string;
  totalLiabilities: string;
  netWorth: string;
  categoryExpenditure: {
    categoryId: string;
    categoryName: string;
    totalAmount: string;
    percentage: number;
  }[];
  paymentMethodExpenditure: {
    paymentMethod: PaymentMethod;
    totalAmount: string;
    percentage: number;
  }[];
  dailyExpenditure: {
    date: string;
    totalAmount: string;
  }[];
  dailyCashFlow: {
    date: string;
    totalIncome: string;
    totalExpenses: string;
  }[];
}

export interface RecurringTransactionDTO {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  transactionType: TransactionType;
  targetAccountId: string | null;
  amount: string;
  currency: string;
  description: string;
  merchantName: string | null;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  intervalCount: number;
  startDate: string;
  endDate: string | null;
  nextExecutionDate: string;
  lastExecutedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BudgetAlertLevel = 'normal' | 'monitor' | 'warning' | 'exceeded';

export interface BudgetDTO {
  id: string;
  userId: string;
  name: string;
  categoryId: string | null;
  categoryName: string; // 'Overall Spending' when categoryId is null
  amount: string; // Allocated budget limit
  spentAmount: string; // Calculated automatically from eligible expense transactions
  remainingAmount: string; // max(0, amount - spentAmount) or negative when exceeded
  utilizationPercentage: number; // (spentAmount / amount) * 100
  alertLevel: BudgetAlertLevel; // <50 normal, 50-79 monitor, 80-99 warning, >=100 exceeded
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

export interface SavingsContributionDTO {
  id: string;
  goalId: string;
  userId: string;
  sourceAccountId: string;
  sourceAccountName?: string;
  transactionId: string | null;
  amount: string;
  currency: string;
  contributionDate: string;
  notes: string | null;
  createdAt: string;
}

export interface SavingsGoalDTO {
  id: string;
  userId: string;
  name: string;
  category: string;
  targetAmount: string;
  initialAmount: string;
  currentAmount: string;
  remainingAmount: string;
  progressPercentage: number;
  currency: string;
  targetDate: string;
  daysRemaining: number;
  estimatedMonthlyRequired: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: SavingsGoalStatus;
  completedAt: string | null;
  contributions?: SavingsContributionDTO[];
  createdAt: string;
  updatedAt: string;
}
