import { render, screen, waitFor } from '@testing-library/react-native';
import { DeviceEventEmitter, ScrollView, TextInput } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { useScrollAboveKeyboard } from './useScrollAboveKeyboard';

function Harness({
  extraOffset = 16,
  onScrollTo,
}: {
  extraOffset?: number;
  onScrollTo: (params: { y: number; animated: boolean }) => void;
}) {
  const { scrollRef, onInputFocus, onScroll } = useScrollAboveKeyboard(extraOffset);

  return (
    <ScrollView
      ref={(node) => {
        if (node != null) {
          Object.assign(scrollRef, { current: { scrollTo: onScrollTo } });
        }
      }}
      onScroll={onScroll}
      testID="scroll-view"
    >
      <TextInput
        testID="input"
        onFocus={() => {
          onInputFocus({
            measureInWindow: (
              cb: (x: number, y: number, width: number, height: number) => void,
            ) => cb(0, 450, 200, 80),
          } as unknown as TextInput);
        }}
      />
    </ScrollView>
  );
}

describe('useScrollAboveKeyboard', () => {
  it('scrolls target above keyboard on keyboardDidShow', async () => {
    const scrollToMock = vi.fn();
    await render(<Harness extraOffset={16} onScrollTo={scrollToMock} />);

    screen.getByTestId('scroll-view').props.onScroll({
      nativeEvent: { contentOffset: { y: 120 } },
    });

    screen.getByTestId('input').props.onFocus();

    DeviceEventEmitter.emit('keyboardDidShow', {
      endCoordinates: { screenY: 500 },
    });

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith({
        y: 166,
        animated: true,
      });
    });
  });
});
