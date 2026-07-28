import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';

import { pokerTheme } from '@/constants/theme';
import { TournamentProvider } from '@/lib/tournament-store';

if (Platform.OS === 'web') {
  LogBox.ignoreAllLogs();
}

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <TournamentProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: pokerTheme.background },
          headerTintColor: pokerTheme.text,
          contentStyle: { backgroundColor: pokerTheme.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Poker Asso', headerShown: false }} />
        <Stack.Screen
          name="create"
          options={{ title: 'Configurer le tournoi', headerBackTitle: 'Accueil' }}
        />
        <Stack.Screen
          name="control/[roomId]"
          options={{ title: 'Contrôle tournoi', headerBackTitle: 'Accueil' }}
        />
        <Stack.Screen
          name="display/[roomId]"
          options={{ title: 'Affichage', headerShown: false }}
        />
      </Stack>
    </TournamentProvider>
  );
}
