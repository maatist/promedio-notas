import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import apiClient from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.resetPassword.mismatch);
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/reset-password', { token, password });
      toast.success(t.resetPassword.success);
      navigate('/login');
    } catch {
      setError(t.resetPassword.invalidToken);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 via-accent-50 to-secondary-100 dark:from-gray-900 dark:via-secondary-950 dark:to-gray-900 p-4">
      {/* Theme & Language toggles */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg mb-3">
            <BookOpen className="h-8 w-8 text-secondary-500" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            {t.resetPassword.title}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-primary-100 dark:border-secondary-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.resetPassword.newPassword}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.resetPassword.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400 text-base"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-400 to-secondary-500 text-white font-semibold rounded-lg shadow-md hover:from-primary-500 hover:to-secondary-600 disabled:opacity-50 transition-all text-base"
            >
              {loading ? '...' : t.resetPassword.submit}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.forgotPassword.backToLogin}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
