import { render, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProviderForTests, type AuthValue } from '@/auth/AuthContext';
import { QueryHydrationContext } from '@/query/QueryHydrationContext';
import { SplashScreenController } from './SplashScreenController';

const hideAsyncSpy = vi.spyOn(SplashScreen, 'hideAsync');

function renderController(authStatus: AuthValue['status'], isHydrated: boolean) {
  const auth: AuthValue = {
    status: authStatus,
    session: null,
    configError: null,
    signInWithGoogle: async () => {},
    signInWithQaToken: async () => {},
    signOut: async () => {},
  };

  return render(
    <AuthProviderForTests value={auth}>
      <QueryHydrationContext.Provider value={{ isHydrated }}>
        <SplashScreenController />
      </QueryHydrationContext.Provider>
    </AuthProviderForTests>,
  );
}

describe('SplashScreenController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps splash screen visible when auth status is loading', () => {
    renderController('loading', true);
    expect(hideAsyncSpy).not.toHaveBeenCalled();
  });

  it('keeps splash screen visible when query cache is not yet hydrated', () => {
    renderController('signedIn', false);
    expect(hideAsyncSpy).not.toHaveBeenCalled();
  });

  it('hides splash screen when auth is resolved and query cache is hydrated', async () => {
    renderController('signedIn', true);
    await waitFor(() => expect(hideAsyncSpy).toHaveBeenCalledTimes(1));
  });

  it('hides splash screen when signed out and query cache is hydrated', async () => {
    renderController('signedOut', true);
    await waitFor(() => expect(hideAsyncSpy).toHaveBeenCalledTimes(1));
  });
});
