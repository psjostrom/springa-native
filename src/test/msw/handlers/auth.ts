import { http } from 'msw';
import { apiUrl, jsonOk } from '../helpers';

/** Happy-path mobile auth exchanges (Google + QA). Negative cases use server.use. */
export const authHandlers = [
  http.post(apiUrl('/api/auth/mobile'), async () =>
    jsonOk({
      token: 'mobile-jwt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'runner@example.com' },
    }),
  ),
  http.post(apiUrl('/api/qa/mobile'), async () =>
    jsonOk({
      token: 'qa-mobile-jwt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'qa@example.com' },
    }),
  ),
];
