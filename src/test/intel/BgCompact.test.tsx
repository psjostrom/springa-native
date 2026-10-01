import { describe, expect, it } from 'vitest';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { BgCompact } from '@/components/intel/BgCompact';
import type { CategoryBGResponse } from '@/lib/bgModel';

describe('BgCompact', () => {
  const sampleCategories: CategoryBGResponse[] = [
    {
      category: 'easy',
      medianRate: -0.02, // -1.2 mmol/L/h
      sampleCount: 40,
      confidence: 'high',
      avgFuelRate: 30,
      activityCount: 5,
    },
  ];

  it('renders mmol/L/h in card, accessibility label, and bottom sheet', async () => {
    await render(<BgCompact categories={sampleCategories} />);

    // Card unit text
    expect(screen.getByText('mmol/L/h')).toBeOnTheScreen();

    // Accessibility label
    const card = screen.getByLabelText(/Easy runs, -1.2 mmol\/L\/h, Moderate/);
    expect(card).toBeOnTheScreen();

    // Open sheet
    const user = userEvent.setup();
    await user.press(card);

    // Sheet displays mmol/L/h
    await waitFor(() => {
      expect(screen.getAllByText('mmol/L/h').length).toBeGreaterThanOrEqual(2);
    });
  });
});
