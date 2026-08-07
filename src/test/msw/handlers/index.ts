import { authHandlers } from './auth';
import { settingsHandlers } from './settings';
import { calendarHandlers } from './calendar';
import { bgHandlers } from './bg';

export const handlers = [
  ...authHandlers,
  ...settingsHandlers,
  ...calendarHandlers,
  ...bgHandlers,
];
