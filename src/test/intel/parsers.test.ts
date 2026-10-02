import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/errors';
import { parseBgCacheResponse } from '@/api/bgCache';
import { parsePaceCurveData } from '@/api/paceCurves';
import { parsePaceSuggestionResponse } from '@/api/paceSuggestion';
import { parseWellnessEntries } from '@/api/wellness';

describe('intel API parsers', () => {
  describe('parseWellnessEntries', () => {
    it('parses valid wellness entries', () => {
      const input = [
        {
          id: '2026-09-01',
          restingHR: 55,
          hrv: 42,
          sleepSecs: 28800,
          sleepScore: 82,
          readiness: 78,
          atl: 35,
          ctl: 45,
        },
      ];
      const result = parseWellnessEntries(input);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2026-09-01');
      expect(result[0].restingHR).toBe(55);
      expect(result[0].hrv).toBe(42);
    });

    it('throws ApiError when input is not an array', () => {
      expect(() => parseWellnessEntries(null)).toThrow(ApiError);
      expect(() => parseWellnessEntries({})).toThrow(ApiError);
    });

    it('throws ApiError when item is missing id or not an object', () => {
      expect(() => parseWellnessEntries(['invalid'])).toThrow(ApiError);
      expect(() => parseWellnessEntries([{ restingHR: 55 }])).toThrow(ApiError);
    });
  });

  describe('parsePaceCurveData', () => {
    it('returns null for null or undefined input', () => {
      expect(parsePaceCurveData(null)).toBeNull();
      expect(parsePaceCurveData(undefined)).toBeNull();
    });

    it('parses valid pace curve data', () => {
      const input = {
        bestEfforts: [{ distance: 5000, label: '5km', timeSeconds: 1500, pace: 5.0 }],
        curve: [{ distance: 5000, pace: 5.0 }],
        longestRun: { distance: 10000, activityId: '1', activityName: 'Long' },
      };
      const result = parsePaceCurveData(input);
      expect(result).not.toBeNull();
      expect(result?.bestEfforts).toHaveLength(1);
      expect(result?.curve).toHaveLength(1);
      expect(result?.longestRun?.distance).toBe(10000);
    });

    it('throws ApiError on invalid shape or missing bestEfforts', () => {
      expect(() => parsePaceCurveData('not an object')).toThrow(ApiError);
      expect(() => parsePaceCurveData([])).toThrow(ApiError);
      expect(() => parsePaceCurveData({})).toThrow(ApiError);
    });
  });

  describe('parsePaceSuggestionResponse', () => {
    it('returns null when input or suggestion is null/undefined', () => {
      expect(parsePaceSuggestionResponse(null)).toBeNull();
      expect(parsePaceSuggestionResponse(undefined)).toBeNull();
      expect(parsePaceSuggestionResponse({ suggestion: null })).toBeNull();
      expect(parsePaceSuggestionResponse({})).toBeNull();
    });

    it('parses valid pace suggestion', () => {
      const input = {
        suggestion: {
          direction: 'improvement',
          confidence: 'high',
          suggestedAbilitySecs: 285,
          currentAbilitySecs: 300,
          currentAbilityDist: 1000,
          z4ImprovementSecPerKm: -15,
          cardiacCostChangePercent: -4.5,
          raceResult: null,
          message: 'Threshold pace improved',
        },
      };
      const result = parsePaceSuggestionResponse(input);
      expect(result).not.toBeNull();
      expect(result?.direction).toBe('improvement');
      expect(result?.suggestedAbilitySecs).toBe(285);
      expect(result?.message).toBe('Threshold pace improved');
    });

    it('throws ApiError when required fields are missing', () => {
      expect(() =>
        parsePaceSuggestionResponse({
          suggestion: { direction: 'improvement' },
        }),
      ).toThrow(ApiError);
    });
  });

  describe('parseBgCacheResponse', () => {
    it('parses valid array', () => {
      const input = [
        {
          activityId: 'act-1',
          category: 'easy',
          hr: [],
          fuelRate: 30,
        },
      ];
      const result = parseBgCacheResponse(input);
      expect(result).toHaveLength(1);
      expect(result[0].activityId).toBe('act-1');
    });

    it('throws ApiError when input is not an array', () => {
      expect(() => parseBgCacheResponse(null)).toThrow(ApiError);
    });
  });
});
