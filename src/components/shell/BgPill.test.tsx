import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@testing-library/react-native';
import { BgPill } from '@/components/shell/BgPill';
import { apiUrl } from '@/test/msw/helpers';
import { server } from '@/test/msw/server';
import {
  makeTestAuthValue,
  makeTestSession,
  TestAppProviders,
} from '@/test/TestAppProviders';

describe('BgPill', () => {
  it('hides when diabetesMode is off', async () => {
    server.use(
      http.get(apiUrl('/api/settings'), () =>
        HttpResponse.json({ intervalsConnected: true, diabetesMode: false }),
      ),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <BgPill />
      </TestAppProviders>,
    );
    await waitFor(() => {
      expect(screen.queryByLabelText(/Blood glucose/i)).toBeNull();
    });
  });

  it('shows current mmol when diabetesMode is on', async () => {
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <BgPill />
      </TestAppProviders>,
    );
    expect(await screen.findByLabelText(/Blood glucose 6\.2/)).toBeOnTheScreen();
    expect(screen.getByText(/6\.2/)).toBeOnTheScreen();
  });

  it('hides when current reading is missing', async () => {
    server.use(
      http.get(apiUrl('/api/bg'), () =>
        HttpResponse.json({ readings: [], current: null, trend: null }),
      ),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <BgPill />
      </TestAppProviders>,
    );
    await waitFor(() => {
      expect(screen.queryByLabelText(/Blood glucose/i)).toBeNull();
    });
  });

  it('hides when reading is stale', async () => {
    server.use(
      http.get(apiUrl('/api/bg'), () =>
        HttpResponse.json({
          readings: [],
          current: { mmol: 5.5, ts: Date.now() - 20 * 60 * 1000, arrow: '→' },
          trend: { arrow: '→' },
        }),
      ),
    );
    await render(
      <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
        <BgPill />
      </TestAppProviders>,
    );
    await waitFor(() => {
      expect(screen.queryByLabelText(/Blood glucose/i)).toBeNull();
    });
  });
});
