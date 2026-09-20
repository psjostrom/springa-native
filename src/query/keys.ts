export const queryKeys = {
  updateWorkout: (identity: string) => ['update-workout', identity] as const,
  createWorkout: (identity: string) => ['create-workout', identity] as const,
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
  wellness: (identity: string, days = 365) => ['wellness', identity, days] as const,
  paceCurves: (identity: string, timeWindow: string) =>
    ['pace-curves', identity, timeWindow] as const,
  paceSuggestion: (identity: string) => ['pace-suggestion', identity] as const,
  bgModel: (identity: string) => ['bg-model', identity] as const,
};
