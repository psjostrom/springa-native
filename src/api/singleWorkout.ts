import { formatIsoDay } from '@/domain/calendarWindows';
import { ApiError } from './errors';
import { parseWorkoutPresentation } from './plannedWorkout';
import type { SingleWorkoutPreview, PlannedWorkoutReplacementCategory } from './types';

function invalid(): never {
  throw new ApiError(200, 'Workout preview response had unexpected shape');
}

function category(value: unknown): PlannedWorkoutReplacementCategory {
  return value === 'easy' || value === 'quality' || value === 'long' || value === 'club'
    ? value : invalid();
}

export function parseSingleWorkoutPreview(value: unknown): SingleWorkoutPreview {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const data = value as Record<string, unknown>;
  if (
    typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    formatIsoDay(new Date(`${data.date}T12:00:00`)) !== data.date ||
    typeof data.previewHash !== 'string' || !/^[a-f0-9]{64}$/.test(data.previewHash) ||
    data.workout == null || typeof data.workout !== 'object' || Array.isArray(data.workout)
  ) return invalid();
  const workout = data.workout as Record<string, unknown>;
  if (
    typeof workout.name !== 'string' || typeof workout.description !== 'string' ||
    typeof workout.startDateLocal !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(workout.startDateLocal) ||
    workout.startDateLocal.slice(0, 10) !== data.date ||
    Number.isNaN(new Date(workout.startDateLocal).getTime())
  ) return invalid();
  return {
    date: data.date, category: category(data.category), suggestedCategory: category(data.suggestedCategory),
    previewHash: data.previewHash,
    workout: {
      name: workout.name, description: workout.description, startDateLocal: workout.startDateLocal,
      ...parseWorkoutPresentation(workout),
    },
  };
}

export function parseCreatedWorkout(value: unknown): { newId: number } {
  if (value != null && typeof value === 'object' && !Array.isArray(value) && 'newId' in value &&
    typeof value.newId === 'number' && Number.isSafeInteger(value.newId) && value.newId > 0) {
    return { newId: value.newId };
  }
  throw new ApiError(200, 'Workout creation response had unexpected shape');
}
