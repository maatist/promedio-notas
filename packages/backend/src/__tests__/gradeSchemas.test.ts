import { describe, it, expect } from 'vitest';
import {
  gradeDateSchema,
  gradeDescriptionSchema,
  createGradeSchema,
  updateGradeSchema,
} from '../validators/schemas';

describe('gradeDateSchema', () => {
  it('accepts a valid ISO date string', () => {
    const result = gradeDateSchema.safeParse('2025-03-15');
    expect(result.success).toBe(true);
  });

  it('accepts leap year date', () => {
    const result = gradeDateSchema.safeParse('2024-02-29');
    expect(result.success).toBe(true);
  });

  it('rejects invalid format (DD-MM-YYYY)', () => {
    const result = gradeDateSchema.safeParse('15-03-2025');
    expect(result.success).toBe(false);
  });

  it('rejects invalid calendar date (Feb 30)', () => {
    const result = gradeDateSchema.safeParse('2025-02-30');
    expect(result.success).toBe(false);
  });

  it('rejects invalid calendar date (month 13)', () => {
    const result = gradeDateSchema.safeParse('2025-13-01');
    expect(result.success).toBe(false);
  });

  it('rejects non-leap year Feb 29', () => {
    const result = gradeDateSchema.safeParse('2025-02-29');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = gradeDateSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects date with time component', () => {
    const result = gradeDateSchema.safeParse('2025-03-15T10:00:00');
    expect(result.success).toBe(false);
  });
});

describe('gradeDescriptionSchema', () => {
  it('accepts a normal string and preserves it', () => {
    const result = gradeDescriptionSchema.safeParse('Capítulos 1-4');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Capítulos 1-4');
    }
  });

  it('trims whitespace from both ends', () => {
    const result = gradeDescriptionSchema.safeParse('  hello world  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello world');
    }
  });

  it('transforms whitespace-only string to null', () => {
    const result = gradeDescriptionSchema.safeParse('   ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('transforms empty string to null', () => {
    const result = gradeDescriptionSchema.safeParse('');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('rejects string longer than 500 characters after trim', () => {
    const longStr = 'a'.repeat(501);
    const result = gradeDescriptionSchema.safeParse(longStr);
    expect(result.success).toBe(false);
  });

  it('accepts string exactly 500 characters', () => {
    const str = 'a'.repeat(500);
    const result = gradeDescriptionSchema.safeParse(str);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(str);
    }
  });
});

describe('createGradeSchema with date and description', () => {
  it('accepts a grade with all fields including date and description', () => {
    const result = createGradeSchema.safeParse({
      name: 'Solemne 1',
      value: 5.5,
      weightPercentage: 30,
      date: '2025-03-15',
      description: 'Capítulos 1-4',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a grade without date and description (optional)', () => {
    const result = createGradeSchema.safeParse({
      name: 'Solemne 1',
      weightPercentage: 30,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null date', () => {
    const result = createGradeSchema.safeParse({
      name: 'Solemne 1',
      weightPercentage: 30,
      date: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null description', () => {
    const result = createGradeSchema.safeParse({
      name: 'Solemne 1',
      weightPercentage: 30,
      description: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = createGradeSchema.safeParse({
      name: 'Solemne 1',
      weightPercentage: 30,
      date: '15/03/2025',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description over 500 chars', () => {
    const result = createGradeSchema.safeParse({
      name: 'Solemne 1',
      weightPercentage: 30,
      description: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateGradeSchema with date and description', () => {
  it('accepts update with only date', () => {
    const result = updateGradeSchema.safeParse({
      date: '2025-04-10',
    });
    expect(result.success).toBe(true);
  });

  it('accepts update with null date (clears date)', () => {
    const result = updateGradeSchema.safeParse({
      date: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts update with description', () => {
    const result = updateGradeSchema.safeParse({
      description: 'Updated topic',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no fields changed)', () => {
    const result = updateGradeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('trims description whitespace in update', () => {
    const result = updateGradeSchema.safeParse({
      description: '  trimmed  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('trimmed');
    }
  });
});
