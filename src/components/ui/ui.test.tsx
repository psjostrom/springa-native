import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { StateView } from './StateView';
import { TextField } from './TextField';

describe('global UI', () => {
  it('disables a pending button and exposes its busy state', async () => {
    const onPress = vi.fn();
    await render(<Button label="Save" loading onPress={onPress} />);
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toBeDisabled();
    expect(button).toHaveProp('accessibilityState', { busy: true, disabled: true });
    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('offers retry only when supplied', async () => {
    const onRetry = vi.fn();
    await render(
      <StateView state="error" title="Couldn’t load" message="Try again." onRetry={onRetry} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps icon-only controls named', async () => {
    await render(
      <IconButton accessibilityLabel="Close">
        <Text>×</Text>
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
  });

  it('associates field errors with an alert', async () => {
    await render(<TextField accessibilityLabel="Carbs" value="x" error="Whole grams only" />);

    expect(screen.getByLabelText('Carbs')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Whole grams only');
  });
});
