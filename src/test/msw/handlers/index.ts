import { authHandlers } from './auth';
import { settingsHandlers } from './settings';
import { calendarHandlers } from './calendar';
import { bgHandlers } from './bg';
import { plannedWorkoutHandlers } from './plannedWorkout';
import { completedWorkoutOverviewHandlers } from './completedWorkoutOverview';
import { plannerHandlers } from './planner';

export const handlers = [
  ...authHandlers,
  ...settingsHandlers,
  ...calendarHandlers,
  ...bgHandlers,
  ...plannedWorkoutHandlers,
  ...completedWorkoutOverviewHandlers,
  ...plannerHandlers,
];
