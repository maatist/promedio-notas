import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { useI18n } from '../i18n';
import apiClient from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch {
      setError(t.auth.errorGeneric);
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
            {t.forgotPassword.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.forgotPassword.description}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-primary-100 dark:border-secondary-800 p-6">
          {success ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t.forgotPassword.success}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm font-medium text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.forgotPassword.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.profile.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t.profile.emailPlaceholder}
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
                {loading ? '...' : t.forgotPassword.submit}
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
          )}
        </div>
      </div>
    </div>
  );
}
