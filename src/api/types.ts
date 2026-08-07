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
