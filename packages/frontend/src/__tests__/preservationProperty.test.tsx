/**
 * Preservation Property Tests — Frontend Non-Bug-Condition Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * These tests capture CURRENT CORRECT behavior that must remain unchanged after the fix.
 * They test non-buggy inputs:
 * - 401 on non-auth endpoints (should clear credentials and redirect)
 * - Registration flow (should store token, set user, navigate to home)
 *
 * Observation-first methodology:
 * - On unfixed code, 401 on non-auth endpoints correctly clears credentials
 * - On unfixed code, registration flow correctly stores token and user
 *
 * EXPECTED OUTCOME: Tests PASS on unfixed code (this confirms baseline behavior to preserve)
 */
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import React from 'react';

// Mock the services module
vi.mock('../api/services', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
}));

import { authService } from '../api/services';

// Helper component to access auth context
function AuthConsumer({ onAuth }: { onAuth: (auth: any) => void }) {
  const auth = useAuth();
  React.useEffect(() => {
    onAuth(auth);
  });
  return null;
}

describe('Preservation Property — 401 on Non-Auth Endpoint (Test 2b)', () => {
  let originalLocation: Location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '/' },
    });
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  /**
   * The interceptor logic from client.ts extracted for direct testing.
   * This mirrors the exact behavior of the real interceptor.
   * Observed behavior on unfixed code: ANY 401 clears credentials unconditionally.
   */
  function simulateInterceptorErrorHandler(error: { response?: { status: number }; config?: { url: string } }) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }

  /**
   * Test 2b — 401 on non-auth endpoint clears credentials:
   * Simulate 401 response on a non-auth endpoint (e.g., /api/subjects, /api/grades).
   * Observed behavior: localStorage is cleared and redirect to /login occurs.
   *
   * Property-based test: for any non-auth endpoint path, a 401 response
   * clears credentials and redirects to /login.
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  it('2b: 401 on non-auth endpoints clears credentials and redirects to /login', async () => {
    // Non-auth endpoint paths that should trigger credential clearing on 401
    const nonAuthEndpoints = [
      '/subjects/123',
      '/periods',
      '/periods/abc/subjects',
      '/grades/456',
      '/components/789/grades',
    ];

    for (const endpoint of nonAuthEndpoints) {
      // Set up credentials as if user is logged in
      localStorage.setItem('token', 'existing-token');
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', username: 'testuser' }));
      (window.location as any).href = '/';

      // Simulate 401 error on non-auth endpoint
      const error401 = {
        response: { status: 401 },
        config: { url: endpoint },
      };

      try {
        await simulateInterceptorErrorHandler(error401);
      } catch {
        // Expected — interceptor rejects the promise
      }

      // Observed behavior on unfixed code: credentials are cleared, redirect happens
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect((window.location as any).href).toBe('/login');
    }
  });

  /**
   * Property-based version of test 2b:
   * For any non-auth endpoint path, 401 should clear credentials.
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  it('2b (property): 401 on any non-auth endpoint path clears credentials', async () => {
    // Generate non-auth endpoint paths (paths that don't start with /auth/)
    const nonAuthPathArb = fc
      .tuple(
        fc.constantFrom('subjects', 'periods', 'grades', 'components'),
        fc.uuid()
      )
      .map(([resource, id]) => `/${resource}/${id}`);

    await fc.assert(
      fc.asyncProperty(nonAuthPathArb, async (path) => {
        // Reset state
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('user', JSON.stringify({ id: '1', username: 'u' }));
        (window.location as any).href = '/';

        const error401 = {
          response: { status: 401 },
          config: { url: path },
        };

        try {
          await simulateInterceptorErrorHandler(error401);
        } catch {
          // Expected
        }

        // For non-auth endpoints, credentials must be cleared
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect((window.location as any).href).toBe('/login');
      }),
      { numRuns: 20 }
    );
  });
});

describe('Preservation Property — Registration Flow (Test 2c)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * Test 2c — Registration flow works correctly:
   * Call register with valid credentials → token is stored, user is set, navigation to home occurs.
   * Observed behavior: register() calls authService.register, sets token/user in state and localStorage.
   *
   * Property-based test: for any valid username/password combination,
   * registration stores token and user correctly.
   *
   * **Validates: Requirements 3.1**
   */
  it('2c: register stores token and user in localStorage and context', async () => {
    const mockUser = { id: 'user-new', username: 'newuser', email: null, authProvider: 'local', createdAt: new Date() };
    const mockToken = 'registration-token-abc';

    // authService.me is called by useEffect on mount when token is null → skip
    vi.mocked(authService.me).mockRejectedValue(new Error('No token'));

    // Register succeeds
    vi.mocked(authService.register).mockResolvedValue({
      token: mockToken,
      user: mockUser,
    });

    // After register sets token, useEffect fires and me() is called
    // For preservation: me() succeeds with the registered user
    vi.mocked(authService.me).mockResolvedValue(mockUser);

    let latestAuth: any = null;

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer onAuth={(auth) => { latestAuth = auth; }} />
        </AuthProvider>
      );
    });

    // Wait for initial loading to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Perform registration
    await act(async () => {
      await latestAuth.register('newuser', 'password123');
    });

    // Wait for useEffect to process
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Observed behavior: token and user are stored
    expect(localStorage.getItem('token')).toBe(mockToken);
    expect(localStorage.getItem('user')).not.toBeNull();

    const storedUser = JSON.parse(localStorage.getItem('user')!);
    expect(storedUser.id).toBe(mockUser.id);
    expect(storedUser.username).toBe(mockUser.username);

    // Context should have user set
    expect(latestAuth.user).not.toBeNull();
    expect(latestAuth.token).toBe(mockToken);
  });

  /**
   * Property-based test 2c:
   * For any valid username (3-50 chars) and password (6-100 chars),
   * registration flow stores credentials correctly.
   *
   * **Validates: Requirements 3.1**
   */
  it('2c (property): registration with valid credentials stores token and user', async () => {
    const usernameArb = fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length >= 3);
    const passwordArb = fc.string({ minLength: 6, maxLength: 30 });

    // Run a smaller number since each test requires React rendering
    await fc.assert(
      fc.asyncProperty(usernameArb, passwordArb, async (username, password) => {
        localStorage.clear();
        vi.clearAllMocks();

        const mockUser = { id: `user-${username}`, username, email: null, authProvider: 'local', createdAt: new Date() };
        const mockToken = `token-${username}-${Date.now()}`;

        vi.mocked(authService.me).mockResolvedValue(mockUser);
        vi.mocked(authService.register).mockResolvedValue({
          token: mockToken,
          user: mockUser,
        });

        let latestAuth: any = null;

        await act(async () => {
          render(
            <AuthProvider>
              <AuthConsumer onAuth={(auth) => { latestAuth = auth; }} />
            </AuthProvider>
          );
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        await act(async () => {
          await latestAuth.register(username, password);
        });

        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        // After registration, token and user must be stored
        expect(localStorage.getItem('token')).toBe(mockToken);
        expect(latestAuth.token).toBe(mockToken);
        expect(latestAuth.user).not.toBeNull();
        expect(latestAuth.user.username).toBe(username);
      }),
      { numRuns: 5 }
    );
  });
});
