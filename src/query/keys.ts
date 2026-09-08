export const queryKeys = {
  singleWorkoutPreview: (identity: string, date: string, category?: string) =>
    ['single-workout-preview', identity, date, category ?? 'suggested'] as const,
  settings: (identity: string) => ['settings', identity] as const,
  planner: (identity: string) => ['planner', identity] as const,
  calendar: (identity: string) => ['calendar', identity] as const,
  bg: (identity: string) => ['bg', identity] as const,
  plannedWorkout: (identity: string, eventId: string) =>
    ['planned-workout', identity, eventId] as const,
  completedWorkoutOverview: (identity: string, activityId: string) =>
    ['completed-overview', identity, activityId] as const,
};
