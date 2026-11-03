'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePennywise, NavTab } from '@/context/pennywise-context';
import { LoginForm } from '@/components/auth/login-form';
import { HomeScreen } from '@/components/home/home-screen';
import { TransactionsScreen } from '@/components/transactions/transactions-screen';
import { GoalsScreen } from '@/components/goals/goals-screen';
import { AccountsScreen } from '@/components/accounts/accounts-screen';
import { AddExpenseSheet } from '@/components/expenses/add-expense-sheet';
import {
  CheckCircle2,
  Home,
  Landmark,
  Plus,
  Receipt,
  Target,
  AlertCircle,
  Info,
  X,
  Sparkles,
} from 'lucide-react';

export function MobileAppShell() {
  const router = useRouter();
  const {
    user,
    isAuthLoading,
    activeTab,
    setActiveTab,
    openAddFlow,
    toasts,
    dismissToast,
  } = usePennywise();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-dvh w-full bg-[#E4EAE0] flex justify-center items-center">
        <div className="w-full max-w-[430px] min-h-dvh bg-[#F5F7F3] flex flex-col items-center justify-center p-6 shadow-pw-elevated animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-[#191B19] flex items-center justify-center text-[#DFFF52] shadow-xs mb-4 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-[#191B19]">Pennywise</p>
          <p className="text-xs text-[#777F77] mt-1">Opening your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const navItems: Array<{
    id: NavTab | 'add';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'add', label: 'Add', icon: Plus },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'accounts', label: 'Accounts', icon: Landmark },
  ];

  return (
    <div className="min-h-dvh w-full bg-[#E4EAE0] flex justify-center overflow-x-hidden">
      {/* Centered Mobile-Only Viewport Frame (360px - 430px target) */}
      <div className="w-full max-w-[430px] min-h-dvh bg-[#F5F7F3] relative flex flex-col shadow-pw-elevated overflow-x-hidden">
        {/* Toast Notification Stack */}
        {toasts.length > 0 && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-[400px] px-4 space-y-2 pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto p-3 rounded-2xl bg-[#191B19] text-white shadow-pw-elevated flex items-center justify-between gap-2.5 animate-slideUp"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {toast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#DFFF52] shrink-0" />
                  ) : toast.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-[#F17D8B] shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-[#B9D99B] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{toast.title}</p>
                    {toast.description && (
                      <p className="text-[10px] text-white/75 truncate">
                        {toast.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main Scrollable Screen Content with Page-to-Page Transition */}
        <main className="flex-1 px-4 pt-4 pb-28 overflow-x-hidden">
          <div key={activeTab} className="animate-pageEnter">
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'transactions' && <TransactionsScreen />}
            {activeTab === 'goals' && <GoalsScreen />}
            {activeTab === 'accounts' && <AccountsScreen />}
          </div>
        </main>

        {/* Fixed Bottom Navigation Bar */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-3 pb-3 pt-1 bg-gradient-to-t from-[#F5F7F3] via-[#F5F7F3]/95 to-transparent"
        >
          <div className="bg-[#202320] text-white rounded-[28px] px-1.5 py-2 shadow-pw-nav grid grid-cols-5 items-center border border-[#191B19]">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.id === 'add') {
                return (
                  <div key="add" className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => openAddFlow('chooser')}
                      aria-label="Add Expense"
                      className="w-12 h-12 rounded-full bg-[#DFFF52] text-[#191B19] shadow-pw-lime border-2 border-[#202320] flex items-center justify-center -translate-y-2 active:scale-95 transition-transform"
                    >
                      <Plus className="w-6 h-6 stroke-[2.5] block m-auto" />
                    </button>
                  </div>
                );
              }

              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as NavTab)}
                  className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all ${
                    isActive
                      ? 'text-[#DFFF52]'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1 tracking-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Central Add Expense / Scan Receipt Action Sheet */}
        <AddExpenseSheet />
      </div>
    </div>
  );
}
