import { Languages } from 'lucide-react';
import { useI18n } from '../i18n';

export default function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
      className="flex items-center gap-1 p-2 rounded-full bg-primary-100 dark:bg-secondary-800 hover:bg-primary-200 dark:hover:bg-secondary-700 transition-colors text-xs font-medium text-gray-600 dark:text-gray-300"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}
