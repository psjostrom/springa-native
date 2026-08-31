import { afterAll, afterEach, beforeAll } from 'vitest';
import { TEST_API_BASE } from './helpers';
import { server } from './server';

import { resetCalendarWarming } from '@/query/useCalendarEvents';

process.env.EXPO_PUBLIC_SPRINGA_API_URL ??= TEST_API_BASE;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  resetCalendarWarming();
});

afterAll(() => {
  server.close();
});
