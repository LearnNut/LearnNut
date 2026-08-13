import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

const stepContent = [
  {
    eyebrow: 'ADD A LINK',
    description: 'Paste a video or webpage URL. We’ll keep it on this device for this preview.',
  },
  {
    eyebrow: 'LABEL IT',
    description: 'Give the source a clear label and add an optional folder name.',
  },
  {
    eyebrow: 'LOCAL PREVIEW',
    description: 'Check the details below. Nothing has been uploaded, processed or saved.',
  },
] as const;

type Step = 0 | 1 | 2;

function isValidHttpUrl(value: string) {
  const trimmedValue = value.trim();

  if (!/^https?:\/\//i.test(trimmedValue)) {
    return false;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && Boolean(parsedUrl.hostname);
  } catch {
    return false;
  }
}

export default function AddSourceScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<Step>(0);
  const [sourceUrl, setSourceUrl] = useState('');
  const [hasUrlBeenEdited, setHasUrlBeenEdited] = useState(false);
  const [hasUrlBeenBlurred, setHasUrlBeenBlurred] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('');
  const [folderName, setFolderName] = useState('');

  const isNarrow = width < 390;
  const currentContent = stepContent[step];
  const trimmedUrl = sourceUrl.trim();
  const trimmedLabel = sourceLabel.trim();
  const trimmedFolder = folderName.trim();
  const isUrlValid = isValidHttpUrl(trimmedUrl);
  const isLabelValid = trimmedLabel.length > 0;
  const canContinue = step === 0 ? isUrlValid : step === 1 ? isLabelValid : true;
  const showUrlError = hasUrlBeenEdited && hasUrlBeenBlurred && !isUrlValid;

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
    AccessibilityInfo.announceForAccessibility(`Add Source, step ${step + 1} of ${stepContent.length}`);
  }, [step]);

  const returnHome = () => {
    Keyboard.dismiss();

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  };

  const goBack = () => {
    Keyboard.dismiss();

    if (step === 0) {
      returnHome();
      return;
    }

    setStep((step - 1) as Step);
  };

  const goForward = () => {
    if (!canContinue) {
      return;
    }

    Keyboard.dismiss();

    if (step === 0) {
      setSourceUrl(trimmedUrl);
      setStep(1);
      return;
    }

    if (step === 1) {
      setSourceLabel(trimmedLabel);
      setFolderName(trimmedFolder);
      setStep(2);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={[styles.glow, styles.glowTop]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowBottom]} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}>
          <View style={styles.screenContent}>
            <View style={styles.shell}>
              <View style={styles.topRow}>
                <Pressable
                  accessibilityHint={step === 0 ? 'Returns to Home' : `Returns to Add Source step ${step}`}
                  accessibilityLabel="Back"
                  accessibilityRole="button"
                  onPress={goBack}
                  style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
                  <Text aria-hidden style={styles.backButtonLabel}>
                    ← Back
                  </Text>
                </Pressable>

                <Text style={styles.stepLabel}>
                  STEP {step + 1} OF {stepContent.length}
                </Text>
              </View>

              <View
                accessible
                accessibilityLabel={`Add Source progress, step ${step + 1} of ${stepContent.length}`}
                accessibilityRole="progressbar"
                accessibilityValue={{ max: stepContent.length, min: 1, now: step + 1 }}
                style={styles.progressTrack}>
                {stepContent.map((content, item) => (
                  <View
                    key={content.eyebrow}
                    style={[styles.progressSegment, item <= step && styles.progressSegmentActive]}
                  />
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.cardClip}>
                  <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={[styles.cardContent, isNarrow && styles.cardContentNarrow]}
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.cardScroll}>
                    <View style={styles.headingGroup}>
                      <Text style={styles.eyebrow}>{currentContent.eyebrow}</Text>
                      <Text
                        accessibilityRole="header"
                        style={[styles.title, isNarrow && styles.titleNarrow]}>
                        What are we cracking?
                      </Text>
                      <Text style={styles.description}>{currentContent.description}</Text>
                    </View>

                    {step === 0 && (
                      <FormField
                        accessibilityHint="Enter a full web address beginning with http or https"
                        error={
                          showUrlError
                            ? 'That link doesn’t look quite right. Use a full http:// or https:// URL.'
                            : undefined
                        }
                        helper={
                          isUrlValid
                            ? 'Ready for a local preview. Nothing will be sent yet.'
                            : 'Paste the full link, including http:// or https://.'
                        }
                        kind="url"
                        label="Video or webpage URL"
                        maxLength={2048}
                        onBlur={() => setHasUrlBeenBlurred(true)}
                        onChangeText={(value) => {
                          setSourceUrl(value);
                          setHasUrlBeenEdited(true);
                        }}
                        placeholder="https://example.com/video"
                        value={sourceUrl}
                      />
                    )}

                    {step === 1 && (
                      <View style={styles.fields}>
                        <FormField
                          accessibilityHint="Enter a short name for this source"
                          helper="Required. Choose a name you will recognize later."
                          label="Source label"
                          maxLength={100}
                          onChangeText={setSourceLabel}
                          placeholder="E.g. How memory works"
                          value={sourceLabel}
                        />

                        <FormField
                          accessibilityHint="Optionally enter a folder name for this source"
                          helper="Optional. Leave this blank if you do not need a folder."
                          label="Folder name"
                          maxLength={100}
                          onChangeText={setFolderName}
                          optional
                          placeholder="E.g. Brain science"
                          value={folderName}
                        />
                      </View>
                    )}

                    {step === 2 && (
                      <View style={styles.previewSection}>
                        <View style={styles.previewCard}>
                          <PreviewItem label="URL" value={trimmedUrl} />
                          <View style={styles.previewDivider} />
                          <PreviewItem label="Label" value={trimmedLabel} />
                          <View style={styles.previewDivider} />
                          <PreviewItem label="Folder" value={trimmedFolder || 'No folder'} />
                        </View>

                        <View style={styles.localNote}>
                          <Text style={styles.localNoteEyebrow}>PREVIEW ONLY</Text>
                          <Text style={styles.localNoteText}>
                            LearnNut has not uploaded, processed or saved this source.
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.actions}>
                      <Pressable
                        accessibilityHint={
                          step === 2
                            ? 'Closes this local preview and returns to Home without saving'
                            : step === 1
                              ? 'Opens a local preview of the source details'
                              : 'Continues to source labeling'
                        }
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canContinue }}
                        disabled={!canContinue}
                        onPress={step === 2 ? returnHome : goForward}
                        style={({ pressed }) => [
                          styles.continueButton,
                          !canContinue && styles.continueButtonDisabled,
                          pressed && canContinue && styles.buttonPressed,
                        ]}>
                        <Text
                          style={[
                            styles.continueButtonLabel,
                            !canContinue && styles.continueButtonLabelDisabled,
                          ]}>
                          {step === 2 ? 'Back to Home' : step === 1 ? 'Continue to preview' : 'Continue'}
                        </Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

type FormFieldProps = {
  accessibilityHint: string;
  error?: string;
  helper: string;
  kind?: 'text' | 'url';
  label: string;
  maxLength: number;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  optional?: boolean;
  placeholder: string;
  value: string;
};

function FormField({
  accessibilityHint,
  error,
  helper,
  kind = 'text',
  label,
  maxLength,
  onBlur,
  onChangeText,
  optional = false,
  placeholder,
  value,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isUrl = kind === 'url';

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional && <Text style={styles.optionalLabel}>OPTIONAL</Text>}
      </View>

      <TextInput
        accessibilityHint={accessibilityHint}
        accessibilityLabel={`${label}${optional ? ', optional' : ''}`}
        autoCapitalize={isUrl ? 'none' : 'sentences'}
        autoComplete={isUrl ? 'url' : 'off'}
        autoCorrect={!isUrl}
        inputMode={isUrl ? 'url' : 'text'}
        keyboardType={isUrl ? 'url' : 'default'}
        maxLength={maxLength}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={Brand.colors.plumSoft}
        returnKeyType="done"
        selectionColor={Brand.colors.plum}
        style={[styles.textInput, isFocused && styles.textInputFocused, error && styles.textInputError]}
        value={value}
      />

      {error ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{error}</Text>
        </View>
      ) : (
        <Text style={styles.fieldHelper}>{helper}</Text>
      )}
    </View>
  );
}

type PreviewItemProps = {
  label: string;
  value: string;
};

function PreviewItem({ label, value }: PreviewItemProps) {
  return (
    <View style={styles.previewItem}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text selectable style={styles.previewValue}>
        {value}
      </Text>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    backgroundColor: Brand.colors.lavender,
    borderRadius: 130,
    opacity: 0.13,
  },
  glowTop: {
    top: -120,
    right: -80,
  },
  glowBottom: {
    bottom: -150,
    left: -100,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 12,
  },
  shell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  backButton: {
    minHeight: 48,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(249, 233, 208, 0.42)',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  backButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  stepLabel: {
    color: Brand.colors.creamMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 2,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(249, 233, 208, 0.2)',
    borderRadius: 999,
  },
  progressSegmentActive: {
    backgroundColor: Brand.colors.cream,
  },
  card: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Brand.colors.offWhite,
    borderRadius: 32,
    shadowColor: '#160C1D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 8,
  },
  cardClip: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
  },
  cardScroll: {
    flex: 1,
  },
  cardContent: {
    flexGrow: 1,
    gap: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 28,
  },
  cardContentNarrow: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 24,
  },
  headingGroup: {
    gap: 9,
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
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 38,
  },
  titleNarrow: {
    fontSize: 30,
    lineHeight: 36,
  },
  description: {
    maxWidth: 560,
    color: Brand.colors.plumSoft,
    fontSize: 16,
    lineHeight: 23,
  },
  fields: {
    gap: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldLabel: {
    flexShrink: 1,
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  optionalLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  textInput: {
    minHeight: 58,
    width: '100%',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 18,
    borderWidth: 2,
    color: Brand.colors.plum,
    fontSize: 17,
    lineHeight: 23,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  textInputFocused: {
    borderColor: Brand.colors.plum,
  },
  textInputError: {
    borderColor: Brand.colors.walnut,
  },
  fieldHelper: {
    color: Brand.colors.plumSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  errorMessage: {
    backgroundColor: Brand.colors.cream,
    borderLeftColor: Brand.colors.walnut,
    borderLeftWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  errorMessageText: {
    color: Brand.colors.plum,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  previewSection: {
    gap: 16,
  },
  previewCard: {
    gap: 14,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 2,
    padding: 17,
  },
  previewItem: {
    gap: 5,
  },
  previewLabel: {
    color: Brand.colors.walnut,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  previewValue: {
    flexShrink: 1,
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  previewDivider: {
    height: 1,
    backgroundColor: Brand.colors.cream,
  },
  localNote: {
    gap: 5,
    backgroundColor: Brand.colors.cream,
    borderRadius: 18,
    padding: 15,
  },
  localNoteEyebrow: {
    color: Brand.colors.walnut,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  localNoteText: {
    color: Brand.colors.plum,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 4,
  },
  continueButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  continueButtonDisabled: {
    backgroundColor: '#D7CFD5',
  },
  continueButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  continueButtonLabelDisabled: {
    color: '#746C72',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
