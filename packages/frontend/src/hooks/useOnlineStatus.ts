import { useState, useEffect, useCallback } from 'react';
import { replayQueue, initPendingCount, subscribeToPendingCount } from '../lib/offlineQueue';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';

/**
 * Hook that tracks online/offline status and pending mutation count.
 * Automatically replays queued mutations when connectivity is restored.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const { t } = useI18n();

  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    const replayed = await replayQueue();
    if (replayed > 0) {
      toast.success(t.offline.synced.replace('{count}', String(replayed)));
      // Dispatch event so data hooks can refetch
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
    }
  }, [t]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    // Initialize pending count from IndexedDB
    initPendingCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to pending count changes
    const unsubscribe = subscribeToPendingCount(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, pendingCount };
}
