export type DateWindow = {
  oldest: string;
  newest: string;
};

/** Format a local Date as YYYY-MM-DD. */
export function formatIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Days after today on the first calendar page (today → future only). */
export const INITIAL_LOOKAHEAD_DAYS = 11;

/** Inclusive day count for each older/newer page after the first. */
export const PAGE_SPAN_DAYS = 1 + INITIAL_LOOKAHEAD_DAYS;

/** Initial window: today → today+11d (inclusive local days; no lookback). */
export function initialCalendarWindow(now = new Date()): DateWindow {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + INITIAL_LOOKAHEAD_DAYS,
  );
  return { oldest: formatIsoDay(start), newest: formatIsoDay(end) };
}

/** Shift by local calendar days (DST-safe). */
function addLocalDays(iso: string, deltaDays: number): Date {
  const d = parseIsoDay(iso);
  d.setDate(d.getDate() + deltaDays);
  return d;
}

export function olderCalendarWindow(currentOldest: string): DateWindow {
  const newest = addLocalDays(currentOldest, -1);
  const oldest = new Date(
    newest.getFullYear(),
    newest.getMonth(),
    newest.getDate() - (PAGE_SPAN_DAYS - 1),
  );
  return { oldest: formatIsoDay(oldest), newest: formatIsoDay(newest) };
}

export function newerCalendarWindow(currentNewest: string): DateWindow {
  const oldest = addLocalDays(currentNewest, 1);
  const newest = new Date(
    oldest.getFullYear(),
    oldest.getMonth(),
    oldest.getDate() + (PAGE_SPAN_DAYS - 1),
  );
  return { oldest: formatIsoDay(oldest), newest: formatIsoDay(newest) };
}
