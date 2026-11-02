'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { BorderGlow } from '@/components/ui/border-glow';

interface ProfileCardProps {
  userName?: string;
  avatarUrl?: string;
  totalBalance?: string;
  currencySymbol?: string;
  onOpenProfile?: () => void;
}

export function ProfileCard({
  userName,
  avatarUrl,
  totalBalance,
  currencySymbol = '$',
  onOpenProfile,
}: ProfileCardProps) {
  const displayName = userName || 'Account Holder';
  const displayBalance = totalBalance ?? '0.00';

  return (
    <BorderGlow roundedClassName="rounded-[24px]" glowRadius={260} className="w-full">
      <div
        className="rounded-[24px] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between h-[320px]"
        style={{
          background:
            'radial-gradient(95% 80% at 50% 105%, rgba(169, 155, 255, 0.56) 0%, rgba(118, 102, 218, 0.32) 44%, rgba(28, 25, 35, 0.98) 92%), #181620',
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-[18px] font-bold tracking-tight text-[#F5F3FA]">Profile</h2>
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="View Profile Details"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] flex items-center justify-center text-[#A09BAE] hover:text-[#F5F3FA] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center Avatar, Name & Total Balance */}
        <div className="flex flex-col items-center justify-center relative z-10 text-center my-auto pt-1">
          <div className="relative mb-3">
            <div className="w-[96px] h-[96px] rounded-full p-0.5 bg-gradient-to-b from-white/25 to-white/5 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#211E2A] flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#373052] via-[#534684] to-[#262138] flex items-center justify-center font-bold text-2xl text-[#E5E0FF]">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <h3 className="text-[18px] font-semibold text-[#B9ADFF] tracking-tight leading-snug">
            {displayName}
          </h3>

          <div className="mt-3">
            <p className="text-[11px] text-[#D0CBE3]/80 font-medium">Total balance</p>
            <p className="text-[26px] sm:text-[28px] font-extrabold text-white tracking-tight leading-tight mt-0.5 drop-shadow-sm">
              {currencySymbol} {displayBalance}
            </p>
          </div>
        </div>
      </div>
    </BorderGlow>
  );
}
