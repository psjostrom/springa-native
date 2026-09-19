import { useEffect } from 'react';

let blurCleanup: (() => void) | undefined;
let currentParams: Record<string, any> = {};
const routerHistory: any[] = [];

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

export function useRouter() {
  return {
    push: (href: any) => {
      routerHistory.push(href);
    },
    replace: (href: any) => {
      routerHistory.push(href);
    },
    back: () => {
      routerHistory.push('..');
    },
    setParams: (params: any) => {
      Object.assign(currentParams, params);
    },
    canGoBack: () => true,
  };
}

export function useLocalSearchParams<T = Record<string, string>>(): T {
  return currentParams as T;
}

export function setLocalSearchParamsForTests(params: Record<string, any>) {
  currentParams = { ...params };
}

export function getRouterHistoryForTests() {
  return [...routerHistory];
}

export function clearRouterHistoryForTests() {
  routerHistory.length = 0;
  currentParams = {};
}
