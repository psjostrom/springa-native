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
  load?: number;
  intensity?: number;
  pace?: number;
  calories?: number;
  cadence?: number;
  zoneTimes?: HeartRateZoneTimes;
  fuelRate?: number | null;
  prescribedCarbsG?: number | null;
  carbsIngested?: number | null;
  preRunCarbsG?: number | null;
  rating?: string | null;
  feedbackComment?: string | null;
  activityId?: string;
  pairedEventId?: number;
};

export type HeartRateZoneTimes = {
  z1: number;
  z2: number;
  z3: number;
  z4: number;
  z5: number;
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
  replacementCategory: PlannedWorkoutReplacementCategory | null;
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

/** Completed workout overview from Springa GET /api/intervals/activity/[id]/overview. */
export type CompletedWorkoutOverview = {
  activityId: string;
  reportCard: {
    bg: CompletedBgScore | null;
    hrZone: CompletedHrZoneScore | null;
    entryTrend: CompletedEntryTrendScore | null;
    recovery: CompletedRecoveryScore | null;
  };
  splits: CompletedSplit[] | null;
  preRunCarbs: {
    grams: number | null;
    source: 'activity' | 'paired-event' | 'none';
    fallbackEventId: number | null;
  };
};

export type CompletedBgScore = {
  rating: 'good' | 'ok' | 'bad';
  startBG: number;
  minBG: number;
  hypo: boolean;
  worstRate: number;
  lbgi: number;
};

export type CompletedHrZoneScore = {
  rating: 'good' | 'ok' | 'bad';
  targetZone: string;
  pctInTarget: number;
  expectedRepSec?: number;
};

export type CompletedEntryTrendScore = {
  rating: 'good' | 'ok' | 'bad';
  slope30m: number;
  stability: number;
  label: string;
};

export type CompletedRecoveryScore = {
  rating: 'good' | 'ok' | 'bad';
  drop30m: number;
  nadir: number;
  postHypo: boolean;
  label: string;
};

export type CompletedSplit = {
  km: number;
  paceMinPerKm: number;
  avgHr: number | null;
  elevationChangeM: number | null;
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
