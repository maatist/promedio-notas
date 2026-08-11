import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if user previously dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide banner if app is already installed
    window.addEventListener('appinstalled', () => {
      setShow(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom">
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-primary-200 dark:border-secondary-700">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t.installPrompt.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t.installPrompt.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-primary-400 to-secondary-500 rounded-lg hover:from-primary-500 hover:to-secondary-600 transition-all"
          >
            {t.installPrompt.install}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t.installPrompt.dismiss}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
