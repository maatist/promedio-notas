import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../i18n';

interface AddGradeFormProps {
  usedWeight: number;
  onAdd: (payload: { name: string; value: number | null; weightPercentage: number }) => Promise<void>;
}

export default function AddGradeForm({ usedWeight, onAdd }: AddGradeFormProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const remainingWeight = 100 - usedWeight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!name || isNaN(w) || w <= 0 || w > remainingWeight) return;

    const val = value === '' ? null : parseFloat(value);
    if (val !== null && (val < 1.0 || val > 7.0)) return;

    setSubmitting(true);
    try {
      await onAdd({ name, value: val, weightPercentage: w });
      setName('');
      setValue('');
      setWeight('');
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 font-medium mt-2 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        {t.subject.addGrade} ({remainingWeight}% {t.subject.available})
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-primary-50/50 dark:bg-secondary-900/30 rounded-lg border border-primary-100 dark:border-secondary-700">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder={t.grade.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="col-span-1 sm:col-span-2 px-3 py-1.5 text-sm rounded-md border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary-300"
        />
        <input
          type="number"
          step="0.1"
          min="1.0"
          max="7.0"
          placeholder={t.grade.valuePlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary-300"
        />
        <input
          type="number"
          step="1"
          min="1"
          max={remainingWeight}
          placeholder={`% (${t.grade.weightPlaceholder} ${remainingWeight})`}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          className="px-3 py-1.5 text-sm rounded-md border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary-300"
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-primary-400 to-secondary-500 text-white rounded-md hover:from-primary-500 hover:to-secondary-600 disabled:opacity-50 transition-all"
        >
          {t.grade.save}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {t.grade.cancel}
        </button>
      </div>
    </form>
  );
}
