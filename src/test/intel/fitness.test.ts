import { describe, expect, it } from 'vitest';
import type { WellnessEntry } from '@/api/types';
import { filterFitnessByWindow, wellnessToFitnessData } from '@/lib/fitness';

describe('fitness domain logic', () => {
  describe('wellnessToFitnessData', () => {
    it('converts wellness entries with ctl and atl', () => {
      const entries: WellnessEntry[] = [
        { id: '2026-09-01', ctl: 45.44, atl: 50.12 },
        { id: '2026-09-02', ctl: 46.12, atl: 48.09 },
      ];

      const result = wellnessToFitnessData(entries);

      expect(result).toEqual([
        { date: '2026-09-01', ctl: 45.4, atl: 50.1, tsb: -4.7 },
        { date: '2026-09-02', ctl: 46.1, atl: 48.1, tsb: -2.0 },
      ]);
    });

    it('filters out entries without both ctl and atl', () => {
      const entries: WellnessEntry[] = [
        { id: '2026-09-01', ctl: 45, atl: 50 },
        { id: '2026-09-02', ctl: undefined, atl: 48 },
        { id: '2026-09-03', ctl: 46, atl: undefined },
        { id: '2026-09-04', restingHR: 55 },
      ];

      const result = wellnessToFitnessData(entries);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-09-01');
    });

    it('sorts entries chronologically ascending', () => {
      const entries: WellnessEntry[] = [
        { id: '2026-09-05', ctl: 50, atl: 50 },
        { id: '2026-09-01', ctl: 40, atl: 40 },
        { id: '2026-09-03', ctl: 45, atl: 45 },
      ];

      const result = wellnessToFitnessData(entries);

      expect(result.map((r) => r.date)).toEqual([
        '2026-09-01',
        '2026-09-03',
        '2026-09-05',
      ]);
    });

    it('returns empty array for empty entries', () => {
      expect(wellnessToFitnessData([])).toEqual([]);
    });
  });

  describe('filterFitnessByWindow', () => {
    // 400 consecutive calendar days starting from 2025-01-01
    const startDate = new Date(2025, 0, 1);
    const sampleData = Array.from({ length: 400 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        date: `${y}-${m}-${day}`,
        ctl: 40 + i * 0.1,
        atl: 45 + i * 0.1,
        tsb: -5,
      };
    });

    it('returns all items when window is all', () => {
      expect(filterFitnessByWindow(sampleData, 'all')).toHaveLength(400);
    });

    it('filters by calendar date for 90d', () => {
      const result = filterFitnessByWindow(sampleData, '90d');
      expect(result).toHaveLength(91); // 90 days span + 1 inclusive
      expect(result[result.length - 1]).toEqual(sampleData[sampleData.length - 1]);
    });

    it('filters by calendar date for 180d', () => {
      const result = filterFitnessByWindow(sampleData, '180d');
      expect(result).toHaveLength(181);
    });

    it('filters by calendar date for 1y', () => {
      const result = filterFitnessByWindow(sampleData, '1y');
      expect(result).toHaveLength(366);
    });

    it('returns all data when dataset is smaller than window', () => {
      const smallData = sampleData.slice(-30);
      expect(filterFitnessByWindow(smallData, '90d')).toHaveLength(30);
    });

    it('filters out sparse data older than window cutoff rather than taking point count', () => {
      const sparseData = [
        { date: '2025-01-01', ctl: 40, atl: 40, tsb: 0 },
        { date: '2025-06-01', ctl: 45, atl: 45, tsb: 0 },
        { date: '2025-08-01', ctl: 50, atl: 50, tsb: 0 },
        { date: '2025-08-15', ctl: 52, atl: 52, tsb: 0 },
      ];
      // 90 days before 2025-08-15 is ~2025-05-17.
      // 2025-01-01 is outside the 90d window and must be excluded.
      const result = filterFitnessByWindow(sparseData, '90d');
      expect(result.map((r) => r.date)).toEqual([
        '2025-06-01',
        '2025-08-01',
        '2025-08-15',
      ]);
    });

    it('falls back to slicing if last date is invalid', () => {
      const invalidData = [
        { date: 'invalid-1', ctl: 40, atl: 40, tsb: 0 },
        { date: 'invalid-2', ctl: 45, atl: 45, tsb: 0 },
        { date: 'invalid-3', ctl: 50, atl: 50, tsb: 0 },
      ];
      expect(filterFitnessByWindow(invalidData, '90d')).toHaveLength(3);
    });
  });
});
