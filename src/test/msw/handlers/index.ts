import { authHandlers } from './auth';
import { settingsHandlers } from './settings';
import { calendarHandlers } from './calendar';
import { bgHandlers } from './bg';
import { plannedWorkoutHandlers } from './plannedWorkout';

export const handlers = [
  ...authHandlers,
  ...settingsHandlers,
  ...calendarHandlers,
  ...bgHandlers,
  ...plannedWorkoutHandlers,
];
