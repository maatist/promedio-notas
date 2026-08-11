import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { gradeDescriptionSchema } from '../../validators/schemas';

/**
 * Property 3: Description normalization
 *
 * For any string input for description, after applying trim:
 * - if the resulting string is empty or contains only whitespace, the stored value SHALL be null
 * - if the resulting string length is ≤ 500 characters, the stored value SHALL equal the trimmed string
 * - if the resulting string length is > 500 characters, the operation SHALL be rejected
 *
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
 */
describe('Property 3: Description normalization', () => {
  // Arbitrary that generates whitespace-only strings
  const whitespaceArb = fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 0, maxLength: 50 })
    .map((chars) => chars.join(''));

  it('whitespace-only strings are normalized to null', () => {
    fc.assert(
      fc.property(whitespaceArb, (whitespaceStr) => {
        const result = gradeDescriptionSchema.safeParse(whitespaceStr);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('non-empty strings ≤ 500 chars after trim are stored as the trimmed string', () => {
    // Generate padding whitespace
    const paddingArb = fc
      .array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 5 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(
        paddingArb,
        fc.string({ minLength: 1, maxLength: 490 }).filter((s) => s.trim().length > 0 && s.trim().length <= 500),
        paddingArb,
        (leading, content, trailing) => {
          const input = leading + content + trailing;
          const expectedTrimmed = input.trim();

          // Only test when trimmed result is within bounds
          if (expectedTrimmed.length > 500 || expectedTrimmed.length === 0) return;

          const result = gradeDescriptionSchema.safeParse(input);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(expectedTrimmed);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('strings > 500 chars after trim are rejected', () => {
    // Generate strings that are guaranteed > 500 chars after trim by using
    // a non-whitespace prefix of length 501+ 
    const longContentArb = fc
      .string({ minLength: 501, maxLength: 800 })
      .map((s) => {
        // Ensure at least 501 non-whitespace chars by prepending 'x' chars
        const base = 'x'.repeat(501) + s;
        return base;
      });

    fc.assert(
      fc.property(longContentArb, (longStr) => {
        const result = gradeDescriptionSchema.safeParse(longStr);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('result is never an empty string (always null or non-empty trimmed)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 600 }), (input) => {
        const result = gradeDescriptionSchema.safeParse(input);
        if (result.success) {
          // The result should either be null or a non-empty string
          expect(
            result.data === null || (typeof result.data === 'string' && result.data.length > 0)
          ).toBe(true);
          // If it's a string, it should be trimmed (no leading/trailing whitespace)
          if (typeof result.data === 'string') {
            expect(result.data).toBe(result.data.trim());
          }
        }
        // If not success, that's fine (rejected due to length > 500)
      }),
      { numRuns: 100 }
    );
  });
});
