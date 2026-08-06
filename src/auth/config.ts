export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SPRINGA_API_URL;
  if (!url) throw new Error('EXPO_PUBLIC_SPRINGA_API_URL is not set');
  return url.replace(/\/$/, '');
}

export function getGoogleWebClientId(): string {
  const id = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!id) throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  return id;
}
