import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

const learnNutIcon = require('../../assets/images/learnnut-icon.png');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="LearnNut brain and walnut logo"
            source={learnNutIcon}
            style={styles.logo}
          />

          <View style={styles.copy}>
            <Text accessibilityRole="header" style={styles.title}>
              LearnNut
            </Text>
            <Text style={styles.tagline}>Crack it. Teach it. Keep it.</Text>
            <Text style={styles.description}>
              Turn anything you watch or read into knowledge you can explain and remember.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityHint="Opens the four-step LearnNut onboarding"
            accessibilityRole="button"
            onPress={() => router.navigate('/onboarding')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.primaryButtonLabel}>Get started</Text>
          </Pressable>

          <Text style={styles.reassurance}>Learn at your pace. There is no need to rush.</Text>
        </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  reassurance: {
    color: Brand.colors.creamMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
