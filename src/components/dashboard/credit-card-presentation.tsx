'use client';

import React from 'react';
import { Wifi, CreditCard, Wallet, Landmark } from 'lucide-react';
import { AccountDTO } from '@/types/finance';
import { BorderGlow } from '@/components/ui/border-glow';

interface CreditCardPresentationProps {
  accounts?: AccountDTO[];
  activeAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onSeeAll?: () => void;
  userName?: string;
  currencySymbol?: string;
}

function formatAccountTypeLabel(type?: string): string {
  switch (type) {
    case 'savings':
      return 'Savings';
    case 'checking':
      return 'Checking';
    case 'credit_card':
      return 'Credit Card';
    case 'digital_wallet':
      return 'Digital Wallet';
    case 'cash':
      return 'Cash Vault';
    default:
      return 'Primary Account';
  }
}

export function CreditCardPresentation({
  accounts = [],
  activeAccountId,
  onSelectAccount,
  onSeeAll,
  userName = 'JASON JONES',
  currencySymbol = '$',
}: CreditCardPresentationProps) {
  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ||
    accounts[0] || {
      id: 'default-1',
      accountName: 'Platinum Vault',
      institutionName: 'K Bank',
      accountType: 'credit_card',
      currentBalance: '24093.00',
      availableCredit: '18500.00',
      currency: 'USD',
    };

  const secondaryAccount = accounts.find((a) => a.id !== activeAccount.id);

  const availableAmount = Number(
    activeAccount.availableCredit ?? activeAccount.currentBalance ?? 24093
  ).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const AccountTypeIcon =
    activeAccount.accountType === 'digital_wallet' || activeAccount.accountType === 'cash'
      ? Wallet
      : activeAccount.accountType === 'savings' || activeAccount.accountType === 'checking'
        ? Landmark
        : CreditCard;

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Section Header directly on main surface (Matches Reference) */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] font-bold tracking-tight text-[#F5F3FA]">Cards</h2>
          {accounts.length > 1 && (
            <div className="flex items-center gap-1 ml-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  aria-label={`Select ${acc.accountName}`}
                  onClick={() => onSelectAccount?.(acc.id)}
                  className={`h-1.5 rounded-full transition-all ${
                    acc.id === activeAccount.id
                      ? 'w-4 bg-[#A99BFF]'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-medium text-[#A99BFF] hover:text-[#F5F3FA] transition-colors"
        >
          See all
        </button>
      </div>

      {/* Layered 3D Card Stack */}
      <div className="relative pt-1 pb-11 flex flex-col items-center">
        {/* Soft Ambient Lavender Backlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 w-[85%] h-40 rounded-full bg-[#A99BFF]/20 blur-2xl"
        />

        {/* Layer 3: Deepest Shadow Plate (Bottom of Stack) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 w-[94%] h-14 rounded-[18px] bg-gradient-to-b from-[#1D1B27]/80 to-[#14121B]/90 border border-white/[0.04] shadow-[0_14px_30px_rgba(0,0,0,0.75)]"
          style={{
            transform: 'perspective(650px) rotateX(28deg)',
          }}
        />

        {/* Layer 2: Angled 3D Peeking / Reflected Secondary Card */}
        <div
          onClick={() => {
            if (secondaryAccount && onSelectAccount) {
              onSelectAccount(secondaryAccount.id);
            }
          }}
          className="absolute bottom-3.5 w-[93%] h-16 rounded-[18px] bg-gradient-to-b from-[#333042]/90 via-[#252231]/95 to-[#1B1924] border border-white/[0.09] px-6 py-2.5 flex flex-col justify-end select-none shadow-[0_10px_25px_rgba(0,0,0,0.6)] cursor-pointer transition-transform duration-300 hover:translate-y-0.5"
          style={{
            transform: 'perspective(600px) rotateX(24deg)',
          }}
        >
          <div className="font-mono text-[13px] tracking-[0.2em] text-white/25 font-medium leading-none mb-1">
            3893 &nbsp;5678 &nbsp;9009 &nbsp;8765
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/25 uppercase tracking-wider">
            <span>{secondaryAccount?.accountName || 'JASON SMITH'}</span>
            <span className="font-mono">08/27</span>
          </div>
        </div>

        {/* Layer 1: Primary Active Financial Account Card with Pure-White BorderGlow */}
        <BorderGlow
          roundedClassName="rounded-[22px]"
          glowRadius={240}
          className="relative z-10 w-full h-[206px] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.75)] transition-transform duration-300 hover:-translate-y-0.5 select-none"
        >
          <div
            className="relative w-full h-full rounded-[22px] p-5 sm:p-6 flex flex-col justify-between text-white overflow-hidden"
            style={{
              background:
                'radial-gradient(68% 80% at 48% 38%, #CEC6FF 0%, #AA9CFF 36%, #8375E2 72%, #6456BF 100%)',
            }}
          >
            {/* Specular Highlight Sheen */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 left-1/4 w-56 h-56 rounded-full bg-white/20 blur-2xl"
            />

            {/* Top Row: Bank / Provider, Account Type + Balance Pill, and Mastercard Emblem */}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[18px] tracking-wide text-white drop-shadow-sm">
                    {activeAccount.institutionName || activeAccount.accountName || 'K Bank'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white/95">
                    <AccountTypeIcon className="w-2.5 h-2.5" />
                    {formatAccountTypeLabel(activeAccount.accountType)}
                  </span>
                </div>
                <p className="text-[11px] text-white/80 font-medium mt-0.5">
                  {activeAccount.accountName} · Avail {currencySymbol}
                  {availableAmount}
                </p>
              </div>

              {/* Dual Overlapping Circles Emblem */}
              <div className="flex items-center relative shrink-0 pt-0.5">
                <div className="w-7 h-7 rounded-full bg-[#EB001B] opacity-95 shadow-sm" />
                <div className="w-7 h-7 rounded-full bg-[#F79E1B] opacity-90 -ml-2.5 shadow-sm" />
              </div>
            </div>

            {/* Middle Row: Realistic Gold EMV Chip (Left) & Contactless Wave (Right, per Reference) */}
            <div className="flex items-center justify-between relative z-10 my-1">
              <div className="w-11 h-8 rounded-[6px] bg-gradient-to-tr from-[#C79D2B] via-[#F5E39E] to-[#D4AF37] border border-[#9E7818]/60 p-1 shadow-inner">
                <div className="w-full h-full border border-black/20 rounded-[3px] grid grid-cols-3 gap-0.5">
                  <div className="border-r border-b border-black/20" />
                  <div className="border-b border-black/20" />
                  <div className="border-l border-b border-black/20" />
                  <div className="border-r border-black/20" />
                  <div />
                  <div className="border-l border-black/20" />
                </div>
              </div>

              <Wifi className="w-5 h-5 text-white/85 rotate-90" strokeWidth={2.2} />
            </div>

            {/* Bottom Row: Card Number & Cardholder / Expiry */}
            <div className="relative z-10 space-y-2">
              <div className="font-mono text-[16px] sm:text-[17px] tracking-[0.18em] text-white font-medium drop-shadow-sm">
                1234 &nbsp;5678 &nbsp;9009 &nbsp;8765
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/90">
                <span className="uppercase tracking-[0.12em] font-medium truncate max-w-[180px]">
                  {userName.toUpperCase()}
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-[7px] leading-[8px] text-white/70 uppercase text-right">
                    VALID
                    <br />
                    THRU
                  </span>
                  <span className="text-xs font-semibold tracking-wider">08/28</span>
                </div>
              </div>
            </div>
          </div>
        </BorderGlow>
      </div>
    </div>
  );
}
