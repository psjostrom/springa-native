import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { SpringaColors } from '@/theme/colors';
import { NewProgramEditor } from './NewProgramEditor';
import { PlannerScheduleEditor } from './PlannerScheduleEditor';

const config: PlannerConfig = {
  raceName: '',
  raceDist: 16,
  raceDate: '2026-12-29',
  currentAbilityDist: 10,
  currentAbilitySecs: 3600,
  runDays: [2, 4, 0],
  longRunDay: 0,
  clubDay: null,
  clubType: null,
  totalWeeks: 19,
  startKm: 8,
  includeBasePhase: false,
  effortMetric: 'pace',
};

const fitnessOptions: PlannerFitnessOption[] = [
  { label: '10K', distanceKm: 10, defaultSeconds: 3600, minSeconds: 3000, maxSeconds: 4800, stepSeconds: 60 },
];

const constraints: PlannerState['constraints'] = {
  raceDistanceKm: { min: 1, max: 100 },
  startDistanceKm: { min: 2, max: 42 },
  minimumWeeks: 8,
  minimumNormalWeeks: 10,
  recommendedWeeks: 12,
  basePhaseMinimumWeeks: 11,
};

function hasTextColor(node: { props: { style?: unknown } }, color: string): boolean {
  return ([node.props.style].flat(Infinity) as ({ color?: string } | null | undefined)[])
    .some((style) => style?.color === color);
}

describe('Planner native control labels', () => {
  it('renders club switch label with app text styling', async () => {
    await render(<PlannerScheduleEditor value={config} onChange={() => {}} />);

    expect(screen.getAllByText('Club run').some((node) => hasTextColor(node, SpringaColors.muted))).toBe(true);
  });

  it('renders base-phase checkbox label with app text styling', async () => {
    await render(
      <NewProgramEditor
        value={config}
        errors={{}}
        fitnessOptions={fitnessOptions}
        constraints={constraints}
        previewing={false}
        onChange={() => {}}
        onCancel={() => {}}
        onPreview={() => {}}
      />,
    );

    expect(screen.getAllByText('Include base phase').some((node) => hasTextColor(node, SpringaColors.muted))).toBe(true);
  });

  it('exposes fitness slider range and value semantics', async () => {
    await render(
      <NewProgramEditor
        value={config}
        errors={{}}
        fitnessOptions={fitnessOptions}
        constraints={constraints}
        previewing={false}
        onChange={() => {}}
        onCancel={() => {}}
        onPreview={() => {}}
      />,
    );

    const slider = screen.getByTestId('planner-fitness-slider-host');
    expect(slider).toHaveProp('accessibilityRole', 'adjustable');
    expect(slider).toHaveProp('accessibilityLabel', 'Current fitness time, 1-minute increments');
    expect(slider.props.accessibilityValue).toEqual({
      min: 3000,
      max: 4800,
      now: 3600,
      text: '1:00:00',
    });
  });
});
