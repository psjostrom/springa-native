export const queryKeys = {
  settings: (identity: string) => ['settings', identity] as const,
  calendar: (identity: string) => ['calendar', identity] as const,
  bg: (identity: string) => ['bg', identity] as const,
  plannedWorkout: (identity: string, eventId: string) =>
    ['planned-workout', identity, eventId] as const,
  completedWorkoutOverview: (identity: string, activityId: string) =>
    ['completed-overview', identity, activityId] as const,
};
