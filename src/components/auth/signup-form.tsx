'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePennywise } from '@/context/pennywise-context';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function SignupForm() {
  const router = useRouter();
  const { signUp, isSupabaseConnected } = usePennywise();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successConfirmation, setSuccessConfirmation] = useState<string | null>(null);

  // Password requirement checks
  const hasMinLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-check.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the terms and conditions to proceed.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp(cleanName, cleanEmail, password, currency);
      if (!res.ok) {
        setError(res.error || 'Failed to create your account.');
      } else {
        // If Supabase requires email verification, display the confirmation screen
        if ((res as any).requiresConfirmation) {
          setSuccessConfirmation(
            `A confirmation link has been sent to ${cleanEmail}. Please check your inbox to activate your account.`
          );
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during account creation.');
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

          {successConfirmation ? (
            /* Success confirmation when Supabase requires email verification */
            <div className="py-6 space-y-4 animate-slideUp text-center">
              <div className="w-14 h-14 rounded-3xl bg-[#191B19] text-[#DFFF52] flex items-center justify-center mx-auto shadow-pw-card">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#191B19]">
                Verify your email
              </h2>
              <p className="text-xs text-[#777F77] leading-relaxed max-w-[320px] mx-auto">
                {successConfirmation}
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
                  Create your account
                </h1>
                <p className="text-xs text-[#777F77] mt-1">
                  Start tracking expenses, scanning receipts, and saving effortlessly.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-[#B42318] text-xs flex items-start gap-2.5 animate-slideUp">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E5484D]" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Registration notice</p>
                    <p className="text-[11px] text-[#73191D] mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-white border border-[#E7EBE5] text-xs text-[#191B19] placeholder:text-[#9EA89E] focus:outline-none focus:ring-2 focus:ring-[#191B19]/20 focus:border-[#191B19] transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-email"
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

                {/* Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-password"
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

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-[#191B19]"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your password"
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

                {/* Password Requirements Checklist */}
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

                {/* Terms Acknowledgement */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#CFD7CB] text-[#191B19] focus:ring-[#191B19] accent-[#191B19]"
                  />
                  <label
                    htmlFor="agree-terms"
                    className="text-[11px] text-[#777F77] leading-relaxed cursor-pointer select-none"
                  >
                    I agree to the Pennywise Terms of Service and Privacy Policy. All
                    financial data is private and encrypted.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full bg-[#191B19] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-pw-elevated hover:bg-[#202320] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#DFFF52]" />
                      <span>Creating workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
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
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="font-bold text-[#191B19] hover:underline"
            >
              Sign In
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9EA89E]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Row-level security isolation on PostgreSQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

