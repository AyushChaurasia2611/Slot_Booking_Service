import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

/**
 * Gets the UTC start and end bounds of a local YYYY-MM-DD date in a target timezone.
 * Useful for querying UTC database timestamps that correspond to a local calendar day.
 */
export function getDateBoundsInTimezone(dateStr: string, timezone: string): { start: Date; end: Date } {
  const startLocal = `${dateStr} 00:00:00.000`;
  const endLocal = `${dateStr} 23:59:59.999`;

  const start = fromZonedTime(startLocal, timezone);
  const end = fromZonedTime(endLocal, timezone);

  return { start, end };
}

/**
 * Formats a Date object into a string representation in the target timezone.
 */
export function formatZonedTime(date: Date | string | number, formatStr: string, timezone: string): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const zonedDate = toZonedTime(d, timezone);
  return format(zonedDate, formatStr, { timeZone: timezone });
}
