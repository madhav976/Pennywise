'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopHeader } from '@/components/dashboard/top-header';
import { usePulseFinance } from '@/modules/finance/store/pulse-finance-context';
import { AlertTriangle, Bell, CheckCircle2, Info, Menu, X } from 'lucide-react';

interface AppShellProps {
  activeNav: 'overview' | 'finance' | 'transactions' | 'budgets' | 'savings';
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  onSearch?: (term: string) => void;
  children: React.ReactNode;
}

export function AppShell({
  activeNav,
  title,
  subtitle,
  headerActions,
  onSearch,
  children,
}: AppShellProps) {
  const {
    userName,
    userEmail,
    userAvatarUrl,
    currency,
    currencySymbol,
    setCurrency,
    summary,
    notifications,
    dismissNotification,
  } = usePulseFinance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#111014] flex flex-col lg:flex-row text-[#F5F3FA] antialiased selection:bg-[#A99BFF] selection:text-[#111014]">
      {/* Fixed Vertical Sidebar on Desktop */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <Sidebar
          currentPath={activeNav}
          onNavigate={(id) => {
            if (id === 'settings') setActiveModal('settings');
            if (id === 'profile') setActiveModal('profile');
          }}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[224px] h-full bg-[#17151D] flex flex-col justify-between">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-3 p-1.5 rounded-lg text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              currentPath={activeNav}
              onNavigate={(id) => {
                setMobileMenuOpen(false);
                if (id === 'settings') setActiveModal('settings');
                if (id === 'profile') setActiveModal('profile');
              }}
              userName={userName}
              userEmail={userEmail}
              userAvatarUrl={userAvatarUrl}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <div className="lg:hidden px-5 pt-3 flex items-center justify-between border-b border-white/[0.06] pb-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl bg-[#1C1923] border border-white/[0.08] text-[#A09BAE] hover:text-[#F5F3FA]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold tracking-[0.08em] text-base text-[#F5F3FA]">
            PULSE
          </span>
          <div className="w-9" />
        </div>

        {/* Shared Top Header */}
        <TopHeader
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onSearch={onSearch}
          onSettingsClick={() => setActiveModal('settings')}
          onLogoutClick={() => setActiveModal('logout')}
          onNotificationsClick={() => setActiveModal('notifications')}
          onProfileClick={() => setActiveModal('profile')}
        />

        {/* Module Page Header + Content */}
        <main className="flex-1 px-6 sm:px-8 lg:px-10 pt-4 pb-12 max-w-[1380px] w-full mx-auto flex flex-col gap-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#F5F3FA]">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[13px] text-[#A09BAE] mt-1">{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex flex-wrap items-center gap-3">{headerActions}</div>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* Floating Bottom-Right Toast for Live Threshold & Activity Alerts */}
      {notifications.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-full space-y-2 pointer-events-none">
          {notifications.slice(0, 1).map((n) => {
            const toneClasses =
              n.severity === 'danger'
                ? 'bg-[#1C1923]/95 border-[#F17D8B]/40 text-[#F17D8B]'
                : n.severity === 'warning'
                  ? 'bg-[#1C1923]/95 border-[#FBBF24]/40 text-[#FBBF24]'
                  : n.severity === 'success'
                    ? 'bg-[#1C1923]/95 border-[#65D6A1]/40 text-[#65D6A1]'
                    : 'bg-[#1C1923]/95 border-[#A99BFF]/40 text-[#A99BFF]';

            const Icon =
              n.severity === 'danger' || n.severity === 'warning'
                ? AlertTriangle
                : n.severity === 'success'
                  ? CheckCircle2
                  : Info;

            return (
              <div
                key={n.id}
                className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs ${toneClasses}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-[#F5F3FA] mr-1.5">{n.title}:</span>
                    <span className="text-[#D5D1E0]">{n.message}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissNotification(n.id)}
                  aria-label="Dismiss alert"
                  className="p-1 rounded-lg hover:bg-white/10 text-[#A09BAE] hover:text-[#F5F3FA] shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Modals for Settings, Profile & Notifications */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1C1923] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1 rounded-full text-[#A09BAE] hover:text-[#F5F3FA]"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'settings' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Preferences</h3>
                <p className="text-xs text-[#A09BAE] mb-4">
                  Configure your display currency and reporting preferences across PULSE.
                </p>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#211E2A] border border-white/[0.06]">
                  <span className="text-xs font-medium text-[#F5F3FA]">Display Currency</span>
                  <button
                    type="button"
                    onClick={() => setCurrency(currency === 'USD' ? 'INR' : 'USD')}
                    className="px-3 py-1 rounded-full bg-[#A99BFF]/20 text-[#A99BFF] text-xs font-semibold hover:bg-[#A99BFF]/30 transition-colors"
                  >
                    {currency === 'USD' ? 'USD ($)' : 'INR (₹)'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'profile' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Financial Profile</h3>
                <p className="text-xs text-[#A09BAE] mb-4">{userEmail}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-3 rounded-xl bg-[#211E2A]">
                    <span className="text-[#A09BAE]">Account Holder</span>
                    <span className="font-semibold text-[#F5F3FA]">{userName}</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#211E2A]">
                    <span className="text-[#A09BAE]">Total Assets</span>
                    <span className="font-semibold text-[#65D6A1]">
                      {currencySymbol}{' '}
                      {Number(summary.totalAssets || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-[#211E2A]">
                    <span className="text-[#A09BAE]">Net Worth</span>
                    <span className="font-semibold text-[#A99BFF]">
                      {currencySymbol}{' '}
                      {Number(summary.netWorth || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'notifications' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-[#A99BFF]" />
                  <h3 className="text-base font-bold text-[#F5F3FA]">Alert Center</h3>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#A09BAE]">
                    All ledger balances, budgets, and recurring schedules are reconciled and up to date.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto mt-3">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-2xl bg-[#211E2A] border border-white/[0.06] flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#F5F3FA]">{n.title}</p>
                          <p className="text-[11px] text-[#A09BAE] mt-0.5">{n.message}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismissNotification(n.id)}
                          className="text-[10px] text-[#A99BFF] hover:underline shrink-0"
                        >
                          Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeModal === 'logout' && (
              <div>
                <h3 className="text-base font-bold text-[#F5F3FA] mb-1.5">Session Status</h3>
                <p className="text-xs text-[#A09BAE] mb-4">
                  You are currently active in the PULSE Financial Vault.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 rounded-xl bg-[#211E2A] hover:bg-[#292535] text-xs font-semibold text-[#F5F3FA] transition-colors"
                >
                  Continue to PULSE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

