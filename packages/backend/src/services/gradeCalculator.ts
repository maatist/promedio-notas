export interface GradeInput {
  value: number | null;
  weightPercentage: number;
}

export interface ComponentInput {
  weightPercentage: number;
  grades: GradeInput[];
}

/**
 * Calculates the weighted average for a single component.
 * Formula: sum(grade.value * grade.weight) / sum(weights)
 * Only grades with non-null values are included.
 */
export function calculateComponentAverage(grades: GradeInput[]): number | null {
  const validGrades = grades.filter(
    (g) => g.value !== null && g.value !== undefined
  );

  if (validGrades.length === 0) {
    return null;
  }

  const totalWeight = validGrades.reduce((sum, g) => sum + g.weightPercentage, 0);

  if (totalWeight === 0) {
    return null;
  }

  const weightedSum = validGrades.reduce(
    (sum, g) => sum + (g.value as number) * g.weightPercentage,
    0
  );

  return weightedSum / totalWeight;
}

/**
 * Calculates the weighted average for a composite subject.
 * Formula: sum(component_avg * component_weight) / sum(component_weights)
 * Only components with calculable averages are included.
 */
export function calculateSubjectAverage(
  components: ComponentInput[]
): number | null {
  const componentAverages = components
    .map((comp) => ({
      average: calculateComponentAverage(comp.grades),
      weight: comp.weightPercentage,
    }))
    .filter((c) => c.average !== null);

  if (componentAverages.length === 0) {
    return null;
  }

  const totalWeight = componentAverages.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight === 0) {
    return null;
  }

  const weightedSum = componentAverages.reduce(
    (sum, c) => sum + (c.average as number) * c.weight,
    0
  );

  return weightedSum / totalWeight;
}

/**
 * Validates that the sum of grade weights for a component does not exceed 100%.
 * Returns true if valid.
 */
export function validateWeightsTotal(
  existingWeights: number[],
  newWeight: number
): boolean {
  const total = existingWeights.reduce((sum, w) => sum + w, 0) + newWeight;
  return total <= 1.001; // Small tolerance for floating point
}
