import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AgendaGate } from '@/components/agenda/AgendaGate';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

describe('AgendaGate', () => {
  it('shows children when Intervals is connected', async () => {
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <AgendaGate>
          <Text>Agenda content</Text>
        </AgendaGate>
      </TestAppProviders>,
    );
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
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <AgendaGate>
          <Text>Agenda content</Text>
        </AgendaGate>
      </TestAppProviders>,
    );
    expect(await screen.findByText('Intervals not connected')).toBeOnTheScreen();
    expect(screen.queryByText('Agenda content')).toBeNull();
  });

  it('shows error for malformed settings JSON instead of disconnected', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () => HttpResponse.json(null)),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <AgendaGate>
          <Text>Agenda content</Text>
        </AgendaGate>
      </TestAppProviders>,
    );
    expect(await screen.findByText('Couldn’t load settings')).toBeOnTheScreen();
    expect(screen.queryByText('Intervals not connected')).toBeNull();
  });

  it('shows error and recovers after Retry', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({ error: 'down' }, { status: 503 }),
      ),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <AgendaGate>
          <Text>Agenda content</Text>
        </AgendaGate>
      </TestAppProviders>,
    );
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

    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <AgendaGate>
          <Text>Agenda content</Text>
        </AgendaGate>
      </TestAppProviders>,
    );
    expect(screen.getByLabelText('Loading settings')).toBeOnTheScreen();

    release();
    await waitFor(() => {
      expect(screen.getByText('Agenda content')).toBeOnTheScreen();
    });
  });

  it('does not flash a previous identity’s settings after account switch', async () => {
    function SwitchableTree() {
      const [email, setEmail] = useState('a@example.com');
      const auth = useMemo(
        () => makeTestAuthValue(makeTestSession(email)),
        [email],
      );
      return (
        <>
          <Pressable
            accessibilityLabel="Switch account"
            onPress={() => setEmail('b@example.com')}
          >
            <Text>Switch</Text>
          </Pressable>
          <TestAppProviders auth={auth}>
            <AgendaGate>
              <Text>Agenda for {email}</Text>
            </AgendaGate>
          </TestAppProviders>
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
