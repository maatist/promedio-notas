/**
 * Bug Condition Exploration Tests — Login Race Condition
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * These tests encode the EXPECTED (correct) behavior for login.
 * On UNFIXED code, they MUST FAIL — failure confirms the bugs exist.
 *
 * Bug 1 — Login Race Condition:
 * - useEffect watching [token] fires /auth/me after login sets token
 * - If /auth/me fails, catch block clears token and user
 * - Axios 401 interceptor unconditionally clears credentials on 401
 *
 * DO NOT fix these tests or the code when they fail.
 */
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Import the mocked module
import { authService } from '../api/services';

// Helper component to access auth context
function AuthConsumer({ onAuth }: { onAuth: (auth: any) => void }) {
  const auth = useAuth();
  React.useEffect(() => {
    onAuth(auth);
  });
  return null;
}

describe('Bug Condition Exploration — Login Race Condition', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * Test 1a — Login useEffect race:
   * Mock authService.me() to reject after login() sets the token.
   * Assert that the token and user REMAIN set (NOT cleared).
   * On unfixed code, the useEffect catch block clears them, so test FAILS.
   *
   * **Validates: Requirements 1.1**
   */
  it('1a: login should keep token and user set even when /auth/me rejects', async () => {
    const mockUser = { id: 'user-1', username: 'testuser', email: null, authProvider: 'local', createdAt: new Date() };
    const mockToken = 'valid-jwt-token-123';

    // Login succeeds
    vi.mocked(authService.login).mockResolvedValue({
      token: mockToken,
      user: mockUser,
    });

    // /auth/me will reject (simulates Vercel cold start timeout)
    vi.mocked(authService.me).mockRejectedValue(new Error('Network timeout'));

    let latestAuth: any = null;

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer onAuth={(auth) => { latestAuth = auth; }} />
        </AuthProvider>
      );
    });

    // Perform login
    await act(async () => {
      await latestAuth.login('testuser', 'password123');
    });

    // Wait for useEffect to fire and process
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Expected behavior: token and user should remain set after login
    // even though /auth/me rejected
    expect(localStorage.getItem('token')).toBe(mockToken);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));

    // Auth state should still have the user and token
    expect(latestAuth.token).toBe(mockToken);
    expect(latestAuth.user).toEqual(mockUser);
  });

  /**
   * Test 1b — Interceptor 401 during auth:
   * Simulate a 401 response on /auth/me during login flow.
   * Assert localStorage is NOT cleared and no redirect to /login occurs.
   * On unfixed code, interceptor fires unconditionally, so test FAILS.
   *
   * **Validates: Requirements 1.2**
   */
  it('1b: 401 interceptor should NOT clear credentials during active login flow', async () => {
    // Import the real apiClient to test the ACTUAL interceptor logic
    const { default: apiClient } = await import('../api/client');

    // Set up initial state as if login just completed
    localStorage.setItem('token', 'fresh-login-token');
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', username: 'testuser' }));

    // Mock window.location.href
    const originalLocation = window.location;
    const mockLocation = { ...originalLocation, href: '/' };
    Object.defineProperty(window, 'location', {
      writable: true,
      value: mockLocation,
    });

    // Get the real interceptor's error handler from the apiClient
    // The response interceptor is the one that handles 401s
    const interceptors = (apiClient.interceptors.response as any).handlers;
    const errorHandler = interceptors[interceptors.length - 1].rejected;

    // Simulate the interceptor processing a 401 on an auth endpoint (/auth/me)
    const error401OnAuth = {
      response: { status: 401 },
      config: { url: '/auth/me' },
    };

    // Manually invoke the real error handler with a 401 on /auth/me
    try {
      await errorHandler(error401OnAuth);
    } catch {
      // Expected - interceptor rejects the error
    }

    // Expected behavior (after fix): credentials should NOT be cleared for auth endpoints
    // On unfixed code: interceptor unconditionally clears localStorage on 401
    expect(localStorage.getItem('token')).toBe('fresh-login-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 'user-1', username: 'testuser' }));
    expect(mockLocation.href).not.toBe('/login');

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: mockLocation,
    });
  });
});
