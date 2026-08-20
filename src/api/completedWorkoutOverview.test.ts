import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { parseCompletedWorkoutOverview } from './completedWorkoutOverview';

const richOverview = {
  activityId: 'activity-123',
  reportCard: {
    bg: {
      rating: 'good',
      startBG: 6.8,
      minBG: 4.9,
      hypo: false,
      worstRate: -0.6,
      lbgi: 1.2,
    },
    hrZone: {
      rating: 'good',
      targetZone: 'z3',
      pctInTarget: 72,
      expectedRepSec: 185,
    },
    entryTrend: {
      rating: 'ok',
      slope30m: 0.9,
      stability: 4.1,
      label: 'Stable',
    },
    recovery: {
      rating: 'bad',
      drop30m: -2.4,
      nadir: 4.2,
      postHypo: true,
      label: 'Deep drop',
    },
  },
  splits: [
    { km: 1, paceMinPerKm: 5.42, avgHr: 142, elevationChangeM: 3.5 },
    { km: 2, paceMinPerKm: 5.38, avgHr: null, elevationChangeM: null },
  ],
  preRunCarbs: { grams: 45, source: 'activity', fallbackEventId: null },
};

describe('parseCompletedWorkoutOverview', () => {
  it('parses a complete DTO with every score, split, and source field', () => {
    expect(parseCompletedWorkoutOverview(richOverview)).toEqual({
      activityId: 'activity-123',
      reportCard: {
        bg: {
          rating: 'good',
          startBG: 6.8,
          minBG: 4.9,
          hypo: false,
          worstRate: -0.6,
          lbgi: 1.2,
        },
        hrZone: {
          rating: 'good',
          targetZone: 'z3',
          pctInTarget: 72,
          expectedRepSec: 185,
        },
        entryTrend: { rating: 'ok', slope30m: 0.9, stability: 4.1, label: 'Stable' },
        recovery: {
          rating: 'bad',
          drop30m: -2.4,
          nadir: 4.2,
          postHypo: true,
          label: 'Deep drop',
        },
      },
      splits: [
        { km: 1, paceMinPerKm: 5.42, avgHr: 142, elevationChangeM: 3.5 },
        { km: 2, paceMinPerKm: 5.38, avgHr: null, elevationChangeM: null },
      ],
      preRunCarbs: { grams: 45, source: 'activity', fallbackEventId: null },
    });
  });

  it('preserves all-null report-card fields and a null splits field', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      reportCard: { bg: null, hrZone: null, entryTrend: null, recovery: null },
      splits: null,
    });

    expect(parsed.reportCard).toEqual({
      bg: null,
      hrZone: null,
      entryTrend: null,
      recovery: null,
    });
    expect(parsed.splits).toBeNull();
  });

  it('preserves every explicit pre-run source value', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      preRunCarbs: { grams: 30, source: 'paired-event', fallbackEventId: 202 },
    });
    expect(parsed.preRunCarbs).toEqual({
      grams: 30,
      source: 'paired-event',
      fallbackEventId: 202,
    });

    const none = parseCompletedWorkoutOverview({
      ...richOverview,
      preRunCarbs: { grams: null, source: 'none', fallbackEventId: 202 },
    });
    expect(none.preRunCarbs).toEqual({
      grams: null,
      source: 'none',
      fallbackEventId: 202,
    });

    const fullyDegraded = parseCompletedWorkoutOverview({
      ...richOverview,
      preRunCarbs: { grams: null, source: 'none', fallbackEventId: null },
    });
    expect(fullyDegraded.preRunCarbs).toEqual({
      grams: null,
      source: 'none',
      fallbackEventId: null,
    });
  });

  it('rejects malformed required response shapes with ApiError', () => {
    const badTopLevel = [null, [richOverview], 'nope', 42];
    for (const data of badTopLevel) {
      expect(() => parseCompletedWorkoutOverview(data)).toThrow(ApiError);
    }

    const { activityId: _activityId, ...missingActivityId } = richOverview;
    expect(() => parseCompletedWorkoutOverview(missingActivityId)).toThrow(ApiError);

    const badActivityId = [
      { ...richOverview, activityId: '' },
      { ...richOverview, activityId: 123 },
    ];
    for (const data of badActivityId) {
      expect(() => parseCompletedWorkoutOverview(data)).toThrow(ApiError);
    }

    const badReportCard = [null, 'card', []];
    for (const reportCard of badReportCard) {
      expect(() =>
        parseCompletedWorkoutOverview({ ...richOverview, reportCard }),
      ).toThrow(ApiError);
    }

    const badSplits = ['rows', {}, 42];
    for (const splits of badSplits) {
      expect(() =>
        parseCompletedWorkoutOverview({ ...richOverview, splits }),
      ).toThrow(ApiError);
    }

    expect(() =>
      parseCompletedWorkoutOverview({ ...richOverview, preRunCarbs: null }),
    ).toThrow(ApiError);
  });

  it('degrades scores with invalid rating values to null', () => {
    const badRating: unknown = 'great';
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      reportCard: {
        bg: { ...richOverview.reportCard.bg, rating: badRating },
        hrZone: { ...richOverview.reportCard.hrZone, rating: 'top' },
        entryTrend: { ...richOverview.reportCard.entryTrend, rating: null },
        recovery: { ...richOverview.reportCard.recovery, rating: 5 },
      },
    });

    expect(parsed.reportCard).toEqual({
      bg: null,
      hrZone: null,
      entryTrend: null,
      recovery: null,
    });
  });

  it('degrades scores with wrong numeric or boolean types to null', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      reportCard: {
        bg: { ...richOverview.reportCard.bg, startBG: '6.8', lbgi: NaN },
        hrZone: { ...richOverview.reportCard.hrZone, pctInTarget: '72' },
        entryTrend: { ...richOverview.reportCard.entryTrend, stability: {} },
        recovery: { ...richOverview.reportCard.recovery, postHypo: 'yes' },
      },
    });

    expect(parsed.reportCard).toEqual({
      bg: null,
      hrZone: null,
      entryTrend: null,
      recovery: null,
    });
  });

  it('drops a malformed expectedRepSec while keeping a valid hrZone score', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      reportCard: {
        bg: null,
        hrZone: { ...richOverview.reportCard.hrZone, expectedRepSec: '185' },
        entryTrend: null,
        recovery: null,
      },
    });

    expect(parsed.reportCard.hrZone).toEqual({
      rating: 'good',
      targetZone: 'z3',
      pctInTarget: 72,
    });
  });

  it('degrades a split row with wrong numeric types to a null splits field', () => {
    const badRows = [
      { ...richOverview.splits[0], km: '1' },
      { ...richOverview.splits[0], paceMinPerKm: null },
      { ...richOverview.splits[0], paceMinPerKm: NaN },
      null,
      'row',
    ];

    for (const badRow of badRows) {
      const parsed = parseCompletedWorkoutOverview({
        ...richOverview,
        splits: [richOverview.splits[0], badRow],
      });
      expect(parsed.splits).toBeNull();
    }
  });

  it('keeps nullable split fields null without inventing values', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      splits: [
        {
          km: 3,
          paceMinPerKm: 5.5,
          avgHr: '145',
          elevationChangeM: '2.0',
        },
      ],
    });

    expect(parsed.splits).toEqual([
      { km: 3, paceMinPerKm: 5.5, avgHr: null, elevationChangeM: null },
    ]);
    expect(parsed.splits?.[0]?.avgHr).not.toBe(0);
    expect(parsed.splits?.[0]?.elevationChangeM).not.toBe(0);
  });

  it('degrades malformed preRunCarbs grams and fallbackEventId to null', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      preRunCarbs: { grams: '45', source: 'paired-event', fallbackEventId: '202' },
    });

    expect(parsed.preRunCarbs).toEqual({
      grams: null,
      source: 'paired-event',
      fallbackEventId: null,
    });
  });

  it('rejects a fractional fallbackEventId', () => {
    const parsed = parseCompletedWorkoutOverview({
      ...richOverview,
      preRunCarbs: { grams: 30, source: 'paired-event', fallbackEventId: 1.5 },
    });

    expect(parsed.preRunCarbs.fallbackEventId).toBeNull();
  });

  it('rejects an invalid preRunCarbs source', () => {
    expect(() =>
      parseCompletedWorkoutOverview({
        ...richOverview,
        preRunCarbs: { grams: 45, source: 'activity', fallbackEventId: null },
        activityId: 'x',
      }),
    ).not.toThrow();

    for (const source of ['guess', 42, null, undefined]) {
      expect(() =>
        parseCompletedWorkoutOverview({
          ...richOverview,
          preRunCarbs: { grams: 45, source, fallbackEventId: null },
        }),
      ).toThrow(ApiError);
    }
  });
});
