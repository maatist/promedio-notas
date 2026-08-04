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
        { value: 5.0, weightPercentage: 30 },
        { value: 6.0, weightPercentage: 30 },
        { value: 4.5, weightPercentage: 40 },
      ];

      const result = calculateComponentAverage(grades);
      // (5.0*30 + 6.0*30 + 4.5*40) / (30 + 30 + 40) = (150 + 180 + 180) / 100 = 5.1
      expect(result).toBeCloseTo(5.1, 2);
    });

    it('calculates average with unequal weights that do not sum to 100', () => {
      const grades = [
        { value: 6.0, weightPercentage: 40 },
        { value: 5.0, weightPercentage: 30 },
      ];

      const result = calculateComponentAverage(grades);
      // (6.0*40 + 5.0*30) / (40 + 30) = (240 + 150) / 70 = 5.571...
      expect(result).toBeCloseTo(5.5714, 3);
    });

    it('returns null for empty grades array', () => {
      const result = calculateComponentAverage([]);
      expect(result).toBeNull();
    });

    it('returns null when all grades have null values', () => {
      const grades = [
        { value: null, weightPercentage: 50 },
        { value: null, weightPercentage: 50 },
      ];

      const result = calculateComponentAverage(grades);
      expect(result).toBeNull();
    });

    it('ignores null grade values in calculation', () => {
      const grades = [
        { value: 6.0, weightPercentage: 50 },
        { value: null, weightPercentage: 30 },
        { value: 4.0, weightPercentage: 20 },
      ];

      const result = calculateComponentAverage(grades);
      // Only considers grades with values: (6.0*50 + 4.0*20) / (50 + 20) = (300 + 80) / 70 = 5.4286
      expect(result).toBeCloseTo(5.4286, 3);
    });

    it('handles single grade correctly', () => {
      const grades = [{ value: 7.0, weightPercentage: 100 }];

      const result = calculateComponentAverage(grades);
      expect(result).toBe(7.0);
    });

    it('handles minimum grade values', () => {
      const grades = [
        { value: 1.0, weightPercentage: 50 },
        { value: 1.0, weightPercentage: 50 },
      ];

      const result = calculateComponentAverage(grades);
      expect(result).toBe(1.0);
    });
  });

  describe('calculateSubjectAverage', () => {
    it('calculates composite subject average correctly', () => {
      const components = [
        {
          weightPercentage: 60,
          grades: [
            { value: 5.5, weightPercentage: 50 },
            { value: 6.0, weightPercentage: 50 },
          ],
        },
        {
          weightPercentage: 40,
          grades: [
            { value: 6.5, weightPercentage: 40 },
            { value: 5.0, weightPercentage: 60 },
          ],
        },
      ];

      const result = calculateSubjectAverage(components);
      // Component 1 avg: (5.5*50 + 6.0*50) / 100 = 5.75
      // Component 2 avg: (6.5*40 + 5.0*60) / 100 = 5.6
      // Subject avg: (5.75*60 + 5.6*40) / 100 = 345 + 224 = 569 / 100 = 5.69
      expect(result).toBeCloseTo(5.69, 2);
    });

    it('calculates with 3 components (catedra, lab, terreno)', () => {
      const components = [
        {
          weightPercentage: 60, // Catedra 60%
          grades: [
            { value: 5.0, weightPercentage: 30 },
            { value: 6.0, weightPercentage: 30 },
            { value: 4.5, weightPercentage: 40 },
          ],
        },
        {
          weightPercentage: 30, // Laboratorio 30%
          grades: [
            { value: 6.5, weightPercentage: 50 },
            { value: 7.0, weightPercentage: 50 },
          ],
        },
        {
          weightPercentage: 10, // Terreno 10%
          grades: [{ value: 6.0, weightPercentage: 100 }],
        },
      ];

      const result = calculateSubjectAverage(components);
      // Catedra avg: (5.0*30 + 6.0*30 + 4.5*40) / 100 = 5.1
      // Lab avg: (6.5*50 + 7.0*50) / 100 = 6.75
      // Terreno avg: 6.0
      // Subject: (5.1*60 + 6.75*30 + 6.0*10) / 100 = 306 + 202.5 + 60 = 568.5 / 100 = 5.685
      expect(result).toBeCloseTo(5.685, 2);
    });

    it('returns null when no components have grades', () => {
      const components = [
        { weightPercentage: 50, grades: [] },
        { weightPercentage: 50, grades: [] },
      ];

      const result = calculateSubjectAverage(components);
      expect(result).toBeNull();
    });

    it('only includes components with calculable averages', () => {
      const components = [
        {
          weightPercentage: 60,
          grades: [{ value: 5.0, weightPercentage: 100 }],
        },
        {
          weightPercentage: 40,
          grades: [], // No grades yet
        },
      ];

      const result = calculateSubjectAverage(components);
      // Only component 1 has grades: (5.0*60) / 60 = 5.0
      expect(result).toBeCloseTo(5.0, 2);
    });

    it('handles all-null grades in one component', () => {
      const components = [
        {
          weightPercentage: 60,
          grades: [{ value: 6.0, weightPercentage: 100 }],
        },
        {
          weightPercentage: 40,
          grades: [{ value: null, weightPercentage: 100 }],
        },
      ];

      const result = calculateSubjectAverage(components);
      // Only component 1 counts: (6.0*60) / 60 = 6.0
      expect(result).toBeCloseTo(6.0, 2);
    });
  });

  describe('validateWeightsTotal', () => {
    it('returns true when total is under 100%', () => {
      const existing = [30, 30];
      expect(validateWeightsTotal(existing, 40)).toBe(true);
    });

    it('returns true when total equals exactly 100%', () => {
      const existing = [30, 30, 20];
      expect(validateWeightsTotal(existing, 20)).toBe(true);
    });

    it('returns false when total exceeds 100%', () => {
      const existing = [30, 30, 30];
      expect(validateWeightsTotal(existing, 20)).toBe(false);
    });

    it('handles empty existing weights', () => {
      expect(validateWeightsTotal([], 50)).toBe(true);
    });

    it('handles small floating point precision issues', () => {
      // 10 + 20 + 30 + 40 should equal 100
      const existing = [10, 20, 30];
      expect(validateWeightsTotal(existing, 40)).toBe(true);
    });

    it('rejects weight that would make total slightly over 100%', () => {
      const existing = [50, 30];
      expect(validateWeightsTotal(existing, 25)).toBe(false);
    });
  });
});
