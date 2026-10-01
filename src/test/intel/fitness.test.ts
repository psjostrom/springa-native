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
    const sampleData = Array.from({ length: 400 }, (_, i) => ({
      date: `2025-08-${i}`,
      ctl: 40 + i * 0.1,
      atl: 45 + i * 0.1,
      tsb: -5,
    }));

    it('returns all items when window is all', () => {
      expect(filterFitnessByWindow(sampleData, 'all')).toHaveLength(400);
    });

    it('slices to 90 items for 90d', () => {
      const result = filterFitnessByWindow(sampleData, '90d');
      expect(result).toHaveLength(90);
      expect(result[result.length - 1]).toEqual(sampleData[sampleData.length - 1]);
    });

    it('slices to 180 items for 180d', () => {
      const result = filterFitnessByWindow(sampleData, '180d');
      expect(result).toHaveLength(180);
    });

    it('slices to 365 items for 1y', () => {
      const result = filterFitnessByWindow(sampleData, '1y');
      expect(result).toHaveLength(365);
    });

    it('returns all data when dataset is smaller than window', () => {
      const smallData = sampleData.slice(0, 30);
      expect(filterFitnessByWindow(smallData, '90d')).toHaveLength(30);
    });
  });
});
