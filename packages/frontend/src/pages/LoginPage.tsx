import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'register' && password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, email || undefined);
      }
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        setError(t.auth.errorInvalid);
      } else if (axiosErr.response?.status === 429) {
        setError('Too many attempts, please try again later');
      } else {
        setError(t.auth.errorGeneric);
        toast.error(t.auth.errorGeneric);
      }
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
            {t.app.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.auth.subtitle}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-primary-100 dark:border-secondary-800 p-6">
          {/* Tabs */}
          <div className="flex rounded-lg bg-primary-50 dark:bg-secondary-900 p-1 mb-5">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-700 text-secondary-600 dark:text-secondary-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.auth.loginTab}
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                tab === 'register'
                  ? 'bg-white dark:bg-gray-700 text-secondary-600 dark:text-secondary-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.auth.registerTab}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.auth.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.auth.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400 text-base"
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.auth.confirmPassword}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400 text-base"
                />
              </div>
            )}

            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.profile.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder={t.profile.emailPlaceholder}
                  className="w-full px-4 py-2.5 rounded-lg border border-primary-200 dark:border-secondary-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary-300 dark:focus:ring-secondary-600 placeholder-gray-400 text-base"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-400 to-secondary-500 text-white font-semibold rounded-lg shadow-md hover:from-primary-500 hover:to-secondary-600 disabled:opacity-50 transition-all text-base"
            >
              {loading
                ? '...'
                : tab === 'login'
                ? t.auth.login
                : t.auth.register}
            </button>

            {tab === 'login' && (
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-secondary-500 hover:text-secondary-600 dark:text-secondary-400 dark:hover:text-secondary-300 transition-colors"
                >
                  {t.auth.forgotPasswordLink}
                </Link>
              </div>
            )}
          </form>

          {/* Or divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-400">{t.google.orDivider}</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
