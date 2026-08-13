import {
  forwardRef,
  type PropsWithChildren,
  type ReactNode,
  useId,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

type AuthScreenProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

type AuthTextFieldProps = Omit<TextInputProps, 'onChangeText' | 'style' | 'value'> & {
  accessibilityHint: string;
  error?: string;
  label: string;
  onChangeText: (value: string) => void;
  onTogglePasswordVisibility?: () => void;
  passwordVisible?: boolean;
  value: string;
};

type AuthPrimaryButtonProps = {
  disabled: boolean;
  label: string;
  loadingLabel: string;
  onPress: () => void;
  pending: boolean;
};

type AuthLinkButtonProps = {
  accessibilityHint: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function AuthScreen({ children, description, eyebrow, title }: AuthScreenProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 390;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={[styles.glow, styles.glowTop]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowBottom]} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, isNarrow && styles.scrollContentNarrow]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.shell}>
              <View style={styles.brandRow}>
                <View accessible={false} style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>L</Text>
                </View>
                <Text style={styles.brandName}>LearnNut</Text>
              </View>

              <View style={[styles.card, isNarrow && styles.cardNarrow]}>
                <View style={styles.headingGroup}>
                  <Text style={styles.eyebrow}>{eyebrow}</Text>
                  <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
                    {title}
                  </Text>
                  <Text style={styles.description}>{description}</Text>
                </View>

                {children}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(function AuthTextField(
  {
    accessibilityHint,
    error,
    label,
    onBlur,
    onChangeText,
    onFocus,
    onTogglePasswordVisibility,
    passwordVisible = false,
    value,
    ...inputProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const errorId = useId();
  const isPassword = onTogglePasswordVisibility !== undefined;
  const isDisabled = inputProps.editable === false;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputFrame,
          focused && styles.inputFrameFocused,
          error !== undefined && styles.inputFrameError,
        ]}>
        <TextInput
          {...inputProps}
          aria-describedby={error !== undefined ? errorId : undefined}
          aria-invalid={error !== undefined}
          accessibilityHint={error === undefined ? accessibilityHint : `${accessibilityHint}. Error: ${error}`}
          accessibilityLabel={label}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          ref={ref}
          secureTextEntry={isPassword ? !passwordVisible : inputProps.secureTextEntry}
          selectionColor={Brand.colors.walnut}
          placeholderTextColor={inputProps.placeholderTextColor ?? Brand.colors.plumSoft}
          style={styles.input}
          value={value}
        />

        {isPassword && (
          <Pressable
            accessibilityLabel={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
            disabled={isDisabled}
            hitSlop={4}
            onPress={onTogglePasswordVisibility}
            style={({ pressed }) => [
              styles.visibilityButton,
              isDisabled && styles.visibilityButtonDisabled,
              pressed && !isDisabled && styles.buttonPressed,
            ]}>
            <Text style={styles.visibilityLabel}>{passwordVisible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>

      {error !== undefined && (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          nativeID={errorId}
          style={styles.fieldError}>
          {error}
        </Text>
      )}
    </View>
  );
});

export function AuthErrorMessage({ children }: { children: ReactNode }) {
  return (
    <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorMessage}>
      <Text style={styles.errorMessageText}>{children}</Text>
    </View>
  );
}

export function AuthPrimaryButton({
  disabled,
  label,
  loadingLabel,
  onPress,
  pending,
}: AuthPrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: pending, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      {pending && <ActivityIndicator color={Brand.colors.cream} size="small" />}
      <Text style={[styles.primaryButtonLabel, disabled && styles.primaryButtonLabelDisabled]}>
        {pending ? loadingLabel : label}
      </Text>
    </Pressable>
  );
}

export function AuthLinkButton({
  accessibilityHint,
  disabled = false,
  label,
  onPress,
}: AuthLinkButtonProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkButton,
        disabled && styles.linkButtonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      <Text style={[styles.linkButtonLabel, disabled && styles.linkButtonLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.colors.plum,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    backgroundColor: Brand.colors.lavender,
    borderRadius: 130,
    opacity: 0.09,
  },
  glowTop: {
    top: -110,
    right: -90,
  },
  glowBottom: {
    bottom: -130,
    left: -110,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  scrollContentNarrow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  shell: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 10,
  },
  brandMark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 12,
  },
  brandMarkText: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '900',
  },
  brandName: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
  },
  card: {
    gap: 22,
    backgroundColor: Brand.colors.offWhite,
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 7,
  },
  cardNarrow: {
    borderRadius: 26,
    padding: 20,
  },
  headingGroup: {
    gap: 8,
  },
  eyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 40,
  },
  titleNarrow: {
    fontSize: 30,
    lineHeight: 36,
  },
  description: {
    color: Brand.colors.plumSoft,
    fontSize: 16,
    lineHeight: 23,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
  },
  inputFrame: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.plumSoft,
    borderRadius: 18,
    borderWidth: 2,
    paddingLeft: 16,
  },
  inputFrameFocused: {
    borderColor: Brand.colors.plum,
  },
  inputFrameError: {
    borderColor: Brand.colors.plum,
  },
  input: {
    minWidth: 0,
    minHeight: 54,
    flex: 1,
    color: Brand.colors.plum,
    fontSize: 17,
    paddingRight: 12,
    paddingVertical: 12,
  },
  visibilityButton: {
    minWidth: 58,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  visibilityLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    fontWeight: '800',
  },
  visibilityButtonDisabled: {
    opacity: 0.55,
  },
  fieldError: {
    color: Brand.colors.plum,
    fontSize: 13,
    lineHeight: 18,
  },
  errorMessage: {
    backgroundColor: Brand.colors.cream,
    borderColor: Brand.colors.walnut,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorMessageText: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Brand.colors.plum,
    borderRadius: 19,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    backgroundColor: Brand.colors.creamMuted,
  },
  primaryButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButtonLabelDisabled: {
    color: Brand.colors.plumSoft,
  },
  linkButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Brand.colors.cream,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkButtonDisabled: {
    opacity: 0.55,
  },
  linkButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  linkButtonLabelDisabled: {
    color: Brand.colors.plumSoft,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
