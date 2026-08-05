/**
 * Preservation Property Tests — Non-Bug-Condition Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests capture CURRENT CORRECT behavior that must remain unchanged after the fix.
 * They test non-buggy inputs: name-only updates, subject creation with valid composites.
 *
 * Observation-first methodology:
 * - On unfixed code, name-only updates work (handler only updates name)
 * - On unfixed code, subject creation with composite payload works (createSubjectSchema accepts it)
 *
 * EXPECTED OUTCOME: Tests PASS on unfixed code (this confirms baseline behavior to preserve)
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { updateSubjectSchema, createSubjectSchema } from '../validators/schemas';

describe('Preservation Property — Name-only Subject Update (Test 2a)', () => {
  /**
   * Test 2a — Name-only subject update:
   * PUT /subjects/:id with { name: "New Name" } → schema validates and returns only name.
   * Observed behavior: updateSubjectSchema accepts name-only payloads and returns { name }.
   * Components remain unchanged because handler only touches name field.
   *
   * Property-based test: for all valid name strings, name-only update schema preserves
   * the name field correctly without introducing extra fields.
   *
   * **Validates: Requirements 3.4**
   */
  it('2a: updateSubjectSchema accepts name-only payloads and returns parsed name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (name) => {
          const payload = { name };
          const result = updateSubjectSchema.parse(payload);

          // Name-only update should parse successfully and return the name
          expect(result).toHaveProperty('name', name);

          // Schema should not introduce structural fields not present in input
          expect(result).not.toHaveProperty('isComposite');
          expect(result).not.toHaveProperty('components');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('2a: updateSubjectSchema rejects empty name string', () => {
    const payload = { name: '' };
    expect(() => updateSubjectSchema.parse(payload)).toThrow();
  });

  it('2a: updateSubjectSchema rejects name over 200 characters', () => {
    const payload = { name: 'A'.repeat(201) };
    expect(() => updateSubjectSchema.parse(payload)).toThrow();
  });

  it('2a: updateSubjectSchema accepts payload with optional name (empty object)', () => {
    // Name is optional in updateSubjectSchema
    const payload = {};
    const result = updateSubjectSchema.parse(payload);
    expect(result).not.toHaveProperty('name');
  });
});

describe('Preservation Property — Subject Creation (Test 2d)', () => {
  /**
   * Test 2d — Subject creation works correctly:
   * POST /subjects with composite payload → schema validates the composite structure.
   * Observed behavior: createSubjectSchema accepts valid composite payloads
   * (≥2 components, weights sum to 100%) and preserves all fields.
   *
   * Property-based test: for all valid component arrays (≥2, weights sum to 100%),
   * createSubjectSchema validates correctly and preserves all data.
   *
   * **Validates: Requirements 3.5**
   */
  it('2d: createSubjectSchema accepts valid composite subjects with components summing to 100%', () => {
    // Generate valid component arrays: ≥2 components, weights sum exactly to 100
    const validComponentsArb = fc
      .integer({ min: 2, max: 5 })
      .chain((numComponents) => {
        // Generate weights that sum to 100
        return fc
          .array(fc.integer({ min: 1, max: 97 }), {
            minLength: numComponents - 1,
            maxLength: numComponents - 1,
          })
          .map((weights) => {
            const partial = weights.slice(0, numComponents - 1);
            const sum = partial.reduce((s, w) => s + w, 0);
            const lastWeight = 100 - sum;
            if (lastWeight < 1 || lastWeight > 100) return null;
            return [...partial, lastWeight];
          })
          .filter((w): w is number[] => w !== null && w.every((v) => v >= 1 && v <= 100))
          .chain((weights) =>
            fc
              .array(fc.string({ minLength: 1, maxLength: 50 }), {
                minLength: weights.length,
                maxLength: weights.length,
              })
              .map((names) =>
                weights.map((w, i) => ({ name: names[i], weightPercentage: w }))
              )
          );
      });

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        validComponentsArb,
        (name, components) => {
          const payload = {
            name,
            isComposite: true,
            components,
          };

          const result = createSubjectSchema.parse(payload);

          // Should preserve all fields
          expect(result.name).toBe(name);
          expect(result.isComposite).toBe(true);
          expect(result.components).toHaveLength(components.length);

          // Each component should be preserved
          for (let i = 0; i < components.length; i++) {
            expect(result.components![i].name).toBe(components[i].name);
            expect(result.components![i].weightPercentage).toBe(
              components[i].weightPercentage
            );
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('2d: createSubjectSchema rejects composite with less than 2 components', () => {
    const payload = {
      name: 'Test Subject',
      isComposite: true,
      components: [{ name: 'Only One', weightPercentage: 100 }],
    };

    expect(() => createSubjectSchema.parse(payload)).toThrow();
  });

  it('2d: createSubjectSchema rejects composite when weights do not sum to 100%', () => {
    const payload = {
      name: 'Test Subject',
      isComposite: true,
      components: [
        { name: 'Exam', weightPercentage: 60 },
        { name: 'Homework', weightPercentage: 30 },
      ],
    };

    expect(() => createSubjectSchema.parse(payload)).toThrow();
  });

  it('2d: createSubjectSchema accepts simple subjects without components', () => {
    const payload = {
      name: 'Simple Subject',
      isComposite: false,
    };

    const result = createSubjectSchema.parse(payload);
    expect(result.name).toBe('Simple Subject');
    expect(result.isComposite).toBe(false);
  });

  it('2d: createSubjectSchema accepts simple subjects with explicit undefined components', () => {
    const payload = {
      name: 'Simple Subject',
      isComposite: false,
      components: undefined,
    };

    const result = createSubjectSchema.parse(payload);
    expect(result.name).toBe('Simple Subject');
    expect(result.isComposite).toBe(false);
  });
});
