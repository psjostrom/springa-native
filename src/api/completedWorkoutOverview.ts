import { ApiError } from './errors';
import type {
  CompletedBgScore,
  CompletedEntryTrendScore,
  CompletedHrZoneScore,
  CompletedRecoveryScore,
  CompletedSplit,
  CompletedWorkoutOverview,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalid(): never {
  throw new ApiError(200, 'Completed workout overview response had unexpected shape');
}

/** Finite number, or null when missing/malformed — score fields degrade, never fabricate. */
function scoreNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function scoreString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseRating(value: unknown): 'good' | 'ok' | 'bad' | null {
  return value === 'good' || value === 'ok' || value === 'bad' ? value : null;
}

function parseBgScore(value: unknown): CompletedBgScore | null {
  if (!isRecord(value)) return null;
  const rating = parseRating(value.rating);
  const startBG = scoreNumber(value.startBG);
  const minBG = scoreNumber(value.minBG);
  const hypo = value.hypo;
  const worstRate = scoreNumber(value.worstRate);
  const lbgi = scoreNumber(value.lbgi);
  if (
    rating === null ||
    startBG === null ||
    minBG === null ||
    typeof hypo !== 'boolean' ||
    worstRate === null ||
    lbgi === null
  ) {
    return null;
  }
  return { rating, startBG, minBG, hypo, worstRate, lbgi };
}

function parseHrZoneScore(value: unknown): CompletedHrZoneScore | null {
  if (!isRecord(value)) return null;
  const rating = parseRating(value.rating);
  const targetZone = scoreString(value.targetZone);
  const pctInTarget = scoreNumber(value.pctInTarget);
  if (rating === null || targetZone === null || pctInTarget === null) return null;
  const expectedRepSec = scoreNumber(value.expectedRepSec);
  return expectedRepSec === null
    ? { rating, targetZone, pctInTarget }
    : { rating, targetZone, pctInTarget, expectedRepSec };
}

function parseEntryTrendScore(value: unknown): CompletedEntryTrendScore | null {
  if (!isRecord(value)) return null;
  const rating = parseRating(value.rating);
  const slope30m = scoreNumber(value.slope30m);
  const stability = scoreNumber(value.stability);
  const label = scoreString(value.label);
  if (rating === null || slope30m === null || stability === null || label === null) {
    return null;
  }
  return { rating, slope30m, stability, label };
}

function parseRecoveryScore(value: unknown): CompletedRecoveryScore | null {
  if (!isRecord(value)) return null;
  const rating = parseRating(value.rating);
  const drop30m = scoreNumber(value.drop30m);
  const nadir = scoreNumber(value.nadir);
  const postHypo = value.postHypo;
  const label = scoreString(value.label);
  if (
    rating === null ||
    drop30m === null ||
    nadir === null ||
    typeof postHypo !== 'boolean' ||
    label === null
  ) {
    return null;
  }
  return { rating, drop30m, nadir, postHypo, label };
}

function parseSplit(value: unknown): CompletedSplit | null {
  if (!isRecord(value)) return null;
  const km = scoreNumber(value.km);
  const paceMinPerKm = scoreNumber(value.paceMinPerKm);
  if (km === null || paceMinPerKm === null) return null;
  return {
    km,
    paceMinPerKm,
    avgHr: scoreNumber(value.avgHr),
    elevationChangeM: scoreNumber(value.elevationChangeM),
  };
}

/** Degrades to null as a whole on any malformed row — no partial or guessed splits. */
function parseSplits(value: unknown): CompletedSplit[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) return invalid();
  const splits = value.map(parseSplit);
  if (splits.some((split) => split === null)) return null;
  return splits as CompletedSplit[];
}

function parsePreRunCarbs(value: unknown): CompletedWorkoutOverview['preRunCarbs'] {
  if (!isRecord(value)) return invalid();
  const source = value.source;
  if (source !== 'activity' && source !== 'paired-event' && source !== 'none') {
    return invalid();
  }
  return {
    grams: scoreNumber(value.grams),
    source,
    fallbackEventId: scoreNumber(value.fallbackEventId),
  };
}

export function parseCompletedWorkoutOverview(data: unknown): CompletedWorkoutOverview {
  if (!isRecord(data)) return invalid();
  const activityId = data.activityId;
  if (typeof activityId !== 'string' || activityId.length === 0) return invalid();
  const reportCard = data.reportCard;
  if (!isRecord(reportCard)) return invalid();
  return {
    activityId,
    reportCard: {
      bg: parseBgScore(reportCard.bg),
      hrZone: parseHrZoneScore(reportCard.hrZone),
      entryTrend: parseEntryTrendScore(reportCard.entryTrend),
      recovery: parseRecoveryScore(reportCard.recovery),
    },
    splits: parseSplits(data.splits),
    preRunCarbs: parsePreRunCarbs(data.preRunCarbs),
  };
}