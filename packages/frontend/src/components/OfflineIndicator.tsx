import { WifiOff, CloudOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useI18n } from '../i18n';

/**
 * Floating indicator that appears when the user is offline
 * or has pending mutations queued for sync.
 */
export default function OfflineIndicator() {
  const { isOnline, pendingCount } = useOnlineStatus();
  const { t } = useI18n();

  // Don't show anything if online and no pending mutations
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-2 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300">
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>{t.offline.statusOffline}</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 flex-shrink-0" />
          <span>{t.offline.statusPending.replace('{count}', String(pendingCount))}</span>
        </>
      )}
      {!isOnline && pendingCount > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-bold">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
