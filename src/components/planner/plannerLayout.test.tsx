import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { SpringaColors } from '@/theme/colors';
import { Spacing } from '@/theme/tokens';
import { PlannerConfigEditor } from './PlannerConfigEditor';
import { NewProgramEditor } from './NewProgramEditor';
import { PlannerPreviewView } from './PlannerPreview';
import { PlannerScheduleEditor } from './PlannerScheduleEditor';
import { replacePlanPreview } from '@/test/msw/handlers/planner';

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

function ControlledFitnessEditor() {
  const [value, setValue] = useState(config);
  return (
    <NewProgramEditor
      value={value}
      errors={{}}
      fitnessOptions={fitnessOptions}
      constraints={constraints}
      previewing={false}
      onChange={setValue}
      onCancel={() => {}}
      onPreview={() => {}}
    />
  );
}

function hasTextColor(node: { props: { style?: unknown } }, color: string): boolean {
  return ([node.props.style].flat(Infinity) as ({ color?: string } | null | undefined)[])
    .some((style) => style?.color === color);
}

describe('Planner native control labels', () => {
  it('renders one club heading beside switch', async () => {
    await render(<PlannerScheduleEditor value={config} onChange={() => {}} />);

    const clubLabels = screen.getAllByText('Club run');
    const clubSwitch = screen.getByRole('switch', { name: 'Club run' });
    expect(clubLabels).toHaveLength(1);
    const clubLabel = clubLabels[0]!;
    expect(clubLabel.parent).toBe(clubSwitch.parent);
    expect(clubLabel.parent).toHaveStyle({ flexDirection: 'row' });
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

  it('uses matching effort metric label for new programs', async () => {
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

    expect(screen.getByText('Effort metric')).toBeTruthy();
  });

  it('gives race goal section same top spacing as other config sections', async () => {
    await render(
      <PlannerConfigEditor
        value={config}
        errors={{}}
        saving={false}
        onChange={() => {}}
        onCancel={() => {}}
        onDone={() => {}}
      />,
    );

    expect(screen.getByText('Race goal').parent?.parent).toHaveStyle({ marginTop: Spacing.xl });
  });

  it('labels chart with returned preview week range', async () => {
    const preview = replacePlanPreview();
    preview.summary = { ...preview.summary, planWeeks: 14 };
    preview.weeks = Array.from({ length: 8 }, (_, index) => ({
      week: index + 7,
      startsOn: '2026-09-01',
      distanceKm: 20,
      workoutCount: 1,
    }));
    preview.workouts = [];

    await render(
      <PlannerPreviewView
        preview={preview}
        error={null}
        applying={false}
        onEdit={() => {}}
        onCancel={() => {}}
        onApply={() => {}}
        onPreviewAgain={() => {}}
      />,
    );

    expect(screen.getByText('Week 7')).toBeOnTheScreen();
    expect(screen.getByText('Week 14')).toBeOnTheScreen();
    expect(screen.queryByText('Week 1')).toBeNull();
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

    const slider = screen.getByTestId('planner-fitness-slider-accessibility');
    expect(slider).toHaveProp('accessibilityRole', 'adjustable');
    expect(slider).toHaveProp('accessibilityLabel', 'Current fitness time, 1-minute increments');
    expect(slider.props.accessibilityValue).toEqual({
      min: 3000,
      max: 4800,
      now: 3600,
      text: '1:00:00',
    });
  });

  it('describes sub-minute fitness steps accurately', async () => {
    await render(
      <NewProgramEditor
        value={{ ...config, currentAbilityDist: 5, currentAbilitySecs: 1500 }}
        errors={{}}
        fitnessOptions={[{ label: '5K', distanceKm: 5, defaultSeconds: 1500, minSeconds: 1200, maxSeconds: 1800, stepSeconds: 30 }]}
        constraints={constraints}
        previewing={false}
        onChange={() => {}}
        onCancel={() => {}}
        onPreview={() => {}}
      />,
    );

    expect(screen.getByTestId('planner-fitness-slider-accessibility')).toHaveProp(
      'accessibilityLabel',
      'Current fitness time, 30-second increments',
    );
  });

  it('uses a controlled native slider for fitness time', async () => {
    await render(
      <ControlledFitnessEditor />,
    );

    const slider = screen.getByTestId('planner-fitness-slider');
    expect(slider).toHaveProp('accessibilityRole', 'adjustable');
    expect(slider.props.accessibilityValue).toEqual({ min: 3000, max: 4800, now: 3600 });

    await userEvent.setup().press(slider);

    expect(screen.getByTestId('planner-fitness-slider')).toHaveProp(
      'accessibilityValue',
      { min: 3000, max: 4800, now: 3660 },
    );
  });
});
