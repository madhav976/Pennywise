'use client';

import React, { useState } from 'react';
import { usePennywise } from '@/context/pennywise-context';
import { ArrowUpRight, Lock, Mail, Sparkles, User, ShieldCheck } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp, isSupabaseConnected } = usePennywise();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (!res.ok) {
          setError(res.error || 'Failed to sign in.');
        }
      } else {
        const res = await signUp(fullName, email, password, currency);
        if (!res.ok) {
          setError(res.error || 'Failed to create account.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStart() {
    setError(null);
    setSubmitting(true);
    try {
      const guestEmail = 'alex@pennywise.app';
      const guestPass = 'pennywise123';
      const signInAttempt = await signIn(guestEmail, guestPass);
      if (!signInAttempt.ok) {
        const signUpAttempt = await signUp(
          'Alex Rivera',
          guestEmail,
          guestPass,
          'INR'
        );
        if (!signUpAttempt.ok) {
          setError(signUpAttempt.error || 'Could not start workspace');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-[#E4EAE0] flex justify-center">
      <div className="w-full max-w-[430px] min-h-dvh bg-[#F5F7F3] flex flex-col justify-between px-5 py-7 shadow-pw-elevated">
        {/* Top Brand Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#191B19] flex items-center justify-center text-[#DFFF52]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-semibold tracking-tight text-[#191B19]">
                  Pennywise
                </span>
                <span className="block text-[11px] text-[#777F77] -mt-0.5">
                  AI Personal Finance
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF0E9] border border-[#E7EBE5] text-[11px] font-medium text-[#191B19]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              {isSupabaseConnected ? 'Supabase Cloud' : 'Secure Ledger'}
            </span>
          </div>

          {/* Editorial Title inspired by UI Reference */}
          <div className="pt-2">
            <h1 className="text-[28px] leading-[1.18] font-normal tracking-tight text-[#191B19]">
              Managing{' '}
              <span className="inline-flex items-center justify-center align-middle w-9 h-7 rounded-full bg-[#EBF0E9] border border-[#E7EBE5] mx-0.5">
                <ShieldCheck className="w-4 h-4 text-[#191B19]" />
              </span>{' '}
              Your Money
              <br />
              and{' '}
              <span className="inline-flex items-center justify-center align-middle w-10 h-7 rounded-full bg-[#DFFF52] mx-0.5">
                <Sparkles className="w-4 h-4 text-[#191B19]" />
              </span>{' '}
              Receipts
            </h1>
            <p className="text-xs text-[#777F77] mt-2.5 leading-relaxed">
              Scan physical receipts with AI, track real-time spending across accounts, and reach your personal savings goals.
            </p>
          </div>

          {/* Pill Mode Switcher */}
          <div className="flex items-center gap-2 bg-[#EBF0E9] p-1.5 rounded-full border border-[#E7EBE5]">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-[#191B19] text-white shadow-sm'
                  : 'text-[#191B19] hover:bg-white/60'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-xs font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-[#191B19] text-white shadow-sm'
                  : 'text-[#191B19] hover:bg-white/60'
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[28px] p-5 border border-[#E7EBE5] shadow-pw-card space-y-3.5"
          >
            {error && (
              <div className="p-3 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-xs text-[#B42318] font-medium">
                {error}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm text-[#191B19] placeholder:text-[#9FA69F] focus:outline-none focus:border-[#191B19]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm text-[#191B19] placeholder:text-[#9FA69F] focus:outline-none focus:border-[#191B19]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#777F77] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F5F7F3] border border-[#E7EBE5] text-sm text-[#191B19] placeholder:text-[#9FA69F] focus:outline-none focus:border-[#191B19]"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-medium text-[#777F77] mb-1.5">
                  Primary Currency
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { code: 'INR', label: '₹ INR' },
                    { code: 'USD', label: '$ USD' },
                    { code: 'EUR', label: '€ EUR' },
                    { code: 'GBP', label: '£ GBP' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setCurrency(item.code)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        currency === item.code
                          ? 'bg-[#DFFF52] border-[#C6E832] text-[#191B19]'
                          : 'bg-[#F5F7F3] border-[#E7EBE5] text-[#777F77]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 rounded-full bg-[#191B19] text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              <span>
                {submitting
                  ? 'Please wait...'
                  : mode === 'signup'
                  ? 'Start Pennywise'
                  : 'Sign In to Workspace'}
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#DFFF52]" />
            </button>
          </form>

          {/* Instant 1-Tap Personal Workspace */}
          <div className="bg-[#EBF0E9] rounded-[24px] p-4 border border-[#E7EBE5] flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#191B19]">
                Quick Mobile Access
              </p>
              <p className="text-[11px] text-[#777F77] mt-0.5">
                Enter your personal workspace immediately with 1 tap.
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickStart}
              disabled={submitting}
              className="shrink-0 px-4 py-2.5 rounded-full bg-[#DFFF52] text-[#191B19] text-xs font-semibold border border-[#CBEB3B] active:scale-95 transition-transform"
            >
              Quick Enter
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#777F77] pt-6">
          Pennywise Mobile · Protected by Row-Level Security
        </p>
      </div>
    </div>
  );
}

