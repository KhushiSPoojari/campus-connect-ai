
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Search,
  Users,
  DoorOpen,
  MapPin,
  Bell,
  Menu,
  X,
  ShieldAlert,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

import { useAuth } from '@/lib/context/auth-context';
import { Badge } from '@/components/ui/Badge';

const NAV_ITEMS = [
  { label: 'Search & Home', href: '/', icon: Search },
  { label: 'Faculty Directory', href: '/faculty', icon: Users },
  { label: 'Classrooms & Vacancies', href: '/classrooms', icon: DoorOpen },
  { label: 'Campus Map', href: '/navigation', icon: MapPin },
  { label: 'Notices & Events', href: '/notices', icon: Bell },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 rounded-md bg-indigo-600 px-4 py-2 text-white shadow-lg"
      >
        Skip to main content
      </a>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 xl:px-8">
        <div className="flex min-h-20 items-center justify-between gap-x-5 gap-y-3 py-3">

          {/* BRANDING */}
          <Link
            href="/"
            className="flex w-[250px] shrink-0 items-center gap-3 rounded-lg p-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20 transition-transform group-hover:scale-105">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="whitespace-nowrap text-lg font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
                  Campus Connect{' '}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    AI
                  </span>
                </span>

                <span className="hidden shrink-0 rounded-full border border-indigo-200/60 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 2xl:inline-flex">
                  Student Portal
                </span>
              </div>

              <p className="mt-1 hidden max-w-[210px] text-[11px] leading-snug text-zinc-500 dark:text-zinc-400 sm:block">
                Smart Campus Information &amp; Space Optimization
              </p>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
            aria-label="Main Navigation"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 2xl:px-3 2xl:text-sm ${
                    isActive
                      ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ADMIN AND AUTHENTICATION */}
          <div className="hidden shrink-0 items-center gap-2 2xl:flex">
            <Link
              href="/admin"
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                user?.role === 'admin'
                  ? 'border-indigo-300 bg-indigo-50/60 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-indigo-400'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Admin Dashboard</span>

              {user?.role === 'admin' && (
                <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Admin
                </span>
              )}
            </Link>

            {isAuthenticated && user ? (
              <div className="flex shrink-0 items-center gap-2 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
                  <User className="h-3.5 w-3.5 shrink-0 text-zinc-400" />

                  <span className="max-w-[90px] truncate">
                    {user.name}
                  </span>

                  <Badge
                    variant={user.role === 'admin' ? 'primary' : 'info'}
                  >
                    {user.role}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => logout()}
                  title="Sign out"
                  aria-label="Sign out"
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* MOBILE / TABLET MENU BUTTON */}
          <div className="flex shrink-0 xl:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET DRAWER */}
      {mobileMenuOpen && (
        <div className="animate-in slide-in-from-top-2 space-y-1 border-t border-zinc-200 bg-white px-4 pb-4 pt-2 duration-150 dark:border-zinc-800 dark:bg-zinc-900 xl:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-400'
                  }`}
                />
                {item.label}
              </Link>
            );
          })}

          {/* Admin link */}
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-zinc-400" />
              Admin Dashboard
            </span>

            {user?.role === 'admin' && (
              <Badge variant="primary">Admin</Badge>
            )}
          </Link>

          {/* Authentication */}
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-3 dark:bg-zinc-800/50">
              <div className="flex min-w-0 items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-zinc-400" />

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {user.name}
                  </div>

                  <div className="truncate text-xs text-zinc-500">
                    {user.role} · {user.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="shrink-0 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Account
            </Link>
          )}
        </div>
      )}
    </header>
  );
}