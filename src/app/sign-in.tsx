import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, TextInput, View } from 'react-native';

import {
  AuthErrorMessage,
  AuthLinkButton,
  AuthPrimaryButton,
  AuthScreen,
  AuthTextField,
} from '@/components/auth-screen';
import { getFriendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SignInScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);
  const submissionInProgressRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForSession, setWaitingForSession] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const normalizedEmail = email.trim();
  const emailError = submitted && !isValidEmailAddress(normalizedEmail) ? 'Enter a valid email address.' : undefined;
  const passwordError = submitted && password.length === 0 ? 'Enter your password.' : undefined;
  const canSubmit = normalizedEmail.length > 0 && password.length > 0 && !isSubmitting;

  useEffect(() => {
    if (waitingForSession && session !== null) {
      router.replace('/home');
    }
  }, [router, session, waitingForSession]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isSubmitting || Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => subscription.remove();
  }, [isSubmitting]);

  const submit = async () => {
    if (submissionInProgressRef.current) {
      return;
    }

    setSubmitted(true);
    setSubmissionError(null);

    if (!isValidEmailAddress(normalizedEmail) || password.length === 0) {
      return;
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    let shouldWaitForSession = false;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!mountedRef.current) {
        return;
      }

      if (error) {
        throw error;
      }

      shouldWaitForSession = true;
      setWaitingForSession(true);
    } catch (error) {
      if (mountedRef.current) {
        setSubmissionError(getFriendlyAuthError(error, 'sign-in'));
      }
    } finally {
      if (!shouldWaitForSession) {
        submissionInProgressRef.current = false;

        if (mountedRef.current) {
          setIsSubmitting(false);
        }
      }
    }
  };

  if (session !== null && !isSubmitting && !waitingForSession) {
    return <Redirect href="/home" />;
  }

  return (
    <AuthScreen
      description="Sign in to continue your LearnNut journey."
      eyebrow="WELCOME BACK"
      title="Keep learning.">
      <Stack.Screen options={{ gestureEnabled: !isSubmitting }} />

      <View style={styles.fields}>
        <AuthTextField
          accessibilityHint="Enter the email address for your LearnNut account"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!isSubmitting}
          error={emailError}
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => {
            setEmail(value);
            setSubmissionError(null);
          }}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          placeholder="you@example.com"
          returnKeyType="next"
          spellCheck={false}
          textContentType="emailAddress"
          value={email}
        />

        <AuthTextField
          accessibilityHint="Enter your LearnNut password"
          autoCapitalize="none"
          autoComplete="current-password"
          autoCorrect={false}
          editable={!isSubmitting}
          error={passwordError}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            setSubmissionError(null);
          }}
          onSubmitEditing={() => void submit()}
          onTogglePasswordVisibility={() => setPasswordVisible((visible) => !visible)}
          passwordVisible={passwordVisible}
          placeholder="Your password"
          ref={passwordInputRef}
          returnKeyType="done"
          spellCheck={false}
          textContentType="password"
          value={password}
        />
      </View>

      {submissionError !== null && <AuthErrorMessage>{submissionError}</AuthErrorMessage>}

      <View style={styles.actions}>
        <AuthPrimaryButton
          disabled={!canSubmit}
          label="Sign in"
          loadingLabel="Signing in…"
          onPress={() => void submit()}
          pending={isSubmitting}
        />
        <AuthLinkButton
          accessibilityHint="Opens the LearnNut account creation screen"
          disabled={isSubmitting}
          label="New to LearnNut? Create an account"
          onPress={() => router.replace('/sign-up')}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 16,
  },
  actions: {
    gap: 12,
  },
});
