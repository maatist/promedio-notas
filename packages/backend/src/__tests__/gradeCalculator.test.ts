import { describe, it, expect } from 'vitest';
import {
  calculateComponentAverage,
  calculateSubjectAverage,
  validateWeightsTotal,
} from '../services/gradeCalculator.js';

describe('gradeCalculator', () => {
  describe('calculateComponentAverage', () => {
    it('calculates weighted average correctly', () => {
      const grades = [
        { value: 5.0, weightPercentage: 0.3 },
        { value: 6.0, weightPercentage: 0.3 },
        { value: 4.5, weightPercentage: 0.4 },
      ];

      const result = calculateComponentAverage(grades);
      // (5.0*0.3 + 6.0*0.3 + 4.5*0.4) / (0.3 + 0.3 + 0.4) = (1.5 + 1.8 + 1.8) / 1.0 = 5.1
      expect(result).toBeCloseTo(5.1, 2);
    });

    it('calculates average with unequal weights that do not sum to 1', () => {
      const grades = [
        { value: 6.0, weightPercentage: 0.4 },
        { value: 5.0, weightPercentage: 0.3 },
      ];

      const result = calculateComponentAverage(grades);
      // (6.0*0.4 + 5.0*0.3) / (0.4 + 0.3) = (2.4 + 1.5) / 0.7 = 5.571...
      expect(result).toBeCloseTo(5.5714, 3);
    });

    it('returns null for empty grades array', () => {
      const result = calculateComponentAverage([]);
      expect(result).toBeNull();
    });

    it('returns null when all grades have null values', () => {
      const grades = [
        { value: null, weightPercentage: 0.5 },
        { value: null, weightPercentage: 0.5 },
      ];

      const result = calculateComponentAverage(grades);
      expect(result).toBeNull();
    });

    it('ignores null grade values in calculation', () => {
      const grades = [
        { value: 6.0, weightPercentage: 0.5 },
        { value: null, weightPercentage: 0.3 },
        { value: 4.0, weightPercentage: 0.2 },
      ];

      const result = calculateComponentAverage(grades);
      // Only considers grades with values: (6.0*0.5 + 4.0*0.2) / (0.5 + 0.2) = (3.0 + 0.8) / 0.7 = 5.4286
      expect(result).toBeCloseTo(5.4286, 3);
    });

    it('handles single grade correctly', () => {
      const grades = [{ value: 7.0, weightPercentage: 1.0 }];

      const result = calculateComponentAverage(grades);
      expect(result).toBe(7.0);
    });

    it('handles minimum grade values', () => {
      const grades = [
        { value: 1.0, weightPercentage: 0.5 },
        { value: 1.0, weightPercentage: 0.5 },
      ];

      const result = calculateComponentAverage(grades);
      expect(result).toBe(1.0);
    });
  });

  describe('calculateSubjectAverage', () => {
    it('calculates composite subject average correctly', () => {
      const components = [
        {
          weightPercentage: 0.6,
          grades: [
            { value: 5.5, weightPercentage: 0.5 },
            { value: 6.0, weightPercentage: 0.5 },
          ],
        },
        {
          weightPercentage: 0.4,
          grades: [
            { value: 6.5, weightPercentage: 0.4 },
            { value: 5.0, weightPercentage: 0.6 },
          ],
        },
      ];

      const result = calculateSubjectAverage(components);
      // Component 1 avg: (5.5*0.5 + 6.0*0.5) / 1.0 = 5.75
      // Component 2 avg: (6.5*0.4 + 5.0*0.6) / 1.0 = 5.6
      // Subject avg: (5.75*0.6 + 5.6*0.4) / 1.0 = 3.45 + 2.24 = 5.69
      expect(result).toBeCloseTo(5.69, 2);
    });

    it('calculates with 3 components (catedra, lab, terreno)', () => {
      const components = [
        {
          weightPercentage: 0.6, // Catedra 60%
          grades: [
            { value: 5.0, weightPercentage: 0.3 },
            { value: 6.0, weightPercentage: 0.3 },
            { value: 4.5, weightPercentage: 0.4 },
          ],
        },
        {
          weightPercentage: 0.3, // Laboratorio 30%
          grades: [
            { value: 6.5, weightPercentage: 0.5 },
            { value: 7.0, weightPercentage: 0.5 },
          ],
        },
        {
          weightPercentage: 0.1, // Terreno 10%
          grades: [{ value: 6.0, weightPercentage: 1.0 }],
        },
      ];

      const result = calculateSubjectAverage(components);
      // Catedra avg: (5.0*0.3 + 6.0*0.3 + 4.5*0.4) / 1.0 = 5.1
      // Lab avg: (6.5*0.5 + 7.0*0.5) / 1.0 = 6.75
      // Terreno avg: 6.0
      // Subject: (5.1*0.6 + 6.75*0.3 + 6.0*0.1) / 1.0 = 3.06 + 2.025 + 0.6 = 5.685
      expect(result).toBeCloseTo(5.685, 2);
    });

    it('returns null when no components have grades', () => {
      const components = [
        { weightPercentage: 0.5, grades: [] },
        { weightPercentage: 0.5, grades: [] },
      ];

      const result = calculateSubjectAverage(components);
      expect(result).toBeNull();
    });

    it('only includes components with calculable averages', () => {
      const components = [
        {
          weightPercentage: 0.6,
          grades: [{ value: 5.0, weightPercentage: 1.0 }],
        },
        {
          weightPercentage: 0.4,
          grades: [], // No grades yet
        },
      ];

      const result = calculateSubjectAverage(components);
      // Only component 1 has grades: (5.0*0.6) / 0.6 = 5.0
      expect(result).toBeCloseTo(5.0, 2);
    });

    it('handles all-null grades in one component', () => {
      const components = [
        {
          weightPercentage: 0.6,
          grades: [{ value: 6.0, weightPercentage: 1.0 }],
        },
        {
          weightPercentage: 0.4,
          grades: [{ value: null, weightPercentage: 1.0 }],
        },
      ];

      const result = calculateSubjectAverage(components);
      // Only component 1 counts: (6.0*0.6) / 0.6 = 6.0
      expect(result).toBeCloseTo(6.0, 2);
    });
  });

  describe('validateWeightsTotal', () => {
    it('returns true when total is under 100%', () => {
      const existing = [0.3, 0.3];
      expect(validateWeightsTotal(existing, 0.4)).toBe(true);
    });

    it('returns true when total equals exactly 100%', () => {
      const existing = [0.3, 0.3, 0.2];
      expect(validateWeightsTotal(existing, 0.2)).toBe(true);
    });

    it('returns false when total exceeds 100%', () => {
      const existing = [0.3, 0.3, 0.3];
      expect(validateWeightsTotal(existing, 0.2)).toBe(false);
    });

    it('handles empty existing weights', () => {
      expect(validateWeightsTotal([], 0.5)).toBe(true);
    });

    it('handles small floating point precision issues', () => {
      // 0.1 + 0.2 + 0.3 + 0.4 should equal 1.0
      const existing = [0.1, 0.2, 0.3];
      expect(validateWeightsTotal(existing, 0.4)).toBe(true);
    });

    it('rejects weight that would make total slightly over 100%', () => {
      const existing = [0.5, 0.3];
      expect(validateWeightsTotal(existing, 0.25)).toBe(false);
    });
  });
});
