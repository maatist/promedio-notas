import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import type { SubjectWithDetails } from '@promedio-notas/shared';
import { useI18n } from '../i18n';
import GradeRow from './GradeRow';
import AddGradeForm from './AddGradeForm';

interface SubjectCardProps {
  subject: SubjectWithDetails;
  onUpdateGrade: (id: string, payload: { name?: string; value?: number | null; weightPercentage?: number }) => Promise<void>;
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
                          <th className="text-center py-1 px-3 font-medium">{t.subject.grade}</th>
                          <th className="text-center py-1 px-3 font-medium">{t.subject.weight}</th>
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
        </div>
      )}
    </div>
  );
}
