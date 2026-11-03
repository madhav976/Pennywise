'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePennywise } from '@/context/pennywise-context';
import {
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function ResetPasswordForm() {
  const router = useRouter();
  const { updatePassword, isSupabaseConnected } = usePennywise();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Requirements
  const hasMinLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-check.');
      return;
    }

    setLoading(true);
    try {
      const res = await updatePassword(password);
      if (!res.ok) {
        setError(res.error || 'Failed to update password.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 2200);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update your password.');
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

          {success ? (
            <div className="py-8 space-y-4 animate-slideUp text-center">
              <div className="w-14 h-14 rounded-3xl bg-[#191B19] text-[#DFFF52] flex items-center justify-center mx-auto shadow-pw-card">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#191B19]">
                Password updated!
              </h2>
              <p className="text-xs text-[#777F77] leading-relaxed max-w-[320px] mx-auto">
                Your new password has been securely saved. Redirecting to your
                dashboard...
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="w-full h-11 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-pw-elevated hover:bg-[#202320]"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="pt-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#191B19]">
                  Set new password
                </h1>
                <p className="text-xs text-[#777F77] mt-1">
                  Choose a new password for your Pennywise account.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-[#B42318] text-xs flex items-start gap-2.5 animate-slideUp">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E5484D]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Update failed</p>
                    <p className="text-[11px] text-[#73191D] mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-password"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white border border-[#E7EBE5] text-xs text-[#191B19] placeholder:text-[#9EA89E] focus:outline-none focus:ring-2 focus:ring-[#191B19]/20 focus:border-[#191B19] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777F77] hover:text-[#191B19] p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your new password"
                      className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white border border-[#E7EBE5] text-xs text-[#191B19] placeholder:text-[#9EA89E] focus:outline-none focus:ring-2 focus:ring-[#191B19]/20 focus:border-[#191B19] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={
                        showConfirmPassword ? 'Hide password' : 'Show password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777F77] hover:text-[#191B19] p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                {password.length > 0 && (
                  <div className="p-3 rounded-2xl bg-[#EBF0E9] border border-[#E7EBE5] text-[11px] space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          hasMinLength
                            ? 'bg-[#2E7D32] text-white'
                            : 'bg-[#CFD7CB] text-[#777F77]'
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={
                          hasMinLength ? 'text-[#191B19] font-medium' : 'text-[#777F77]'
                        }
                      >
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          hasLetters && hasNumbers
                            ? 'bg-[#2E7D32] text-white'
                            : 'bg-[#CFD7CB] text-[#777F77]'
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={
                          hasLetters && hasNumbers
                            ? 'text-[#191B19] font-medium'
                            : 'text-[#777F77]'
                        }
                      >
                        Contains letters and numbers
                      </span>
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            passwordsMatch
                              ? 'bg-[#2E7D32] text-white'
                              : 'bg-[#E5484D] text-white'
                          }`}
                        >
                          {passwordsMatch ? '✓' : '✕'}
                        </span>
                        <span
                          className={
                            passwordsMatch
                              ? 'text-[#191B19] font-medium'
                              : 'text-[#B42318]'
                          }
                        >
                          {passwordsMatch
                            ? 'Passwords match'
                            : 'Passwords do not match'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-pw-elevated hover:bg-[#202320] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#DFFF52]" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
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
              className="font-bold text-[#191B19] hover:underline"
            >
              Back to Sign In
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9EA89E]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Encrypted authentication session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

