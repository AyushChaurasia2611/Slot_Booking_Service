'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'New York (EST/EDT - UTC-5/-4)' },
  { value: 'Europe/London', label: 'London (GMT/BST - UTC+0/+1)' },
  { value: 'Asia/Kolkata', label: 'Delhi (IST - UTC+5.5)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST - UTC+9)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT - UTC-8/-7)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST - UTC+1/+2)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT - UTC+10/+11)' }
];

export default function Header() {
  const { currentUser, allUsers, timezone, loginAs, changeTimezone, loading } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') {
      await loginAs(null);
      router.push('/');
    } else {
      await loginAs(val);
      // Determine default route based on role
      const user = allUsers.find(u => u.id === val);
      if (user) {
        if (user.role === 'PROVIDER') {
          router.push('/manage-slots');
        } else {
          router.push('/dashboard');
        }
      }
    }
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeTimezone(e.target.value);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg tracking-tight">SlotBooker</span>
            </Link>

            {currentUser && (
              <nav className="hidden md:flex items-center gap-1">
                {currentUser.role === 'CUSTOMER' ? (
                  <>
                    <Link
                      href="/dashboard"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === '/dashboard'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      Book a Slot
                    </Link>
                    <Link
                      href="/bookings"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === '/bookings'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      My Bookings
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/manage-slots"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === '/manage-slots'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      Manage Slots
                    </Link>
                    <Link
                      href="/bookings"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        pathname === '/bookings'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      Received Bookings
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex items-center gap-3">
            {/* Timezone Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="hidden lg:inline text-xs font-semibold text-slate-500 dark:text-slate-400">
                Viewing Zone:
              </span>
              <select
                value={timezone}
                onChange={handleTimezoneChange}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-400"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User Switcher (Mock Login) */}
            <div className="flex items-center gap-1.5">
              <span className="hidden lg:inline text-xs font-semibold text-slate-500 dark:text-slate-400">
                Acting As:
              </span>
              <div className="relative">
                {loading ? (
                  <div className="h-7 w-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ) : (
                  <select
                    value={currentUser?.id || ''}
                    onChange={handleUserChange}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      currentUser
                        ? currentUser.role === 'PROVIDER'
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-400'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                    }`}
                  >
                    <option value="">-- Guest --</option>
                    <optgroup label="Providers (Publish Slots)">
                      {allUsers
                        .filter((u) => u.role === 'PROVIDER')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Customers (Book Slots)">
                      {allUsers
                        .filter((u) => u.role === 'CUSTOMER')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        {currentUser && (
          <div className="flex md:hidden h-10 border-t border-slate-100 dark:border-slate-800 items-center justify-around">
            {currentUser.role === 'CUSTOMER' ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-xs font-semibold transition-colors ${
                    pathname === '/dashboard'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Book a Slot
                </Link>
                <Link
                  href="/bookings"
                  className={`text-xs font-semibold transition-colors ${
                    pathname === '/bookings'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  My Bookings
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/manage-slots"
                  className={`text-xs font-semibold transition-colors ${
                    pathname === '/manage-slots'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Manage Slots
                </Link>
                <Link
                  href="/bookings"
                  className={`text-xs font-semibold transition-colors ${
                    pathname === '/bookings'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Received Bookings
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
