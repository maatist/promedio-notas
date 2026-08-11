/**
 * Formats an ISO date string to a localized short date format.
 * Accepts both "YYYY-MM-DD" and full ISO datetime "YYYY-MM-DDTHH:mm:ss.sssZ".
 * - 'es' locale: day/month/year (e.g., "15/3/2025")
 * - 'en' locale: month/day/year (e.g., "3/15/2025")
 */
export function formatGradeDate(isoDate: string, locale: 'es' | 'en'): string {
  // Extract just the date part (YYYY-MM-DD) if a full datetime is provided
  const datePart = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
  const date = new Date(datePart + 'T00:00:00');
  return date.toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculates the number of days remaining from today to the grade date.
 * Both parameters should be ISO date strings (YYYY-MM-DD).
 * Returns a positive integer for future dates, 0 for today.
 */
export function getDaysRemaining(gradeDate: string, today: string): number {
  const target = new Date(gradeDate + 'T00:00:00');
  const current = new Date(today + 'T00:00:00');
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns the urgency color based on days remaining:
 * - 0-7 days: 'red' (urgent)
 * - 8-14 days: 'yellow' (approaching)
 * - 15-30 days: 'green' (comfortable)
 */
export type UrgencyColor = 'red' | 'yellow' | 'green';

export function getUrgencyColor(daysRemaining: number): UrgencyColor {
  if (daysRemaining <= 7) return 'red';
  if (daysRemaining <= 14) return 'yellow';
  return 'green';
}
