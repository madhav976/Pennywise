'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePennywise } from '@/context/pennywise-context';
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const { signIn, isSupabaseConnected } = usePennywise();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(cleanEmail, password);
      if (!res.ok) {
        setError(res.error || 'Invalid email or password.');
      } else {
        router.push('/dashboard');
        router.refresh();
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

          {/* Heading */}
          <div className="pt-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#191B19]">
              Welcome back
            </h1>
            <p className="text-xs text-[#777F77] mt-1">
              Sign in to manage your accounts, transactions, and AI receipt scans.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FFEFEF] border border-[#F5C2C7] text-[#B42318] text-xs flex items-start gap-2.5 animate-slideUp">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E5484D]" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Authentication failed</p>
                <p className="text-[11px] text-[#73191D] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#191B19]"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#191B19]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-[#191B19] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777F77] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#CFD7CB] text-[#191B19] focus:ring-[#191B19] accent-[#191B19]"
              />
              <label
                htmlFor="remember-me"
                className="text-xs text-[#777F77] cursor-pointer select-none"
              >
                Keep me signed in
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#DFFF52]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#E7EBE5] space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#777F77]">
            <span>Don't have an account?</span>
            <Link
              href="/signup"
              className="font-bold text-[#191B19] hover:underline"
            >
              Create Account
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9EA89E]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>End-to-end encrypted financial storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}

