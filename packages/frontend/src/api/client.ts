import axios from 'axios';
import { getCachedResponse, setCachedResponse } from '../lib/idb';
import { queueMutation } from '../lib/offlineQueue';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request interceptor: attach auth token ---
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: cache GETs + handle offline ---
apiClient.interceptors.response.use(
  (response) => {
    // Cache successful GET responses in IndexedDB
    if (response.config.method === 'get' && response.config.url) {
      const cacheKey = buildCacheKey(response.config.url, response.config.baseURL);
      setCachedResponse(cacheKey, response.data).catch(() => {
        // IndexedDB write failed — non-critical, ignore
      });
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    // Handle 401 — redirect to login
    if (error.response?.status === 401) {
      const url = config?.url || '';
      const isAuthEndpoint =
        url.includes('/auth/me') ||
        url.includes('/auth/login') ||
        url.includes('/auth/register');

      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // If offline (network error, no response), handle gracefully
    if (!error.response && config) {
      const method = (config.method || 'get').toUpperCase();

      // For GET requests: serve from cache
      if (method === 'GET' && config.url) {
        const cacheKey = buildCacheKey(config.url, config.baseURL);
        const cached = await getCachedResponse(cacheKey).catch(() => undefined);
        if (cached) {
          // Return a synthetic response from cache
          return { data: cached.data, status: 200, config, cached: true };
        }
      }

      // For write operations: queue for later replay
      if ((method === 'POST' || method === 'PUT' || method === 'DELETE') && config.url) {
        const fullUrl = config.url.startsWith('/') ? config.url : `/${config.url}`;
        await queueMutation(method as 'POST' | 'PUT' | 'DELETE', fullUrl, config.data ? JSON.parse(config.data) : undefined);
        // Return a synthetic success so the UI doesn't break
        return { data: { data: null, queued: true }, status: 202, config, queued: true };
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Build a consistent cache key from the request URL.
 * Handles both relative and absolute URLs.
 */
function buildCacheKey(url: string, baseURL?: string): string {
  if (url.startsWith('http')) return url;
  const base = baseURL || '/api';
  return `${base}${url.startsWith('/') ? url : '/' + url}`;
}

export default apiClient;
