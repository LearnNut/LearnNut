import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { useAuth } from '@/providers/auth-provider';

const howItWorks = [
  ['01', 'Add', 'Save a webpage or video link on this device.'],
  ['02', 'Find', 'Search by label, folder or URL, or browse your Library.'],
  ['03', 'Return', 'Open the source details and revisit the original whenever you’re ready.'],
] as const;

export default function MeScreen() {
  const { signOut, user } = useAuth();
  const { width } = useWindowDimensions();
  const mountedRef = useRef(true);
  const signOutInProgressRef = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false);
  const isNarrow = width < 390;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    if (!signOutInProgressRef.current) {
      setShowSignOutConfirmation(true);
    }
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
        <ScrollView
          contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headingGroup}>
            <Text style={styles.eyebrow}>YOUR SPACE</Text>
            <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
              Me
            </Text>
            <Text style={styles.description}>Your LearnNut account and a quick guide to the app.</Text>
          </View>

          <View style={styles.accountCard}>
            <View aria-hidden style={styles.accountMark}>
              <Text style={styles.accountMarkLabel}>L</Text>
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountEyebrow}>SIGNED IN AS</Text>
              <Text selectable style={styles.accountEmail}>
                {user?.email ?? 'LearnNut account'}
              </Text>
              <Text style={styles.accountNote}>Your saved sources remain local to this device.</Text>
            </View>
          </View>

          <View style={styles.guideSection}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              How LearnNut works
            </Text>
            <View style={styles.guideList}>
              {howItWorks.map(([number, title, body]) => (
                <View key={number} style={styles.guideRow}>
                  <Text aria-hidden style={styles.guideNumber}>
                    {number}
                  </Text>
                  <View style={styles.guideCopy}>
                    <Text style={styles.guideTitle}>{title}</Text>
                    <Text style={styles.guideBody}>{body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.signOutSection}>
            <View style={styles.signOutCopy}>
              <Text style={styles.signOutTitle}>Finished for now?</Text>
              <Text style={styles.signOutBody}>You can sign back in whenever you want to return.</Text>
            </View>

            {signOutError !== null && (
              <View
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.signOutError}>
                <Text style={styles.signOutErrorText}>{signOutError}</Text>
              </View>
            )}

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
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 24,
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 18,
  },
  contentNarrow: {
    gap: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  headingGroup: {
    gap: 7,
  },
  eyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 46,
  },
  titleNarrow: {
    fontSize: 36,
    lineHeight: 42,
  },
  description: {
    color: Brand.colors.plumSoft,
    fontSize: 16,
    lineHeight: 23,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Brand.colors.plum,
    borderRadius: 24,
    padding: 20,
  },
  accountMark: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 18,
  },
  accountMarkLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 28,
    fontWeight: '900',
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  accountEyebrow: {
    color: Brand.colors.creamMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  accountEmail: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  accountNote: {
    color: Brand.colors.creamMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  guideSection: {
    gap: 13,
  },
  sectionTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 21,
    fontWeight: '800',
  },
  guideList: {
    gap: 10,
  },
  guideRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  guideNumber: {
    color: Brand.colors.plumSoft,
    fontFamily: Brand.fonts.rounded,
    fontSize: 14,
    fontWeight: '900',
  },
  guideCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  guideTitle: {
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
  },
  guideBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  signOutSection: {
    gap: 14,
    backgroundColor: Brand.colors.cream,
    borderRadius: 22,
    padding: 18,
  },
  signOutCopy: {
    gap: 4,
  },
  signOutTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  signOutBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  signOutButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.plumSoft,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 18,
  },
  signOutButtonDisabled: {
    opacity: 0.58,
  },
  signOutButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
  },
  signOutError: {
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.walnut,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  signOutErrorText: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
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
});
