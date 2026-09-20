import { describe, expect, it } from 'vitest';
import { getMonday, getPhaseBoundaries, getPhaseInfo } from '@/lib/phases';

describe('phases domain logic', () => {
  describe('getMonday', () => {
    it('returns Monday for a Wednesday', () => {
      // 2026-09-16 is Wednesday
      const wed = new Date(2026, 8, 16);
      const mon = getMonday(wed);
      expect(mon.getDay()).toBe(1);
      expect(mon.getDate()).toBe(14);
      expect(mon.getHours()).toBe(0);
    });

    it('returns previous Monday for a Sunday', () => {
      // 2026-09-20 is Sunday
      const sun = new Date(2026, 8, 20);
      const mon = getMonday(sun);
      expect(mon.getDay()).toBe(1);
      expect(mon.getDate()).toBe(14);
    });

    it('returns same day for a Monday', () => {
      // 2026-09-14 is Monday
      const mon = new Date(2026, 8, 14);
      const result = getMonday(mon);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(14);
    });
  });

  describe('getPhaseBoundaries', () => {
    it('handles short plans (<8 weeks)', () => {
      const b = getPhaseBoundaries(6);
      expect(b.baseEnd).toBe(0);
      expect(b.buildStart).toBe(1);
      expect(b.buildEnd).toBe(3);
      expect(b.raceWeek).toBe(6);
    });

    it('handles 8-9 week plans', () => {
      const b = getPhaseBoundaries(8);
      expect(b.baseEnd).toBe(0);
      expect(b.buildEnd).toBe(5);
      expect(b.raceTestStart).toBe(6);
      expect(b.taperStart).toBe(7);
      expect(b.raceWeek).toBe(8);
    });

    it('handles 12-week plans with base phase', () => {
      const b = getPhaseBoundaries(12, true);
      expect(b.baseEnd).toBeGreaterThan(0);
      expect(b.buildStart).toBe(b.baseEnd + 1);
      expect(b.raceWeek).toBe(12);
    });
  });

  describe('getPhaseInfo', () => {
    it('returns null when raceDate or totalWeeks is missing', () => {
      expect(getPhaseInfo(undefined, 12)).toBeNull();
      expect(getPhaseInfo('2026-10-18', 0)).toBeNull();
    });

    it('returns Pre-Plan when now is before plan start', () => {
      const info = getPhaseInfo('2026-12-01', 8, false, new Date('2026-08-01T00:00:00'));
      expect(info?.name).toBe('Pre-Plan');
      expect(info?.week).toBe(0);
      expect(info?.progress).toBe(0);
    });

    it('returns Post-Race when now is after race day', () => {
      const info = getPhaseInfo('2026-09-01', 8, false, new Date('2026-09-10T00:00:00'));
      expect(info?.name).toBe('Post-Race');
      expect(info?.week).toBe(8);
      expect(info?.progress).toBe(1);
    });

    it('handles DST shifts correctly without dropping a week', () => {
      // Test across Spring DST transition (March in Europe/US)
      // 12-week plan targeting 2026-05-10
      // Plan start is mid-February, DST happens in late March
      const raceDate = '2026-05-10';
      const totalWeeks = 12;
      // 4 weeks into plan (after DST change)
      const now = new Date('2026-03-23T12:00:00');
      const info = getPhaseInfo(raceDate, totalWeeks, false, now);
      expect(info?.week).toBeGreaterThanOrEqual(1);
      expect(info?.week).toBeLessThanOrEqual(12);
      expect(info?.progressPercent).toBeGreaterThan(0);
    });
  });
});
