'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Wallet,
  ReceiptText,
  PieChart,
  Target,
  LifeBuoy,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

const ROUTE_MAP: Record<string, string> = {
  overview: '/',
  finance: '/finance',
  transactions: '/transactions',
  budgets: '/budgets',
  savings: '/savings-goals',
};

export function Sidebar({
  currentPath,
  onNavigate,
  userName = 'Jason Jones',
  userEmail = 'Personal Vault',
  userAvatarUrl,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const resolvedActiveId = React.useMemo(() => {
    if (currentPath) return currentPath;
    if (pathname?.startsWith('/finance')) return 'finance';
    if (pathname?.startsWith('/transactions')) return 'transactions';
    if (pathname?.startsWith('/budgets')) return 'budgets';
    if (pathname?.startsWith('/savings-goals')) return 'savings';
    return 'overview';
  }, [currentPath, pathname]);

  const mainNavItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'savings', label: 'Savings Goals', icon: Target },
  ];

  const handleNav = (id: string) => {
    onNavigate?.(id);
    const targetRoute = ROUTE_MAP[id];
    if (targetRoute) {
      router.push(targetRoute);
    }
  };

  return (
    <aside className="w-[216px] bg-sidebar border-r border-white/[0.06] flex flex-col justify-between px-4 py-6 select-none shrink-0 min-h-screen">
      {/* Top Branding & Primary Navigation */}
      <div>
        {/* PULSE Monogram & Wordmark (Reference VAULT Lockup Style) */}
        <button
          type="button"
          onClick={() => handleNav('overview')}
          className="flex items-center gap-2.5 px-3 mb-7 text-left focus:outline-none"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#A99BFF] to-[#7A6AF0] shadow-[0_0_16px_rgba(169,155,255,0.35)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 text-[#111014]"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12h4l3-7 4 14 3-7h2" />
            </svg>
          </div>
          <span className="font-extrabold text-[18px] tracking-[0.08em] text-[#F5F3FA]">
            PULSE
          </span>
        </button>

        {/* Navigation List */}
        <nav className="space-y-1" aria-label="Main Navigation">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = resolvedActiveId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`group w-full flex items-center gap-3 px-2.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2A2538] via-[#231F30] to-[#1B1824] text-[#F5F3FA] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_rgba(0,0,0,0.3)]'
                    : 'text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'bg-[#A99BFF]/20 border border-[#A99BFF]/40 text-[#F5F3FA] shadow-[0_0_10px_rgba(169,155,255,0.28)]'
                      : 'text-[#A09BAE] group-hover:text-[#F5F3FA]'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Help Center, Settings & User Profile */}
      <div className="space-y-1 pt-4 border-t border-white/[0.05]">
        <button
          type="button"
          onClick={() => handleNav('help')}
          className="group w-full flex items-center gap-3 px-3 py-2 rounded-full text-[13px] font-medium text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/[0.03] transition-colors"
        >
          <LifeBuoy
            className="w-4 h-4 text-[#A09BAE] group-hover:text-[#F5F3FA] transition-colors"
            strokeWidth={1.75}
          />
          <span>Help Center</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav('settings')}
          className="group w-full flex items-center gap-3 px-3 py-2 rounded-full text-[13px] font-medium text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-white/[0.03] transition-colors"
        >
          <Settings
            className="w-4 h-4 text-[#A09BAE] group-hover:text-[#F5F3FA] transition-colors"
            strokeWidth={1.75}
          />
          <span>Settings</span>
        </button>

        {/* Compact User Profile Item */}
        <button
          type="button"
          onClick={() => handleNav('profile')}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-2xl bg-[#1C1923]/70 hover:bg-[#211E2A] border border-white/[0.06] transition-colors text-left"
        >
          <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gradient-to-tr from-[#8A7CF5] to-[#A99BFF] flex items-center justify-center shrink-0">
            {userAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-[#111014]">
                {userName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#F5F3FA] truncate">{userName}</p>
            <p className="text-[10px] text-[#A09BAE] truncate">{userEmail}</p>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-[#65D6A1] shrink-0" />
        </button>
      </div>
    </aside>
  );
}
