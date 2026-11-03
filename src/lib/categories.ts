import {
  AccountType,
  ExpenseCategoryName,
  IncomeCategoryName,
  TransactionCategoryName,
} from '@/types/pennywise';

export interface CategoryMeta {
  name: TransactionCategoryName;
  icon: string;
  color: string;
  bgSoft: string;
  textColor: string;
  type: 'expense' | 'income';
}

export const CATEGORY_METADATA: Record<TransactionCategoryName, CategoryMeta> = {
  'Food & Dining': {
    name: 'Food & Dining',
    icon: 'Utensils',
    color: '#191B19',
    bgSoft: '#EBF0E9',
    textColor: '#191B19',
    type: 'expense',
  },
  Groceries: {
    name: 'Groceries',
    icon: 'ShoppingBasket',
    color: '#6BA353',
    bgSoft: '#EBF5E6',
    textColor: '#2E5A1C',
    type: 'expense',
  },
  Shopping: {
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: '#9CCF3B',
    bgSoft: '#F3FAD8',
    textColor: '#3D570B',
    type: 'expense',
  },
  Transportation: {
    name: 'Transportation',
    icon: 'Car',
    color: '#4A6B5D',
    bgSoft: '#E6F0EC',
    textColor: '#253D33',
    type: 'expense',
  },
  Entertainment: {
    name: 'Entertainment',
    icon: 'Film',
    color: '#8B9D83',
    bgSoft: '#EEF2EC',
    textColor: '#3A4635',
    type: 'expense',
  },
  'Bills & Utilities': {
    name: 'Bills & Utilities',
    icon: 'Zap',
    color: '#D98A3C',
    bgSoft: '#FDF3E7',
    textColor: '#7A4612',
    type: 'expense',
  },
  Healthcare: {
    name: 'Healthcare',
    icon: 'HeartPulse',
    color: '#D65A5A',
    bgSoft: '#FCEEEE',
    textColor: '#7A2323',
    type: 'expense',
  },
  Education: {
    name: 'Education',
    icon: 'GraduationCap',
    color: '#4E7A94',
    bgSoft: '#E9F1F6',
    textColor: '#234559',
    type: 'expense',
  },
  Travel: {
    name: 'Travel',
    icon: 'Plane',
    color: '#3B8276',
    bgSoft: '#E6F3F1',
    textColor: '#1C4D45',
    type: 'expense',
  },
  'Personal Care': {
    name: 'Personal Care',
    icon: 'Sparkles',
    color: '#A27B95',
    bgSoft: '#F5EEF3',
    textColor: '#56384C',
    type: 'expense',
  },
  Luxury: {
    name: 'Luxury',
    icon: 'Gem',
    color: '#5C5446',
    bgSoft: '#F1EFEA',
    textColor: '#363026',
    type: 'expense',
  },
  Other: {
    name: 'Other',
    icon: 'CircleDot',
    color: '#777F77',
    bgSoft: '#ECEFEC',
    textColor: '#444A44',
    type: 'expense',
  },
  Salary: {
    name: 'Salary',
    icon: 'Briefcase',
    color: '#2E7D32',
    bgSoft: '#E8F5E9',
    textColor: '#1B5E20',
    type: 'income',
  },
  Freelance: {
    name: 'Freelance',
    icon: 'Laptop',
    color: '#4E8752',
    bgSoft: '#EBF5EC',
    textColor: '#255228',
    type: 'income',
  },
  Investments: {
    name: 'Investments',
    icon: 'TrendingUp',
    color: '#3A7D6C',
    bgSoft: '#E6F4F0',
    textColor: '#1D4E41',
    type: 'income',
  },
  'Refund / Cashback': {
    name: 'Refund / Cashback',
    icon: 'RotateCcw',
    color: '#689F38',
    bgSoft: '#F1F8E9',
    textColor: '#33691E',
    type: 'income',
  },
  'Other Income': {
    name: 'Other Income',
    icon: 'ArrowDownLeft',
    color: '#558B2F',
    bgSoft: '#EDF6E7',
    textColor: '#2E5414',
    type: 'income',
  },
};

export function getCategoryMeta(category: string): CategoryMeta {
  if (category in CATEGORY_METADATA) {
    return CATEGORY_METADATA[category as TransactionCategoryName];
  }
  return CATEGORY_METADATA.Other;
}

export interface AccountTypeMeta {
  type: AccountType;
  label: string;
  defaultIcon: string;
  badgeColor: string;
  description: string;
}

export const ACCOUNT_TYPE_METADATA: Record<AccountType, AccountTypeMeta> = {
  salary: {
    type: 'salary',
    label: 'Salary Account',
    defaultIcon: 'Landmark',
    badgeColor: '#DFFF52',
    description: 'Primary account for payroll & regular income',
  },
  savings: {
    type: 'savings',
    label: 'Savings Account',
    defaultIcon: 'PiggyBank',
    badgeColor: '#B9D99B',
    description: 'Dedicated account for reserves & long-term funds',
  },
  cash: {
    type: 'cash',
    label: 'Cash Wallet',
    defaultIcon: 'Wallet',
    badgeColor: '#EBF0E9',
    description: 'Physical cash on hand for daily spending',
  },
  personal: {
    type: 'personal',
    label: 'Personal Account',
    defaultIcon: 'CreditCard',
    badgeColor: '#EBF0E9',
    description: 'Everyday personal checking & debit transactions',
  },
  credit: {
    type: 'credit',
    label: 'Card / Digital',
    defaultIcon: 'Smartphone',
    badgeColor: '#EBF0E9',
    description: 'UPI, prepaid card, or digital payment account',
  },
  custom: {
    type: 'custom',
    label: 'Custom Account',
    defaultIcon: 'Briefcase',
    badgeColor: '#EBF0E9',
    description: 'Custom financial bucket or specialized fund',
  },
};

export const GOAL_ICONS = [
  { id: 'smartphone', label: 'Smartphone', icon: 'Smartphone' },
  { id: 'laptop', label: 'Laptop & Tech', icon: 'Laptop' },
  { id: 'gamepad', label: 'Gaming Console', icon: 'Gamepad2' },
  { id: 'vacation', label: 'Vacation & Travel', icon: 'Plane' },
  { id: 'car', label: 'Vehicle', icon: 'Car' },
  { id: 'home', label: 'Home & Living', icon: 'Home' },
  { id: 'watch', label: 'Luxury & Watch', icon: 'Watch' },
  { id: 'education', label: 'Course & Study', icon: 'GraduationCap' },
  { id: 'shield', label: 'Emergency Fund', icon: 'ShieldCheck' },
  { id: 'gift', label: 'Special Purchase', icon: 'Gift' },
] as const;

export const ACCOUNT_ICONS = [
  { id: 'Landmark', label: 'Bank' },
  { id: 'Wallet', label: 'Wallet' },
  { id: 'PiggyBank', label: 'Savings' },
  { id: 'CreditCard', label: 'Card' },
  { id: 'Smartphone', label: 'Digital / UPI' },
  { id: 'Banknote', label: 'Cash' },
  { id: 'Briefcase', label: 'Business' },
  { id: 'ShieldCheck', label: 'Vault' },
] as const;

