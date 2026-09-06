import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { describe, expect, it } from 'vitest';
import { Button, Card, ChoiceChip, Grid, IconButton, StateView, TextField } from '.';
import { SpringaColors } from '@/theme/colors';

function RetryState() {
  const [retried, setRetried] = useState(false);

  return retried ? (
    <Text>Retry requested</Text>
  ) : (
    <StateView title="Couldn’t load" message="Try again." onRetry={() => setRetried(true)} />
  );
}

describe('global UI', () => {
  it('disables a pending button and exposes its busy state', async () => {
    await render(<Button label="Save" loading />);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toBeDisabled();
    expect(button).toHaveProp('accessibilityState', { busy: true, disabled: true });
  });

  it('offers retry only when supplied', async () => {
    await render(<RetryState />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Retry requested')).toBeOnTheScreen();
  });

  it('shows progress only for a loading state', async () => {
    const loadingView = await render(
      <StateView loading title="Loading" message="Please wait" />,
    );
    expect(
      loadingView.container.queryAll((node) => node.type === 'AndroidProgressBar'),
    ).toHaveLength(1);

    await loadingView.rerender(<StateView title="Empty" message="Nothing here" />);
    expect(
      loadingView.container.queryAll((node) => node.type === 'AndroidProgressBar'),
    ).toHaveLength(0);
  });

  it('keeps icon-only controls named', async () => {
    await render(
      <IconButton accessibilityLabel="Close">
        <Text>×</Text>
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
  });

  it('exposes selected and disabled choice chip state', async () => {
    await render(
      <ChoiceChip label="Sunday" selected disabled onPress={() => {}} />,
    );

    const chip = screen.getByRole('button', { name: 'Sunday' });
    expect(chip).toBeDisabled();
    expect(chip).toHaveProp('accessibilityState', { selected: true, disabled: true });
    expect(chip).toHaveStyle({ minHeight: 44 });
  });

  it('composes arbitrary content in a brand card and grid', async () => {
    await render(
      <Card tone="brand" accessibilityLabel="Summary">
        <Grid>
          <Text>First block</Text>
          <Text>Second block</Text>
        </Grid>
      </Card>,
    );

    expect(screen.getByLabelText('Summary')).toHaveStyle({
      backgroundColor: SpringaColors.tintBrand,
      borderColor: `${SpringaColors.brand}66`,
    });
    expect(screen.getByText('First block')).toBeOnTheScreen();
    expect(screen.getByText('Second block')).toBeOnTheScreen();
  });

  it('associates field errors with an alert', async () => {
    await render(<TextField accessibilityLabel="Carbs" value="x" error="Whole grams only" />);

    expect(screen.getByLabelText('Carbs')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Whole grams only');
  });

  it('exposes a non-editable text field as disabled', async () => {
    await render(<TextField accessibilityLabel="Carbs" editable={false} />);

    expect(screen.getByLabelText('Carbs')).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });
});
