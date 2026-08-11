import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import type { SubjectWithDetails } from '@promedio-notas/shared';
import { useI18n } from '../i18n';
import GradeRow from './GradeRow';
import AddGradeForm from './AddGradeForm';

/**
 * Calculates the minimum grade needed in all pending evaluations (assuming the same
 * score in each) to reach the exemption grade.
 * Returns null if the calculation doesn't apply (no exemptionGrade, weights not at 100%, or no pending grades).
 */
function calculateExemptionNeeded(subject: SubjectWithDetails): number | null {
  if (subject.exemptionGrade == null) return null;

  if (subject.isComposite && subject.components.length > 1) {
    // For composite subjects, we need to compute across all components weighted by their component weightPercentage
    let totalWeightedContribution = 0;
    let totalWeightedRemaining = 0;
    let allComponentsFullyAssigned = true;
    let hasPendingGrade = false;

    for (const component of subject.components) {
      const componentWeight = component.weightPercentage; // percentage e.g. 60
      const totalGradeWeight = component.grades.reduce((sum, g) => sum + g.weightPercentage, 0);

      // Check that 100% of weight is assigned in this component
      if (Math.abs(totalGradeWeight - 100) > 0.1) {
        allComponentsFullyAssigned = false;
        break;
      }

      for (const grade of component.grades) {
        if (grade.value != null) {
          // contribution = value * (gradeWeight / 100) * (componentWeight / 100)
          totalWeightedContribution += grade.value * (grade.weightPercentage / 100) * (componentWeight / 100);
        } else {
          hasPendingGrade = true;
          totalWeightedRemaining += (grade.weightPercentage / 100) * (componentWeight / 100);
        }
      }
    }

    if (!allComponentsFullyAssigned || !hasPendingGrade) return null;
    if (totalWeightedRemaining === 0) return null;

    const needed = (subject.exemptionGrade - 0.05 - totalWeightedContribution) / totalWeightedRemaining;
    return needed;
  } else {
    // Simple subject - single component
    const component = subject.components[0];
    if (!component) return null;

    const totalGradeWeight = component.grades.reduce((sum, g) => sum + g.weightPercentage, 0);

    // Check that 100% of weight is assigned
    if (Math.abs(totalGradeWeight - 100) > 0.1) return null;

    let gradedContribution = 0;
    let remainingWeight = 0;
    let hasPendingGrade = false;

    for (const grade of component.grades) {
      if (grade.value != null) {
        gradedContribution += grade.value * (grade.weightPercentage / 100);
      } else {
        hasPendingGrade = true;
        remainingWeight += grade.weightPercentage / 100;
      }
    }

    if (!hasPendingGrade) return null;
    if (remainingWeight === 0) return null;

    const needed = (subject.exemptionGrade - 0.05 - gradedContribution) / remainingWeight;
    return needed;
  }
}

interface SubjectCardProps {
  subject: SubjectWithDetails;
  onUpdateGrade: (id: string, payload: { name?: string; value?: number | null; weightPercentage?: number; date?: string | null; description?: string | null }) => Promise<void>;
  onDeleteGrade: (id: string) => Promise<void>;
  onAddGrade: (componentId: string, payload: { name: string; value: number | null; weightPercentage: number }) => Promise<void>;
  onEdit: (subject: SubjectWithDetails) => void;
  onDelete: (id: string) => void;
}

export default function SubjectCard({
  subject,
  onUpdateGrade,
  onDeleteGrade,
  onAddGrade,
  onEdit,
  onDelete,
}: SubjectCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useI18n();

  // Use backend-computed average instead of duplicating calculation logic
  const average = subject.calculatedAverage ?? null;
  const avgColor = average !== null
    ? average >= 4.0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-500 dark:text-red-400'
    : 'text-gray-400';

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete(subject.id);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-primary-100 dark:border-secondary-800 overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-secondary-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-secondary-400" />
          )}
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {subject.name}
          </h3>
          {subject.isComposite && subject.components.length > 1 && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-secondary-100 dark:bg-secondary-900 text-secondary-600 dark:text-secondary-300 uppercase tracking-wide">
              {t.subject.composite}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${avgColor}`}>
            {average !== null ? average.toFixed(1) : '-'}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(subject)}
              className="p-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-secondary-800 text-gray-400 hover:text-secondary-500 transition-colors"
              title={t.subject.edit}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-full transition-colors ${
                confirmDelete
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-600'
                  : 'hover:bg-primary-100 dark:hover:bg-secondary-800 text-gray-400 hover:text-red-500'
              }`}
              title={confirmDelete ? t.subject.confirmDelete : t.subject.delete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-primary-50 dark:border-secondary-800/50">
          {subject.components.map((component) => {
            const usedWeight = component.grades.reduce((sum, g) => sum + g.weightPercentage, 0);
            // Use backend-computed component average
            const compAvg = component.average ?? null;

            return (
              <div key={component.id} className="mt-3">
                {/* Component header (only for composite) */}
                {subject.isComposite && subject.components.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {component.name}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent-100 dark:bg-accent-900 text-accent-600 dark:text-accent-300">
                      {component.weightPercentage}%
                    </span>
                    {compAvg !== null && (
                      <span className={`text-sm font-semibold ml-auto ${
                        compAvg >= 4.0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {compAvg.toFixed(1)}
                      </span>
                    )}
                  </div>
                )}

                {/* Grades table */}
                {component.grades.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          <th className="text-left py-1 px-3 font-medium">{t.subject.evaluation}</th>
                          <th className="text-center py-1 px-3 font-medium">{t.grade.dateLabel}</th>
                          <th className="text-center py-1 px-3 font-medium">{t.subject.grade}</th>
                          <th className="text-center py-1 px-3 font-medium">{t.subject.weight}</th>
                          <th className="hidden sm:table-cell text-center py-1 px-2 font-medium w-10">{t.grade.descriptionLabel}</th>
                          <th className="text-center py-1 px-2 font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {component.grades.map((grade) => (
                          <GradeRow
                            key={grade.id}
                            grade={grade}
                            onUpdate={onUpdateGrade}
                            onDelete={onDeleteGrade}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-primary-100 dark:bg-secondary-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-300 to-secondary-400 rounded-full transition-all"
                      style={{ width: `${Math.min(usedWeight, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {usedWeight}%
                  </span>
                </div>

                {/* Add grade form */}
                {usedWeight < 100 && (
                  <AddGradeForm
                    usedWeight={usedWeight}
                    onAdd={(payload) => onAddGrade(component.id, payload)}
                  />
                )}
              </div>
            );
          })}

          {/* Exemption grade calculation */}
          {(() => {
            const needed = calculateExemptionNeeded(subject);
            if (needed === null) return null;

            // Round up to 1 decimal (minimum grade you need to get, considering grades are in tenths)
            const neededRounded = Math.ceil(needed * 10) / 10;

            let colorClass: string;
            let displayText: string;

            if (neededRounded <= 1.0) {
              // Already meets exemption with any grade
              colorClass = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
              displayText = t.subject.exemptionAchieved;
            } else if (neededRounded > 7.0) {
              colorClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
              displayText = t.subject.exemptionImpossible;
            } else if (neededRounded >= 6.0) {
              colorClass = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
              displayText = t.subject.needForExemption.replace('{grade}', neededRounded.toFixed(1));
            } else {
              colorClass = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
              displayText = t.subject.needForExemption.replace('{grade}', neededRounded.toFixed(1));
            }

            return (
              <div className={`mt-3 px-3 py-2 rounded-lg border text-sm font-medium ${colorClass}`}>
                {displayText}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
