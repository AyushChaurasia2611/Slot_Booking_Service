'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { formatZonedTime } from '@/lib/timezone';
import Link from 'next/link';

interface Provider {
  id: string;
  name: string;
  email: string;
  timezone: string;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  providerId: string;
  provider: Provider;
}

export default function CustomerDashboard() {
  const { currentUser, timezone, loading: authLoading } = useApp();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load all providers for filtering
  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.users) {
          setProviders(data.users.filter((u: any) => u.role === 'PROVIDER'));
        }
      } catch (e) {
        console.error('Failed to fetch providers', e);
      }
    }
    fetchProviders();
  }, []);

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        status: 'available',
        page: page.toString(),
        limit: '6',
        timezone, // Pass selected viewing timezone for proper date range querying
      });

      if (selectedProvider) {
        params.append('providerId', selectedProvider);
      }
      if (filterDate) {
        params.append('date', filterDate);
      }

      const res = await fetch(`/api/slots?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setSlots(data.slots || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fetch slots' });
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Network error fetching slots.' });
    } finally {
      setSlotsLoading(false);
    }
  }, [page, selectedProvider, filterDate, timezone]);

  // Fetch slots when criteria change
  useEffect(() => {
    if (currentUser && currentUser.role === 'CUSTOMER') {
      fetchSlots();
    }
  }, [currentUser, fetchSlots]);

  // Reset page when filters change
  const handleProviderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvider(e.target.value);
    setPage(1);
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedProvider('');
    setFilterDate('');
    setPage(1);
  };

  const handleBookSlot = async (slotId: string) => {
    setBookingId(slotId);
    setMessage(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Booking confirmed! Check "My Bookings" page.',
        });
        // Remove booked slot from list
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to book slot. It may have been booked by someone else.',
        });
        // Rerequest slots list to sync with DB
        fetchSlots();
      }
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Network error. Booking failed.' });
    } finally {
      setBookingId(null);
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
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Mock Account Required</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please use the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Acting As</span> dropdown in the header to switch to a Customer account (e.g., Charlie or Dave) and begin booking.
          </p>
          <div className="mt-6">
            <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'CUSTOMER') {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4 dark:bg-indigo-950/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">Provider View</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You are currently signed in as a <span className="font-semibold text-indigo-600 dark:text-indigo-400">Provider</span>.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/manage-slots" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors">
              Go to Manage Slots
            </Link>
            <span className="text-xs text-slate-400">Or use the top switcher to act as Charlie or Dave.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="md:flex md:items-center md:justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Available Time Slots
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Browse and book sessions with available providers. All times are displayed in your currently selected viewing timezone: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{timezone}</span>.
          </p>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div className={`mt-6 rounded-xl p-4 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-300' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300'
        }`}>
          <div className="flex gap-2">
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Provider Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Provider
            </label>
            <select
              value={selectedProvider}
              onChange={handleProviderFilterChange}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="">All Providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={handleDateFilterChange}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            />
          </div>

          {/* Clear Filters */}
          {(selectedProvider || filterDate) && (
            <button
              onClick={handleClearFilters}
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          Showing page <span className="font-semibold text-slate-800 dark:text-slate-100">{page}</span> of{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-100">{totalPages}</span>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="mt-6">
        {slotsLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No available slots found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try changing your filters or checking a different date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => {
              // Convert dates for display in selected viewing timezone
              const formattedDate = formatZonedTime(slot.startTime, 'EEEE, MMMM d, yyyy', timezone);
              const formattedStart = formatZonedTime(slot.startTime, 'h:mm a', timezone);
              const formattedEnd = formatZonedTime(slot.endTime, 'h:mm a', timezone);
              
              // Provider local timezone details for informative badge
              const providerZone = slot.provider.timezone;

              return (
                <div
                  key={slot.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    {/* Provider Info */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {slot.provider.name}
                        </h3>
                        <p className="text-xs text-slate-400">{slot.provider.email}</p>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xxs font-medium text-slate-500 border border-slate-200 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-400">
                        {providerZone}
                      </span>
                    </div>

                    {/* Slot Time details */}
                    <div className="mt-4 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                        <span>{formattedStart}</span>
                        <span className="text-slate-400 font-normal">→</span>
                        <span>{formattedEnd}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      onClick={() => handleBookSlot(slot.id)}
                      disabled={bookingId !== null}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {bookingId === slot.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Booking...</span>
                        </>
                      ) : (
                        <span>Book Slot</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {!slotsLoading && slots.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850"
          >
            ←
          </button>
          <span className="text-sm font-medium text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
