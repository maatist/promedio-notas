import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Calendar, FileText, Check, Pencil } from 'lucide-react';
import type { Grade } from '@promedio-notas/shared';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n/translations';
import { formatGradeDate } from '../utils/dateUtils';

type EditableField = 'name' | 'value' | 'weight' | 'date' | 'description';

interface GradeDetailModalProps {
  grade: Grade | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, payload: { name?: string; value?: number | null; weightPercentage?: number; date?: string | null; description?: string | null }) => Promise<void>;
}

export default function GradeDetailModal({ grade, open, onClose, onUpdate }: GradeDetailModalProps) {
  const { t, locale } = useI18n();
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!grade) return null;

  const startEdit = (field: EditableField) => {
    setEditingField(field);
    switch (field) {
      case 'name':
        setEditValue(grade.name);
        break;
      case 'value':
        setEditValue(grade.value?.toString() ?? '');
        break;
      case 'weight':
        setEditValue(grade.weightPercentage.toString());
        break;
      case 'date': {
        const dateVal = grade.date ?? '';
        setEditValue(dateVal.includes('T') ? dateVal.split('T')[0] : dateVal);
        break;
      }
      case 'description':
        setEditValue(grade.description ?? '');
        break;
    }
  };

  const saveEdit = async () => {
    if (!editingField) return;
    try {
      switch (editingField) {
        case 'name':
          if (editValue.trim()) {
            await onUpdate(grade.id, { name: editValue.trim() });
          }
          break;
        case 'value': {
          const val = editValue === '' ? null : parseFloat(editValue);
          if (val !== null && (val < 1.0 || val > 7.0)) return;
          await onUpdate(grade.id, { value: val });
          break;
        }
        case 'weight': {
          const w = parseFloat(editValue);
          if (isNaN(w) || w <= 0 || w > 100) return;
          await onUpdate(grade.id, { weightPercentage: w });
          break;
        }
        case 'date': {
          const dateVal = editValue === '' ? null : editValue;
          await onUpdate(grade.id, { date: dateVal });
          break;
        }
        case 'description': {
          const descVal = editValue.trim() === '' ? null : editValue.trim();
          await onUpdate(grade.id, { description: descVal });
          break;
        }
      }
    } finally {
      setEditingField(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(editingField === 'description' && e.shiftKey)) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') cancelEdit();
  };

  const valueColor = grade.value !== null
    ? grade.value >= 4.0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-500 dark:text-red-400'
    : 'text-gray-400';

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-sm bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl p-5 border border-primary-100 dark:border-secondary-800">
                {/* Header — Name */}
                <div className="flex items-center justify-between mb-4">
                  {editingField === 'name' ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="flex-1 px-3 py-1.5 text-base font-semibold rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300"
                      />
                      <button onClick={saveEdit} className="p-1.5 text-green-500 hover:text-green-700">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit('name')}
                      className="flex items-center gap-2 group text-left"
                    >
                      <Dialog.Title className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-secondary-600 dark:group-hover:text-secondary-400 transition-colors">
                        {grade.name}
                      </Dialog.Title>
                      <Pencil className="h-3.5 w-3.5 text-gray-300 group-hover:text-secondary-500 transition-colors" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-secondary-800 text-gray-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Grade & Weight */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Value */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">
                      {t.subject.grade}
                    </label>
                    {editingField === 'value' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="7.0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300"
                        />
                        <button onClick={saveEdit} className="p-1.5 text-green-500 hover:text-green-700">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit('value')}
                        className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg bg-primary-50 dark:bg-secondary-900 border border-primary-100 dark:border-secondary-700 hover:bg-primary-100 dark:hover:bg-secondary-800 transition-colors ${valueColor}`}
                      >
                        {grade.value !== null ? grade.value.toFixed(1) : '-'}
                      </button>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">
                      {t.subject.weight}
                    </label>
                    {editingField === 'weight' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="100"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300"
                        />
                        <button onClick={saveEdit} className="p-1.5 text-green-500 hover:text-green-700">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit('weight')}
                        className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg bg-primary-50 dark:bg-secondary-900 border border-primary-100 dark:border-secondary-700 text-gray-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-secondary-800 transition-colors"
                      >
                        {grade.weightPercentage}%
                      </button>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="mb-4">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t.grade.dateLabel}
                  </label>
                  {editingField === 'date' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300"
                      />
                      <button onClick={saveEdit} className="p-2 text-green-500 hover:text-green-700">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={cancelEdit} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit('date')}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg bg-primary-50 dark:bg-secondary-900 border border-primary-100 dark:border-secondary-700 text-gray-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-secondary-800 transition-colors"
                    >
                      {grade.date ? formatGradeDate(grade.date, locale as Locale) : t.grade.datePlaceholder}
                    </button>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {t.grade.descriptionLabel}
                  </label>
                  {editingField === 'description' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        maxLength={500}
                        autoFocus
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 resize-none"
                        placeholder={t.grade.descriptionPlaceholder}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                          {t.grade.cancel}
                        </button>
                        <button onClick={saveEdit} className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-primary-400 to-secondary-500 text-white rounded-md hover:from-primary-500 hover:to-secondary-600 transition-all">
                          {t.grade.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit('description')}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg bg-primary-50 dark:bg-secondary-900 border border-primary-100 dark:border-secondary-700 text-gray-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-secondary-800 transition-colors min-h-[2.5rem]"
                    >
                      {grade.description || (
                        <span className="text-gray-400 dark:text-gray-500">{t.grade.descriptionPlaceholder}</span>
                      )}
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
