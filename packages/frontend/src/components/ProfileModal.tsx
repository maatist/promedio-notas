import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, User, LogOut, Languages } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { t, locale, setLocale } = useI18n();
  const { user, updateProfile, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill email whenever modal opens or user changes
  useEffect(() => {
    if (open) {
      setEmail(user?.email ?? '');
      setError('');
    }
  }, [open, user?.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t.profile.email);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ email: email.trim() });
      toast.success(t.profile.emailUpdated);
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error?.response?.status === 409) {
        setError(t.profile.emailConflict);
      } else {
        setError(t.toast.error);
      }
    } finally {
      setSaving(false);
    }
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
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-secondary-500" />
                    <Dialog.Title className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {t.profile.title}
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-secondary-800 text-gray-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Username (read-only) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.auth.username}
                  </label>
                  <input
                    type="text"
                    value={user?.username ?? ''}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.profile.email}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.profile.emailPlaceholder}
                      className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400"
                    />
                  </div>

                  {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

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
                      {saving ? '...' : t.profile.save}
                    </button>
                  </div>
                </form>

                {/* Language & Logout */}
                <div className="mt-5 pt-4 border-t border-primary-100 dark:border-secondary-700 flex items-center justify-between">
                  <button
                    onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-100 dark:bg-secondary-800 hover:bg-primary-200 dark:hover:bg-secondary-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    <Languages className="h-4 w-4" />
                    <span className="uppercase">{locale}</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    {t.nav.logout}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
