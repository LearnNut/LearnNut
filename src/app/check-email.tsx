import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuthPrimaryButton, AuthScreen } from '@/components/auth-screen';
import { Brand } from '@/constants/brand';
import { useAuth } from '@/providers/auth-provider';

export default function CheckEmailScreen() {
  const router = useRouter();
  const { session } = useAuth();

  if (session !== null) {
    return <Redirect href="/home" />;
  }

  return (
    <AuthScreen
      description="Open the confirmation link we sent you. Then come back and sign in to LearnNut."
      eyebrow="ONE MORE STEP"
      title="Check your email">
      <View accessible accessibilityLabel="Confirmation email sent" style={styles.mailBadge}>
        <Text accessible={false} style={styles.mailBadgeText}>
          ✓
        </Text>
      </View>

      <Text style={styles.note}>
        It can take a minute to arrive. You may also want to check your spam or junk folder.
      </Text>

      <AuthPrimaryButton
        disabled={false}
        label="Back to sign in"
        loadingLabel="Back to sign in"
        onPress={() => router.replace('/sign-in')}
        pending={false}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  mailBadge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 24,
  },
  mailBadgeText: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 34,
    fontWeight: '900',
  },
  note: {
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
