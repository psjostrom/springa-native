import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { createApiClient } from '@/api/client';
import { SettingsLoader } from '@/api/SettingsContext';
import { AgendaGate } from '@/components/agenda/AgendaGate';
import { TEST_API_BASE, apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';

const baseUrl = process.env.EXPO_PUBLIC_SPRINGA_API_URL ?? TEST_API_BASE;

function GateTree({
  children = <Text>Agenda content</Text>,
  identity = 'runner@example.com',
  enabled = true,
}: {
  children?: ReactNode;
  identity?: string;
  enabled?: boolean;
}) {
  const client = useMemo(
    () =>
      createApiClient({
        getToken: () => 'test-token',
        onUnauthorized: () => {},
        baseUrl,
      }),
    [],
  );
  return (
    <SettingsLoader client={client} enabled={enabled} identity={identity}>
      <AgendaGate>{children}</AgendaGate>
    </SettingsLoader>
  );
}

describe('AgendaGate', () => {
  it('shows fixture agenda when Intervals is connected', async () => {
    await render(<GateTree />);
    expect(await screen.findByText('Agenda content')).toBeOnTheScreen();
  });

  it('shows empty state when Intervals is not connected', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({
          intervalsConnected: false,
          diabetesMode: false,
        }),
      ),
    );
    await render(<GateTree />);
    expect(await screen.findByText('Intervals not connected')).toBeOnTheScreen();
    expect(screen.queryByText('Agenda content')).toBeNull();
  });

  it('shows error for malformed settings JSON instead of disconnected', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () => HttpResponse.json(null)),
    );
    await render(<GateTree />);
    expect(await screen.findByText('Couldn’t load settings')).toBeOnTheScreen();
    expect(screen.queryByText('Intervals not connected')).toBeNull();
  });

  it('shows error and recovers after Retry', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({ error: 'down' }, { status: 503 }),
      ),
    );
    await render(<GateTree />);
    expect(await screen.findByText('Couldn’t load settings')).toBeOnTheScreen();

    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({ intervalsConnected: true }),
      ),
    );

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Retry loading settings'));
    expect(await screen.findByText('Agenda content')).toBeOnTheScreen();
  });

  it('shows loading while settings request is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(apiUrl('/api/settings'), async () => {
        await gate;
        return HttpResponse.json({ intervalsConnected: true });
      }),
    );

    await render(<GateTree />);
    expect(screen.getByLabelText('Loading settings')).toBeOnTheScreen();

    release();
    await waitFor(() => {
      expect(screen.getByText('Agenda content')).toBeOnTheScreen();
    });
  });

  it('does not flash a previous identity’s settings after re-enable', async () => {
    function SwitchableTree() {
      const [enabled, setEnabled] = useState(true);
      const [identity, setIdentity] = useState('a@example.com');
      const client = useMemo(
        () =>
          createApiClient({
            getToken: () => 'test-token',
            onUnauthorized: () => {},
            baseUrl,
          }),
        [],
      );
      return (
        <>
          <Pressable
            accessibilityLabel="Switch account"
            onPress={() => {
              setEnabled(false);
              setIdentity('b@example.com');
              queueMicrotask(() => setEnabled(true));
            }}
          >
            <Text>Switch</Text>
          </Pressable>
          <SettingsLoader client={client} enabled={enabled} identity={identity}>
            <AgendaGate>
              <Text>Agenda for {identity}</Text>
            </AgendaGate>
          </SettingsLoader>
        </>
      );
    }

    await render(<SwitchableTree />);
    expect(await screen.findByText('Agenda for a@example.com')).toBeOnTheScreen();

    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(apiUrl('/api/settings'), async () => {
        await held;
        return HttpResponse.json({ intervalsConnected: false });
      }),
    );

    const user = userEvent.setup();
    await user.press(screen.getByLabelText('Switch account'));

    await waitFor(() => {
      expect(screen.getByLabelText('Loading settings')).toBeOnTheScreen();
    });
    expect(screen.queryByText('Agenda for a@example.com')).toBeNull();

    release();
    expect(await screen.findByText('Intervals not connected')).toBeOnTheScreen();
  });
});
