/**
 * Property 9: Banner display limit
 *
 * For any set of upcoming grades with more than 10 items, the banner SHALL display
 * at most 10 evaluations, and those 10 SHALL be the first 10 by ascending date order
 * (the most imminent ones).
 *
 * **Validates: Requirements 4.1**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure logic extracted from UpcomingBanner component.
 * Sorts grades by date ASC and limits to 10.
 */
function getDisplayedGrades(grades: { id: string; date: string }[]): { id: string; date: string }[] {
  return [...grades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);
}

/**
 * Generator for a valid ISO date string (YYYY-MM-DD) within a reasonable range.
 */
const isoDateArb = fc.integer({ min: 0, max: 2556 }).map((daysOffset) => {
  const base = new Date('2024-01-01T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + daysOffset);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
});

/**
 * Generator for a grade with a valid ISO date string.
 */
const gradeArb = fc.record({
  id: fc.uuid(),
  date: isoDateArb,
});

describe('Property 9: Banner display limit', () => {
  /**
   * For any array with more than 10 items, the result has exactly 10 items.
   *
   * **Validates: Requirements 4.1**
   */
  it('displays exactly 10 items when input has more than 10', () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 11, maxLength: 50 }),
        (grades) => {
          const displayed = getDisplayedGrades(grades);
          expect(displayed).toHaveLength(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The 10 displayed items are the first 10 by date ASC (the most imminent ones).
   *
   * **Validates: Requirements 4.1**
   */
  it('displayed items are the first 10 by date ASC', () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 11, maxLength: 50 }),
        (grades) => {
          const displayed = getDisplayedGrades(grades);
          const allSorted = [...grades].sort((a, b) => a.date.localeCompare(b.date));
          const expectedFirst10 = allSorted.slice(0, 10);

          // The displayed items should match the first 10 from the fully sorted array
          expect(displayed).toEqual(expectedFirst10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For arrays with ≤ 10 items, all items are displayed.
   *
   * **Validates: Requirements 4.1**
   */
  it('displays all items when input has 10 or fewer', () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 0, maxLength: 10 }),
        (grades) => {
          const displayed = getDisplayedGrades(grades);
          expect(displayed).toHaveLength(grades.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The result is always sorted by date ASC.
   *
   * **Validates: Requirements 4.1**
   */
  it('result is always sorted by date ASC', () => {
    fc.assert(
      fc.property(
        fc.array(gradeArb, { minLength: 0, maxLength: 50 }),
        (grades) => {
          const displayed = getDisplayedGrades(grades);

          for (let i = 0; i < displayed.length - 1; i++) {
            expect(displayed[i].date.localeCompare(displayed[i + 1].date)).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
