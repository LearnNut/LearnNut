import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useAuth } from '@/providers/auth-provider';

const learnNutIcon = require('../../assets/images/learnnut-icon.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 390;

  if (session !== null) {
    return <Redirect href="/home" />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel="LearnNut brain and walnut logo"
              source={learnNutIcon}
              style={[styles.logo, isNarrow && styles.logoNarrow]}
            />

            <View style={styles.copy}>
              <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
                LearnNut
              </Text>
              <Text style={styles.tagline}>Learn it. Teach it. Remember it.</Text>
              <Text style={styles.description}>
                Turn anything you watch or read into knowledge you can explain and remember.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityHint="Opens LearnNut account creation"
              accessibilityRole="button"
              onPress={() => router.navigate('/sign-up')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.primaryButtonLabel}>Get started</Text>
            </Pressable>

            <Pressable
              accessibilityHint="Opens the LearnNut sign in screen"
              accessibilityRole="button"
              onPress={() => router.navigate('/sign-in')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonLabel}>I already have an account</Text>
            </Pressable>

            <Text style={styles.reassurance}>Learn at your pace. There is no need to rush.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.colors.plum,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  contentNarrow: {
    paddingHorizontal: 18,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 24,
  },
  logo: {
    width: 190,
    height: 190,
    borderRadius: 44,
  },
  logoNarrow: {
    width: 154,
    height: 154,
    borderRadius: 36,
  },
  copy: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 420,
  },
  title: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 54,
    textAlign: 'center',
  },
  titleNarrow: {
    fontSize: 42,
    lineHeight: 48,
  },
  tagline: {
    color: Brand.colors.lavender,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
    textAlign: 'center',
  },
  description: {
    color: Brand.colors.creamMuted,
    fontSize: 17,
    lineHeight: 25,
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    gap: 14,
    paddingTop: 24,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    paddingHorizontal: 24,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(249, 233, 208, 0.58)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
  },
  secondaryButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  reassurance: {
    color: Brand.colors.creamMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
