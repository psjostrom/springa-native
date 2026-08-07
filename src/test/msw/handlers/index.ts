import { authHandlers } from './auth';
import { settingsHandlers } from './settings';

/** Composed default happy-path handlers for all domains. */
export const handlers = [...authHandlers, ...settingsHandlers];
