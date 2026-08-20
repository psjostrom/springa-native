import { authHandlers } from './auth';
import { settingsHandlers } from './settings';
import { calendarHandlers } from './calendar';
import { bgHandlers } from './bg';
import { plannedWorkoutHandlers } from './plannedWorkout';
import { completedWorkoutOverviewHandlers } from './completedWorkoutOverview';

export const handlers = [
  ...authHandlers,
  ...settingsHandlers,
  ...calendarHandlers,
  ...bgHandlers,
  ...plannedWorkoutHandlers,
  ...completedWorkoutOverviewHandlers,
];
