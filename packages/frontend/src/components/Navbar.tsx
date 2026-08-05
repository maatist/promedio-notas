import { useState } from 'react';
import { Plus, LogOut, BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import type { Period } from '@promedio-notas/shared';

interface NavbarProps {
  periods: Period[];
  selectedPeriod: Period | null;
  onSelectPeriod: (period: Period) => void;
  onAddSubject: () => void;
  onAddPeriod: () => void;
}

export default function Navbar({
  periods,
  selectedPeriod,
  onSelectPeriod,
  onAddSubject,
  onAddPeriod,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-primary-200 dark:border-secondary-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-secondary-500" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent hidden sm:inline">
              {t.app.name}
            </span>
          </div>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setPeriodMenuOpen(!periodMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-secondary-900 border border-primary-200 dark:border-secondary-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              {selectedPeriod?.name || t.nav.selectPeriod}
              <ChevronDown className="h-4 w-4" />
            </button>
            {periodMenuOpen && (
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-primary-100 dark:border-secondary-700 py-1 z-50">
                {periods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => {
                      onSelectPeriod(period);
                      setPeriodMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 dark:hover:bg-secondary-900 transition-colors ${
                      selectedPeriod?.id === period.id
                        ? 'text-secondary-600 font-semibold bg-primary-50 dark:bg-secondary-900'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {period.name}
                  </button>
                ))}
                <hr className="my-1 border-primary-100 dark:border-secondary-700" />
                <button
                  onClick={() => {
                    onAddPeriod();
                    setPeriodMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-secondary-600 dark:text-secondary-400 hover:bg-primary-50 dark:hover:bg-secondary-900 font-medium"
                >
                  {t.nav.newPeriod}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onAddSubject}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary-400 to-secondary-500 text-white font-medium rounded-lg shadow-sm hover:from-primary-500 hover:to-secondary-600 transition-all text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.nav.newSubject}</span>
            </button>
            <LanguageToggle />
            <ThemeToggle />
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="hidden sm:inline">{user?.username}</span>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-primary-100 dark:hover:bg-secondary-800 transition-colors"
                aria-label={t.nav.logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
