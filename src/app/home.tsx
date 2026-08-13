import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const mountedRef = useRef(true);
  const signOutInProgressRef = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false);

  useEffect(
    () => {
      mountedRef.current = true;

      return () => {
        mountedRef.current = false;
      };
    },
    [],
  );

  const performSignOut = async () => {
    if (signOutInProgressRef.current) {
      return;
    }

    signOutInProgressRef.current = true;
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
    } catch (error) {
      if (mountedRef.current) {
        setShowSignOutConfirmation(false);
        setSignOutError(getFriendlyAuthError(error, 'sign-out'));
      }
    } finally {
      signOutInProgressRef.current = false;

      if (mountedRef.current) {
        setIsSigningOut(false);
      }
    }
  };

  const confirmSignOut = () => {
    if (signOutInProgressRef.current) {
      return;
    }

    setShowSignOutConfirmation(true);
  };

  const dismissSignOutConfirmation = () => {
    if (!signOutInProgressRef.current) {
      setShowSignOutConfirmation(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.utilityRow}>
            <Text style={styles.eyebrow}>LEARNNUT</Text>
            <Pressable
              accessibilityHint="Asks for confirmation before signing out of LearnNut"
              accessibilityRole="button"
              accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
              disabled={isSigningOut}
              onPress={confirmSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                isSigningOut && styles.signOutButtonDisabled,
                pressed && !isSigningOut && styles.buttonPressed,
              ]}>
              <Text style={styles.signOutButtonLabel}>{isSigningOut ? 'Signing out…' : 'Sign out'}</Text>
            </Pressable>
          </View>

          {signOutError !== null && (
            <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.signOutError}>
              <Text style={styles.signOutErrorText}>{signOutError}</Text>
            </View>
          )}

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                What would you like to learn today?
              </Text>
            </View>
            <View accessible accessibilityLabel="Current learning streak: zero days" style={styles.streak}>
              <Text style={styles.streakNumber}>0</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>START A LESSON</Text>
            <Text style={styles.heroTitle}>Turn a source into something you can teach.</Text>
            <Text style={styles.heroBody}>
              Add a video, PDF, audio file or text. LearnNut will build a grounded learning session.
            </Text>
            <Pressable
              accessibilityHint="Opens the Add Source flow for a video or webpage link"
              accessibilityRole="button"
              onPress={() => router.push('/add-source')}
              style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}>
              <Text style={styles.addButtonLabel}>＋ Add your first source</Text>
            </Pressable>
            <Pressable
              accessibilityHint="Opens sources saved on this device"
              accessibilityRole="button"
              onPress={() => router.push('/library')}
              style={({ pressed }) => [styles.libraryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.libraryButtonLabel}>Open Library</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your learning loop</Text>
            <Text style={styles.sectionMeta}>4 steps</Text>
          </View>

          <View style={styles.steps}>
            {[
              ['01', 'Learn', 'Watch or read with source bookmarks.'],
              ['02', 'Prove', 'Answer questions and inspect the evidence.'],
              ['03', 'Teach', 'Explain it to Milo, Ari and Nova.'],
              ['04', 'Keep', 'Repair gaps and return for short reviews.'],
            ].map(([number, title, body]) => (
              <View key={number} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{number}</Text>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={styles.stepBody}>{body}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={dismissSignOutConfirmation}
        transparent
        visible={showSignOutConfirmation}>
        <SafeAreaView
          style={styles.confirmationOverlay}
          edges={['top', 'bottom', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={styles.confirmationScrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.confirmationScroll}>
            <View accessibilityViewIsModal style={styles.confirmationCard}>
              <View style={styles.confirmationCopy}>
                <Text accessibilityRole="header" style={styles.confirmationTitle}>
                  Sign out?
                </Text>
                <Text style={styles.confirmationBody}>
                  You’ll need to sign in again to continue learning.
                </Text>
              </View>

              <View style={styles.confirmationActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSigningOut }}
                  disabled={isSigningOut}
                  onPress={dismissSignOutConfirmation}
                  style={({ pressed }) => [
                    styles.confirmationButton,
                    isSigningOut && styles.confirmationButtonDisabled,
                    pressed && !isSigningOut && styles.buttonPressed,
                  ]}>
                  <Text style={styles.cancelSignOutButtonLabel}>Stay signed in</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
                  disabled={isSigningOut}
                  onPress={() => void performSignOut()}
                  style={({ pressed }) => [
                    styles.confirmSignOutButton,
                    isSigningOut && styles.confirmationButtonDisabled,
                    pressed && !isSigningOut && styles.buttonPressed,
                  ]}>
                  <Text style={styles.confirmSignOutButtonLabel}>
                    {isSigningOut ? 'Signing out…' : 'Sign out'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.colors.offWhite,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 24,
    paddingHorizontal: 22,
    paddingBottom: 48,
    paddingTop: 18,
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  signOutButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  signOutButtonDisabled: {
    opacity: 0.58,
  },
  signOutButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '800',
  },
  signOutError: {
    backgroundColor: Brand.colors.cream,
    borderColor: Brand.colors.walnut,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  signOutErrorText: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  confirmationOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(53, 34, 66, 0.68)',
    padding: 22,
  },
  confirmationScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmationScroll: {
    width: '100%',
    maxWidth: 420,
  },
  confirmationCard: {
    width: '100%',
    maxWidth: 420,
    gap: 22,
    backgroundColor: Brand.colors.offWhite,
    borderColor: Brand.colors.cream,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
  },
  confirmationCopy: {
    gap: 8,
  },
  confirmationTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31,
  },
  confirmationBody: {
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  confirmationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  confirmationButton: {
    minHeight: 52,
    minWidth: 140,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  confirmSignOutButton: {
    minHeight: 52,
    minWidth: 140,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  confirmationButtonDisabled: {
    opacity: 0.58,
  },
  cancelSignOutButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmSignOutButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 37,
    marginTop: 6,
    maxWidth: 280,
  },
  streak: {
    minWidth: 66,
    alignItems: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  streakNumber: {
    color: Brand.colors.plum,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 23,
  },
  streakLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '700',
  },
  heroCard: {
    gap: 13,
    backgroundColor: Brand.colors.plum,
    borderRadius: 28,
    padding: 24,
    shadowColor: Brand.colors.plum,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  heroEyebrow: {
    color: Brand.colors.lavender,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroBody: {
    color: Brand.colors.creamMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  addButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 18,
    marginTop: 4,
    paddingHorizontal: 18,
  },
  addButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
  },
  libraryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(249, 233, 208, 0.5)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  libraryButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 21,
    fontWeight: '800',
  },
  sectionMeta: {
    color: Brand.colors.plumSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  steps: {
    gap: 11,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  stepNumber: {
    color: Brand.colors.walnut,
    fontFamily: Brand.fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    color: Brand.colors.plum,
    fontSize: 17,
    fontWeight: '800',
  },
  stepBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
