import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { shareService, periodService } from '../api/services';
import type { SubjectPreview } from '../api/services';
import type { Period } from '@promedio-notas/shared';
import { BookOpen, AlertCircle, Clock, Download } from 'lucide-react';

export default function ImportSubjectPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SubjectPreview | null>(null);
  const [error, setError] = useState<{ type: 'not_found' | 'expired' | 'unknown' } | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!user || !token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [previewData, periodsData] = await Promise.all([
          shareService.getPreview(token),
          periodService.list(),
        ]);
        setPreview(previewData);
        setPeriods(periodsData);
        if (periodsData.length > 0) {
          setSelectedPeriodId(periodsData[0].id);
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) {
          setError({ type: 'not_found' });
        } else if (axiosErr.response?.status === 410) {
          setError({ type: 'expired' });
        } else {
          setError({ type: 'unknown' });
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, token]);

  // If still checking auth, show loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-300 border-t-secondary-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const handleImport = async () => {
    if (!token || !selectedPeriodId) return;
    setImporting(true);
    try {
      await shareService.importSubject(token, selectedPeriodId);
      toast.success(t.share.import.successToast);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 403) {
        toast.error(t.share.import.errorForbidden);
      } else if (axiosErr.response?.status === 410) {
        toast.error(t.share.import.errorExpired);
      } else {
        toast.error(t.share.import.errorGeneric);
      }
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-secondary-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-300 border-t-secondary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-secondary-950 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-primary-100 dark:border-secondary-800 p-8">
            {error.type === 'expired' ? (
              <>
                <Clock className="h-12 w-12 mx-auto text-amber-400 mb-4" />
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {t.share.import.errorExpired}
                </h2>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {error.type === 'not_found'
                    ? t.share.import.errorNotFound
                    : t.share.import.errorGeneric}
                </h2>
              </>
            )}
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-5 py-2 text-sm font-medium bg-gradient-to-r from-primary-400 to-secondary-500 text-white rounded-lg shadow-sm hover:from-primary-500 hover:to-secondary-600 transition-all"
            >
              {t.addSubject.cancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const formatDate = (date: string | null): string => {
    if (!date) return t.share.import.noDate;
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return t.share.import.noDate;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-900 dark:via-gray-900 dark:to-secondary-950 p-4 py-8">
      <div className="w-full max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-md mb-3">
            <BookOpen className="h-6 w-6 text-secondary-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {t.share.import.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.share.import.preview}
          </p>
        </div>

        {/* Preview Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-primary-100 dark:border-secondary-800 p-5">
          {/* Subject Name */}
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            {preview.subjectName}
          </h2>

          {/* Components */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t.share.import.components}
            </h3>
            {preview.components.map((component, idx) => (
              <div
                key={idx}
                className="p-3 bg-primary-50/50 dark:bg-secondary-900/30 rounded-lg border border-primary-100 dark:border-secondary-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {component.name}
                  </span>
                  <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    {component.weightPercentage}%
                  </span>
                </div>

                {component.grades.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t.share.import.grades}
                    </span>
                    {component.grades.map((grade, gIdx) => (
                      <div
                        key={gIdx}
                        className="flex items-center justify-between text-xs bg-white dark:bg-gray-700 rounded-md px-2.5 py-1.5 border border-primary-100 dark:border-secondary-700"
                      >
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          {grade.name}
                        </span>
                        <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                          <span>{grade.weightPercentage}%</span>
                          <span>{formatDate(grade.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Period Selector & Import Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-primary-100 dark:border-secondary-800 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.share.import.selectPeriod}
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 text-sm"
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !selectedPeriodId}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-400 to-secondary-500 text-white font-semibold rounded-lg shadow-md hover:from-primary-500 hover:to-secondary-600 disabled:opacity-50 transition-all text-sm"
          >
            <Download className="h-4 w-4" />
            {importing ? t.share.import.importing : t.share.import.confirmButton}
          </button>
        </div>
      </div>
    </div>
  );
}
