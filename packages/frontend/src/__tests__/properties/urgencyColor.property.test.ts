/**
 * Property 7: Urgency color classification
 *
 * For any integer representing days remaining in the range [0, 30], the color
 * classification function SHALL return: "red" for values 0-7, "yellow" for values
 * 8-14, and "green" for values 15-30. The ranges SHALL be exhaustive and non-overlapping.
 *
 * **Validates: Requirements 4.2**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getUrgencyColor } from '../../utils/dateUtils';

describe('Property 7: Urgency color classification', () => {
  /**
   * For any integer in [0, 7]: getUrgencyColor returns 'red'
   *
   * **Validates: Requirements 4.2**
   */
  it('returns "red" for any days remaining in [0, 7]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 7 }),
        (daysRemaining) => {
          expect(getUrgencyColor(daysRemaining)).toBe('red');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any integer in [8, 14]: getUrgencyColor returns 'yellow'
   *
   * **Validates: Requirements 4.2**
   */
  it('returns "yellow" for any days remaining in [8, 14]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 14 }),
        (daysRemaining) => {
          expect(getUrgencyColor(daysRemaining)).toBe('yellow');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any integer in [15, 30]: getUrgencyColor returns 'green'
   *
   * **Validates: Requirements 4.2**
   */
  it('returns "green" for any days remaining in [15, 30]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 15, max: 30 }),
        (daysRemaining) => {
          expect(getUrgencyColor(daysRemaining)).toBe('green');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * For any integer in [0, 30]: the result is always one of the three valid colors (exhaustive coverage).
   *
   * **Validates: Requirements 4.2**
   */
  it('returns one of "red", "yellow", or "green" for any days in [0, 30]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (daysRemaining) => {
          const color = getUrgencyColor(daysRemaining);
          expect(['red', 'yellow', 'green']).toContain(color);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * The three ranges [0,7], [8,14], [15,30] partition [0,30] completely with no overlap:
   * each value maps to exactly one color.
   *
   * **Validates: Requirements 4.2**
   */
  it('ranges are exhaustive and non-overlapping (each value maps to exactly one color)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (daysRemaining) => {
          const color = getUrgencyColor(daysRemaining);

          // Verify exactly one range matches
          const isRed = daysRemaining >= 0 && daysRemaining <= 7;
          const isYellow = daysRemaining >= 8 && daysRemaining <= 14;
          const isGreen = daysRemaining >= 15 && daysRemaining <= 30;

          // Exactly one should be true (non-overlapping)
          const matchCount = [isRed, isYellow, isGreen].filter(Boolean).length;
          expect(matchCount).toBe(1);

          // Color must match the range
          if (isRed) expect(color).toBe('red');
          if (isYellow) expect(color).toBe('yellow');
          if (isGreen) expect(color).toBe('green');
        }
      ),
      { numRuns: 100 }
    );
  });
});
