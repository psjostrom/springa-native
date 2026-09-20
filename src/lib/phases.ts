export type PhaseName = 'Base' | 'Build' | 'Race Test' | 'Taper' | 'Race Week';

export interface PhaseBoundaries {
  baseEnd: number;
  buildStart: number;
  buildEnd: number;
  raceTestStart: number;
  raceTestEnd: number;
  taperStart: number;
  taperEnd: number;
  raceWeek: number;
}

export interface PhaseInfo {
  name: string;
  week: number;
  totalWeeks: number;
  progress: number; // 0-1
  progressPercent: number; // 0-100
}

export function getPhaseBoundaries(
  totalWeeks: number,
  includeBasePhase = false,
): PhaseBoundaries {
  if (totalWeeks < 8) {
    return {
      baseEnd: 0,
      buildStart: 1,
      buildEnd: Math.max(1, totalWeeks - 3),
      raceTestStart: Math.max(1, totalWeeks - 2),
      raceTestEnd: Math.max(1, totalWeeks - 2),
      taperStart: Math.max(1, totalWeeks - 1),
      taperEnd: Math.max(1, totalWeeks - 1),
      raceWeek: totalWeeks,
    };
  }

  // Compressed 8-9 week plans
  if (totalWeeks < 10) {
    return {
      baseEnd: 0,
      buildStart: 1,
      buildEnd: totalWeeks - 3,
      raceTestStart: totalWeeks - 2,
      raceTestEnd: totalWeeks - 2,
      taperStart: totalWeeks - 1,
      taperEnd: totalWeeks - 1,
      raceWeek: totalWeeks,
    };
  }

  const raceWeek = totalWeeks;
  const taperEnd = totalWeeks - 1;
  const taperStart = totalWeeks - 2;
  const raceTestEnd = taperStart - 1;
  const raceTestStart = raceTestEnd - 1;

  let baseEnd = 0;
  if (includeBasePhase && totalWeeks >= 11) {
    baseEnd = Math.min(3, Math.max(2, Math.floor(totalWeeks * 0.17)));
  }

  const buildStart = baseEnd + 1;
  const buildEnd = raceTestStart - 1;

  return {
    baseEnd,
    buildStart,
    buildEnd,
    raceTestStart,
    raceTestEnd,
    taperStart,
    taperEnd,
    raceWeek,
  };
}

export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getPhaseInfo(
  raceDate?: string,
  totalWeeks?: number,
  includeBasePhase = false,
  now = new Date(),
): PhaseInfo | null {
  if (!raceDate || !totalWeeks || totalWeeks <= 0) return null;

  const rDate = new Date(raceDate + 'T00:00:00');
  if (isNaN(rDate.getTime())) return null;

  const raceWeekMonday = getMonday(rDate);
  const planStartMonday = new Date(raceWeekMonday);
  planStartMonday.setDate(planStartMonday.getDate() - (totalWeeks - 1) * 7);

  const todayMonday = getMonday(now);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const currentWeekIdx = Math.round(
    (todayMonday.getTime() - planStartMonday.getTime()) / msPerWeek,
  );

  if (now.getTime() < planStartMonday.getTime()) {
    return {
      name: 'Pre-Plan',
      week: 0,
      totalWeeks,
      progress: 0,
      progressPercent: 0,
    };
  }

  if (now.getTime() > rDate.getTime() + 24 * 60 * 60 * 1000) {
    return {
      name: 'Post-Race',
      week: totalWeeks,
      totalWeeks,
      progress: 1,
      progressPercent: 100,
    };
  }

  const currentWeek = Math.min(totalWeeks, Math.max(1, currentWeekIdx + 1));
  const boundaries = getPhaseBoundaries(totalWeeks, includeBasePhase);

  let name = 'Build Phase';
  if (boundaries.baseEnd > 0 && currentWeek <= boundaries.baseEnd) {
    name = 'Base Phase';
  } else if (
    currentWeek >= boundaries.raceTestStart &&
    currentWeek <= boundaries.raceTestEnd
  ) {
    name = 'Race Test Phase';
  } else if (
    currentWeek >= boundaries.taperStart &&
    currentWeek <= boundaries.taperEnd
  ) {
    name = 'Taper Phase';
  } else if (currentWeek >= boundaries.raceWeek) {
    name = 'Race Week';
  }

  const progress = Math.min(1, Math.max(0, currentWeek / totalWeeks));
  const progressPercent = Math.round(progress * 100);

  return {
    name,
    week: currentWeek,
    totalWeeks,
    progress,
    progressPercent,
  };
}
