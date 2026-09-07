import { Pressable, Text } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './AuthContext';
import { clearSession, saveSession, type Session } from './session';

function Probe() {
  const { status, signOut } = useAuth();
  return (
    <>
      <Text>{`Status: ${status}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Sign Out" onPress={() => void signOut()}>
        <Text>Sign Out</Text>
      </Pressable>
    </>
  );
}

describe('AuthProvider query client clearance', () => {
  it('clears query cache on cold start when no session exists', async () => {
    await clearSession();
    const queryClient = new QueryClient();
    queryClient.setQueryData(['test-query'], 'stale-data');
    expect(queryClient.getQueryData(['test-query'])).toBe('stale-data');

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Status: signedOut')).toBeOnTheScreen();
    });

    expect(queryClient.getQueryData(['test-query'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('clears query cache on signOut', async () => {
    const session: Session = {
      token: 'valid-token',
      email: 'runner@example.com',
      expiresAt: 2_000_000_000,
    };
    await saveSession(session);

    const queryClient = new QueryClient();
    queryClient.setQueryData(['user-query'], 'user-data');
    expect(queryClient.getQueryData(['user-query'])).toBe('user-data');

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Status: signedIn')).toBeOnTheScreen();
    });

    queryClient.setQueryData(['calendar', 'runner@example.com'], { events: [] });
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(screen.getByText('Status: signedOut')).toBeOnTheScreen();
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    await clearSession();
  });
});
