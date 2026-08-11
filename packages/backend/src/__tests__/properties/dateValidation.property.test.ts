/**
 * Property 1: Date validation round-trip
 *
 * For any string that matches the ISO 8601 format (YYYY-MM-DD) and represents a valid
 * calendar date, the date validation function SHALL accept it. For any string that does
 * NOT match the format or does NOT represent a valid calendar date (e.g., 2024-02-30,
 * 2024-13-01), the validation SHALL reject it.
 *
 * **Validates: Requirements 1.4, 1.5**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { gradeDateSchema } from '../../validators/schemas';

describe('Property 1: Date validation round-trip', () => {
  /**
   * Valid ISO 8601 dates generated from real Date objects should always be accepted.
   *
   * **Validates: Requirements 1.4, 1.5**
   */
  it('accepts any valid ISO 8601 date string (YYYY-MM-DD)', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date('1900-01-01T00:00:00Z'),
          max: new Date('2099-12-31T00:00:00Z'),
        }),
        (date) => {
          const isoString = date.toISOString().split('T')[0];
          const result = gradeDateSchema.safeParse(isoString);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Random strings that don't match YYYY-MM-DD format should always be rejected.
   *
   * **Validates: Requirements 1.4, 1.5**
   */
  it('rejects strings that do not match YYYY-MM-DD format', () => {
    const nonDateString = fc.string().filter((s) => {
      // Exclude strings that happen to match YYYY-MM-DD format
      return !/^\d{4}-\d{2}-\d{2}$/.test(s);
    });

    fc.assert(
      fc.property(nonDateString, (input) => {
        const result = gradeDateSchema.safeParse(input);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Dates with valid YYYY-MM-DD format but invalid calendar values should be rejected.
   * Examples: month 13, day 32, Feb 30, non-leap year Feb 29.
   *
   * **Validates: Requirements 1.4, 1.5**
   */
  it('rejects dates with valid format but invalid calendar values', () => {
    // Generate invalid calendar dates with correct format
    const invalidCalendarDate = fc.oneof(
      // Month > 12
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.integer({ min: 13, max: 99 }),
        day: fc.integer({ min: 1, max: 28 }),
      }),
      // Day > 31
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 32, max: 99 }),
      }),
      // Month 0
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.constant(0),
        day: fc.integer({ min: 1, max: 28 }),
      }),
      // Day 0
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.constant(0),
      }),
      // Feb 30 (never valid)
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.constant(2),
        day: fc.constant(30),
      }),
      // Feb 31 (never valid)
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.constant(2),
        day: fc.constant(31),
      }),
      // Feb 29 on non-leap years
      fc.integer({ min: 1900, max: 2099 }).filter((y) => {
        // Non-leap year: not divisible by 4, or divisible by 100 but not 400
        return !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
      }).map((year) => ({ year, month: 2, day: 29 })),
      // April, June, September, November with day 31
      fc.record({
        year: fc.integer({ min: 1900, max: 2099 }),
        month: fc.oneof(fc.constant(4), fc.constant(6), fc.constant(9), fc.constant(11)),
        day: fc.constant(31),
      })
    );

    fc.assert(
      fc.property(invalidCalendarDate, ({ year, month, day }) => {
        const dateStr = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const result = gradeDateSchema.safeParse(dateStr);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
