'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { formatZonedTime } from '@/lib/timezone';
import Link from 'next/link';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  timezone: string;
}

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  providerId: string;
  provider: UserDetail;
  bookedById: string | null;
  bookedBy: UserDetail | null;
}

interface AvailableSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export default function BookingsPage() {
  const { currentUser, timezone, loading: authLoading } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // States for Cancel Modal
  const [slotToCancel, setSlotToCancel] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  // States for Reschedule Modal
  const [slotToReschedule, setSlotToReschedule] = useState<Booking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState<boolean>(false);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>('');
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      } else {
        setErrorMessage(data.error || 'Failed to fetch bookings.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error fetching bookings.');
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBookings();
    }
  }, [currentUser, fetchBookings]);

  // Handle Cancel Booking
  const handleCancelConfirm = async () => {
    if (!slotToCancel) return;
    setCancelLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/bookings?slotId=${slotToCancel.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Booking successfully cancelled.');
        setBookings((prev) => prev.filter((b) => b.id !== slotToCancel.id));
        setSlotToCancel(null);
      } else {
        setErrorMessage(data.error || 'Failed to cancel booking.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error cancelling booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Reschedule Modal & Fetch available slots for the same provider
  const handleOpenReschedule = async (booking: Booking) => {
    setSlotToReschedule(booking);
    setAvailableSlots([]);
    setSelectedNewSlotId('');
    setRescheduleSlotsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Query available slots for this provider, limit 50, page 1
      const params = new URLSearchParams({
        providerId: booking.providerId,
        status: 'available',
        page: '1',
        limit: '50',
      });
      
      const res = await fetch(`/api/slots?${params.toString()}`);
      const data = await res.json();
      
      if (res.ok) {
        // Exclude the current slot from the available options
        const filtered = (data.slots || []).filter((s: any) => s.id !== booking.id);
        setAvailableSlots(filtered);
      } else {
        setErrorMessage(data.error || 'Failed to fetch alternative slots.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error fetching alternative slots.');
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  // Confirm Reschedule (PUT request)
  const handleRescheduleConfirm = async () => {
    if (!slotToReschedule || !selectedNewSlotId) return;
    setRescheduleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSlotId: slotToReschedule.id,
          newSlotId: selectedNewSlotId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Booking successfully rescheduled.');
        setSlotToReschedule(null);
        fetchBookings(); // Refresh bookings
      } else {
        setErrorMessage(data.error || 'Rescheduling failed.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error during reschedule.');
    } finally {
      setRescheduleLoading(false);
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
            Please use the <span className="font-semibold text-indigo-600 dark:text-indigo-400">Acting As</span> dropdown in the header to switch to an account.
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

  const isCustomer = currentUser.role === 'CUSTOMER';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          {isCustomer ? 'My Bookings' : 'Received Bookings'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {isCustomer
            ? 'Manage your scheduled appointments. You can reschedule or cancel slots.'
            : 'View clients who booked sessions on your published slots.'}{' '}
          All times are displayed in: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{timezone}</span>.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Bookings List */}
      <div className="mt-8">
        {bookingsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No bookings scheduled</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isCustomer ? 'Go find available sessions and book one now.' : 'Clients will appear here once they book your slots.'}
            </p>
            {isCustomer && (
              <div className="mt-6">
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 transition-colors">
                  Browse Available Slots
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const formattedDate = formatZonedTime(booking.startTime, 'EEEE, MMMM d, yyyy', timezone);
              const formattedStart = formatZonedTime(booking.startTime, 'h:mm a', timezone);
              const formattedEnd = formatZonedTime(booking.endTime, 'h:mm a', timezone);
              
              const partner = isCustomer ? booking.provider : booking.bookedBy;

              return (
                <div
                  key={booking.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Time block */}
                    <div className="rounded-xl bg-indigo-50 p-4 text-center dark:bg-indigo-950/30 min-w-[140px]">
                      <span className="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {formatZonedTime(booking.startTime, 'MMM d', timezone)}
                      </span>
                      <span className="block text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {formattedStart}
                      </span>
                      <span className="block text-xxs font-medium text-slate-400 mt-0.5">
                        to {formattedEnd}
                      </span>
                    </div>

                    {/* Details block */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {formattedDate}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        {isCustomer ? `Provider: ${partner?.name}` : `Client: ${partner?.name}`}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <span>{partner?.email}</span>
                        <span className="text-slate-350 dark:text-slate-650">•</span>
                        <span>Local Zone: {partner?.timezone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isCustomer ? (
                    <div className="flex items-center gap-3 border-t border-slate-100 mt-4 pt-4 sm:mt-0 sm:pt-0 sm:border-0">
                      <button
                        onClick={() => handleOpenReschedule(booking)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-850 transition-colors text-center"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => setSlotToCancel(booking)}
                        className="flex-1 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 text-sm font-semibold hover:bg-rose-100/50 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 border-t border-slate-100 mt-4 pt-4 sm:mt-0 sm:pt-0 sm:border-0">
                      <button
                        onClick={() => setSlotToCancel(booking)}
                        className="w-full sm:w-auto rounded-xl bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 text-sm font-semibold hover:bg-rose-100/50 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors text-center"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {slotToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cancel Appointment?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to cancel your booking with{' '}
              <span className="font-semibold text-slate-850 dark:text-slate-200">
                {isCustomer ? slotToCancel.provider.name : slotToCancel.bookedBy?.name}
              </span>{' '}
              on {formatZonedTime(slotToCancel.startTime, 'MMM d, h:mm a', timezone)}? The slot will immediately become available for others to book.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSlotToCancel(null)}
                disabled={cancelLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-850 transition-colors"
              >
                No, Keep It
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {cancelLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Appointment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {slotToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reschedule Appointment</h3>
              <button
                onClick={() => setSlotToReschedule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400">CURRENT BOOKING</p>
              <div className="mt-1 rounded-xl bg-slate-50 p-3 border border-slate-150 text-sm dark:bg-slate-950 dark:border-slate-800">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatZonedTime(slotToReschedule.startTime, 'EEEE, MMM d, yyyy', timezone)}
                </span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-bold text-slate-850 dark:text-slate-200">
                  {formatZonedTime(slotToReschedule.startTime, 'h:mm a', timezone)} -{' '}
                  {formatZonedTime(slotToReschedule.endTime, 'h:mm a', timezone)}
                </span>
              </div>

              <div className="mt-5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Select New Available Slot from {slotToReschedule.provider.name}
                </label>
                
                {rescheduleSlotsLoading ? (
                  <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-850" />
                ) : availableSlots.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    No other available slots found for this provider. To reschedule, this provider needs to publish more slots first.
                  </p>
                ) : (
                  <select
                    value={selectedNewSlotId}
                    onChange={(e) => setSelectedNewSlotId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <option value="">-- Choose alternative time --</option>
                    {availableSlots.map((slot) => {
                      const dateStr = formatZonedTime(slot.startTime, 'EEE, MMM d - h:mm a', timezone);
                      const endStr = formatZonedTime(slot.endTime, 'h:mm a', timezone);
                      return (
                        <option key={slot.id} value={slot.id}>
                          {dateStr} to {endStr}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                onClick={() => setSlotToReschedule(null)}
                disabled={rescheduleLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-850 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleConfirm}
                disabled={rescheduleLoading || !selectedNewSlotId}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {rescheduleLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Confirm Reschedule</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
