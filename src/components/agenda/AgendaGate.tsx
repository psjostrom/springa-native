import type { ReactNode } from 'react';
import { StateView } from '@/components/ui';
import { useSettingsQuery } from '@/query/useSettingsQuery';

type AgendaGateProps = {
  children: ReactNode;
};

/**
 * Blocks Agenda only when settings prove Intervals is disconnected (or fail).
 * While settings are still loading, children render so calendar can fetch in parallel.
 */
export function AgendaGate({ children }: AgendaGateProps) {
  const { status, settings, error, reload } = useSettingsQuery();

  if (status === 'error') {
    return (
      <StateView
        state="error"
        title="Couldn’t load settings"
        message={error ?? 'Something went wrong.'}
        onRetry={reload}
        retryLabel="Retry"
        retryAccessibilityLabel="Retry loading settings"
      />
    );
  }

  if (status === 'ready' && !settings?.intervalsConnected) {
    return (
      <StateView
        state="unavailable"
        title="Intervals not connected"
        message="Connect Intervals.icu in Springa on the web, then retry here."
        onRetry={reload}
        retryLabel="Retry"
        retryAccessibilityLabel="Retry loading settings"
      />
    );
  }

  // idle (signed out), loading, or ready+connected → let Agenda mount
  return <>{children}</>;
}
