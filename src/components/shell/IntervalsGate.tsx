import type { ReactNode } from 'react';
import { StateView } from '@/components/ui';
import { useSettingsQuery } from '@/query/useSettingsQuery';

type IntervalsGateProps = {
  children: ReactNode;
};

/**
 * Blocks content when Intervals is disconnected or settings fail.
 * While settings are loading or idle, allows children to render.
 */
export function IntervalsGate({ children }: IntervalsGateProps) {
  const { status, settings, error, reload } = useSettingsQuery();

  if (status === 'error') {
    return (
      <StateView
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
        title="Intervals not connected"
        message="Connect Intervals.icu in Springa on the web, then retry here."
        onRetry={reload}
        retryLabel="Retry"
        retryAccessibilityLabel="Retry loading settings"
      />
    );
  }

  return <>{children}</>;
}
