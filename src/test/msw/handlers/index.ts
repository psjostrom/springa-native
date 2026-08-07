import { settingsHandlers } from './settings';
import { calendarHandlers } from './calendar';
import { bgHandlers } from './bg';

export const handlers = [...settingsHandlers, ...calendarHandlers, ...bgHandlers];
