import { useCallback, useEffect, useRef } from 'react';
import {
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type TextInput,
} from 'react-native';
import { Spacing } from '@/theme/tokens';

export function useScrollAboveKeyboard(extraOffset: number = Spacing.lg) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const pendingEditorTarget = useRef<TextInput | null>(null);

  const scrollToEditor = useCallback(
    (target: TextInput, keyboardY: number) => {
      target.measureInWindow((_x, y, _width, height) => {
        const overlap = y + height + extraOffset - keyboardY;
        if (overlap <= 0) return;
        scrollRef.current?.scrollTo({
          y: scrollOffsetY.current + overlap,
          animated: true,
        });
      });
    },
    [extraOffset],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = Keyboard.addListener('keyboardDidShow', (keyboardEvent) => {
      const target = pendingEditorTarget.current;
      if (target == null) return;
      pendingEditorTarget.current = null;
      requestAnimationFrame(() => {
        scrollToEditor(target, keyboardEvent.endCoordinates.screenY);
      });
    });
    return () => subscription.remove();
  }, [scrollToEditor]);

  const onInputFocus = useCallback(
    (target: TextInput) => {
      if (Platform.OS !== 'android') return;
      const keyboardY = Keyboard.metrics()?.screenY;
      if (Keyboard.isVisible() && keyboardY != null) {
        scrollToEditor(target, keyboardY);
        return;
      }
      pendingEditorTarget.current = target;
    },
    [scrollToEditor],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  return {
    scrollRef,
    onInputFocus,
    onScroll,
  };
}
