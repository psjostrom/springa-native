import { HttpResponse, type HttpResponseInit, type JsonBodyType } from 'msw';

/** Default API origin for MSW matchers until env-driven base is wired in tests. */
export const TEST_API_BASE = 'https://www.springa.run';

/**
 * Build an absolute API URL for MSW handlers.
 * @see https://mswjs.io/docs/recipes/using-base-url
 */
export function apiUrl(path: string): string {
  const base =
    process.env.EXPO_PUBLIC_SPRINGA_API_URL?.replace(/\/$/, '') ?? TEST_API_BASE;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, `${base}/`).href;
}

export function jsonOk<T extends JsonBodyType>(
  body: T,
  init?: HttpResponseInit,
): HttpResponse<T> {
  return HttpResponse.json(body, { status: 200, ...init });
}
