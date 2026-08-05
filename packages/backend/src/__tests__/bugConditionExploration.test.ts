/**
 * Bug Condition Exploration Tests
 *
 * **Validates: Requirements 1.3, 1.4**
 *
 * These tests encode the EXPECTED (correct) behavior for subject structural edits.
 * On UNFIXED code, they MUST FAIL — failure confirms the bugs exist.
 *
 * Bug 2 — Subject Edit Structural Fields Ignored:
 * - updateSubjectSchema only validates `{ name?: string }`, stripping isComposite/components
 * - PUT handler only destructures `name` and updates only `name`
 *
 * DO NOT fix these tests or the code when they fail.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { updateSubjectSchema } from '../validators/schemas';

describe('Bug Condition Exploration — Subject Edit Structural Fields', () => {
  /**
   * Test 1c — Subject edit structural fields:
   * Send a payload with { name, isComposite: true, components: [...] }
   * and assert the schema preserves those fields.
   * On unfixed code, Zod strips unknown fields, so this FAILS.
   *
   * **Validates: Requirements 1.3**
   */
  it('1c: updateSubjectSchema should preserve isComposite and components fields', () => {
    const payload = {
      name: 'Mathematics',
      isComposite: true,
      components: [
        { name: 'Exam', weightPercentage: 60 },
        { name: 'Homework', weightPercentage: 40 },
      ],
    };

    const result = updateSubjectSchema.parse(payload);

    // Expected behavior: schema should accept and preserve structural fields
    expect(result).toHaveProperty('isComposite', true);
    expect(result).toHaveProperty('components');
    expect(result.components).toHaveLength(2);
    expect(result.components[0]).toEqual({ name: 'Exam', weightPercentage: 60 });
    expect(result.components[1]).toEqual({ name: 'Homework', weightPercentage: 40 });
  });

  /**
   * Test 1d — Subject component weight change:
   * Send a payload with only `components` weights changed.
   * Assert schema output includes components with new weights.
   * On unfixed code, schema strips components field, so this FAILS.
   *
   * **Validates: Requirements 1.4**
   */
  it('1d: updateSubjectSchema should preserve components when only weights change', () => {
    const payload = {
      components: [
        { name: 'Exam', weightPercentage: 70 },
        { name: 'Homework', weightPercentage: 30 },
      ],
    };

    const result = updateSubjectSchema.parse(payload);

    // Expected behavior: schema should accept components-only payload
    expect(result).toHaveProperty('components');
    expect(result.components).toHaveLength(2);
    expect(result.components[0].weightPercentage).toBe(70);
    expect(result.components[1].weightPercentage).toBe(30);
  });

  /**
   * Property-based version of test 1c:
   * For any valid composite payload with ≥2 components summing to 100%,
   * the updateSubjectSchema should preserve isComposite and components.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  it('1c/1d (property): updateSubjectSchema preserves structural fields for valid composite payloads', () => {
    // Generate arrays of at least 2 components whose weights sum to 100
    const componentArb = fc
      .array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          weightPercentage: fc.integer({ min: 1, max: 98 }),
        }),
        { minLength: 2, maxLength: 5 }
      )
      .filter((components) => {
        const total = components.reduce((s, c) => s + c.weightPercentage, 0);
        return total === 100;
      });

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        componentArb,
        (name, components) => {
          const payload = {
            name,
            isComposite: true,
            components,
          };

          const result = updateSubjectSchema.parse(payload);

          // The schema should preserve structural fields
          expect(result).toHaveProperty('isComposite', true);
          expect(result).toHaveProperty('components');
          expect((result as any).components).toHaveLength(components.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
