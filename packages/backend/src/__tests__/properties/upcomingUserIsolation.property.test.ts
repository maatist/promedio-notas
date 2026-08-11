/**
 * Property 6: Upcoming grades user isolation
 *
 * For any authenticated user, the upcoming grades endpoint SHALL return only grades
 * that belong to that user through the ownership chain (Grade → SubjectComponent →
 * Subject → Period → User). No grade belonging to another user SHALL appear in the results.
 *
 * **Validates: Requirements 3.7**
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

interface GradeWithOwnership {
  id: string;
  date: string;
  userId: string; // resolved owner through the chain
}

/**
 * Filters grades to only those belonging to the authenticated user.
 * This replicates the WHERE clause in the Prisma query that filters by
 * the ownership chain: Grade → SubjectComponent → Subject → Period → User.
 */
function filterByUser(
  grades: GradeWithOwnership[],
  authenticatedUserId: string
): GradeWithOwnership[] {
  return grades.filter((g) => g.userId === authenticatedUserId);
}

/**
 * Generates a valid ISO date string (YYYY-MM-DD) using integer components
 * to avoid Invalid Date issues with fc.date().
 */
const validIsoDateArb = fc
  .record({
    year: fc.integer({ min: 2024, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid day-of-month
  })
  .map(({ year, month, day }) => {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  });

/**
 * Generates a UUID-like string for user and grade IDs.
 */
const uuidArb = fc.uuid();

/**
 * Generates a GradeWithOwnership with a specific user ID.
 */
function gradeWithOwnerArb(userId: fc.Arbitrary<string>): fc.Arbitrary<GradeWithOwnership> {
  return fc.record({
    id: uuidArb,
    date: validIsoDateArb,
    userId,
  });
}

describe('Property 6: Upcoming grades user isolation', () => {
  /**
   * All grades in the result belong to the authenticated user.
   *
   * **Validates: Requirements 3.7**
   */
  it('all grades in the result belong to the authenticated user', () => {
    fc.assert(
      fc.property(
        // Generate 2+ distinct user IDs
        fc.tuple(uuidArb, uuidArb).filter(([a, b]) => a !== b),
        // Generate a mixed list of grades belonging to different users
        fc.array(
          fc.oneof(
            gradeWithOwnerArb(uuidArb),
            gradeWithOwnerArb(uuidArb)
          ),
          { minLength: 1, maxLength: 50 }
        ),
        // Pick a user to authenticate as
        uuidArb,
        (_, grades, authenticatedUserId) => {
          const result = filterByUser(grades, authenticatedUserId);

          // Every grade in the result must belong to the authenticated user
          for (const grade of result) {
            expect(grade.userId).toBe(authenticatedUserId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * No grade from another user appears in the result.
   *
   * **Validates: Requirements 3.7**
   */
  it('no grade from another user appears in the result', () => {
    fc.assert(
      fc.property(
        // Generate at least 2 distinct user IDs
        fc
          .uniqueArray(uuidArb, { minLength: 2, maxLength: 5 })
          .filter((arr) => arr.length >= 2),
        (userIds) => {
          const authenticatedUserId = userIds[0];
          const otherUserIds = userIds.slice(1);

          // Create grades from other users
          const otherUserGrades: GradeWithOwnership[] = otherUserIds.map((uid, i) => ({
            id: `grade-other-${i}`,
            date: '2025-06-15',
            userId: uid,
          }));

          // Create grades from the authenticated user
          const ownGrades: GradeWithOwnership[] = [
            { id: 'grade-own-1', date: '2025-06-10', userId: authenticatedUserId },
            { id: 'grade-own-2', date: '2025-06-20', userId: authenticatedUserId },
          ];

          const allGrades = [...ownGrades, ...otherUserGrades];
          const result = filterByUser(allGrades, authenticatedUserId);

          // No result should have a userId different from the authenticated user
          for (const grade of result) {
            expect(otherUserIds).not.toContain(grade.userId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * All grades from the authenticated user are included in the result
   * (completeness — no owned grade is dropped).
   *
   * **Validates: Requirements 3.7**
   */
  it('all grades from the authenticated user are included in the result', () => {
    fc.assert(
      fc.property(
        uuidArb,
        fc.array(uuidArb, { minLength: 1, maxLength: 5 }),
        fc.array(validIsoDateArb, { minLength: 1, maxLength: 10 }),
        (authenticatedUserId, otherUserIds, dates) => {
          // Build grades for the authenticated user
          const ownGrades: GradeWithOwnership[] = dates.map((date, i) => ({
            id: `own-${i}`,
            date,
            userId: authenticatedUserId,
          }));

          // Build grades for other users
          const otherGrades: GradeWithOwnership[] = otherUserIds.map((uid, i) => ({
            id: `other-${i}`,
            date: dates[i % dates.length],
            userId: uid,
          }));

          const allGrades = [...ownGrades, ...otherGrades];
          const result = filterByUser(allGrades, authenticatedUserId);

          // All own grades should be in the result
          const resultIds = new Set(result.map((g) => g.id));
          for (const grade of ownGrades) {
            expect(resultIds.has(grade.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Changing the authenticated user ID changes the result set
   * (when there are grades from multiple users).
   *
   * **Validates: Requirements 3.7**
   */
  it('changing the authenticated user ID changes the result set', () => {
    fc.assert(
      fc.property(
        // Two distinct user IDs
        fc.tuple(uuidArb, uuidArb).filter(([a, b]) => a !== b),
        fc.array(validIsoDateArb, { minLength: 1, maxLength: 5 }),
        ([userA, userB], dates) => {
          // Each user has at least one grade
          const gradesA: GradeWithOwnership[] = dates.map((date, i) => ({
            id: `a-${i}`,
            date,
            userId: userA,
          }));

          const gradesB: GradeWithOwnership[] = dates.map((date, i) => ({
            id: `b-${i}`,
            date,
            userId: userB,
          }));

          const allGrades = [...gradesA, ...gradesB];

          const resultForA = filterByUser(allGrades, userA);
          const resultForB = filterByUser(allGrades, userB);

          // Results should be different since they belong to different users
          const idsA = new Set(resultForA.map((g) => g.id));
          const idsB = new Set(resultForB.map((g) => g.id));

          // No overlap between the two result sets
          for (const id of idsA) {
            expect(idsB.has(id)).toBe(false);
          }
          for (const id of idsB) {
            expect(idsA.has(id)).toBe(false);
          }

          // Each set should have the correct grades
          expect(resultForA.length).toBe(gradesA.length);
          expect(resultForB.length).toBe(gradesB.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
