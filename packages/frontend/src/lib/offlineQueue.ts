/**
 * Offline mutation queue.
 * Enqueues write operations (POST/PUT/DELETE) when offline and replays them
 * sequentially when connectivity is restored.
 */

import {
  enqueueMutation,
  getAllQueuedMutations,
  removeMutation,
  type QueuedMutation,
} from './idb';
import apiClient from '../api/client';

let isSyncing = false;
let pendingCount = 0;

// Listeners for UI updates
type Listener = (count: number) => void;
const listeners = new Set<Listener>();

export function subscribeToPendingCount(fn: Listener): () => void {
  listeners.add(fn);
  fn(pendingCount);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(pendingCount));
}

/**
 * Queue a mutation for later replay.
 * Call this when the user is offline and attempts a write operation.
 */
export async function queueMutation(
  method: 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown
): Promise<void> {
  const mutation: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    method,
    url,
    data,
    timestamp: Date.now(),
  };
  await enqueueMutation(mutation);
  pendingCount++;
  notifyListeners();

  // Try to trigger background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    try {
      await (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('replay-mutations');
    } catch {
      // Background Sync not supported or permission denied — will sync on reconnect
    }
  }
}

/**
 * Replay all queued mutations sequentially.
 * Called when the browser comes back online.
 * Returns the number of successfully replayed mutations.
 */
export async function replayQueue(): Promise<number> {
  if (isSyncing) return 0;
  if (!navigator.onLine) return 0;

  isSyncing = true;
  let replayed = 0;

  try {
    const mutations = await getAllQueuedMutations();
    // Sort by timestamp to maintain order
    mutations.sort((a, b) => a.timestamp - b.timestamp);

    for (const mutation of mutations) {
      try {
        switch (mutation.method) {
          case 'POST':
            await apiClient.post(mutation.url, mutation.data);
            break;
          case 'PUT':
            await apiClient.put(mutation.url, mutation.data);
            break;
          case 'DELETE':
            await apiClient.delete(mutation.url);
            break;
        }
        await removeMutation(mutation.id);
        pendingCount = Math.max(0, pendingCount - 1);
        replayed++;
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        // If it's a client error (4xx), remove from queue — retrying won't help
        if (err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
          await removeMutation(mutation.id);
          pendingCount = Math.max(0, pendingCount - 1);
        } else {
          // Server error or network issue — stop replaying, try again later
          break;
        }
      }
    }
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return replayed;
}

/**
 * Initialize pending count from IndexedDB (call on app start).
 */
export async function initPendingCount(): Promise<void> {
  try {
    const mutations = await getAllQueuedMutations();
    pendingCount = mutations.length;
    notifyListeners();
  } catch {
    // IndexedDB might not be available
    pendingCount = 0;
  }
}

export function getPendingCount(): number {
  return pendingCount;
}
