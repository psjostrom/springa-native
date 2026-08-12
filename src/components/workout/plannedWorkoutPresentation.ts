function formatRounded(value: number): string {
  return Number(value.toFixed(1)).toString();
}

function isWorkoutStructureLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === 'Warmup' ||
    trimmed === 'Cooldown' ||
    trimmed === 'Main set' ||
    /^Main set\s+\d+x(?:\s|$)/.test(trimmed) ||
    /^Strides\s+\d+x(?:\s|$)/.test(trimmed) ||
    /^-\s+.*\d+(?:\.\d+)?(?:km|m|s)(?:\s|$)/.test(trimmed)
  );
}

export function formatDistanceKm(km: number): string {
  return `${formatRounded(km)} km`;
}

export function formatWorkoutDate(date: Date): string {
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseLocalDateTime(value: string): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (match == null) return new Date(value);

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
  );
}

export function formatLocalDateTime(date: Date): string {
  return [
    `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`,
  ].join('T');
}

export function formatTimelineMinutes(minutes: number): string {
  return `${formatRounded(minutes)}m`;
}

export function formatWorkoutStepDuration(duration: string): string {
  const match = duration.trim().match(/^(\d+(?:\.\d+)?)\s*km$/i);
  if (match == null) return duration;

  const kilometers = Number(match[1]);
  return kilometers < 1
    ? `${Math.round(kilometers * 1000)}m`
    : `${formatRounded(kilometers)}km`;
}

export function extractWorkoutNotes(description: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length === 0) return null;

  const lines = trimmed.split('\n');
  const firstStructureLine = lines.findIndex(isWorkoutStructureLine);
  const preamble = firstStructureLine === -1 ? lines : lines.slice(0, firstStructureLine);
  const notes = preamble
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^FUEL PER 10:/i.test(line) &&
        !/^PUMP/i.test(line) &&
        !/^\(Trail\)$/i.test(line),
    );

  return notes.length > 0 ? notes.join(' ') : null;
}

export function timelineSegmentHeightPercent(intensityPercent: number): number {
  return Math.min(100, Math.max(20, ((intensityPercent - 70) / 30) * 70 + 30));
}
