import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { beforeEach, describe, expect, it } from 'vitest';
import { QUERY_CACHE_KEY } from './persister';
import { useQueryHydration } from './QueryHydrationContext';
import { QueryProvider } from './QueryProvider';

function HydrationProbe() {
  const { isHydrated } = useQueryHydration();
  return <Text>{isHydrated ? 'Hydrated' : 'Not Hydrated'}</Text>;
}

function Probe() {
  const { isHydrated } = useQueryHydration();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['test-probe'],
    queryFn: () => 'fetched-value',
    enabled: false,
  });

  return (
    <>
      <Text>{isHydrated ? 'Hydrated' : 'Not Hydrated'}</Text>
      <Text>{client ? 'Client Ready' : 'No Client'}</Text>
      <Text>Cached: {query.data ?? 'empty'}</Text>
    </>
  );
}

describe('QueryProvider and QueryHydrationContext', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('provides default isHydrated false when used outside provider', async () => {
    await render(<HydrationProbe />);
    expect(screen.getByText('Not Hydrated')).toBeOnTheScreen();
  });

  it('mounts PersistQueryClientProvider and sets isHydrated to true upon hydration', async () => {
    await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );

    expect(screen.getByText('Client Ready')).toBeOnTheScreen();
    expect(await screen.findByText('Hydrated')).toBeOnTheScreen();
  });

  it('restores dehydrated query state from AsyncStorage during hydration', async () => {
    const dehydratedPayload = {
      timestamp: Date.now(),
      buster: '',
      clientState: {
        mutations: [],
        queries: [
          {
            queryKey: ['test-probe'],
            queryHash: '["test-probe"]',
            state: {
              data: 'persisted-value',
              dataUpdateCount: 1,
              dataUpdatedAt: Date.now(),
              error: null,
              errorUpdateCount: 0,
              errorUpdatedAt: 0,
              fetchFailureCount: 0,
              fetchFailureReason: null,
              fetchMeta: null,
              isInvalidated: false,
              status: 'success',
              fetchStatus: 'idle',
            },
          },
        ],
      },
    };

    await AsyncStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(dehydratedPayload));

    await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );

    expect(await screen.findByText('Hydrated')).toBeOnTheScreen();
    expect(screen.getByText('Cached: persisted-value')).toBeOnTheScreen();
  });
});
