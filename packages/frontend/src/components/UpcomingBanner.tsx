import type { UpcomingGrade } from '@promedio-notas/shared';
import { formatGradeDate, getDaysRemaining, getUrgencyColor } from '../utils/dateUtils';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n/translations';
import { Calendar } from 'lucide-react';

interface UpcomingBannerProps {
  grades: UpcomingGrade[];
}

export default function UpcomingBanner({ grades }: UpcomingBannerProps) {
  const { t, locale } = useI18n();

  if (grades.length === 0) return null;

  // Sort by date ASC and limit to 10
  const sortedGrades = [...grades]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  const today = new Date().toISOString().split('T')[0];

  function getDaysLabel(daysRemaining: number): string {
    if (daysRemaining === 0) return t.upcomingBanner.today;
    if (daysRemaining === 1) return t.upcomingBanner.tomorrow;
    return t.upcomingBanner.daysRemaining.replace('{n}', String(daysRemaining));
  }

  // Color classes for urgency indicators with WCAG AA contrast in dark mode
  function getColorClasses(color: 'red' | 'yellow' | 'green'): string {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'green':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    }
  }

  return (
    <section
      role="region"
      aria-label={t.upcomingBanner.title}
      className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-primary-100 dark:border-secondary-800"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-secondary-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t.upcomingBanner.title}
        </h2>
      </div>

      <ul className="space-y-2">
        {sortedGrades.map((grade) => {
          const days = getDaysRemaining(grade.date, today);
          const color = getUrgencyColor(days);
          const colorClasses = getColorClasses(color);
          const daysLabel = getDaysLabel(days);

          return (
            <li
              key={grade.id}
              className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-800 dark:text-gray-100 truncate block">
                  {grade.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
                  {grade.subjectName} &middot; {formatGradeDate(grade.date, locale as Locale)}
                </span>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colorClasses}`}
                aria-label={daysLabel}
              >
                {daysLabel}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
