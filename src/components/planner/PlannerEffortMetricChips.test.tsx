import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { PlannerConfig, PlannerFitnessOption, PlannerState } from '@/api/types';
import { NewProgramEditor } from './NewProgramEditor';
import { PlannerConfigEditor } from './PlannerConfigEditor';

const config: PlannerConfig = {
  raceName: 'Stockholm Half',
  raceDist: 21.1,
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

function ControlledNewProgramEditor() {
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

function ControlledPlannerConfigEditor() {
  const [value, setValue] = useState(config);
  return (
    <PlannerConfigEditor
      value={value}
      errors={{}}
      fitnessOptions={fitnessOptions}
      constraints={constraints}
      saving={false}
      onChange={setValue}
      onDone={() => {}}
      onCancel={() => {}}
    />
  );
}

describe('Planner effort metric controls', () => {
  it('labels populated race and starting distances visibly', async () => {
    await render(<ControlledNewProgramEditor />);

    expect(screen.getByText('Race distance (km)')).toBeOnTheScreen();
    expect(screen.getByText('Starting long-run distance (km)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Race distance (km)')).toHaveProp('value', '21.1');
    expect(screen.getByLabelText('Starting long-run distance (km)')).toHaveProp('value', '8');
  });

  it('labels populated race distance in existing planner settings', async () => {
    await render(<ControlledPlannerConfigEditor />);

    expect(screen.getByText('Race distance (km)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Race distance (km)')).toHaveProp('value', '21.1');
  });

  it('marks selected effort metric chip and keeps touch target at 44px', async () => {
    await render(<ControlledPlannerConfigEditor />);

    const pace = screen.getByRole('button', { name: 'Pace' });
    expect(pace).toHaveProp('accessibilityState', { selected: true });
    expect(pace).toHaveStyle({ minHeight: 44 });
  });

  it('changes selected effort metric chip in new program editor', async () => {
    await render(<ControlledNewProgramEditor />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Feel' }));

    expect(screen.getByRole('button', { name: 'Feel' })).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
    expect(screen.getByRole('button', { name: 'Pace' })).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
  });
});
