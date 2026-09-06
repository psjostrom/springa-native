import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useQueryHydration } from '@/query/QueryHydrationContext';

export function SplashScreenController() {
  const { status } = useAuth();
  const { isHydrated } = useQueryHydration();

  useEffect(() => {
    if (status !== 'loading' && isHydrated) {
      void SplashScreen.hideAsync();
    }
  }, [status, isHydrated]);

  return null;
}
