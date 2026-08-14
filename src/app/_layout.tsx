import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.setOptions({
  duration: 450,
  fade: true,
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { loading, session } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        contentStyle: { backgroundColor: Brand.colors.offWhite },
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="check-email" />

      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="review/[id]" />
        <Stack.Screen name="source/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

function AuthLoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View accessibilityLiveRegion="polite" accessibilityRole="progressbar" style={styles.loadingContent}>
          <View accessible={false} style={styles.loadingMark}>
            <Text style={styles.loadingMarkText}>L</Text>
          </View>
          <Text style={styles.loadingTitle}>LearnNut</Text>
          <ActivityIndicator color={Brand.colors.cream} size="small" />
          <Text style={styles.loadingMessage}>Opening your learning space…</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Brand.colors.plum,
  },
  loadingSafeArea: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    padding: 24,
  },
  loadingMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 19,
  },
  loadingMarkText: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 31,
    fontWeight: '900',
  },
  loadingTitle: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 27,
    fontWeight: '800',
  },
  loadingMessage: {
    color: Brand.colors.creamMuted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
