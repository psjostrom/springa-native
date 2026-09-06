import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import type { PlannerConfig } from '@/api/types';
import { PlannerScheduleEditor } from './PlannerScheduleEditor';

const config: PlannerConfig = {
  raceName: '',
  raceDist: 16,
  raceDate: '2026-12-29',
  currentAbilityDist: 10,
  currentAbilitySecs: 3600,
  runDays: [2, 4, 0],
  longRunDay: 0,
  clubDay: 4,
  clubType: 'speed',
  totalWeeks: 19,
  startKm: 8,
  includeBasePhase: false,
  effortMetric: 'pace',
};

describe('PlannerScheduleEditor', () => {
  it('disables long-run day club chip while keeping other club days enabled', async () => {
    const onChange = vi.fn();
    await render(<PlannerScheduleEditor value={config} onChange={onChange} />);

    const longRunClubDay = screen.getByRole('button', { name: 'Sunday club day' });
    expect(longRunClubDay).toHaveProp('accessibilityState', { selected: false, disabled: true });
    expect(longRunClubDay).toBeDisabled();
    await fireEvent.press(longRunClubDay);
    expect(onChange).not.toHaveBeenCalled();

    const otherClubDay = screen.getByRole('button', { name: 'Tuesday club day' });
    expect(otherClubDay).toBeEnabled();
    await fireEvent.press(otherClubDay);
    expect(onChange).toHaveBeenCalledWith({ ...config, clubDay: 2 });
  });
});
