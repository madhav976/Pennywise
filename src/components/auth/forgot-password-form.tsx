'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePennywise } from '@/context/pennywise-context';
import {
  Sparkles,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export function ForgotPasswordForm() {
  const { sendPasswordResetEmail, isSupabaseConnected } = usePennywise();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPasswordResetEmail(cleanEmail);
      if (!res.ok) {
        setError(res.error || 'Failed to send password reset email.');
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-[#E4EAE0] flex justify-center overflow-x-hidden">
      <div className="w-full max-w-[430px] min-h-dvh bg-[#F5F7F3] flex flex-col justify-between px-6 py-8 shadow-pw-elevated animate-fadeIn">
        {/* Top Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link href="/login" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-[#191B19] flex items-center justify-center text-[#DFFF52] shadow-xs group-hover:scale-105 transition-transform">
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
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF0E9] border border-[#E7EBE5] text-[11px] font-medium text-[#191B19]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              {isSupabaseConnected ? 'Cloud Sync' : 'Secure Mode'}
            </span>
          </div>

          {submitted ? (
            /* Sent confirmation card */
            <div className="py-8 space-y-4 animate-slideUp text-center">
              <div className="w-14 h-14 rounded-3xl bg-[#191B19] text-[#DFFF52] flex items-center justify-center mx-auto shadow-pw-card">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#191B19]">
                Check your inbox
              </h2>
              <p className="text-xs text-[#777F77] leading-relaxed max-w-[320px] mx-auto">
                We have sent a secure password reset link to{' '}
                <strong className="text-[#191B19] font-semibold">{email}</strong>.
                Follow the link in the email to choose a new password.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="w-full h-11 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-pw-elevated hover:bg-[#202320]"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="pt-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#191B19]">
                  Reset your password
                </h1>
                <p className="text-xs text-[#777F77] mt-1">
                  Enter the email address registered with your Pennywise workspace.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-[#B42318] text-xs flex items-start gap-2.5 animate-slideUp">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E5484D]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Reset request failed</p>
                    <p className="text-[11px] text-[#73191D] mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-white border border-[#E7EBE5] text-xs text-[#191B19] placeholder:text-[#9EA89E] focus:outline-none focus:ring-2 focus:ring-[#191B19]/20 focus:border-[#191B19] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-pw-elevated hover:bg-[#202320] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#DFFF52]" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <ArrowRight className="w-4 h-4 text-[#DFFF52]" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#E7EBE5] space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#777F77]">
            <Link
              href="/login"
              className="font-bold text-[#191B19] hover:underline flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9EA89E]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Secure password recovery via Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}

