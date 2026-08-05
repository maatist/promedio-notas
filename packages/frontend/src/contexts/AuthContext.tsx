import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { User } from '@promedio-notas/shared';
import { authService } from '../api/services';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Guard ref: prevents the verification useEffect from firing a /me call
  // when the token was just set by login/register
  const isAuthenticating = useRef(false);

  // Only verify the token on initial mount — login/register already set the user
  // from the API response, so no secondary verification is needed.
  useEffect(() => {
    const verifyToken = async () => {
      if (isAuthenticating.current) {
        setLoading(false);
        return;
      }

      if (token) {
        try {
          const userData = await authService.me();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    isAuthenticating.current = true;
    try {
      const response = await authService.login(username, password);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } finally {
      isAuthenticating.current = false;
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    isAuthenticating.current = true;
    try {
      const response = await authService.register(username, password);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } finally {
      isAuthenticating.current = false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
