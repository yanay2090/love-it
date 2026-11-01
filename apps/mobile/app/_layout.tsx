import 'react-native-gesture-handler';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/src/store';
import { colors } from '@/src/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.cream }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.cream },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="place/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="u/[handle]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="find-friends" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
            <Stack.Screen name="import" options={{ presentation: 'modal' }} />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
