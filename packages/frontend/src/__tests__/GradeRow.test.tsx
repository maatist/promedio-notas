import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import GradeRow from '../components/GradeRow';
import type { Grade } from '@promedio-notas/shared';

vi.mock('../i18n', () => ({
  useI18n: () => ({
    t: {
      grade: {
        dateLabel: 'Date',
        datePlaceholder: 'No date',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Add description...',
        deleteConfirm: 'Click again to confirm',
        deleteGrade: 'Delete grade',
      },
    },
    locale: 'en',
  }),
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <svg data-testid="trash-icon" />,
  Check: () => <svg data-testid="check-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Calendar: () => <svg data-testid="calendar-icon" />,
  FileText: () => <svg data-testid="filetext-icon" />,
}));

const gradeWithDate: Grade = {
  id: '1',
  subjectComponentId: 'comp-1',
  name: 'Solemne 1',
  value: 5.5,
  weightPercentage: 30,
  order: 0,
  date: '2025-08-15',
  description: 'Chapters 1-4',
};

const gradeWithoutDate: Grade = {
  id: '2',
  subjectComponentId: 'comp-1',
  name: 'Control 1',
  value: null,
  weightPercentage: 20,
  order: 1,
  date: null,
  description: null,
};

function renderGradeRow(grade: Grade, onUpdate = vi.fn(), onDelete = vi.fn()) {
  return render(
    <table>
      <tbody>
        <GradeRow grade={grade} onUpdate={onUpdate} onDelete={onDelete} />
      </tbody>
    </table>,
  );
}

describe('GradeRow inline editing', () => {
  describe('Date editing', () => {
    it('click on date activates date input', async () => {
      renderGradeRow(gradeWithDate);

      // The formatted date should be visible as text
      const dateButton = screen.getByTitle('Date');
      await userEvent.click(dateButton);

      // An input type="date" should now be in the document
      const dateInput = screen.getByDisplayValue('2025-08-15');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('Enter saves date', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      renderGradeRow(gradeWithDate, mockUpdate);

      // Click on date to start editing
      const dateButton = screen.getByTitle('Date');
      await userEvent.click(dateButton);

      // Change the date value
      const dateInput = screen.getByDisplayValue('2025-08-15');
      fireEvent.change(dateInput, { target: { value: '2025-09-01' } });

      // Press Enter to save
      fireEvent.keyDown(dateInput, { key: 'Enter', code: 'Enter' });

      expect(mockUpdate).toHaveBeenCalledWith('1', { date: '2025-09-01' });
    });

    it('Escape cancels date edit', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      renderGradeRow(gradeWithDate, mockUpdate);

      // Click on date to start editing
      const dateButton = screen.getByTitle('Date');
      await userEvent.click(dateButton);

      // Change the date value
      const dateInput = screen.getByDisplayValue('2025-08-15');
      fireEvent.change(dateInput, { target: { value: '2025-09-01' } });

      // Press Escape to cancel
      fireEvent.keyDown(dateInput, { key: 'Escape', code: 'Escape' });

      // onUpdate should NOT have been called
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('calendar icon shown when date is null', () => {
      renderGradeRow(gradeWithoutDate);

      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    });
  });

  describe('Description editing', () => {
    it('click on description icon opens textarea', async () => {
      renderGradeRow(gradeWithDate);

      // Click on the FileText icon to start editing description
      const descButton = screen.getByTitle('Chapters 1-4');
      await userEvent.click(descButton);

      // A textarea should now appear
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
    });

    it('Enter saves description', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      renderGradeRow(gradeWithDate, mockUpdate);

      // Click on the description icon
      const descButton = screen.getByTitle('Chapters 1-4');
      await userEvent.click(descButton);

      // Clear and type new text
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      // Press Enter to save
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

      expect(mockUpdate).toHaveBeenCalledWith('1', { description: 'Updated content' });
    });

    it('Escape cancels description edit', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      renderGradeRow(gradeWithDate, mockUpdate);

      // Click on the description icon
      const descButton = screen.getByTitle('Chapters 1-4');
      await userEvent.click(descButton);

      // Type something
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      // Press Escape to cancel
      fireEvent.keyDown(textarea, { key: 'Escape', code: 'Escape' });

      // onUpdate should NOT have been called
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
