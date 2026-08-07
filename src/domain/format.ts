/** Format a minute count as "Xh Ym" / "Xh" / "Ym" (web Agenda parity). */
export function formatHrMin(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Format seconds as "Xh Ym" or "Ym" (completed Agenda cards). */
export function formatDuration(seconds: number): string {
  const secs = Math.round(seconds % 60);
  const totalMins = Math.floor(seconds / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
