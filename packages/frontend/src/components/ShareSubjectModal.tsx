import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, Copy, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import { shareService } from '../api/services';

interface ShareSubjectModalProps {
  subjectId: string;
  subjectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareSubjectModal({
  subjectId,
  subjectName,
  isOpen,
  onClose,
}: ShareSubjectModalProps) {
  const { t } = useI18n();
  const [shareLink, setShareLink] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShareLink('');
      setExpiresAt(null);
      setError('');
      setCopied(false);
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await shareService.generateLink(subjectId);
      setShareLink(result.shareLink);
      setExpiresAt(result.expiresAt);
    } catch {
      setError(t.share.errorGenerate);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success(t.share.copiedToast);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  };

  const formattedExpiration = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
                    {t.share.modalTitle}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-secondary-800 text-gray-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Subject name indicator */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Link className="h-4 w-4 text-secondary-400" />
                    <span className="font-medium">{subjectName}</span>
                  </div>

                  {/* Loading state */}
                  {loading && (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin h-6 w-6 border-2 border-secondary-400 border-t-transparent rounded-full" />
                      <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                        {t.share.generating}
                      </span>
                    </div>
                  )}

                  {/* Error state */}
                  {error && !loading && (
                    <div className="py-4 text-center">
                      <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Success state: share link */}
                  {shareLink && !loading && !error && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t.share.linkLabel}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={shareLink}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:outline-none select-all"
                          />
                          <button
                            onClick={handleCopy}
                            className="px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-primary-400 to-secondary-500 text-white rounded-lg shadow-sm hover:from-primary-500 hover:to-secondary-600 transition-all flex items-center gap-1.5"
                          >
                            {copied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            {t.share.copyButton}
                          </button>
                        </div>
                      </div>

                      {/* Expiration date */}
                      {formattedExpiration && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.share.expiresAt.replace('{date}', formattedExpiration)}
                        </p>
                      )}
                    </>
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
