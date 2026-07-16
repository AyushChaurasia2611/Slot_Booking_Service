'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { formatZonedTime } from '@/lib/timezone';
import { fromZonedTime } from 'date-fns-tz';
import Link from 'next/link';

interface UserDetail {
  name: string;
  email: string;
  timezone: string;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  bookedById: string | null;
  bookedBy: UserDetail | null;
}

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

export default function ManageSlotsPage() {
  const { currentUser, timezone, loading: authLoading } = useApp();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(true);
  
  // Form states
  const [formDate, setFormDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('');
  const [formEndTime, setFormEndTime] = useState<string>('');
  const [formTimezone, setFormTimezone] = useState<string>('UTC');
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  
  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync input timezone with provider timezone on load
  useEffect(() => {
    if (currentUser) {
      setFormTimezone(currentUser.timezone);
    }
  }, [currentUser]);

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({
        providerId: currentUser?.id || '',
        status: 'all', // Show both available and booked slots
        page: '1',
        limit: '100', // Fetch up to 100 slots for management view
      });
      const res = await fetch(`/api/slots?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch slots.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Network error fetching slots.');
    } finally {
      setSlotsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'PROVIDER') {
      fetchSlots();
    }
  }, [currentUser, fetchSlots]);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formStartTime || !formEndTime) {
      setErrorMsg('Please fill in all slot scheduling fields.');
      return;
    }

    setCreateLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Build local date-time strings
      const localStartStr = `${formDate} ${formStartTime}:00.000`;
      const localEndStr = `${formDate} ${formEndTime}:00.000`;

      // 2. Translate local times to UTC ISO Strings in the formTimezone context
      const startUtc = fromZonedTime(localStartStr, formTimezone).toISOString();
      const endUtc = fromZonedTime(localEndStr, formTimezone).toISOString();

      // 3. POST to backend API
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startUtc,
          endTime: endUtc,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Time slot published successfully!');
        setFormStartTime('');
        setFormEndTime('');
        fetchSlots(); // Refresh slot list
      } else {
        setErrorMsg(data.error || 'Failed to publish slot.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Network error publishing slot.');
    } finally {
      setCreateLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 dark:bg-amber-950/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mock Account Required</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please use the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Acting As</span> dropdown in the header to switch to a Provider account (e.g., Alice or Bob) to manage slots.
          </p>
          <div className="mt-6">
            <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'PROVIDER') {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4 dark:bg-indigo-950/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer View</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You are currently signed in as a <span className="font-semibold text-emerald-600 dark:text-emerald-400">Customer</span>.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors">
              Go to Slots Dashboard
            </Link>
            <span className="text-xs text-slate-400">Or use the top switcher to act as Alice or Bob.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          Manage Time Slots
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create and publish time slots. Clients will immediately be able to book them. All times are displayed in your currently selected viewing timezone: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{timezone}</span>.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Create Slot Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Publish New Slot</h2>
            <p className="text-xs text-slate-400 mt-1">Specify times in your preferred scheduling timezone.</p>

            {successMsg && (
              <div className="mt-4 rounded-xl border border-emerald-250 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mt-4 rounded-xl border border-rose-250 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSlot} className="mt-6 flex flex-col gap-4">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                />
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Timezone for entry */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Input Timezone
                </label>
                <select
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {createLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Time Slot</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Slots List */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Published Slots</h2>
          
          {slotsLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-800 bg-white dark:bg-slate-900">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No slots published yet</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Use the scheduling form on the left to add slots.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map((slot) => {
                const formattedDate = formatZonedTime(slot.startTime, 'EEEE, MMMM d, yyyy', timezone);
                const formattedStart = formatZonedTime(slot.startTime, 'h:mm a', timezone);
                const formattedEnd = formatZonedTime(slot.endTime, 'h:mm a', timezone);
                
                const isBooked = slot.bookedById !== null;

                return (
                  <div
                    key={slot.id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm sm:flex-row sm:items-center bg-white dark:bg-slate-900 ${
                      isBooked
                        ? 'border-emerald-250 dark:border-emerald-900/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {formattedDate}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {formattedStart} - {formattedEnd}
                        </span>
                      </div>
                      
                      {isBooked ? (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            ✓ Booked by Customer
                          </p>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            {slot.bookedBy?.name}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {slot.bookedBy?.email} (Timezone: {slot.bookedBy?.timezone})
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          ● Available for booking
                        </p>
                      )}
                    </div>

                    {isBooked && (
                      <div className="mt-4 border-t border-slate-100 pt-3 sm:mt-0 sm:pt-0 sm:border-0">
                        <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300">
                          Confirmed Slot
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
