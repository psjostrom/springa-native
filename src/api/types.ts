/**
 * Public settings JSON from Springa GET /api/settings.
 * Secrets (Intervals key, Nightscout secret) are never returned.
 */
export type UserSettings = {
  raceDate?: string;
  raceName?: string;
  raceDist?: number;
  currentAbilitySecs?: number;
  currentAbilityDist?: number;
  totalWeeks?: number;
  startKm?: number;
  widgetOrder?: string[];
  hiddenWidgets?: string[];
  bgChartWindow?: number;
  includeBasePhase?: boolean;
  warmthPreference?: number;
  effortMetric?: 'pace' | 'hr' | 'feel';
  diabetesMode?: boolean;
  displayName?: string;
  timezone?: string;
  runDays?: number[];
  longRunDay?: number;
  clubDay?: number;
  clubType?: string;
  onboardingComplete?: boolean;
  insulinType?: string;
  paceSuggestionDismissedAt?: number;
  intervalsConnected?: boolean;
  nightscoutUrl?: string;
  nightscoutConnected?: boolean;
  lthr?: number;
  maxHr?: number;
  hrZones?: number[];
  restingHr?: number;
  sportSettingsId?: number;
  email?: string;
  demo?: boolean;
};

/** Calendar event from Springa GET /api/intervals/calendar (JSON dates coerced to Date). */
export type CalendarEvent = {
  id: string;
  date: Date;
  name: string;
  description: string;
  type: 'completed' | 'planned' | 'race';
  category: 'long' | 'interval' | 'easy' | 'race' | 'other';
  distance?: number;
  duration?: number;
  avgHr?: number;
  maxHr?: number;
  pace?: number;
  fuelRate?: number | null;
  prescribedCarbsG?: number | null;
  activityId?: string;
};

export type WorkoutZone = 'z1' | 'z2' | 'z3' | 'z4' | 'z5';

export type PlannedWorkoutCategory =
  | 'easy'
  | 'long'
  | 'interval'
  | 'race'
  | 'other';

export type PlannedWorkoutReplacementCategory = 'easy' | 'quality' | 'long' | 'club';

export type ClothingRecommendation = {
  upper: string[];
  lower: string[];
  accessories: string[];
  weather: {
    temp: number;
    feelsLike: number;
    windSpeed: number;
    precipitation: number;
    isRain: boolean;
    isSnow: boolean;
  };
};

export type PlannedWorkoutClothing =
  | { status: 'available'; recommendation: ClothingRecommendation }
  | {
      status: 'unavailable';
      reason: 'outside-window' | 'forecast-unavailable';
    };

export type PlannedWorkoutDetail = {
  event: {
    id: string;
    intervalsEventId: number;
    startDateLocal: string;
    name: string;
    category: PlannedWorkoutCategory;
    description: string;
  };
  structure: {
    sections: {
      name: string;
      repeats: number | null;
      steps: {
        label: string | null;
        duration: string;
        zone: WorkoutZone;
        detail: string;
      }[];
    }[];
    timeline: {
      durationMinutes: number;
      intensityPercent: number;
      zone: WorkoutZone;
      estimated: boolean;
    }[];
  };
  metrics: {
    duration: { minutes: number; estimated: boolean } | null;
    distance: { km: number; estimated: boolean } | null;
    fuelRateGPerHour: number | null;
    prescribedCarbsG: number | null;
  };
  preRunCarbsG: number | null;
  clothing: PlannedWorkoutClothing;
};

export type BgPayload = {
  readings?: unknown[];
  current?: {
    mmol: number;
    ts: number;
    arrow?: string;
    direction?: string;
  } | null;
  trend?: {
    slope?: number;
    arrow?: string;
    direction?: string;
  } | null;
};
