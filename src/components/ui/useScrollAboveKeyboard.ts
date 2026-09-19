import { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
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
  const currentKeyboardHeight = useRef<number>(0);
  const lastKeyboardTop = useRef<number | null>(null);

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
    const showSub = Keyboard.addListener('keyboardDidShow', (keyboardEvent) => {
      const height = keyboardEvent.endCoordinates?.height;
      const keyboardTop =
        height != null && height > 0
          ? Dimensions.get('window').height - height
          : keyboardEvent.endCoordinates?.screenY;

      if (height != null && height > 0) {
        currentKeyboardHeight.current = height;
      }
      if (keyboardTop != null) {
        lastKeyboardTop.current = keyboardTop;
      }

      const target = pendingEditorTarget.current;
      if (target == null || keyboardTop == null) return;
      pendingEditorTarget.current = null;
      requestAnimationFrame(() => {
        scrollToEditor(target, keyboardTop);
      });
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      currentKeyboardHeight.current = 0;
      lastKeyboardTop.current = null;
      pendingEditorTarget.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToEditor]);

  const onInputFocus = useCallback(
    (target: TextInput) => {
      if (Platform.OS !== 'android') return;
      if (lastKeyboardTop.current != null) {
        scrollToEditor(target, lastKeyboardTop.current);
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
