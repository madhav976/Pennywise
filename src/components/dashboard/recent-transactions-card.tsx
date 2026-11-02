'use client';

import React from 'react';
import {
  Coffee,
  ShoppingBag,
  Store,
  User,
  ShoppingCart,
  Tv,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { TransactionDTO } from '@/types/finance';

interface RecentTransactionsCardProps {
  transactions?: TransactionDTO[];
  currencySymbol?: string;
  onSeeAll?: () => void;
  onTransactionClick?: (txId: string) => void;
}

export function RecentTransactionsCard({
  transactions = [],
  currencySymbol = '$',
  onSeeAll,
  onTransactionClick,
}: RecentTransactionsCardProps) {
  const displayItems =
    transactions.length > 0
      ? transactions.slice(0, 6)
      : [
          {
            id: 'tx-1',
            merchantName: 'Starbucks',
            description: 'Coffee & Dining',
            amount: '30.44',
            transactionDate: '2025-04-02T10:30:00Z',
            transactionType: 'expense',
            referenceNumber: '#73246',
          },
          {
            id: 'tx-2',
            merchantName: 'Walmart',
            description: 'Groceries',
            amount: '196.98',
            transactionDate: '2025-04-02T14:15:00Z',
            transactionType: 'expense',
            referenceNumber: '#73557',
          },
          {
            id: 'tx-3',
            merchantName: 'Zara',
            description: 'Apparel',
            amount: '79.58',
            transactionDate: '2025-04-02T16:45:00Z',
            transactionType: 'expense',
            referenceNumber: '#95337',
          },
          {
            id: 'tx-4',
            merchantName: 'Walmart',
            description: 'Home Essentials',
            amount: '234.25',
            transactionDate: '2025-03-31T11:20:00Z',
            transactionType: 'expense',
            referenceNumber: '#76295',
          },
          {
            id: 'tx-5',
            merchantName: 'Robert Fox',
            description: 'Peer Transfer',
            amount: '51.02',
            transactionDate: '2025-03-28T09:00:00Z',
            transactionType: 'expense',
            referenceNumber: '#65336',
          },
          {
            id: 'tx-6',
            merchantName: 'eBay',
            description: 'Marketplace',
            amount: '46.61',
            transactionDate: '2025-03-26T18:10:00Z',
            transactionType: 'expense',
            referenceNumber: '#76355',
          },
        ];

  const getMerchantIcon = (name: string = '', type: string = 'expense') => {
    const lower = name.toLowerCase();
    if (lower.includes('starbucks') || lower.includes('coffee')) {
      return <Coffee className="w-3.5 h-3.5 text-[#A09BAE]" />;
    }
    if (lower.includes('walmart')) {
      return <Store className="w-3.5 h-3.5 text-[#A09BAE]" />;
    }
    if (lower.includes('zara')) {
      return <ShoppingBag className="w-3.5 h-3.5 text-[#A09BAE]" />;
    }
    if (lower.includes('ebay')) {
      return <ShoppingCart className="w-3.5 h-3.5 text-[#A09BAE]" />;
    }
    if (lower.includes('netflix')) {
      return <Tv className="w-3.5 h-3.5 text-[#A09BAE]" />;
    }
    if (lower.includes('fox') || lower.includes('robert')) {
      return <User className="w-3.5 h-3.5 text-[#A09BAE]" />;
    }
    if (type === 'income') {
      return <ArrowDownLeft className="w-3.5 h-3.5 text-[#65D6A1]" />;
    }
    return <ArrowUpRight className="w-3.5 h-3.5 text-[#A09BAE]" />;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="px-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[18px] font-bold tracking-tight text-[#F5F3FA]">Transactions</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-medium text-[#A99BFF] hover:text-[#F5F3FA] transition-colors"
        >
          See all
        </button>
      </div>

      {/* Compact Tabular Transaction List with subtle bottom fade matching reference */}
      <div className="relative space-y-1">
        {displayItems.map((tx: any, index: number) => {
          const isExpense = tx.transactionType === 'expense';
          const isIncome = tx.transactionType === 'income';
          const isLast = index === displayItems.length - 1;

          return (
            <div
              key={tx.id}
              onClick={() => onTransactionClick?.(tx.id)}
              className={`grid grid-cols-[1.3fr_0.95fr_0.85fr_0.65fr] items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-[#1C1923] cursor-pointer transition-colors group ${
                isLast ? 'opacity-55 hover:opacity-100' : ''
              }`}
            >
              {/* Col 1: Icon & Merchant */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#221F2D] border border-white/[0.07] flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
                  {getMerchantIcon(tx.merchantName || tx.description, tx.transactionType)}
                </div>
                <span className="text-xs font-medium text-[#E5E2F0] truncate">
                  {tx.merchantName || tx.description}
                </span>
              </div>

              {/* Col 2: Signed Amount */}
              <div
                className={`text-xs font-medium tabular-nums text-left ${
                  isIncome ? 'text-[#65D6A1]' : 'text-[#C8C3D8]'
                }`}
              >
                {isExpense ? '- ' : isIncome ? '+ ' : ''}
                {currencySymbol} {Number(tx.amount).toFixed(2)}
              </div>

              {/* Col 3: Date */}
              <div className="text-xs text-[#8E889F] tabular-nums text-left">
                {formatDate(tx.transactionDate)}
              </div>

              {/* Col 4: Reference / Type */}
              <div className="text-xs font-mono text-[#7E7890] text-right truncate">
                {tx.referenceNumber || `#${String(tx.id).slice(0, 5)}`}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
