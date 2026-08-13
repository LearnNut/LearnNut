import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { Brand } from '@/constants/brand';

SplashScreen.setOptions({
  duration: 450,
  fade: true,
});

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: Brand.colors.offWhite },
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="home" />
      <Stack.Screen name="add-source" />
    </Stack>
  );
}
