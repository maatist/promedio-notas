import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full bg-primary-100 dark:bg-secondary-800 hover:bg-primary-200 dark:hover:bg-secondary-700 transition-colors"
      aria-label={theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-300" />
      ) : (
        <Moon className="h-5 w-5 text-secondary-600" />
      )}
    </button>
  );
}
