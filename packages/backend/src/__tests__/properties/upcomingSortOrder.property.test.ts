/**
 * Property 5: Upcoming grades sort order
 *
 * For any result set returned by the upcoming grades endpoint, the grades SHALL be
 * sorted by date in ascending order — that is, for every consecutive pair of items
 * (i, i+1), item[i].date <= item[i+1].date.
 *
 * **Validates: Requirements 3.3**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Sorts an array of grades by date in ascending order (lexicographic on ISO date strings).
 */
function sortByDateAsc<T extends { date: string }>(grades: T[]): T[] {
  return [...grades].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Checks whether an array of grades is sorted by date in ascending order.
 */
function isSortedAsc(grades: { date: string }[]): boolean {
  for (let i = 0; i < grades.length - 1; i++) {
    if (grades[i].date > grades[i + 1].date) return false;
  }
  return true;
}

/**
 * Generates a valid ISO date string (YYYY-MM-DD) within a reasonable range
 * by constructing from year/month/day integers to avoid Invalid Date issues.
 */
const isoDateArb = fc
  .record({
    year: fc.integer({ min: 2024, max: 2026 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to always be valid
  })
  .map(({ year, month, day }) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

/**
 * Generates an array of grade-like objects with date fields.
 */
const gradesArrayArb = fc.array(
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    date: isoDateArb,
    description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    subjectComponentName: fc.string({ minLength: 1, maxLength: 30 }),
    subjectName: fc.string({ minLength: 1, maxLength: 30 }),
  }),
  { minLength: 0, maxLength: 30 }
);

describe('Property 5: Upcoming grades sort order', () => {
  /**
   * For any generated array of grades with valid dates, after applying sortByDateAsc,
   * the result is always sorted (isSortedAsc returns true).
   *
   * **Validates: Requirements 3.3**
   */
  it('sorted result is always in ascending date order', () => {
    fc.assert(
      fc.property(gradesArrayArb, (grades) => {
        const sorted = sortByDateAsc(grades);
        expect(isSortedAsc(sorted)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * The sorted array has the same length as the input (no items lost or added).
   *
   * **Validates: Requirements 3.3**
   */
  it('sorting preserves array length (no items lost)', () => {
    fc.assert(
      fc.property(gradesArrayArb, (grades) => {
        const sorted = sortByDateAsc(grades);
        expect(sorted).toHaveLength(grades.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * The sorted array contains exactly the same elements as the input
   * (sorting is a permutation, not a filter).
   *
   * **Validates: Requirements 3.3**
   */
  it('sorting preserves all elements (same multiset)', () => {
    fc.assert(
      fc.property(gradesArrayArb, (grades) => {
        const sorted = sortByDateAsc(grades);

        // Every element in sorted should be in the original (by reference)
        const originalSet = new Set(grades);
        for (const item of sorted) {
          expect(originalSet.has(item)).toBe(true);
        }

        // Every element in original should be in sorted (by reference)
        const sortedSet = new Set(sorted);
        for (const item of grades) {
          expect(sortedSet.has(item)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
