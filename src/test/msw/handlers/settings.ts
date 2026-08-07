import { http } from 'msw';
import { apiUrl, jsonOk } from '../helpers';

/** Happy-path GET /api/settings — Intervals connected. */
export const settingsHandlers = [
  http.get(apiUrl('/api/settings'), () =>
    jsonOk({
      intervalsConnected: true,
      diabetesMode: true,
      displayName: 'Runner',
      email: 'runner@example.com',
    }),
  ),
];
