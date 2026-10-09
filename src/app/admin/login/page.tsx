'use client';

import React, { useState, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/context/auth-context';

function AdminLoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/admin';

  const { login, isAuthenticated, user, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-fill demo admin credentials
  function fillDemoAdmin() {
    setEmail('admin@campus.edu');
    setPassword('Admin@Campus2026!');
    setErrorMessage('');
  }

  // If already authenticated as admin
  if (isAuthenticated && user?.role === 'admin') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Administrator Session Active
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You are signed in as <span className="font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</span> ({user.email}).
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/admin')}
          >
            Open Admin Dashboard
          </Button>
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => logout()}
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  // If authenticated as student, warn about privilege mismatch
  if (isAuthenticated && user?.role === 'student') {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-md text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Administrator Privileges Required
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You are currently signed in as <span className="font-semibold">{user.name}</span> with a{' '}
          <Badge variant="info">Student</Badge> account. The Admin Dashboard requires an Administrator account.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await logout();
            }}
          >
            Switch to Administrator Account
          </Button>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/')}
          >
            Return to Student Portal
          </Button>
        </div>
      </div>
    );
  }

  async function handleAdminLogin(e: FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (!result.success || !result.user) {
        setErrorMessage(result.error || 'Authentication failed. Please verify administrator credentials.');
      } else if (result.user.role !== 'admin') {
        // Authenticated but not an admin!
        await logout();
        setErrorMessage(
          'Access Denied: This account does not have administrator privileges. Please sign in via the Student Portal.'
        );
      } else {
        setSuccessMessage('Administrator authenticated! Establishing secure management session...');
        setTimeout(() => {
          router.push(rawRedirect);
        }, 500);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto w-full my-8 p-6 sm:p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-13 h-13 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800">
          <span>Campus Administration Portal</span>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Admin Sign In
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Restricted access for authorized university administrators &amp; department heads
        </p>
      </div>

      {/* Demo Credentials Helper Pill */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Default Administrator Credentials:</span>
          </span>
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline underline-offset-2"
          >
            Auto-fill
          </button>
        </div>
        <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 flex flex-col gap-0.5">
          <div>Email: <span className="text-indigo-600 dark:text-indigo-400">admin@campus.edu</span></div>
          <div>Password: <span className="text-indigo-600 dark:text-indigo-400">Admin@Campus2026!</span></div>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="alert"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs sm:text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start gap-2"
        >
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAdminLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
            Admin Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@campus.edu"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-9 pr-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
            Admin Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 pl-9 pr-10 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 mt-2 bg-indigo-700 hover:bg-indigo-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Admin Authorization...</span>
            </>
          ) : (
            <>
              <span>Sign In as Administrator</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* Switch to Student Login */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center space-y-3">
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Are you a student?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-1"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Go to Student Sign In</span>
          </Link>
        </div>

        <div className="text-center pt-1">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition"
          >
            ← Return to Campus Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading admin authentication...</span>
          </div>
        }
      >
        <AdminLoginFormContent />
      </Suspense>
    </div>
  );
}
