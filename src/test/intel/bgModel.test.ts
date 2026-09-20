import { describe, expect, it } from 'vitest';
import type { CachedBGActivity } from '@/api/types';
import { buildBGCategories } from '@/lib/bgModel';

describe('bgModel domain logic', () => {
  it('returns empty results for empty or null cache', () => {
    expect(buildBGCategories([])).toEqual({
      categories: [],
      activitiesAnalyzed: 0,
    });
  });

  it('filters out activities with invalid category or < 5 glucose points', () => {
    const invalid: CachedBGActivity[] = [
      {
        activityId: 'inv-1',
        category: 'unknown_cat' as unknown as CachedBGActivity['category'],
        hr: [],
        glucose: Array.from({ length: 10 }, (_, i) => ({ time: i, value: 7.0 })),
        fuelRate: null,
      },
      {
        activityId: 'inv-2',
        category: 'easy',
        hr: [],
        glucose: [
          { time: 0, value: 6.0 },
          { time: 1, value: 5.9 },
        ],
        fuelRate: null,
      },
    ];
    const result = buildBGCategories(invalid);
    expect(result.categories).toHaveLength(0);
    expect(result.activitiesAnalyzed).toBe(0);
  });

  it('computes median drop rate, confidence, and fuel rate for valid activities', () => {
    // Generate 30 minutes of easy run where BG drops 0.05 mmol/L per min
    const easyPoints = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      value: 8.0 - i * 0.05,
    }));

    const activities: CachedBGActivity[] = [
      {
        activityId: 'easy-1',
        category: 'easy',
        hr: [],
        glucose: easyPoints,
        fuelRate: 40,
      },
      {
        activityId: 'easy-2',
        category: 'easy',
        hr: [],
        glucose: easyPoints,
        fuelRate: 50,
      },
    ];

    const { categories, activitiesAnalyzed } = buildBGCategories(activities);
    expect(activitiesAnalyzed).toBe(2);
    expect(categories).toHaveLength(1);

    const easyCat = categories[0];
    expect(easyCat.category).toBe('easy');
    expect(easyCat.medianRate).toBeCloseTo(-0.05, 2);
    expect(easyCat.activityCount).toBe(2);
    expect(easyCat.avgFuelRate).toBe(45);
    expect(['low', 'medium', 'high']).toContain(easyCat.confidence);
  });
});
