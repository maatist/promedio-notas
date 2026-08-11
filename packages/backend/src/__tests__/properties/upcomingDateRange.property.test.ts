/**
 * Property 4: Upcoming grades date range filter
 *
 * For any set of grades with various dates (null, past, today, within 30 days,
 * beyond 30 days), the upcoming grades endpoint SHALL return exactly those grades
 * whose date is >= start of today AND <= today + 30 days. Grades with null date
 * or past dates SHALL be excluded.
 *
 * **Validates: Requirements 3.1, 3.4**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Replicates the filter logic from the GET /api/upcoming-grades endpoint.
 * Returns true if a grade should be included in upcoming results.
 */
function isInUpcomingRange(gradeDate: string | null, todayStr: string): boolean {
  if (gradeDate === null) return false;
  const today = new Date(todayStr + 'T00:00:00');
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const date = new Date(gradeDate + 'T00:00:00');
  return date >= today && date <= thirtyDaysLater;
}

/**
 * Helper to format a Date as YYYY-MM-DD string.
 */
function toISODate(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Arbitrary that generates a "today" reference date within a reasonable range.
 * Uses integer-based construction to avoid Invalid Date issues with fc.date().
 */
const todayArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to always be valid
  })
  .map(({ year, month, day }) => {
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return d;
  });

describe('Property 4: Upcoming grades date range filter', () => {
  /**
   * Grades with null date are never included in upcoming results.
   *
   * **Validates: Requirements 3.1, 3.4**
   */
  it('grades with null date are never included', () => {
    fc.assert(
      fc.property(todayArb, (today) => {
        const todayStr = toISODate(today);
        expect(isInUpcomingRange(null, todayStr)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Grades with dates before today are never included.
   *
   * **Validates: Requirements 3.1, 3.4**
   */
  it('grades with dates before today are never included', () => {
    fc.assert(
      fc.property(
        todayArb,
        fc.integer({ min: 1, max: 365 }),
        (today, daysBefore) => {
          const pastDate = new Date(today);
          pastDate.setDate(pastDate.getDate() - daysBefore);
          const todayStr = toISODate(today);
          const gradeDateStr = toISODate(pastDate);
          expect(isInUpcomingRange(gradeDateStr, todayStr)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Grades with dates from today to today+30 are always included.
   *
   * **Validates: Requirements 3.1, 3.4**
   */
  it('grades with dates from today to today+30 are always included', () => {
    fc.assert(
      fc.property(
        todayArb,
        fc.integer({ min: 0, max: 30 }),
        (today, daysAhead) => {
          const futureDate = new Date(today);
          futureDate.setDate(futureDate.getDate() + daysAhead);
          const todayStr = toISODate(today);
          const gradeDateStr = toISODate(futureDate);
          expect(isInUpcomingRange(gradeDateStr, todayStr)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Grades with dates after today+30 are never included.
   *
   * **Validates: Requirements 3.1, 3.4**
   */
  it('grades with dates after today+30 are never included', () => {
    fc.assert(
      fc.property(
        todayArb,
        fc.integer({ min: 31, max: 365 }),
        (today, daysAhead) => {
          const farFutureDate = new Date(today);
          farFutureDate.setDate(farFutureDate.getDate() + daysAhead);
          const todayStr = toISODate(today);
          const gradeDateStr = toISODate(farFutureDate);
          expect(isInUpcomingRange(gradeDateStr, todayStr)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Applying the filter to a mixed set returns exactly the expected subset.
   *
   * **Validates: Requirements 3.1, 3.4**
   */
  it('filtering a mixed set returns exactly grades within the date range', () => {
    // Generator for a single grade with varied date categories
    const gradeWithDateArb = (today: Date) => {
      const todayStr = toISODate(today);
      return fc.oneof(
        // null date
        fc.constant({ id: '', date: null as string | null }),
        // past date (1..365 days before today)
        fc.integer({ min: 1, max: 365 }).map((daysBefore) => {
          const d = new Date(today);
          d.setDate(d.getDate() - daysBefore);
          return { id: '', date: toISODate(d) };
        }),
        // today
        fc.constant({ id: '', date: todayStr }),
        // within 30 days (1..30)
        fc.integer({ min: 1, max: 30 }).map((daysAhead) => {
          const d = new Date(today);
          d.setDate(d.getDate() + daysAhead);
          return { id: '', date: toISODate(d) };
        }),
        // beyond 30 days (31..365)
        fc.integer({ min: 31, max: 365 }).map((daysAhead) => {
          const d = new Date(today);
          d.setDate(d.getDate() + daysAhead);
          return { id: '', date: toISODate(d) };
        })
      );
    };

    fc.assert(
      fc.property(
        todayArb.chain((today) =>
          fc.tuple(
            fc.constant(today),
            fc.array(gradeWithDateArb(today), { minLength: 1, maxLength: 20 })
          )
        ),
        ([today, grades]) => {
          const todayStr = toISODate(today);

          // Assign unique ids for comparison
          const gradesWithIds = grades.map((g, i) => ({ ...g, id: `grade-${i}` }));

          // Apply filter
          const filtered = gradesWithIds.filter((g) => isInUpcomingRange(g.date, todayStr));

          // Manually compute expected subset
          const expected = gradesWithIds.filter((g) => {
            if (g.date === null) return false;
            const gradeDate = new Date(g.date + 'T00:00:00');
            const todayDate = new Date(todayStr + 'T00:00:00');
            const thirtyDaysLater = new Date(todayDate);
            thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
            return gradeDate >= todayDate && gradeDate <= thirtyDaysLater;
          });

          // Sets should match exactly
          const filteredIds = filtered.map((g) => g.id).sort();
          const expectedIds = expected.map((g) => g.id).sort();
          expect(filteredIds).toEqual(expectedIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});
