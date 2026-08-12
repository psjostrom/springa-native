import type { PlannedWorkoutReplacementCategory } from '@/api/types';

export const replacementCategories: PlannedWorkoutReplacementCategory[] = [
  'easy',
  'quality',
  'long',
  'club',
];

export function availableReplacementCategories(
  current: PlannedWorkoutReplacementCategory | null,
) {
  return replacementCategories.filter((category) => category !== current);
}
