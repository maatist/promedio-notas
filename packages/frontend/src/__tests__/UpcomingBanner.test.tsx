import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UpcomingBanner from '../components/UpcomingBanner';

vi.mock('../i18n', () => ({
  useI18n: () => ({
    t: {
      upcomingBanner: {
        title: 'Upcoming evaluations',
        daysRemaining: 'in {n} days',
        today: 'Today',
        tomorrow: 'Tomorrow',
      },
    },
    locale: 'en',
  }),
}));

// Mock lucide-react Calendar icon
vi.mock('lucide-react', () => ({
  Calendar: () => <svg data-testid="calendar-icon" />,
}));

const sampleGrades = [
  {
    id: '1',
    name: 'Solemne 1',
    date: '2025-08-10',
    description: 'Chapters 1-4',
    subjectComponentName: 'Cátedra',
    subjectName: 'Cálculo I',
  },
  {
    id: '2',
    name: 'Control 3',
    date: '2025-08-05',
    description: null,
    subjectComponentName: 'Laboratorio',
    subjectName: 'Física II',
  },
];

describe('UpcomingBanner', () => {
  beforeEach(() => {
    // Fix "today" to 2025-08-01 so date calculations are stable
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-08-01T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when grades list is empty', () => {
    const { container } = render(<UpcomingBanner grades={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render correctly with grade data', () => {
    render(<UpcomingBanner grades={sampleGrades} />);

    // Section is rendered
    const section = screen.getByRole('region');
    expect(section).toBeInTheDocument();

    // Title is rendered
    expect(screen.getByText('Upcoming evaluations')).toBeInTheDocument();

    // Grade names are rendered
    expect(screen.getByText('Solemne 1')).toBeInTheDocument();
    expect(screen.getByText('Control 3')).toBeInTheDocument();

    // Subject names are rendered inside the list items
    expect(screen.getByText(/Cálculo I/)).toBeInTheDocument();
    expect(screen.getByText(/Física II/)).toBeInTheDocument();
  });

  it('should have accessibility attributes: role="region" and aria-label on section', () => {
    render(<UpcomingBanner grades={sampleGrades} />);

    const section = screen.getByRole('region');
    expect(section).toHaveAttribute('aria-label', 'Upcoming evaluations');
  });

  it('should have aria-label on urgency badges', () => {
    render(<UpcomingBanner grades={sampleGrades} />);

    // With today = 2025-08-01:
    // grade "Control 3" date 2025-08-05 → 4 days → "in 4 days"
    // grade "Solemne 1" date 2025-08-10 → 9 days → "in 9 days"
    const badge4days = screen.getByLabelText('in 4 days');
    expect(badge4days).toBeInTheDocument();

    const badge9days = screen.getByLabelText('in 9 days');
    expect(badge9days).toBeInTheDocument();
  });
});
