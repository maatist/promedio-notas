import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Period, SubjectWithDetails } from '@promedio-notas/shared';
import { periodService, subjectService, gradeService } from '../api/services';
import { useI18n } from '../i18n';
import Navbar from '../components/Navbar';
import SubjectCard from '../components/SubjectCard';
import AddSubjectModal from '../components/AddSubjectModal';
import EditSubjectModal from '../components/EditSubjectModal';
import { BookOpen } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useI18n();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithDetails | null>(null);
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');

  // Load periods
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const data = await periodService.list();
        setPeriods(data);
        if (data.length > 0 && !selectedPeriod) {
          setSelectedPeriod(data[0]);
        }
      } catch {
        toast.error(t.toast.error);
      } finally {
        setLoading(false);
      }
    };
    loadPeriods();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load subjects when period changes
  const loadSubjects = useCallback(async () => {
    if (!selectedPeriod) return;
    try {
      const data = await subjectService.list(selectedPeriod.id);
      setSubjects(data);
    } catch {
      toast.error(t.toast.error);
    }
  }, [selectedPeriod, t.toast.error]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Create period
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName.trim()) return;
    try {
      const period = await periodService.create(newPeriodName.trim());
      setPeriods((prev) => [...prev, period]);
      setSelectedPeriod(period);
      setNewPeriodName('');
      setShowNewPeriod(false);
      toast.success(t.toast.periodCreated);
    } catch {
      toast.error(t.toast.error);
    }
  };

  // Create subject
  const handleCreateSubject = async (payload: {
    name: string;
    isComposite: boolean;
    components?: { name: string; weightPercentage: number }[];
  }) => {
    if (!selectedPeriod) return;
    await subjectService.create(selectedPeriod.id, payload);
    toast.success(t.toast.subjectCreated);
    await loadSubjects();
  };

  // Update subject
  const handleUpdateSubject = async (
    id: string,
    payload: {
      name?: string;
      isComposite?: boolean;
      components?: { name: string; weightPercentage: number }[];
      exemptionGrade?: number | null;
    }
  ) => {
    await subjectService.update(id, payload);
    toast.success(t.toast.subjectUpdated);
    await loadSubjects();
  };

  // Delete subject
  const handleDeleteSubject = async (id: string) => {
    try {
      await subjectService.delete(id);
      toast.success(t.toast.subjectDeleted);
      await loadSubjects();
    } catch {
      toast.error(t.toast.error);
    }
  };

  // Grade operations
  const handleAddGrade = async (
    componentId: string,
    payload: { name: string; value: number | null; weightPercentage: number }
  ) => {
    await gradeService.create(componentId, payload);
    toast.success(t.toast.gradeCreated);
    await loadSubjects();
  };

  const handleUpdateGrade = async (
    id: string,
    payload: { name?: string; value?: number | null; weightPercentage?: number }
  ) => {
    await gradeService.update(id, payload);
    toast.success(t.toast.gradeUpdated);
    await loadSubjects();
  };

  const handleDeleteGrade = async (id: string) => {
    await gradeService.delete(id);
    toast.success(t.toast.gradeDeleted);
    await loadSubjects();
  };

  const openEditModal = (subject: SubjectWithDetails) => {
    setEditingSubject(subject);
    setEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-300 border-t-secondary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-secondary-950">
      <Navbar
        periods={periods}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
        onAddSubject={() => setAddModalOpen(true)}
        onAddPeriod={() => setShowNewPeriod(true)}
      />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        {/* New period form */}
        {showNewPeriod && (
          <form
            onSubmit={handleCreatePeriod}
            className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-primary-100 dark:border-secondary-800"
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.dashboard.periodName}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPeriodName}
                onChange={(e) => setNewPeriodName(e.target.value)}
                placeholder={t.dashboard.periodPlaceholder}
                autoFocus
                className="flex-1 px-4 py-2 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 text-base"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-primary-400 to-secondary-500 text-white font-medium rounded-lg hover:from-primary-500 hover:to-secondary-600 transition-all text-sm"
              >
                {t.dashboard.createPeriod}
              </button>
              <button
                type="button"
                onClick={() => setShowNewPeriod(false)}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                &times;
              </button>
            </div>
          </form>
        )}

        {/* No periods state */}
        {periods.length === 0 && !showNewPeriod && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-secondary-200 dark:text-secondary-800 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t.dashboard.noPeriods}</p>
            <button
              onClick={() => setShowNewPeriod(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-primary-400 to-secondary-500 text-white font-medium rounded-lg shadow-sm hover:from-primary-500 hover:to-secondary-600 transition-all"
            >
              {t.dashboard.createPeriod}
            </button>
          </div>
        )}

        {/* Subjects list */}
        {selectedPeriod && subjects.length > 0 && (
          <div className="space-y-4">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onUpdateGrade={handleUpdateGrade}
                onDeleteGrade={handleDeleteGrade}
                onAddGrade={handleAddGrade}
                onEdit={openEditModal}
                onDelete={handleDeleteSubject}
              />
            ))}
          </div>
        )}

        {/* No subjects state */}
        {selectedPeriod && subjects.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto text-secondary-200 dark:text-secondary-800 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t.dashboard.noSubjects}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {t.dashboard.addFirst}
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddSubjectModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleCreateSubject}
      />
      <EditSubjectModal
        open={editModalOpen}
        subject={editingSubject}
        onClose={() => {
          setEditModalOpen(false);
          setEditingSubject(null);
        }}
        onSave={handleUpdateSubject}
      />
    </div>
  );
}
