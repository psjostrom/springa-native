import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react-native';
import { TimeWindowChips } from '@/components/intel/TimeWindowChips';

describe('TimeWindowChips', () => {
  const windows = [
    { label: '3m', value: '90d' },
    { label: '6m', value: '180d' },
    { label: '1y', value: '1y' },
    { label: 'All', value: 'all' },
  ] as const;

  it('renders chips with selected state and triggers onChange', async () => {
    const onChange = vi.fn();
    const view = await render(
      <TimeWindowChips
        windows={windows}
        selected="90d"
        onChange={onChange}
      />,
    );

    expect(view.getByText('3m')).toBeOnTheScreen();
    expect(view.getByText('6m')).toBeOnTheScreen();
    expect(view.getByText('1y')).toBeOnTheScreen();
    expect(view.getByText('All')).toBeOnTheScreen();

    const selectedChip = view.getByLabelText('Time window 3m');
    expect(selectedChip.props.accessibilityState.selected).toBe(true);

    const unselectedChip = view.getByLabelText('Time window 1y');
    expect(unselectedChip.props.accessibilityState.selected).toBe(false);

    fireEvent.press(unselectedChip);
    expect(onChange).toHaveBeenCalledWith('1y');
  });
});
