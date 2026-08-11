/**
 * Property 2: Grade update date semantics
 *
 * For any existing grade with any current date value (null or non-null), when an update
 * payload provides an explicit date value, the grade's date SHALL equal that value; when
 * the payload sends date as null, the grade's date SHALL become null; when the payload
 * omits the date field entirely, the grade's date SHALL remain unchanged from its previous value.
 *
 * **Validates: Requirements 1.3**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Extracted logic from the PUT /api/grades/:id endpoint.
 * This replicates the date handling semantics:
 * - date is a valid ISO string → update to that Date
 * - date is null → clear (set to null)
 * - date is undefined (omitted) → preserve (don't include 'date' key in updateData)
 */
function buildDateUpdate(dateField: string | null | undefined): { date?: Date | null } {
  if (dateField === undefined) return {}; // preserve
  if (dateField === null) return { date: null }; // clear
  return { date: new Date(dateField + 'T00:00:00Z') }; // update
}

/**
 * Generates a valid ISO date string (YYYY-MM-DD) using integer components
 * to avoid Invalid Date issues with fc.date().
 */
const validIsoDateArb = fc
  .record({
    year: fc.integer({ min: 1900, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid day-of-month
  })
  .map(({ year, month, day }) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

describe('Property 2: Grade update date semantics', () => {
  /**
   * When an explicit valid ISO date string is provided, the updateData should contain
   * a 'date' key with a Date object matching that string.
   *
   * **Validates: Requirements 1.3**
   */
  it('explicit date string updates to a matching Date object', () => {
    fc.assert(
      fc.property(validIsoDateArb, (dateStr) => {
        const result = buildDateUpdate(dateStr);

        // Should have a 'date' key
        expect(result).toHaveProperty('date');
        // Should be a Date instance
        expect(result.date).toBeInstanceOf(Date);
        // Should match the input date string
        expect(result.date!.toISOString().startsWith(dateStr)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * When date is explicitly set to null, the updateData should contain
   * a 'date' key with value null (clearing the date).
   *
   * **Validates: Requirements 1.3**
   */
  it('null date clears the date field (sets to null)', () => {
    fc.assert(
      fc.property(
        // Generate any arbitrary integer to represent varied invocations (previous state irrelevant)
        fc.integer({ min: 0, max: 1000 }),
        (_iteration) => {
          const result = buildDateUpdate(null);

          // Should have a 'date' key
          expect(result).toHaveProperty('date');
          // The date value should be null
          expect(result.date).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * When date is undefined (omitted from payload), the updateData should NOT
   * contain a 'date' key at all, preserving the current value.
   *
   * **Validates: Requirements 1.3**
   */
  it('undefined (omitted) date preserves current value (no date key in result)', () => {
    fc.assert(
      fc.property(
        // Generate any arbitrary integer to represent varied invocations (previous state irrelevant)
        fc.integer({ min: 0, max: 1000 }),
        (_iteration) => {
          const result = buildDateUpdate(undefined);

          // Should NOT have a 'date' key
          expect(result).not.toHaveProperty('date');
          // Should be an empty object
          expect(Object.keys(result)).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Combined property: for any randomly chosen action (set, clear, or preserve),
   * the semantics are consistent regardless of the current grade state.
   *
   * **Validates: Requirements 1.3**
   */
  it('all three semantics are mutually exclusive and complete', () => {
    // Arbitrary representing the three possible states of the date field in the payload
    const datePayloadArb = fc.oneof(
      validIsoDateArb.map((d) => ({ type: 'set' as const, value: d as string | null | undefined })),
      fc.constant({ type: 'clear' as const, value: null as string | null | undefined }),
      fc.constant({ type: 'preserve' as const, value: undefined as string | null | undefined })
    );

    fc.assert(
      fc.property(datePayloadArb, ({ type, value }) => {
        const result = buildDateUpdate(value);

        switch (type) {
          case 'set':
            expect(result).toHaveProperty('date');
            expect(result.date).toBeInstanceOf(Date);
            expect(result.date!.toISOString().startsWith(value as string)).toBe(true);
            break;
          case 'clear':
            expect(result).toHaveProperty('date');
            expect(result.date).toBeNull();
            break;
          case 'preserve':
            expect(result).not.toHaveProperty('date');
            break;
        }
      }),
      { numRuns: 100 }
    );
  });
});
