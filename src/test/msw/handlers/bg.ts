import { http } from 'msw';
import { apiUrl, jsonOk } from '../helpers';

export const bgHandlers = [
  http.get(apiUrl('/api/bg'), () =>
    jsonOk({
      readings: [],
      current: {
        mmol: 6.2,
        ts: Date.now() - 2 * 60 * 1000,
        arrow: '→',
      },
      trend: { arrow: '→', slope: 0 },
    }),
  ),
];
