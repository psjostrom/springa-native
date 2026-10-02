import { describe, expect, it } from 'vitest';
import {
  distanceLabel,
  formatTime,
  getSuggestionMessage,
} from '@/components/intel/PaceSuggestionBanner';
import type { PaceSuggestion } from '@/api/types';

describe('PaceSuggestionBanner', () => {
  describe('formatTime', () => {
    it('formats seconds without hours', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(59)).toBe('0:59');
    });

    it('rounds fractional seconds correctly without unpadded decimals', () => {
      // 65.4 should round to 65 -> 1:05, not 1:5.4
      expect(formatTime(65.4)).toBe('1:05');
      // 285.5 should round to 286 -> 4:46, not 4:45.5
      expect(formatTime(285.5)).toBe('4:46');
    });

    it('formats durations with hours', () => {
      expect(formatTime(3600)).toBe('1:00:00');
      expect(formatTime(3665)).toBe('1:01:05');
      expect(formatTime(3665.4)).toBe('1:01:05');
    });
  });

  describe('distanceLabel', () => {
    it('returns standard names for common distances', () => {
      expect(distanceLabel(5)).toBe('5K');
      expect(distanceLabel(10)).toBe('10K');
      expect(distanceLabel(21.1)).toBe('Half');
      expect(distanceLabel(42.2)).toBe('Marathon');
      expect(distanceLabel(15)).toBe('15km');
    });
  });

  describe('getSuggestionMessage', () => {
    it('returns suggestion.message when present', () => {
      const suggestion: PaceSuggestion = {
        direction: 'improvement',
        suggestedAbilitySecs: 1200,
        currentAbilitySecs: 1300,
        currentAbilityDist: 5,
        confidence: 'high',
        message: 'Explicit message from server',
        z4ImprovementSecPerKm: null,
        cardiacCostChangePercent: null,
        raceResult: null,
      };
      expect(getSuggestionMessage(suggestion)).toBe('Explicit message from server');
    });

    it('formats raceResult message when distance matches', () => {
      const suggestion: PaceSuggestion = {
        direction: 'improvement',
        suggestedAbilitySecs: 1200,
        currentAbilitySecs: 1300,
        currentAbilityDist: 5,
        confidence: 'high',
        z4ImprovementSecPerKm: null,
        cardiacCostChangePercent: null,
        raceResult: {
          distance: 5,
          name: 'City 5K',
          duration: 1250,
          distanceMatch: true,
        },
      };
      const msg = getSuggestionMessage(suggestion);
      expect(msg).toContain('You finished in 20:50');
      expect(msg).toContain('50 faster than your current 5K ability (21:40)');
    });

    it('formats pbEvidence message', () => {
      const suggestion: PaceSuggestion = {
        direction: 'improvement',
        suggestedAbilitySecs: 1200,
        currentAbilitySecs: 1300,
        currentAbilityDist: 5,
        confidence: 'high',
        z4ImprovementSecPerKm: null,
        cardiacCostChangePercent: null,
        raceResult: null,
        pbEvidence: {
          timeSeconds: 1245.4,
          ageDays: 3.2,
        },
      };
      const msg = getSuggestionMessage(suggestion);
      expect(msg).toContain('Your best 5K effort was 20:45 (3 days ago)');
    });
  });
});
