'use client';

import React, { useState } from 'react';
import { Search, Settings, LogOut, Bell, User } from 'lucide-react';

interface TopHeaderProps {
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  onSearch?: (term: string) => void;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
  onNotificationsClick?: () => void;
  onProfileClick?: () => void;
}

export function TopHeader({
  userName = 'Jason Jones',
  userEmail = 'jason.jones@pulse.app',
  userAvatarUrl,
  onSearch,
  onSettingsClick,
  onLogoutClick,
  onNotificationsClick,
  onProfileClick,
}: TopHeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    onSearch?.(term);
  };

  return (
    <header className="pt-5 pb-2 px-5 sm:px-7 lg:px-8 flex items-center justify-between gap-4 relative z-30">
      {/* Wide Pill Search Bar (Matches Reference Proportions) */}
      <div className="relative flex-1 max-w-[540px]">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-[#8E889F]" strokeWidth={1.8} />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search"
          aria-label="Search financial records"
          className="w-full h-10 pl-10 pr-4 bg-[#1B1922] border border-white/[0.07] rounded-full text-xs text-[#F5F3FA] placeholder:text-[#7E7890] focus:outline-none focus:border-white/20 focus:bg-[#211E2A] transition-all"
        />
      </div>

      {/* Right Control Cluster: Avatar (with top-right green dot), Notification, Settings, Exit */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* User Avatar + Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            aria-label="User Profile Menu"
            className="relative flex items-center justify-center w-9 h-9 rounded-full border border-white/15 bg-[#211E2A] hover:border-white/30 transition-all focus:outline-none"
          >
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-[#5C4FB8] via-[#8A7CF5] to-[#B7ABFF]">
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-[11px] text-[#111014]">
                  {userName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {/* Top-right online indicator dot matching reference */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#65D6A1] border-2 border-[#111014] shadow-[0_0_8px_#65D6A1]" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2.5 w-56 bg-[#1C1923] border border-white/[0.09] rounded-2xl p-2 shadow-[0_16px_40px_rgba(0,0,0,0.65)] z-50">
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-xs font-semibold text-[#F5F3FA] truncate">{userName}</p>
                <p className="text-[11px] text-[#A09BAE] truncate">{userEmail}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  onProfileClick?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-[#211E2A] transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Financial Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  onSettingsClick?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A09BAE] hover:text-[#F5F3FA] hover:bg-[#211E2A] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  onLogoutClick?.();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#F17D8B] hover:bg-[#F17D8B]/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Notification Shortcut */}
        <button
          type="button"
          onClick={onNotificationsClick}
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-full bg-[#1C1923] hover:bg-[#24202E] border border-white/[0.08] hover:border-white/[0.16] flex items-center justify-center text-[#A09BAE] hover:text-[#F5F3FA] transition-all"
        >
          <Bell className="w-4 h-4" strokeWidth={1.75} />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[#A99BFF]" />
        </button>

        {/* Settings Shortcut */}
        <button
          type="button"
          onClick={onSettingsClick}
          aria-label="Settings"
          className="w-9 h-9 rounded-full bg-[#1C1923] hover:bg-[#24202E] border border-white/[0.08] hover:border-white/[0.16] flex items-center justify-center text-[#A09BAE] hover:text-[#F5F3FA] transition-all"
        >
          <Settings className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {/* Exit / Sign Out Shortcut */}
        <button
          type="button"
          onClick={onLogoutClick}
          aria-label="Sign Out"
          className="w-9 h-9 rounded-full bg-[#1C1923] hover:bg-[#24202E] border border-white/[0.08] hover:border-white/[0.16] flex items-center justify-center text-[#A09BAE] hover:text-[#F17D8B] transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
