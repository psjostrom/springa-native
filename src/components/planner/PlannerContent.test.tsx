import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PlannerContent } from './PlannerContent';
import { apiUrl } from '@/test/msw/helpers';
import { makeTestAuthValue, makeTestSession, TestAppProviders } from '@/test/TestAppProviders';
import { activePlannerState, replacePlanPreview } from '@/test/msw/handlers/planner';
import { server } from '@/test/msw/server';

function renderPlanner() {
  return render(
    <TestAppProviders auth={makeTestAuthValue(makeTestSession())}>
      <PlannerContent />
    </TestAppProviders>,
  );
}

describe('Planner content', () => {
  it('renders active summary and learned/default fuel rates', async () => {
    await renderPlanner();

    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
    expect(screen.getByText('Long: Sun')).toBeOnTheScreen();
    expect(screen.getByText('Stockholm Half 21.1km')).toBeOnTheScreen();
    expect(screen.getByText('13 wks to go')).toBeOnTheScreen();
    expect(screen.getByText('55 g/h')).toBeOnTheScreen();
    expect(screen.getByText('60 g/h (default)')).toBeOnTheScreen();
    expect(screen.queryByText(/Adapt Upcoming/i)).toBeNull();
  });

  it('keeps schedule edits local until Done, then saves complete config', async () => {
    let settingsWrites = 0;
    let settingsBody: unknown;
    server.use(http.put(apiUrl('/api/settings'), async ({ request }) => {
      settingsWrites += 1;
      settingsBody = await request.json();
      return HttpResponse.json({ ok: true });
    }));
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    await user.press(screen.getByRole('button', { name: 'Monday run day' }));
    expect(settingsWrites).toBe(0);
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await waitFor(() => expect(settingsWrites).toBe(1));
    expect(settingsBody).toMatchObject({ runDays: [1, 2, 4, 0] });
    expect(await screen.findByText('Update future workouts to match your new settings?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Keep workouts' }));
    await user.press(screen.getByLabelText('Complete bottom sheet dismissal'));
    await waitFor(() => expect(screen.queryByText('Update future workouts to match your new settings?')).toBeNull());
  });

  it('does not ask to update workouts for race-name-only edits', async () => {
    let settingsWrites = 0;
    server.use(http.put(apiUrl('/api/settings'), () => {
      settingsWrites += 1;
      return HttpResponse.json({ ok: true });
    }));
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Edit planner settings' }));
    const raceName = screen.getByLabelText('Race name');
    await user.clear(raceName);
    await user.type(raceName, 'New race name');
    await user.press(screen.getByRole('button', { name: 'Done editing planner' }));
    await waitFor(() => expect(settingsWrites).toBe(1));
    expect(screen.queryByText('Update future workouts to match your new settings?')).toBeNull();
  });

  it('previews a new program without saving settings and renders read-only rows', async () => {
    let settingsWrites = 0;
    let previewBody: unknown;
    server.use(
      http.put(apiUrl('/api/settings'), () => {
        settingsWrites += 1;
        return HttpResponse.json({ ok: true });
      }),
      http.post(apiUrl('/api/planner/preview'), async ({ request }) => {
        previewBody = await request.json();
        return HttpResponse.json(replacePlanPreview());
      }),
    );
    await renderPlanner();
    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Start New Program' }));
    expect(screen.getByText('Start new program')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Preview plan' }));
    expect(await screen.findByText('Reviewing new program preview')).toBeOnTheScreen();
    // LegendList may not mount virtualized rows under Vitest; header is the gate.
    expect(screen.getByText('Week 1')).toBeOnTheScreen();
    expect(settingsWrites).toBe(0);
    expect(previewBody).toMatchObject({ intent: 'start', config: expect.any(Object) });
  });

  it('shows loading and retryable errors', async () => {
    let available = false;
    server.use(http.get(apiUrl('/api/planner'), () => available
      ? HttpResponse.json(activePlannerState())
      : HttpResponse.json({ error: 'planner unavailable' }, { status: 502 })));
    await renderPlanner();
    expect(await screen.findByText('Couldn’t load planner')).toBeOnTheScreen();
    available = true;
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry loading planner' }));
    expect(await screen.findByText('3 days/wk')).toBeOnTheScreen();
  });
});
