import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ApiClientProvider } from '@/api/ApiClientProvider';
import { AuthProvider } from '@/auth/AuthProvider';
import { useAuth } from '@/auth/AuthContext';
import { useQueryHydration } from '@/query/QueryHydrationContext';
import { QueryProvider } from '@/query/QueryProvider';
import { SplashScreenController } from '@/components/shell/SplashScreenController';
import { SpringaColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();
  const { isHydrated } = useQueryHydration();
  // Do not treat "loading" as signed-out — that mounts login under the splash.
  const signedIn = status === 'signedIn' && isHydrated;
  const signedOut = status === 'signedOut' && isHydrated;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SpringaColors.bg },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="workout/[id]"
          options={{
            presentation: 'card',
            headerShown: true,
            headerTintColor: SpringaColors.brandText,
            headerStyle: { backgroundColor: SpringaColors.surface },
            headerTitleStyle: { color: SpringaColors.text },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: SpringaColors.surface },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="login" />
        <Stack.Screen name="qa-login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ApiClientProvider>
          <StatusBar style="light" />
          <SplashScreenController />
          <RootNavigator />
        </ApiClientProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
