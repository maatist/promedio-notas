import { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import type { Grade } from '@promedio-notas/shared';
import { useI18n } from '../i18n';

interface GradeRowProps {
  grade: Grade;
  onUpdate: (id: string, payload: { name?: string; value?: number | null; weightPercentage?: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function GradeRow({ grade, onUpdate, onDelete }: GradeRowProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<'name' | 'value' | 'weight' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEdit = (field: 'name' | 'value' | 'weight') => {
    setEditing(field);
    if (field === 'name') setEditValue(grade.name);
    else if (field === 'value') setEditValue(grade.value?.toString() ?? '');
    else setEditValue(grade.weightPercentage.toString());
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      if (editing === 'name') {
        await onUpdate(grade.id, { name: editValue });
      } else if (editing === 'value') {
        const val = editValue === '' ? null : parseFloat(editValue);
        if (val !== null && (val < 1.0 || val > 7.0)) return;
        await onUpdate(grade.id, { value: val });
      } else {
        const w = parseFloat(editValue);
        if (isNaN(w) || w <= 0 || w > 100) return;
        await onUpdate(grade.id, { weightPercentage: w });
      }
    } finally {
      setEditing(null);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await onDelete(grade.id);
  };

  const valueColor = grade.value !== null
    ? grade.value >= 4.0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-500 dark:text-red-400'
    : 'text-gray-400';

  return (
    <tr className="border-b border-primary-100 dark:border-secondary-800 last:border-0 hover:bg-primary-50/50 dark:hover:bg-secondary-900/50 transition-colors">
      {/* Name */}
      <td className="py-2 px-3">
        {editing === 'name' ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEdit}
              autoFocus
              className="w-full px-2 py-0.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-secondary-400"
            />
          </div>
        ) : (
          <button
            onClick={() => startEdit('name')}
            className="text-sm text-gray-700 dark:text-gray-200 hover:text-secondary-600 dark:hover:text-secondary-400 cursor-pointer text-left"
          >
            {grade.name}
          </button>
        )}
      </td>
      {/* Value */}
      <td className="py-2 px-3 text-center">
        {editing === 'value' ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="7.0"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEdit}
              autoFocus
              className="w-16 px-2 py-0.5 text-sm text-center rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-secondary-400"
            />
          </div>
        ) : (
          <button
            onClick={() => startEdit('value')}
            className={`text-sm font-semibold ${valueColor} hover:underline cursor-pointer`}
          >
            {grade.value !== null ? grade.value.toFixed(1) : '-'}
          </button>
        )}
      </td>
      {/* Weight */}
      <td className="py-2 px-3 text-center">
        {editing === 'weight' ? (
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEdit}
              autoFocus
              className="w-16 px-2 py-0.5 text-sm text-center rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-secondary-400"
            />
          </div>
        ) : (
          <button
            onClick={() => startEdit('weight')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-secondary-600 dark:hover:text-secondary-400 cursor-pointer"
          >
            {grade.weightPercentage}%
          </button>
        )}
      </td>
      {/* Actions */}
      <td className="py-2 px-2 text-center">
        {editing ? (
          <div className="flex items-center justify-center gap-1">
            <button onClick={saveEdit} className="p-1 text-green-500 hover:text-green-700">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={cancelEdit} className="p-1 text-red-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className={`p-1 rounded transition-colors ${
              confirmDelete
                ? 'text-red-600 bg-red-50 dark:bg-red-900/30'
                : 'text-gray-400 hover:text-red-500 dark:hover:text-red-400'
            }`}
            title={confirmDelete ? t.grade.deleteConfirm : t.grade.deleteGrade}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
