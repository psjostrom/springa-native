import { describe, expect, it } from 'vitest';
import { availableReplacementCategories } from './workoutActions';

describe('availableReplacementCategories', () => {
  it('omits the current replacement category', () => {
    expect(availableReplacementCategories('easy')).toEqual([
      'quality',
      'long',
      'club',
    ]);
  });

  it('keeps all choices when intent is unknown', () => {
    expect(availableReplacementCategories(null)).toEqual([
      'easy',
      'quality',
      'long',
      'club',
    ]);
  });
});
