import { http, HttpResponse } from 'msw';
import { apiUrl, jsonOk } from '../helpers';

/** Happy-path mobile auth exchanges (Google + QA). */
export const authHandlers = [
  http.post(apiUrl('/api/auth/mobile'), async ({ request }) => {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken) {
      return new HttpResponse('Unauthorized', { status: 401 });
    }
    return jsonOk({
      token: 'mobile-jwt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'runner@example.com' },
    });
  }),
  http.post(apiUrl('/api/qa/mobile'), async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (!body.token) {
      return new HttpResponse('Unauthorized', { status: 401 });
    }
    return jsonOk({
      token: 'qa-mobile-jwt',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'qa@example.com' },
    });
  }),
];
