import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { DeviceEventEmitter, Keyboard, Text } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppBottomSheet } from './AppBottomSheet';

function DismissalHarness({ onDismissComplete }: { onDismissComplete: () => void }) {
  const [isPresented, setIsPresented] = useState(true);

  return (
    <>
      <Text accessibilityRole="button" onPress={() => setIsPresented(false)}>
        Request dismissal
      </Text>
      <AppBottomSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        onDismissComplete={onDismissComplete}
      >
        <Text>Sheet content</Text>
      </AppBottomSheet>
    </>
  );
}

function PresentationHarness() {
  const [isPresented, setIsPresented] = useState(false);

  return (
    <>
      <Text accessibilityRole="button" onPress={() => setIsPresented(true)}>
        Request presentation
      </Text>
      <AppBottomSheet isPresented={isPresented} onDismiss={() => setIsPresented(false)}>
        <Text>Sheet content</Text>
      </AppBottomSheet>
    </>
  );
}

describe('AppBottomSheet', () => {
  beforeEach(() => {
    DeviceEventEmitter.emit('keyboardDidHide', {});
  });

  afterEach(() => {
    cleanup();
    DeviceEventEmitter.emit('keyboardDidHide', {});
  });

  it('reports completion only after the native dismissal animation', async () => {
    const onDismissComplete = vi.fn();
    const view = await render(<DismissalHarness onDismissComplete={onDismissComplete} />);

    fireEvent.press(view.getByText('Request dismissal'));

    expect(view.getByText('Sheet content')).toBeOnTheScreen();
    expect(onDismissComplete).not.toHaveBeenCalled();

    fireEvent.press(await view.findByLabelText('Complete bottom sheet dismissal'));

    await waitFor(() => expect(view.queryByText('Sheet content')).toBeNull());
    expect(onDismissComplete).toHaveBeenCalledOnce();
  });

  it('waits for the keyboard to close before presenting', async () => {
    DeviceEventEmitter.emit('keyboardDidShow', {});
    expect(Keyboard.isVisible()).toBe(true);

    const view = await render(<PresentationHarness />);
    fireEvent.press(view.getByText('Request presentation'));

    expect(view.queryByText('Sheet content')).toBeNull();

    await act(() => DeviceEventEmitter.emit('keyboardDidHide', {}));

    expect(view.getByText('Sheet content')).toBeOnTheScreen();
  });
});
