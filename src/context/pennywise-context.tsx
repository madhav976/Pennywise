'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Account,
  AccountType,
  ExpenseCategoryName,
  GoalContribution,
  MonthlyAnalyticsSummary,
  ReceiptItemInput,
  ReceiptRecord,
  RecurringContribution,
  RecurringFrequency,
  SavingsGoal,
  Transaction,
  TransactionCategoryName,
  TransactionType,
  UserProfile,
} from '@/types/pennywise';
import {
  advanceDateByFrequency,
  canSafelyDeleteAccount,
  computeMonthlyAnalytics,
  getPeriodKeyForDate,
  roundMoney,
  synchronizeBalances,
} from '@/lib/money';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  createAccountServerAction,
  createTransactionServerAction,
  fetchUserLedgerAction,
} from '@/app/actions/pennywise-actions';

export type NavTab = 'home' | 'transactions' | 'goals' | 'accounts';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface LedgerState {
  accounts: Account[];
  transactions: Transaction[];
  receipts: ReceiptRecord[];
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  recurringRules: RecurringContribution[];
}

interface PennywiseContextValue {
  user: UserProfile | null;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  isSupabaseConnected: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  accounts: Account[];
  transactions: Transaction[];
  receipts: ReceiptRecord[];
  goals: SavingsGoal[];
  contributions: GoalContribution[];
  recurringRules: RecurringContribution[];
  monthlyAnalytics: MonthlyAnalyticsSummary;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  showToast: (type: ToastMessage['type'], title: string, description?: string) => void;

  // Navigation & Action Sheet triggers
  isAddExpenseSheetOpen: boolean;
  setIsAddExpenseSheetOpen: (open: boolean) => void;
  activeAddMode: 'chooser' | 'scan' | 'manual' | null;
  openAddFlow: (mode?: 'chooser' | 'scan' | 'manual') => void;
  closeAddFlow: () => void;

  // Filter presets when navigating from Accounts or Categories
  transactionFilters: {
    month: string; // 'all' or YYYY-MM
    category: string; // 'all' or CategoryName
    accountId: string; // 'all' or AccountId
    search: string;
  };
  setTransactionFilters: React.Dispatch<
    React.SetStateAction<{
      month: string;
      category: string;
      accountId: string;
      search: string;
    }>
  >;

  // Auth actions
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
    currency?: string
  ) => Promise<{ ok: boolean; error?: string; requiresConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { fullName?: string; currency?: string }) => void;
  sendPasswordResetEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>;

  // Module 4: Accounts
  createAccount: (input: {
    name: string;
    accountType: AccountType;
    openingBalance: number;
    monthlyIncome?: number;
    icon: string;
    description?: string;
  }) => Promise<{ ok: boolean; error?: string; account?: Account }>;
  updateAccount: (
    id: string,
    updates: {
      name: string;
      accountType: AccountType;
      openingBalance: number;
      icon: string;
      description?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Module 1 & 2: Transactions & Receipts
  isReceiptHashDuplicate: (hash: string) => boolean;
  addTransaction: (input: {
    accountId: string;
    title: string;
    amount: number;
    transactionType: TransactionType;
    category: TransactionCategoryName;
    transactionDate: string;
    taxAmount?: number;
    notes?: string;
    receipt?: {
      merchantName: string;
      receiptDate: string;
      totalAmount: number;
      taxAmount?: number;
      suggestedCategory: ExpenseCategoryName;
      receiptHash: string;
      rawOcrText?: string;
      items: ReceiptItemInput[];
    };
  }) => Promise<{ ok: boolean; error?: string; transaction?: Transaction }>;
  updateTransaction: (
    id: string,
    updates: {
      accountId: string;
      title: string;
      amount: number;
      transactionType: TransactionType;
      category: TransactionCategoryName;
      transactionDate: string;
      taxAmount?: number;
      notes?: string;
      receiptItems?: ReceiptItemInput[];
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteTransaction: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Module 3: Savings Goals & Contributions
  createGoal: (input: {
    name: string;
    targetAmount: number;
    targetDate?: string;
    icon: string;
    initialContribution?: number;
    sourceAccountId?: string;
  }) => Promise<{ ok: boolean; error?: string; goal?: SavingsGoal }>;
  updateGoal: (
    id: string,
    updates: {
      name: string;
      targetAmount: number;
      targetDate?: string;
      icon: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteGoal: (id: string) => Promise<{ ok: boolean; error?: string }>;
  contributeToGoal: (input: {
    goalId: string;
    sourceAccountId: string;
    amount: number;
    contributionDate?: string;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  saveRecurringContribution: (input: {
    goalId: string;
    sourceAccountId: string;
    amount: number;
    frequency: RecurringFrequency;
    startDate: string;
    isEnabled: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  toggleRecurringContribution: (
    ruleId: string,
    isEnabled: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteRecurringContribution: (ruleId: string) => Promise<{ ok: boolean; error?: string }>;
  processDueRecurringContributions: () => Promise<{ processedCount: number }>;
}

const PennywiseContext = createContext<PennywiseContextValue | null>(null);

const AUTH_SESSION_STORAGE_KEY = 'pennywise_active_user_v1';
const AUTH_SIGNED_OUT_FLAG_KEY = 'pennywise_signed_out_v1';
const USERS_REGISTRY_STORAGE_KEY = 'pennywise_users_registry_v1';

const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'usr-pennywise-default',
  email: 'personal@pennywise.app',
  fullName: 'Personal Workspace',
  currency: 'INR',
  createdAt: '2026-11-01T00:00:00.000Z',
};

function getLedgerStorageKey(userId: string): string {
  return `pennywise_ledger_v1_${userId}`;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

const EMPTY_LEDGER: LedgerState = {
  accounts: [],
  transactions: [],
  receipts: [],
  goals: [],
  contributions: [],
  recurringRules: [],
};

export function PennywiseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activeTab, setActiveTabState] = useState<NavTab>('home');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [ledger, setLedger] = useState<LedgerState>(EMPTY_LEDGER);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isAddExpenseSheetOpen, setIsAddExpenseSheetOpen] = useState(false);
  const [activeAddMode, setActiveAddMode] = useState<'chooser' | 'scan' | 'manual' | null>(
    null
  );

  const [transactionFilters, setTransactionFilters] = useState({
    month: 'all',
    category: 'all',
    accountId: 'all',
    search: '',
  });

  const isSupabaseConnected = useMemo(() => isSupabaseConfigured(), []);

  // Synchronize page navigation and modal states with browser back/forward history
  const setActiveTab = useCallback((nextTab: NavTab) => {
    setActiveTabState((prevTab) => {
      if (prevTab !== nextTab && typeof window !== 'undefined') {
        try {
          window.history.pushState(
            { pwTab: nextTab, pwAddSheet: false, pwAddMode: null },
            '',
            `#${nextTab}`
          );
        } catch {
          // Ignore history push errors in restricted environments
        }
      }
      return nextTab;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed initial history state if none exists
    const initialHash = window.location.hash.replace('#', '') as NavTab;
    const validTabs: NavTab[] = ['home', 'transactions', 'goals', 'accounts'];
    const startingTab: NavTab = validTabs.includes(initialHash) ? initialHash : 'home';

    if (startingTab !== 'home') {
      setActiveTabState(startingTab);
    }

    try {
      window.history.replaceState(
        { pwTab: startingTab, pwAddSheet: false, pwAddMode: null },
        '',
        window.location.hash || '#home'
      );
    } catch {
      // Ignore history errors
    }

    function handlePopState(event: PopStateEvent) {
      const state = event.state;
      if (state && typeof state.pwTab === 'string') {
        const valid: NavTab[] = ['home', 'transactions', 'goals', 'accounts'];
        if (valid.includes(state.pwTab as NavTab)) {
          setActiveTabState(state.pwTab as NavTab);
        }
        if (state.pwAddSheet && state.pwAddMode) {
          setActiveAddMode(state.pwAddMode);
          setIsAddExpenseSheetOpen(true);
        } else {
          setIsAddExpenseSheetOpen(false);
          setActiveAddMode(null);
        }
      } else {
        const hashTab = window.location.hash.replace('#', '') as NavTab;
        const valid: NavTab[] = ['home', 'transactions', 'goals', 'accounts'];
        if (valid.includes(hashTab)) {
          setActiveTabState(hashTab);
        }
        setIsAddExpenseSheetOpen(false);
        setActiveAddMode(null);
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openAddFlow = useCallback(
    (mode: 'chooser' | 'scan' | 'manual' = 'chooser') => {
      setActiveAddMode(mode);
      setIsAddExpenseSheetOpen(true);
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState(
            { pwTab: activeTab, pwAddSheet: true, pwAddMode: mode },
            '',
            `#${activeTab}`
          );
        } catch {
          // Ignore
        }
      }
    },
    [activeTab]
  );

  const closeAddFlow = useCallback(() => {
    setIsAddExpenseSheetOpen(false);
    setActiveAddMode(null);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(
          { pwTab: activeTab, pwAddSheet: false, pwAddMode: null },
          '',
          `#${activeTab}`
        );
      } catch {
        // Ignore
      }
    }
  }, [activeTab]);

  const persistLedger = useCallback((userId: string, nextLedger: LedgerState) => {
    const synced = synchronizeBalances(
      nextLedger.accounts,
      nextLedger.transactions,
      nextLedger.goals,
      nextLedger.contributions
    );
    const finalState: LedgerState = {
      ...nextLedger,
      accounts: synced.accounts,
      goals: synced.goals,
    };
    setLedger(finalState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getLedgerStorageKey(userId), JSON.stringify(finalState));
      } catch (e) {
        console.warn('Failed to persist local ledger mirror:', e);
      }
    }
    return finalState;
  }, []);

  // Load initial authentication & user ledger
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        setIsDataLoading(true);

        // Fetch authoritative database ledger and user profile from /api/ledger
        const res = await fetch('/api/ledger');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (mounted) {
              setUser(json.data.user);
              persistLedger(json.data.user.id, json.data.ledger);
            }
          }
        } else if (typeof window !== 'undefined') {
          // Local storage fallback for offline / unconfigured demo mode
          const savedUserRaw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
          if (savedUserRaw && mounted) {
            const parsedUser: UserProfile = JSON.parse(savedUserRaw);
            if (parsedUser?.id) {
              setUser(parsedUser);
              const savedLedgerRaw = localStorage.getItem(getLedgerStorageKey(parsedUser.id));
              if (savedLedgerRaw) {
                const parsedLedger: LedgerState = JSON.parse(savedLedgerRaw);
                persistLedger(parsedUser.id, {
                  accounts: parsedLedger.accounts || [],
                  transactions: parsedLedger.transactions || [],
                  receipts: parsedLedger.receipts || [],
                  goals: parsedLedger.goals || [],
                  contributions: parsedLedger.contributions || [],
                  recurringRules: parsedLedger.recurringRules || [],
                });
              }
            }
          }
        }

        // Real-time auth state subscription if Supabase client is available
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          if (supabase) {
            const {
              data: { subscription },
            } = supabase.auth.onAuthStateChange(async (event, session) => {
              if (!mounted) return;
              if (session?.user || event === 'SIGNED_IN') {
                const refreshRes = await fetch('/api/ledger');
                if (refreshRes.ok) {
                  const rJson = await refreshRes.json();
                  if (rJson.success && rJson.data && mounted) {
                    setUser(rJson.data.user);
                    persistLedger(rJson.data.user.id, rJson.data.ledger);
                  }
                }
              } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLedger(EMPTY_LEDGER);
              }
            });

            return () => {
              subscription.unsubscribe();
            };
          }
        }
      } catch (err) {
        console.warn('Session initialization warning:', err);
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
          setIsDataLoading(false);
        }
      }
    }

    initSession();
    return () => {
      mounted = false;
    };
  }, [persistLedger]);

  // Auth Actions
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        return { ok: false, error: 'Please enter both email and password.' };
      }

      // 1. Try server-side login endpoint first to establish HTTP session cookies
      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (loginRes.ok) {
          const lJson = await loginRes.json();
          if (lJson.success && lJson.user) {
            if (isSupabaseConfigured()) {
              const supabase = createClient();
              if (supabase) {
                await supabase.auth.signInWithPassword({
                  email: cleanEmail,
                  password,
                }).catch(() => {});
              }
            }

            const profile: UserProfile = {
              id: lJson.user.id,
              email: lJson.user.email,
              fullName: lJson.user.fullName,
              currency: lJson.user.currency,
              createdAt: new Date().toISOString(),
            };

            const ledgerRes = await fetch('/api/ledger');
            if (ledgerRes.ok) {
              const ledJson = await ledgerRes.json();
              if (ledJson.success && ledJson.data) {
                persistLedger(profile.id, ledJson.data.ledger);
              }
            }

            setUser(profile);
            localStorage.removeItem(AUTH_SIGNED_OUT_FLAG_KEY);
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));
            showToast('success', `Welcome back, ${profile.fullName}`);
            return { ok: true };
          }
        } else {
          const errJson = await loginRes.json().catch(() => ({}));
          if (loginRes.status === 401 || (errJson.error && !errJson.error.includes('not configured'))) {
            return { ok: false, error: errJson.error || 'Invalid email or password.' };
          }
        }
      } catch {
        // Fall back to direct client-side Supabase authentication
      }

      // 2. Client-side Supabase authentication fallback
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (error) {
            return { ok: false, error: error.message };
          }

          if (data.user) {
            let profile: UserProfile = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              fullName:
                data.user.user_metadata?.full_name ||
                cleanEmail.split('@')[0] ||
                'Pennywise User',
              currency: data.user.user_metadata?.currency || 'INR',
              createdAt: data.user.created_at,
            };

            const ledgerRes = await fetch('/api/ledger');
            if (ledgerRes.ok) {
              const lJson = await ledgerRes.json();
              if (lJson.success && lJson.data) {
                profile = lJson.data.user;
                persistLedger(profile.id, lJson.data.ledger);
              }
            }

            setUser(profile);
            localStorage.removeItem(AUTH_SIGNED_OUT_FLAG_KEY);
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));
            showToast('success', `Welcome back, ${profile.fullName}`);
            return { ok: true };
          }
        }
      }

      return {
        ok: false,
        error: 'Invalid email or password. Please verify your credentials.',
      };
    },
    [persistLedger, showToast]
  );

  const signUp = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      currency: string = 'INR'
    ): Promise<{ ok: boolean; error?: string; requiresConfirmation?: boolean }> => {
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName) return { ok: false, error: 'Please enter your name.' };
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (password.length < 8) {
        return { ok: false, error: 'Password must be at least 8 characters.' };
      }

      // 1. Call dedicated server signup endpoint to create auth user and insert into public.profiles
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: cleanName,
            email: cleanEmail,
            password,
            currency,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          return {
            ok: false,
            error: json.error || 'Failed to create your account in Supabase.',
          };
        }

        // 2. Automatically log in via server login endpoint to establish session cookies
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (loginData.success && loginData.user) {
            if (isSupabaseConfigured()) {
              const supabase = createClient();
              if (supabase) {
                await supabase.auth.signInWithPassword({
                  email: cleanEmail,
                  password,
                }).catch(() => {});
              }
            }

            const profile: UserProfile = {
              id: loginData.user.id,
              email: cleanEmail,
              fullName: cleanName,
              currency,
              createdAt: new Date().toISOString(),
            };
            setUser(profile);
            localStorage.removeItem(AUTH_SIGNED_OUT_FLAG_KEY);
            localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(profile));

            const lRes = await fetch('/api/ledger');
            if (lRes.ok) {
              const lJson = await lRes.json();
              if (lJson.success && lJson.data) {
                persistLedger(profile.id, lJson.data.ledger);
              } else {
                persistLedger(profile.id, EMPTY_LEDGER);
              }
            } else {
              persistLedger(profile.id, EMPTY_LEDGER);
            }

            showToast('success', 'Account created! Welcome to Pennywise.');
            return { ok: true, requiresConfirmation: false };
          }
        }

        return {
          ok: true,
          requiresConfirmation: Boolean(json.requiresConfirmation),
        };
      } catch (apiErr: any) {
        return {
          ok: false,
          error: apiErr?.message || 'Network error connecting to signup service.',
        };
      }
    },
    [persistLedger, showToast]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    }
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    localStorage.setItem(AUTH_SIGNED_OUT_FLAG_KEY, 'true');
    setUser(null);
    setLedger(EMPTY_LEDGER);
    setActiveTab('home');
    showToast('info', 'Signed out securely');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [showToast, setActiveTab]);

  const sendPasswordResetEmail = useCallback(
    async (email: string): Promise<{ ok: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { ok: false, error: 'Please enter your email address.' };
      }

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: `${origin}/auth/callback?type=recovery`,
          });
          if (error) {
            return { ok: false, error: error.message };
          }
          showToast('success', 'Reset instructions sent to your email');
          return { ok: true };
        }
      }

      showToast('info', 'Password reset instructions sent');
      return { ok: true };
    },
    [showToast]
  );

  const updatePassword = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      if (!password || password.length < 8) {
        return { ok: false, error: 'Password must be at least 8 characters.' };
      }

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          const { error } = await supabase.auth.updateUser({
            password,
          });
          if (error) {
            return { ok: false, error: error.message };
          }
          showToast('success', 'Password updated successfully');
          return { ok: true };
        }
      }

      showToast('success', 'Password updated successfully');
      return { ok: true };
    },
    [showToast]
  );

  const updateProfile = useCallback(
    async (updates: { fullName?: string; currency?: string }) => {
      if (!user) return;
      const updated: UserProfile = {
        ...user,
        fullName: updates.fullName?.trim() || user.fullName,
        currency: updates.currency || user.currency,
      };
      setUser(updated);

      try {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: updated.fullName,
            currency: updated.currency,
          }),
        });
      } catch (e) {
        console.warn('Failed to persist profile to server:', e);
      }

      showToast('success', 'Profile preferences updated');
    },
    [user, showToast]
  );

  // Module 4: Account Management
  const createAccount = useCallback(
    async (input: {
      name: string;
      accountType: AccountType;
      openingBalance: number;
      monthlyIncome?: number;
      icon: string;
      description?: string;
    }) => {
      if (!user) return { ok: false, error: 'Please sign in first.' };
      const trimmedName = input.name.trim();
      if (!trimmedName) return { ok: false, error: 'Account name is required.' };
      if (isNaN(input.openingBalance) || input.openingBalance < 0) {
        return { ok: false, error: 'Opening balance must be 0 or greater.' };
      }

      const duplicate = ledger.accounts.some(
        (a) => a.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return { ok: false, error: `An account named "${trimmedName}" already exists.` };
      }

      const parsedMonthlyIncome =
        input.monthlyIncome !== undefined && !isNaN(input.monthlyIncome)
          ? roundMoney(Math.max(0, input.monthlyIncome))
          : undefined;

      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            accountType: input.accountType,
            openingBalance: roundMoney(input.openingBalance),
            monthlyIncome: parsedMonthlyIncome,
            icon: input.icon || 'Landmark',
            description: input.description?.trim(),
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to create account';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const newAcc: Account = json.data;
        persistLedger(user.id, {
          ...ledger,
          accounts: [...ledger.accounts, newAcc],
        });

        showToast('success', `${trimmedName} created`);
        return { ok: true, account: newAcc };
      } catch (err: any) {
        const msg = err.message || 'Network error creating account';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const updateAccount = useCallback(
    async (
      id: string,
      updates: {
        name: string;
        accountType: AccountType;
        openingBalance: number;
        icon: string;
        description?: string;
      }
    ) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      const trimmedName = updates.name.trim();
      if (!trimmedName) return { ok: false, error: 'Account name is required.' };
      if (isNaN(updates.openingBalance) || updates.openingBalance < 0) {
        return { ok: false, error: 'Opening balance must be 0 or greater.' };
      }

      try {
        const res = await fetch(`/api/accounts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmedName,
            accountType: updates.accountType,
            openingBalance: roundMoney(updates.openingBalance),
            icon: updates.icon || 'Landmark',
            description: updates.description?.trim(),
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to update account';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const updatedAccount: Account = json.data;
        persistLedger(user.id, {
          ...ledger,
          accounts: ledger.accounts.map((a) => (a.id === id ? updatedAccount : a)),
        });

        showToast('success', `${trimmedName} updated`);
        return { ok: true, account: updatedAccount };
      } catch (err: any) {
        const msg = err.message || 'Error updating account';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      if (!user) return { ok: false, error: 'Not signed in.' };

      const safety = canSafelyDeleteAccount(id, ledger.transactions, ledger.contributions);
      if (!safety.allowed) {
        showToast('error', 'Cannot delete account', safety.reason);
        return { ok: false, error: safety.reason };
      }

      const hasRecurring = ledger.recurringRules.some((r) => r.sourceAccountId === id);
      if (hasRecurring) {
        const msg =
          'This account is linked to an automated savings contribution rule. Remove or reassign that rule first.';
        showToast('error', 'Cannot delete account', msg);
        return { ok: false, error: msg };
      }

      try {
        const res = await fetch(`/api/accounts/${id}`, {
          method: 'DELETE',
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to delete account';
          showToast('error', err);
          return { ok: false, error: err };
        }

        persistLedger(user.id, {
          ...ledger,
          accounts: ledger.accounts.filter((a) => a.id !== id),
        });

        showToast('info', 'Account deleted');
        return { ok: true };
      } catch (err: any) {
        const msg = err.message || 'Error deleting account';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  // Module 1 & 2: Transactions & Receipts
  const isReceiptHashDuplicate = useCallback(
    (hash: string) => {
      if (!hash) return false;
      return ledger.receipts.some((r) => r.receiptHash === hash);
    },
    [ledger.receipts]
  );

  const addTransaction = useCallback(
    async (input: {
      accountId: string;
      title: string;
      amount: number;
      transactionType: TransactionType;
      category: TransactionCategoryName;
      transactionDate: string;
      taxAmount?: number;
      notes?: string;
      receipt?: {
        merchantName: string;
        receiptDate: string;
        totalAmount: number;
        taxAmount?: number;
        suggestedCategory: ExpenseCategoryName;
        receiptHash: string;
        rawOcrText?: string;
        items: ReceiptItemInput[];
      };
    }) => {
      if (!user) return { ok: false, error: 'Please sign in first.' };
      if (!input.accountId) {
        return {
          ok: false,
          error: 'Please select an account. Every transaction must be linked to an account.',
        };
      }

      const targetAccount = ledger.accounts.find((a) => a.id === input.accountId);
      if (!targetAccount) {
        return { ok: false, error: 'Selected account was not found.' };
      }

      const cleanTitle = input.title.trim();
      if (!cleanTitle) {
        return { ok: false, error: 'Please enter a merchant or expense title.' };
      }

      const cleanAmount = roundMoney(input.amount);
      if (cleanAmount <= 0) {
        return { ok: false, error: 'Amount must be greater than zero.' };
      }

      if (input.receipt && isReceiptHashDuplicate(input.receipt.receiptHash)) {
        return {
          ok: false,
          error: 'This receipt has already been recorded. Duplicate receipt prevented.',
        };
      }

      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: input.accountId,
            title: cleanTitle,
            amount: cleanAmount,
            transactionType: input.transactionType,
            category: input.category,
            transactionDate: input.transactionDate,
            taxAmount: input.taxAmount,
            notes: input.notes?.trim(),
            receipt: input.receipt,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to record transaction';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const newTx: Transaction = json.data;
        const updatedAcc = json.updatedAccount;

        let nextReceipts = ledger.receipts;
        if (input.receipt && newTx.receiptId) {
          const newReceipt: ReceiptRecord = {
            id: newTx.receiptId,
            userId: user.id,
            merchantName: input.receipt.merchantName,
            receiptDate: input.receipt.receiptDate,
            totalAmount: roundMoney(input.receipt.totalAmount),
            taxAmount:
              input.receipt.taxAmount !== undefined
                ? roundMoney(input.receipt.taxAmount)
                : undefined,
            suggestedCategory: input.receipt.suggestedCategory,
            receiptHash: input.receipt.receiptHash,
            rawOcrText: input.receipt.rawOcrText,
            items: input.receipt.items,
            createdAt: newTx.createdAt,
          };
          nextReceipts = [newReceipt, ...ledger.receipts];
        }

        const nextAccounts = updatedAcc
          ? ledger.accounts.map((a) =>
              a.id === updatedAcc.id ? { ...a, currentBalance: updatedAcc.currentBalance } : a
            )
          : ledger.accounts;

        const nextTransactions = [newTx, ...ledger.transactions].sort(
          (a, b) =>
            b.transactionDate.localeCompare(a.transactionDate) ||
            b.createdAt.localeCompare(a.createdAt)
        );

        persistLedger(user.id, {
          ...ledger,
          accounts: nextAccounts,
          receipts: nextReceipts,
          transactions: nextTransactions,
        });

        const txMonth = input.transactionDate.slice(0, 7);
        if (txMonth) {
          setSelectedMonth(txMonth);
        }

        showToast(
          'success',
          input.transactionType === 'expense' ? 'Expense recorded' : 'Income credited',
          `${cleanTitle} · ${targetAccount.name}`
        );
        return { ok: true, transaction: newTx };
      } catch (err: any) {
        const msg = err.message || 'Error recording transaction';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, isReceiptHashDuplicate, persistLedger, showToast]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      updates: {
        accountId: string;
        title: string;
        amount: number;
        transactionType: TransactionType;
        category: TransactionCategoryName;
        transactionDate: string;
        taxAmount?: number;
        notes?: string;
        receiptItems?: ReceiptItemInput[];
      }
    ) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      if (!updates.accountId) return { ok: false, error: 'Account is required.' };
      const cleanTitle = updates.title.trim();
      if (!cleanTitle) return { ok: false, error: 'Title is required.' };
      const cleanAmount = roundMoney(updates.amount);
      if (cleanAmount <= 0) return { ok: false, error: 'Amount must be greater than zero.' };

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: updates.accountId,
            title: cleanTitle,
            amount: cleanAmount,
            category: updates.category,
            transactionDate: updates.transactionDate,
            taxAmount: updates.taxAmount,
            notes: updates.notes,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to update transaction';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const updatedTx: Transaction = json.data;
        const updatedAcc = json.updatedAccount;

        const nextAccounts = updatedAcc
          ? ledger.accounts.map((a) =>
              a.id === updatedAcc.id ? { ...a, currentBalance: updatedAcc.currentBalance } : a
            )
          : ledger.accounts;

        const nextTransactions = ledger.transactions
          .map((tx) => (tx.id === id ? updatedTx : tx))
          .sort(
            (a, b) =>
              b.transactionDate.localeCompare(a.transactionDate) ||
              b.createdAt.localeCompare(a.createdAt)
          );

        persistLedger(user.id, {
          ...ledger,
          accounts: nextAccounts,
          transactions: nextTransactions,
        });

        showToast('success', 'Transaction updated');
        return { ok: true, transaction: updatedTx };
      } catch (err: any) {
        const msg = err.message || 'Error updating transaction';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      const target = ledger.transactions.find((t) => t.id === id);
      if (!target) return { ok: false, error: 'Transaction not found.' };

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to delete transaction';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const updatedAcc = json.updatedAccount;
        const nextAccounts = updatedAcc
          ? ledger.accounts.map((a) =>
              a.id === updatedAcc.id ? { ...a, currentBalance: updatedAcc.currentBalance } : a
            )
          : ledger.accounts;

        persistLedger(user.id, {
          ...ledger,
          accounts: nextAccounts,
          transactions: ledger.transactions.filter((t) => t.id !== id),
          receipts: target.receiptId
            ? ledger.receipts.filter((r) => r.id !== target.receiptId)
            : ledger.receipts,
        });

        showToast('info', 'Transaction deleted & balance restored');
        return { ok: true };
      } catch (err: any) {
        const msg = err.message || 'Error deleting transaction';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  // Module 3: Savings Goals & Contributions
  const createGoal = useCallback(
    async (input: {
      name: string;
      targetAmount: number;
      targetDate?: string;
      icon: string;
      initialContribution?: number;
      sourceAccountId?: string;
    }) => {
      if (!user) return { ok: false, error: 'Please sign in first.' };
      const cleanName = input.name.trim();
      if (!cleanName) return { ok: false, error: 'Goal name is required.' };
      const targetAmt = roundMoney(input.targetAmount);
      if (targetAmt <= 0) return { ok: false, error: 'Target amount must be greater than zero.' };

      const initContrib = roundMoney(input.initialContribution || 0);
      if (initContrib > 0) {
        if (!input.sourceAccountId) {
          return {
            ok: false,
            error: 'Please select a source account for your initial contribution.',
          };
        }
        const sourceAcc = ledger.accounts.find((a) => a.id === input.sourceAccountId);
        if (!sourceAcc) {
          return { ok: false, error: 'Selected source account was not found.' };
        }
        if (sourceAcc.currentBalance < initContrib) {
          return {
            ok: false,
            error: `Insufficient available funds in ${sourceAcc.name} for the initial contribution.`,
          };
        }
      }

      try {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            targetAmount: targetAmt,
            targetDate: input.targetDate,
            icon: input.icon || 'smartphone',
            initialContribution: initContrib,
            initialSourceAccountId: input.sourceAccountId,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to create savings goal';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const newGoal: SavingsGoal = json.data;
        const contribRecord = json.contribution;
        const updatedAcc = json.updatedAccount;

        const nextAccounts = updatedAcc
          ? ledger.accounts.map((a) =>
              a.id === updatedAcc.id ? { ...a, currentBalance: updatedAcc.currentBalance } : a
            )
          : ledger.accounts;

        const nextContributions = contribRecord
          ? [contribRecord, ...ledger.contributions]
          : ledger.contributions;

        persistLedger(user.id, {
          ...ledger,
          accounts: nextAccounts,
          goals: [...ledger.goals, newGoal],
          contributions: nextContributions,
        });

        showToast('success', `Goal "${cleanName}" created`);
        return { ok: true, goal: newGoal };
      } catch (err: any) {
        const msg = err.message || 'Error creating goal';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const updateGoal = useCallback(
    async (
      id: string,
      updates: {
        name: string;
        targetAmount: number;
        targetDate?: string;
        icon: string;
      }
    ) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      const cleanName = updates.name.trim();
      if (!cleanName) return { ok: false, error: 'Goal name is required.' };
      const targetAmt = roundMoney(updates.targetAmount);
      if (targetAmt <= 0) return { ok: false, error: 'Target amount must be greater than zero.' };

      try {
        const res = await fetch(`/api/goals/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            targetAmount: targetAmt,
            targetDate: updates.targetDate,
            icon: updates.icon || 'smartphone',
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to update goal';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const updatedGoal: SavingsGoal = json.data;
        persistLedger(user.id, {
          ...ledger,
          goals: ledger.goals.map((g) => (g.id === id ? updatedGoal : g)),
        });

        showToast('success', 'Savings goal updated');
        return { ok: true, goal: updatedGoal };
      } catch (err: any) {
        const msg = err.message || 'Error updating goal';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (!user) return { ok: false, error: 'Not signed in.' };

      try {
        const res = await fetch(`/api/goals/${id}`, {
          method: 'DELETE',
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to delete goal';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const updatedAccountsList: Array<{ id: string; currentBalance: number }> =
          json.updatedAccounts || [];

        const nextAccounts = ledger.accounts.map((a) => {
          const matched = updatedAccountsList.find((u) => u.id === a.id);
          return matched ? { ...a, currentBalance: matched.currentBalance } : a;
        });

        persistLedger(user.id, {
          ...ledger,
          accounts: nextAccounts,
          goals: ledger.goals.filter((g) => g.id !== id),
          contributions: ledger.contributions.filter((c) => c.goalId !== id),
          recurringRules: ledger.recurringRules.filter((r) => r.goalId !== id),
        });

        showToast('info', 'Goal removed & allocated funds returned to accounts');
        return { ok: true };
      } catch (err: any) {
        const msg = err.message || 'Error deleting goal';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const contributeToGoal = useCallback(
    async (input: {
      goalId: string;
      sourceAccountId: string;
      amount: number;
      contributionDate?: string;
      notes?: string;
    }) => {
      if (!user) return { ok: false, error: 'Please sign in first.' };
      const goal = ledger.goals.find((g) => g.id === input.goalId);
      if (!goal) return { ok: false, error: 'Savings goal not found.' };

      const account = ledger.accounts.find((a) => a.id === input.sourceAccountId);
      if (!account) return { ok: false, error: 'Please select a valid source account.' };

      const amt = roundMoney(input.amount);
      if (amt <= 0) return { ok: false, error: 'Contribution amount must be greater than zero.' };

      if (account.currentBalance < amt) {
        return {
          ok: false,
          error: `Insufficient available balance in ${account.name} (Available: ${account.currentBalance}).`,
        };
      }

      try {
        const res = await fetch('/api/goals/contributions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId: input.goalId,
            sourceAccountId: input.sourceAccountId,
            amount: amt,
            contributionDate: input.contributionDate,
            notes: input.notes?.trim(),
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to record contribution';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const newContrib: GoalContribution = json.data;
        const updatedAcc = json.updatedAccount;
        const updatedGoal = json.updatedGoal;

        const nextAccounts = updatedAcc
          ? ledger.accounts.map((a) =>
              a.id === updatedAcc.id ? { ...a, currentBalance: updatedAcc.currentBalance } : a
            )
          : ledger.accounts;

        const nextGoals = updatedGoal
          ? ledger.goals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
          : ledger.goals;

        persistLedger(user.id, {
          ...ledger,
          accounts: nextAccounts,
          goals: nextGoals,
          contributions: [newContrib, ...ledger.contributions],
        });

        showToast('success', `Allocated to ${goal.name}`, `From ${account.name}`);
        return { ok: true };
      } catch (err: any) {
        const msg = err.message || 'Error recording contribution';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const saveRecurringContribution = useCallback(
    async (input: {
      goalId: string;
      sourceAccountId: string;
      amount: number;
      frequency: RecurringFrequency;
      startDate: string;
      isEnabled: boolean;
    }) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      if (!input.sourceAccountId) {
        return { ok: false, error: 'Please select a source account.' };
      }
      const amt = roundMoney(input.amount);
      if (amt <= 0) {
        return { ok: false, error: 'Contribution amount must be greater than zero.' };
      }

      try {
        const res = await fetch('/api/goals/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId: input.goalId,
            sourceAccountId: input.sourceAccountId,
            amount: amt,
            frequency: input.frequency,
            startDate: input.startDate,
            isEnabled: input.isEnabled,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to save recurring schedule';
          showToast('error', err);
          return { ok: false, error: err };
        }

        const savedRule: RecurringContribution = json.data;
        const otherRules = ledger.recurringRules.filter((r) => r.goalId !== input.goalId);

        persistLedger(user.id, {
          ...ledger,
          recurringRules: [...otherRules, savedRule],
        });

        showToast(
          'success',
          input.isEnabled
            ? 'Automated savings allocation enabled'
            : 'Automated savings allocation paused'
        );
        return { ok: true, rule: savedRule };
      } catch (err: any) {
        const msg = err.message || 'Error saving recurring schedule';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const toggleRecurringContribution = useCallback(
    async (ruleId: string, isEnabled: boolean) => {
      if (!user) return { ok: false, error: 'Not signed in.' };
      const rule = ledger.recurringRules.find((r) => r.id === ruleId);
      if (!rule) return { ok: false, error: 'Recurring rule not found.' };

      try {
        const res = await fetch('/api/goals/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId: rule.goalId,
            sourceAccountId: rule.sourceAccountId,
            amount: rule.amount,
            frequency: rule.frequency,
            startDate: rule.startDate,
            isEnabled,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to toggle recurring schedule';
          showToast('error', err);
          return { ok: false, error: err };
        }

        persistLedger(user.id, {
          ...ledger,
          recurringRules: ledger.recurringRules.map((r) =>
            r.id === ruleId ? { ...r, isEnabled, updatedAt: new Date().toISOString() } : r
          ),
        });

        showToast(
          'info',
          isEnabled ? 'Recurring contribution enabled' : 'Recurring contribution paused'
        );
        return { ok: true };
      } catch (err: any) {
        const msg = err.message || 'Error toggling recurring rule';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const deleteRecurringContribution = useCallback(
    async (ruleId: string) => {
      if (!user) return { ok: false, error: 'Not signed in.' };

      try {
        const res = await fetch(`/api/goals/recurring?id=${ruleId}`, {
          method: 'DELETE',
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          const err = json.error || 'Failed to delete schedule';
          showToast('error', err);
          return { ok: false, error: err };
        }

        persistLedger(user.id, {
          ...ledger,
          recurringRules: ledger.recurringRules.filter((r) => r.id !== ruleId),
        });

        showToast('info', 'Automated contribution rule removed');
        return { ok: true };
      } catch (err: any) {
        const msg = err.message || 'Error deleting recurring schedule';
        showToast('error', msg);
        return { ok: false, error: msg };
      }
    },
    [user, ledger, persistLedger, showToast]
  );

  const processDueRecurringContributions = useCallback(async () => {
    if (!user) return { processedCount: 0 };
    const today = new Date().toISOString().slice(0, 10);

    let workingAccounts = [...ledger.accounts];
    let workingGoals = [...ledger.goals];
    const workingContributions = [...ledger.contributions];
    const workingRules = [...ledger.recurringRules];
    let processedCount = 0;

    for (let i = 0; i < workingRules.length; i++) {
      const rule = { ...workingRules[i] };
      if (!rule.isEnabled) continue;

      let safetyCounter = 0;
      while (rule.nextRunDate <= today && safetyCounter < 12) {
        safetyCounter++;
        const periodKey = getPeriodKeyForDate(rule.nextRunDate, rule.frequency);
        const alreadyExecuted = workingContributions.some(
          (c) => c.recurringRuleId === rule.id && c.periodKey === periodKey
        );

        if (alreadyExecuted) {
          rule.nextRunDate = advanceDateByFrequency(rule.nextRunDate, rule.frequency);
          continue;
        }

        const synced = synchronizeBalances(
          workingAccounts,
          ledger.transactions,
          workingGoals,
          workingContributions
        );
        workingAccounts = synced.accounts;
        workingGoals = synced.goals;

        const sourceAcc = workingAccounts.find((a) => a.id === rule.sourceAccountId);
        const targetGoal = workingGoals.find((g) => g.id === rule.goalId);

        if (!sourceAcc || !targetGoal) break;

        const remainingGoal = roundMoney(targetGoal.targetAmount - targetGoal.savedAmount);
        if (remainingGoal <= 0) {
          rule.isEnabled = false;
          break;
        }

        const actualAllocation = Math.min(rule.amount, remainingGoal);
        if (sourceAcc.currentBalance < actualAllocation) {
          break;
        }

        const newContrib: GoalContribution = {
          id: generateId('contrib'),
          userId: user.id,
          goalId: rule.goalId,
          sourceAccountId: rule.sourceAccountId,
          recurringRuleId: rule.id,
          periodKey,
          amount: actualAllocation,
          contributionDate: rule.nextRunDate,
          notes: `Automated ${rule.frequency} allocation`,
          createdAt: new Date().toISOString(),
        };

        workingContributions.unshift(newContrib);
        rule.lastProcessedDate = rule.nextRunDate;
        rule.nextRunDate = advanceDateByFrequency(rule.nextRunDate, rule.frequency);
        rule.updatedAt = new Date().toISOString();
        processedCount++;
      }

      workingRules[i] = rule;
    }

    if (processedCount > 0) {
      persistLedger(user.id, {
        ...ledger,
        contributions: workingContributions,
        recurringRules: workingRules,
      });
      showToast(
        'success',
        `Processed ${processedCount} scheduled savings allocation(s)`
      );
    }

    return { processedCount };
  }, [user, ledger, persistLedger, showToast]);

  useEffect(() => {
    if (!user || ledger.recurringRules.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const hasDue = ledger.recurringRules.some(
      (r) => r.isEnabled && r.nextRunDate <= today
    );
    if (hasDue) {
      processDueRecurringContributions();
    }
  }, [user, ledger.recurringRules, processDueRecurringContributions]);

  const monthlyAnalytics = useMemo(
    () =>
      computeMonthlyAnalytics(
        selectedMonth,
        ledger.accounts,
        ledger.transactions,
        ledger.goals
      ),
    [selectedMonth, ledger.accounts, ledger.transactions, ledger.goals]
  );

  const value = useMemo<PennywiseContextValue>(
    () => ({
      user,
      isAuthLoading,
      isDataLoading,
      isSupabaseConnected,
      activeTab,
      setActiveTab,
      selectedMonth,
      setSelectedMonth,
      accounts: ledger.accounts,
      transactions: ledger.transactions,
      receipts: ledger.receipts,
      goals: ledger.goals,
      contributions: ledger.contributions,
      recurringRules: ledger.recurringRules,
      monthlyAnalytics,
      toasts,
      dismissToast,
      showToast,
      isAddExpenseSheetOpen,
      setIsAddExpenseSheetOpen,
      activeAddMode,
      openAddFlow,
      closeAddFlow,
      transactionFilters,
      setTransactionFilters,
      signIn,
      signUp,
      signOut,
      updateProfile,
      sendPasswordResetEmail,
      updatePassword,
      createAccount,
      updateAccount,
      deleteAccount,
      isReceiptHashDuplicate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      createGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      saveRecurringContribution,
      toggleRecurringContribution,
      deleteRecurringContribution,
      processDueRecurringContributions,
    }),
    [
      user,
      isAuthLoading,
      isDataLoading,
      isSupabaseConnected,
      activeTab,
      setActiveTab,
      selectedMonth,
      ledger,
      monthlyAnalytics,
      toasts,
      dismissToast,
      showToast,
      isAddExpenseSheetOpen,
      activeAddMode,
      openAddFlow,
      closeAddFlow,
      transactionFilters,
      signIn,
      signUp,
      signOut,
      updateProfile,
      sendPasswordResetEmail,
      updatePassword,
      createAccount,
      updateAccount,
      deleteAccount,
      isReceiptHashDuplicate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      createGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      saveRecurringContribution,
      toggleRecurringContribution,
      deleteRecurringContribution,
      processDueRecurringContributions,
    ]
  );

  return (
    <PennywiseContext.Provider value={value}>{children}</PennywiseContext.Provider>
  );
}

export function usePennywise() {
  const ctx = useContext(PennywiseContext);
  if (!ctx) {
    throw new Error('usePennywise must be used within a PennywiseProvider');
  }
  return ctx;
}
