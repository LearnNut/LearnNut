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
import {
  getDisplayNameValidationError,
  normalizeDisplayName,
} from '@/lib/display-name';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SignUpScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);
  const submissionInProgressRef = useRef(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForSession, setWaitingForSession] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const normalizedName = normalizeDisplayName(name);
  const nameValidationError = getDisplayNameValidationError(name);
  const normalizedEmail = email.trim();
  const nameError = submitted || nameTouched ? nameValidationError ?? undefined : undefined;
  const emailError = submitted && !isValidEmailAddress(normalizedEmail) ? 'Enter a valid email address.' : undefined;
  const passwordError =
    submitted && password.length < 6 ? 'Choose a password with at least 6 characters.' : undefined;
  const confirmPasswordError =
    submitted || confirmPasswordTouched
      ? confirmPassword.length === 0
        ? 'Confirm your password.'
        : confirmPassword !== password
          ? 'Those passwords don’t match yet.'
          : undefined
      : undefined;
  const canSubmit =
    nameValidationError === null &&
    normalizedEmail.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !isSubmitting;

  useEffect(() => {
    if (waitingForSession && session !== null) {
      router.replace('/onboarding');
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

  const clearSubmissionError = () => {
    setSubmissionError(null);
  };

  const submit = async () => {
    if (submissionInProgressRef.current) {
      return;
    }

    setSubmitted(true);
    setNameTouched(true);
    setConfirmPasswordTouched(true);
    setSubmissionError(null);

    if (
      nameValidationError !== null ||
      !isValidEmailAddress(normalizedEmail) ||
      password.length < 6 ||
      confirmPassword !== password
    ) {
      return;
    }

    submissionInProgressRef.current = true;
    setIsSubmitting(true);
    let shouldWaitForSession = false;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { display_name: normalizedName },
        },
      });

      if (!mountedRef.current) {
        return;
      }

      if (error) {
        throw error;
      }

      if (data.session !== null) {
        shouldWaitForSession = true;
        setWaitingForSession(true);
      } else {
        router.replace('/check-email');
      }
    } catch (error) {
      if (mountedRef.current) {
        setSubmissionError(getFriendlyAuthError(error, 'sign-up'));
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
      description="Save what you learn and pick up where you left off."
      eyebrow="CREATE YOUR ACCOUNT"
      title="Let’s get started.">
      <Stack.Screen options={{ gestureEnabled: !isSubmitting }} />

      <View style={styles.fields}>
        <AuthTextField
          accessibilityHint="Enter your preferred name. A surname is optional"
          aria-required
          autoCapitalize="words"
          autoComplete="name"
          autoCorrect={false}
          editable={!isSubmitting}
          error={nameError}
          label="Name"
          onBlur={() => setNameTouched(true)}
          onChangeText={(value) => {
            setName(value);
            clearSubmissionError();
          }}
          onSubmitEditing={() => emailInputRef.current?.focus()}
          placeholder="Your preferred name"
          returnKeyType="next"
          spellCheck={false}
          textContentType="name"
          value={name}
        />

        <AuthTextField
          accessibilityHint="Enter the email address you want to use for LearnNut"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!isSubmitting}
          error={emailError}
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => {
            setEmail(value);
            clearSubmissionError();
          }}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          placeholder="you@example.com"
          ref={emailInputRef}
          returnKeyType="next"
          spellCheck={false}
          textContentType="emailAddress"
          value={email}
        />

        <AuthTextField
          accessibilityHint="Enter a password with at least 6 characters"
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={!isSubmitting}
          error={passwordError}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            clearSubmissionError();
          }}
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          onTogglePasswordVisibility={() => setPasswordVisible((visible) => !visible)}
          passwordVisible={passwordVisible}
          placeholder="At least 6 characters"
          ref={passwordInputRef}
          returnKeyType="next"
          spellCheck={false}
          textContentType="newPassword"
          value={password}
        />

        <AuthTextField
          accessibilityHint="Enter the same password again"
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          editable={!isSubmitting}
          error={confirmPasswordError}
          label="Confirm password"
          onBlur={() => setConfirmPasswordTouched(true)}
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearSubmissionError();
          }}
          onSubmitEditing={() => void submit()}
          onTogglePasswordVisibility={() => setConfirmPasswordVisible((visible) => !visible)}
          passwordVisible={confirmPasswordVisible}
          placeholder="Enter it once more"
          ref={confirmPasswordInputRef}
          returnKeyType="done"
          spellCheck={false}
          textContentType="newPassword"
          value={confirmPassword}
        />
      </View>

      {submissionError !== null && <AuthErrorMessage>{submissionError}</AuthErrorMessage>}

      <View style={styles.actions}>
        <AuthPrimaryButton
          disabled={!canSubmit}
          label="Create account"
          loadingLabel="Creating account…"
          onPress={() => void submit()}
          pending={isSubmitting}
        />
        <AuthLinkButton
          accessibilityHint="Opens the LearnNut sign in screen"
          disabled={isSubmitting}
          label="Already have an account? Sign in"
          onPress={() => router.replace('/sign-in')}
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
