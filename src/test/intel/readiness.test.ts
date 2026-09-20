import { describe, expect, it } from 'vitest';
import type { WellnessEntry } from '@/api/types';
import {
  computeReadiness,
  computeReadinessData,
  computeStats,
  getReadinessExplanation,
  tsbToScore,
  zScoreToScore,
} from '@/lib/readiness';

describe('readiness domain logic', () => {
  describe('computeStats', () => {
    it('returns zeroes for empty input', () => {
      expect(computeStats([])).toEqual({ mean: 0, sd: 0 });
    });

    it('calculates mean and population standard deviation', () => {
      const { mean, sd } = computeStats([10, 20, 30]);
      expect(mean).toBe(20);
      expect(sd).toBeCloseTo(8.165, 2);
    });
  });

  describe('zScoreToScore', () => {
    it('returns 50 when sd is 0', () => {
      expect(zScoreToScore(10, 10, 0)).toBe(50);
    });

    it('scales higher values positively when invert is false', () => {
      // value = mean + 1*sd -> score = 50 + 25 = 75
      expect(zScoreToScore(60, 50, 10, false)).toBe(75);
    });

    it('scales lower values positively when invert is true', () => {
      // for RHR: 40 with mean 50, sd 10 -> z = -1 -> inverted z = +1 -> score 75
      expect(zScoreToScore(40, 50, 10, true)).toBe(75);
    });

    it('clamps to 0 and 100', () => {
      expect(zScoreToScore(100, 50, 10, false)).toBe(100);
      expect(zScoreToScore(0, 50, 10, false)).toBe(0);
    });
  });

  describe('tsbToScore', () => {
    it('clamps at <= -30 to 0 and >= 15 to 100', () => {
      expect(tsbToScore(-40)).toBe(0);
      expect(tsbToScore(20)).toBe(100);
    });

    it('maps 0 TSB correctly', () => {
      // (0 + 30) / 45 * 100 = 66.67
      expect(tsbToScore(0)).toBeCloseTo(66.67, 1);
    });
  });

  describe('computeReadiness', () => {
    const baseline = { mean: 50, sd: 10 };

    it('returns null when no metrics are provided', () => {
      expect(computeReadiness(null, { mean: 0, sd: 0 }, null, { mean: 0, sd: 0 }, null, null)).toBeNull();
    });

    it('weights metrics appropriately with sleep score', () => {
      const score = computeReadiness(
        50, // z=0 -> score 50 (weight 30)
        baseline,
        50, // z=0 -> score 50 (weight 20)
        baseline,
        80, // sleep score 80 (weight 25)
        0, // tsb score ~66.7 (weight 25)
      );
      expect(score).toBeGreaterThan(55);
      expect(score).toBeLessThan(70);
    });

    it('handles sleep duration in hours (<=12)', () => {
      const score = computeReadiness(
        null,
        { mean: 0, sd: 0 },
        null,
        { mean: 0, sd: 0 },
        8, // 8 hrs -> ((8-4)/5)*100 = 80
        null,
      );
      expect(score).toBe(80);
    });
  });

  describe('computeReadinessData', () => {
    it('returns null for empty entries', () => {
      expect(computeReadinessData([])).toBeNull();
    });

    it('extracts latest values, baseline, and sparklines', () => {
      const entries: WellnessEntry[] = Array.from({ length: 30 }, (_, i) => ({
        id: `2026-09-${(i + 1).toString().padStart(2, '0')}`,
        restingHR: 60,
        hrv: 40,
        sleepScore: 85,
        ctl: 50,
        atl: 40,
      }));

      const data = computeReadinessData(entries);
      expect(data).not.toBeNull();
      expect(data?.restingHR).toBe(60);
      expect(data?.hrv).toBe(40);
      expect(data?.sleep).toBe(85);
      expect(data?.sleepLabel).toBe('Sleep Score');
      expect(data?.tsb).toBe(10);
      expect(data?.isComputed).toBe(true);
      expect(data?.hrvSparkline.length).toBe(14);
    });

    it('prefers built-in readiness from wearable when present', () => {
      const entries: WellnessEntry[] = [
        {
          id: '2026-09-01',
          readiness: 92,
        },
      ];
      const data = computeReadinessData(entries);
      expect(data?.readiness).toBe(92);
      expect(data?.isComputed).toBe(false);
    });
  });

  describe('getReadinessExplanation', () => {
    it('returns valid definition and context for each metric key', () => {
      const metrics = ['hrv', 'rhr', 'sleep', 'tsb', 'readiness'] as const;
      for (const m of metrics) {
        const exp = getReadinessExplanation(m, 50, { mean: 50, sd: 10 });
        expect(exp.definition).toBeTruthy();
        expect(exp.context).toBeTruthy();
      }
    });
  });
});
