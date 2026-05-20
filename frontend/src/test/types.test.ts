import { describe, it, expect } from 'vitest';
import { FOOD_CONFIG, FoodType } from '../types/game';

describe('FOOD_CONFIG', () => {
  const foodTypes: FoodType[] = ['NORMAL', 'SPECIAL', 'SLOW', 'SHIELD', 'SHRINK'];

  it('should have config for all food types', () => {
    for (const ft of foodTypes) {
      expect(FOOD_CONFIG[ft]).toBeDefined();
      expect(FOOD_CONFIG[ft].color).toBeTruthy();
      expect(FOOD_CONFIG[ft].emissive).toBeTruthy();
      expect(typeof FOOD_CONFIG[ft].score).toBe('number');
      expect(FOOD_CONFIG[ft].label).toBeTruthy();
    }
  });

  it('should have positive scores for all food types', () => {
    for (const ft of foodTypes) {
      expect(FOOD_CONFIG[ft].score).toBeGreaterThan(0);
    }
  });

  it('should have special food with highest score', () => {
    const specialScore = FOOD_CONFIG.SPECIAL.score;
    for (const ft of foodTypes) {
      if (ft !== 'SPECIAL') {
        expect(specialScore).toBeGreaterThanOrEqual(FOOD_CONFIG[ft].score);
      }
    }
  });

  it('should have valid hex colors', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (const ft of foodTypes) {
      expect(FOOD_CONFIG[ft].color).toMatch(hexPattern);
      expect(FOOD_CONFIG[ft].emissive).toMatch(hexPattern);
    }
  });
});
