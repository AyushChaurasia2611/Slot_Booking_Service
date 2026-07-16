'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const { allUsers, currentUser, loginAs, loading } = useApp();
  const router = useRouter();

  const handleSelectUser = async (userId: string, role: string) => {
    await loginAs(userId);
    if (role === 'PROVIDER') {
      router.push('/manage-slots');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          Slot Booking Service
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
          A premium, timezone-aware, concurrency-safe appointment scheduler built with Next.js, Prisma, and PostgreSQL.
        </p>
        
        {currentUser ? (
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href={currentUser.role === 'PROVIDER' ? '/manage-slots' : '/dashboard'}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              Go to Dashboard ({currentUser.name})
            </Link>
          </div>
        ) : null}
      </div>

      {/* User Login Section */}
      <div className="mt-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Select a Mock Identity to Begin
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Switch identities at any time using the selector in the top-right header to test provider/customer interactions.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {allUsers.map((user) => {
              const isProvider = user.role === 'PROVIDER';
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id, user.role)}
                  className={`flex flex-col text-left justify-between p-6 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-400 transition-all ${
                    currentUser?.id === user.id
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="w-full">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide mb-3 ${
                      isProvider
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                    }`}>
                      {user.role}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {user.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                  </div>
                  
                  <div className="mt-8 w-full border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Zone: {user.timezone}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                      Login →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Explanations */}
      <div className="mt-20 border-t border-slate-200 pt-12 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-10">
          Technical Highlights
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">Concurrency Control</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Prevents double-booking at the database query level using an optimistic check condition ({"where: { bookedById: null }"}). If multiple users book in the exact same millisecond, one succeeds and the other receives a conflict exception.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-3.5a2.5 2.5 0 014-2.5V4a9 9 0 11-8.59 3l1.825-1.125z" />
              </svg>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">Cross-Timezone Logic</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              All slots are stored in UTC. Providers enter dates in their scheduling zone, and the database records the exact UTC translations. The client interface translates date ranges and displays times according to the viewer's active zone dropdown.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
              </svg>
            </div>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">Atomic Rescheduling</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Swapping appointments executes inside a single database transaction (`$transaction`). If claiming the new slot fails (e.g. taken), releasing the old slot rolls back, ensuring no data loss or accidental cancellation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
