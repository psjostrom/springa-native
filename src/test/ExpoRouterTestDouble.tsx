import { useEffect } from 'react';

let blurCleanup: (() => void) | undefined;

export function useFocusEffect(effect: () => void | (() => void)) {
  useEffect(() => {
    const cleanup = effect();
    blurCleanup = cleanup ?? undefined;
    return () => {
      blurCleanup = undefined;
      cleanup?.();
    };
  }, [effect]);
}

export function blurRouteForTests() {
  const cleanup = blurCleanup;
  blurCleanup = undefined;
  cleanup?.();
}
