export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Luxury',
  'Other',
] as const;

export type ExpenseCategoryName = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Refund / Cashback',
  'Other Income',
] as const;

export type IncomeCategoryName = (typeof INCOME_CATEGORIES)[number];

export type TransactionCategoryName = ExpenseCategoryName | IncomeCategoryName;

export type AccountType =
  | 'salary'
  | 'savings'
  | 'cash'
  | 'personal'
  | 'credit'
  | 'custom';

export type TransactionType = 'expense' | 'income';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  currency: string;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  openingBalance: number;
  currentBalance: number;
  monthlyIncome?: number;
  icon: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItemInput {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptRecord {
  id: string;
  userId: string;
  merchantName: string;
  receiptDate: string;
  totalAmount: number;
  taxAmount?: number;
  suggestedCategory: ExpenseCategoryName;
  imageUrl?: string;
  receiptHash: string;
  rawOcrText?: string;
  items: ReceiptItemInput[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  receiptId?: string;
  title: string;
  amount: number;
  transactionType: TransactionType;
  category: TransactionCategoryName;
  transactionDate: string; // YYYY-MM-DD
  taxAmount?: number;
  notes?: string;
  receiptItems?: ReceiptItemInput[];
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string; // YYYY-MM-DD
  icon: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  userId: string;
  goalId: string;
  sourceAccountId: string;
  recurringRuleId?: string;
  periodKey?: string;
  amount: number;
  contributionDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface RecurringContribution {
  id: string;
  userId: string;
  goalId: string;
  sourceAccountId: string;
  amount: number;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  nextRunDate: string; // YYYY-MM-DD
  lastProcessedDate?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScannedReceiptExtraction {
  isValidReceipt: boolean;
  qualityWarning?: string;
  isDuplicateWarning?: boolean;
  receiptHash: string;
  merchantName: string;
  transactionDate: string;
  totalAmount: number;
  taxAmount?: number;
  items: ReceiptItemInput[];
  suggestedCategory: ExpenseCategoryName;
  categoryReasoning: string;
  rawText?: string;
  extractionSource: 'gemini-vision' | 'ocr-engine';
}

export interface DailySpendingPoint {
  day: number;
  dateLabel: string;
  fullDate: string;
  currentMonthSpend: number;
  previousMonthSpend: number;
  cumulativeCurrent: number;
  cumulativePrevious: number;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategoryName;
  amount: number;
  percentage: number;
  count: number;
  color: string;
  icon: string;
}

export interface MonthlyAnalyticsSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "November 2026"
  previousMonthLabel: string; // e.g. "October 2026"
  totalExpenses: number;
  totalIncome: number;
  previousMonthExpenses: number;
  expenseDifferenceAmount: number;
  expenseDifferencePercent: number | null;
  totalAvailableBalance: number;
  totalSavedInGoals: number;
  dailySeries: DailySpendingPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
}

