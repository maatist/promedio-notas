import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Plus, Trash2, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface AddSubjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    isComposite: boolean;
    components?: { name: string; weightPercentage: number }[];
  }) => Promise<void>;
}

export default function AddSubjectModal({ open, onClose, onSave }: AddSubjectModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [isComposite, setIsComposite] = useState(false);
  const [components, setComponents] = useState<{ name: string; weightPercentage: number }[]>([
    { name: 'Catedra', weightPercentage: 60 },
    { name: 'Laboratorio', weightPercentage: 40 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalWeight = components.reduce((sum, c) => sum + c.weightPercentage, 0);

  const addComponent = () => {
    setComponents([...components, { name: '', weightPercentage: 0 }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: 'name' | 'weightPercentage', value: string | number) => {
    const updated = [...components];
    if (field === 'name') {
      updated[index] = { ...updated[index], name: value as string };
    } else {
      updated[index] = { ...updated[index], weightPercentage: Number(value) };
    }
    setComponents(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t.addSubject.errorName);
      return;
    }

    if (isComposite) {
      if (components.length < 2) {
        setError(t.addSubject.errorMinComponents);
        return;
      }
      if (components.some((c) => !c.name.trim())) {
        setError(t.addSubject.errorComponentNames);
        return;
      }
      if (totalWeight !== 100) {
        setError(`${t.addSubject.errorWeightSum} (${totalWeight}%)`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        isComposite,
        components: isComposite ? components : undefined,
      });
      resetForm();
      onClose();
    } catch {
      setError(t.addSubject.errorSave);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setIsComposite(false);
    setComponents([
      { name: 'Catedra', weightPercentage: 60 },
      { name: 'Laboratorio', weightPercentage: 40 },
    ]);
    setError('');
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-primary-100 dark:border-secondary-800">
                <div className="flex items-center justify-between mb-5">
                  <Dialog.Title className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    {t.addSubject.title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-secondary-800 text-gray-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.addSubject.name}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.addSubject.namePlaceholder}
                      className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400"
                    />
                  </div>

                  {/* Composite toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsComposite(!isComposite)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        isComposite
                          ? 'bg-gradient-to-r from-primary-400 to-secondary-500'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          isComposite ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t.addSubject.compositeToggle}
                    </span>
                  </div>

                  {/* Components section */}
                  {isComposite && (
                    <div className="space-y-3 p-4 bg-primary-50/50 dark:bg-secondary-900/30 rounded-lg border border-primary-100 dark:border-secondary-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.addSubject.components}
                        </span>
                        <span className={`text-xs font-semibold ${
                          totalWeight === 100
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}>
                          {t.addSubject.total}: {totalWeight}%
                        </span>
                      </div>

                      {components.map((comp, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) => updateComponent(index, 'name', e.target.value)}
                            placeholder={t.addSubject.componentName}
                            className="flex-1 px-3 py-1.5 text-sm rounded-md border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-secondary-300"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={comp.weightPercentage}
                              onChange={(e) => updateComponent(index, 'weightPercentage', e.target.value)}
                              className="w-16 px-2 py-1.5 text-sm text-center rounded-md border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-secondary-300"
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                          {components.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeComponent(index)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addComponent}
                        className="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.addSubject.addComponent}
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                    >
                      {t.addSubject.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-primary-400 to-secondary-500 text-white rounded-lg shadow-sm hover:from-primary-500 hover:to-secondary-600 disabled:opacity-50 transition-all"
                    >
                      {saving ? t.addSubject.saving : t.addSubject.create}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
