'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Calendar,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  CreditCard,
  Edit3,
  FileText,
  Film,
  Filter,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  LogOut,
  MoreVertical,
  PenLine,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  Utensils,
  Wallet,
  Watch,
  X,
  Zap,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Utensils,
  ShoppingBasket,
  ShoppingBag,
  Car,
  Film,
  Zap,
  HeartPulse,
  GraduationCap,
  Plane,
  Sparkles,
  Gem,
  CircleDot,
  Briefcase,
  Laptop,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  PiggyBank,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Gamepad2,
  Home,
  Watch,
  Gift,
  Target,
  Receipt,
  Camera,
  Upload,
  Plus,
  PenLine,
  Search,
  Filter,
  Calendar,
  Clock,
  Check,
  X,
  Trash2,
  Edit3,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  // Lowercase aliases for goal icons
  smartphone: Smartphone,
  laptop: Laptop,
  gamepad: Gamepad2,
  vacation: Plane,
  car: Car,
  home: Home,
  watch: Watch,
  education: GraduationCap,
  shield: ShieldCheck,
  gift: Gift,
  wallet: Wallet,
};

export function PwIcon({
  name,
  className = 'w-5 h-5',
  strokeWidth = 1.75,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const IconComponent = ICON_MAP[name] || CircleDot;
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}

/**
 * Signature Segmented Capsule Progress Indicator inspired by the uploaded UI Reference
 * ("Operations" and "Data Transfer" cards with dark filled capsules and dashed empty capsules).
 */
export function SegmentedCapsuleBar({
  percentage,
  segments = 8,
  activeColor = 'charcoal',
}: {
  percentage: number;
  segments?: number;
  activeColor?: 'charcoal' | 'lime';
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clamped / 100) * segments);

  return (
    <div className="flex items-center gap-1.5 w-full" aria-label={`${clamped}% progress`}>
      {Array.from({ length: segments }).map((_, idx) => {
        const isFilled = idx < filledCount || (clamped > 0 && idx === 0);
        if (isFilled) {
          return (
            <div
              key={idx}
              className={`h-6 flex-1 rounded-full transition-all duration-300 ${
                activeColor === 'lime'
                  ? 'bg-[#DFFF52] border border-[#C8EA3A]'
                  : 'bg-[#191B19]'
              }`}
            />
          );
        }
        return (
          <div
            key={idx}
            className="h-6 flex-1 rounded-full border border-dashed border-[#B7C0B4] bg-transparent transition-all duration-300"
          />
        );
      })}
    </div>
  );
}

/**
 * Signature Percentage Pill Badge with mini progress ring from the UI reference
 */
export function PercentagePillBadge({
  percentage,
  variant = 'lime',
}: {
  percentage: number;
  variant?: 'lime' | 'white' | 'dark';
}) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = 5.5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const bgClass =
    variant === 'lime'
      ? 'bg-[#DFFF52] text-[#191B19]'
      : variant === 'dark'
      ? 'bg-[#191B19] text-white'
      : 'bg-white text-[#191B19] border border-[#E7EBE5]';

  const strokeColor = variant === 'dark' ? '#DFFF52' : '#191B19';
  const trackColor = variant === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(25,27,25,0.2)';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-tight ${bgClass}`}
    >
      <span>{pct}%</span>
      <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth="1.75"
        />
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * Subtle inline spinner for async operations (buttons, initialization states)
 */
export function PwSpinner({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
  return <Loader2 className={`${className} animate-spin shrink-0`} />;
}

/**
 * Skeleton placeholder matching Pennywise chart card dimensions without fabricating data
 */
export function ChartCardSkeleton({ heightClass = 'h-48' }: { heightClass?: string }) {
  return (
    <div
      className="bg-white rounded-[28px] p-5 border border-[#E7EBE5] shadow-pw-card space-y-4 animate-fadeIn"
      aria-busy="true"
      aria-label="Loading analytics chart"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-28 rounded-full animate-pwSkeleton" />
          <div className="h-6 w-36 rounded-xl animate-pwSkeleton" />
        </div>
        <div className="h-7 w-24 rounded-full animate-pwSkeleton" />
      </div>
      <div className={`w-full ${heightClass} rounded-2xl animate-pwSkeleton`} />
    </div>
  );
}

/**
 * Skeleton placeholder matching Pennywise transaction/account/goal cards
 */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5 animate-fadeIn" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-[24px] p-4 border border-[#E7EBE5] shadow-pw-card flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-11 h-11 rounded-2xl animate-pwSkeleton shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-32 rounded-full animate-pwSkeleton" />
              <div className="h-2.5 w-24 rounded-full animate-pwSkeleton" />
            </div>
          </div>
          <div className="h-4 w-16 rounded-full animate-pwSkeleton shrink-0" />
        </div>
      ))}
    </div>
  );
}

export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  footer?: React.ReactNode;
  hideScrollbar?: boolean;
  className?: string;
}

/**
 * Production-ready Mobile Bottom Sheet Modal rendered via React Portal directly into document.body.
 * Ensures 100% viewport alignment, independent of parent overflow or transforms, and covers
 * fixed navigation bars with proper z-index and safe-area insets.
 */
export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[88dvh]',
  footer,
  hideScrollbar = true,
  className,
}: MobileBottomSheetProps) {
  const [mounted, setMounted] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    // Reset scroll position to top whenever sheet opens
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end items-center bg-[#191B19]/60 backdrop-blur-[4px] animate-fadeIn"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[430px] mx-auto bg-[#F5F7F3] rounded-t-[32px] sm:rounded-t-[36px] border-t border-[#E7EBE5] shadow-2xl flex flex-col overflow-hidden animate-sheetSlideUp ${maxHeight} ${
          className || ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="pt-3 pb-1.5 flex justify-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-[#D0D7CC]" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-1 pb-3.5 flex items-start justify-between border-b border-[#E7EBE5] shrink-0 bg-[#F5F7F3]">
          <div className="pr-3 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#191B19] tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#777F77] mt-1 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white border border-[#E7EBE5] flex items-center justify-center text-[#191B19] hover:bg-[#EBF0E9] active:scale-95 transition-all shadow-xs shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div
          ref={scrollContainerRef}
          className={`px-5 sm:px-6 py-4 overflow-y-auto overscroll-contain space-y-4 flex-1 ${
            hideScrollbar ? 'hide-scrollbar' : ''
          } ${footer ? 'pb-3' : 'pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'}`}
        >
          {children}
        </div>

        {/* Optional Sticky Footer for CTA buttons */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-[#E7EBE5] bg-white shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

