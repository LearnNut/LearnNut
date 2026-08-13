import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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

const purposes = [
  'Learn for fun',
  'Study or education',
  'Grow at work',
  'Expand my knowledge',
  'Strengthen my learning habits',
] as const;

const ageRanges = [
  'Under 18',
  '18–24',
  '25–39',
  '40–59',
  '60+',
  'Prefer not to say',
] as const;

const interests = [
  'Science',
  'History',
  'Technology',
  'Health',
  'Art',
  'Finance',
  'Languages',
  'Philosophy',
  'Practical skills',
] as const;

const dailyTimes = ['5 minutes', '10 minutes', '20 minutes', '30+ minutes', 'Decide each time'] as const;

const otherOption = 'Other' as const;

const stepContent = [
  {
    eyebrow: 'YOUR PURPOSE',
    title: 'What brings you to LearnNut?',
    description: 'Choose the reason that feels closest. We’ll use it to shape your learning journey.',
  },
  {
    eyebrow: 'A BETTER FIT',
    title: 'Which age range suits you?',
    description: 'This helps us make learning feel comfortable and relevant. Sharing is optional.',
  },
  {
    eyebrow: 'YOUR INTERESTS',
    title: 'What are you curious about?',
    description: 'Choose one or more. You can always explore something different later.',
  },
  {
    eyebrow: 'YOUR DAILY GOAL',
    title: 'How much time would you like to learn each day?',
    description: 'You can change this anytime.',
  },
] as const;

type Purpose = (typeof purposes)[number];
type AgeRange = (typeof ageRanges)[number];
type Interest = (typeof interests)[number];
type DailyTime = (typeof dailyTimes)[number];
type Step = 0 | 1 | 2 | 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<Step>(0);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [isOtherInterestSelected, setIsOtherInterestSelected] = useState(false);
  const [customInterestsText, setCustomInterestsText] = useState('');
  const [dailyTime, setDailyTime] = useState<DailyTime | null>(null);

  const isNarrow = width < 390;
  const isWide = width >= 700;
  const currentContent = stepContent[step];
  const totalSteps = stepContent.length;
  const customInterests = customInterestsText
    .split(',')
    .map((interest) => interest.trim())
    .filter(Boolean);
  const hasValidInterestSelection =
    selectedInterests.length > 0 || (isOtherInterestSelected && customInterests.length > 0);
  const canContinue =
    step === 0 ? purpose !== null : step === 1 ? true : step === 2 ? hasValidInterestSelection : dailyTime !== null;

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
    AccessibilityInfo.announceForAccessibility(`Step ${step + 1} of ${totalSteps}. ${stepContent[step].title}`);
  }, [step, totalSteps]);

  const goBack = () => {
    if (step === 0) {
      router.back();
      return;
    }

    setStep((step - 1) as Step);
  };

  const goForward = () => {
    if (!canContinue) {
      return;
    }

    if (step < totalSteps - 1) {
      setStep((step + 1) as Step);
      return;
    }

    router.replace('/home');
  };

  const skipAgeRange = () => {
    setAgeRange(null);
    setStep(2);
  };

  const toggleInterest = (interest: Interest) => {
    setSelectedInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]
    );
  };

  const keepInputAndActionsVisible = () => {
    if (Platform.OS !== 'web') {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
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
            <View style={[styles.shell, isWide && styles.shellWide]}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark} accessible={false}>
                  <Text style={styles.brandMarkText}>L</Text>
                </View>
                <Text style={styles.brandName}>LearnNut</Text>
              </View>

              <View
                accessible
                accessibilityLabel={`Onboarding progress, step ${step + 1} of ${totalSteps}`}
                accessibilityRole="progressbar"
                accessibilityValue={{ max: totalSteps, min: 1, now: step + 1 }}
                style={styles.progressArea}>
                <View style={styles.progressCopy}>
                  <Text style={styles.progressLabel}>STEP {step + 1} OF {totalSteps}</Text>
                  <Text style={styles.progressPercent}>{Math.round(((step + 1) / totalSteps) * 100)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  {stepContent.map((content, item) => (
                    <View
                      key={content.title}
                      style={[styles.progressSegment, item <= step && styles.progressSegmentActive]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardClip}>
                  <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={[styles.cardContent, isWide && styles.cardContentWide]}
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.cardScroll}>
                    <View style={styles.headingGroup}>
                      <Text style={styles.eyebrow}>{currentContent.eyebrow}</Text>
                      <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
                        {currentContent.title}
                      </Text>
                      <Text style={styles.description}>{currentContent.description}</Text>
                    </View>

                {step === 0 && (
                  <View style={[styles.options, isWide && styles.optionsWide]}>
                    {purposes.map((option) => {
                      const selected = purpose === option;

                      return (
                        <Choice
                          isWide={isWide}
                          key={option}
                          label={option}
                          onPress={() => setPurpose(option)}
                          selected={selected}
                          type="radio"
                        />
                      );
                    })}
                  </View>
                )}

                {step === 1 && (
                  <View style={[styles.options, isWide && styles.optionsWide]}>
                    {ageRanges.map((option) => {
                      const selected = ageRange === option;

                      return (
                        <Choice
                          isWide={isWide}
                          key={option}
                          label={option}
                          onPress={() => setAgeRange(option)}
                          selected={selected}
                          type="radio"
                        />
                      );
                    })}
                  </View>
                )}

                {step === 3 && (
                  <View style={[styles.options, isWide && styles.optionsWide]}>
                    {dailyTimes.map((option) => {
                      const selected = dailyTime === option;

                      return (
                        <Choice
                          isWide={isWide}
                          key={option}
                          label={option}
                          onPress={() => setDailyTime(option)}
                          selected={selected}
                          type="radio"
                        />
                      );
                    })}
                  </View>
                )}

                {step === 2 && (
                  <View style={styles.optionSection}>
                    <View style={[styles.options, isWide && styles.optionsWide]}>
                      {interests.map((option) => {
                        const selected = selectedInterests.includes(option);

                        return (
                          <Choice
                            isWide={isWide}
                            key={option}
                            label={option}
                            onPress={() => toggleInterest(option)}
                            selected={selected}
                            type="checkbox"
                          />
                        );
                      })}
                      <Choice
                        isWide={isWide}
                        label={otherOption}
                        onPress={() => setIsOtherInterestSelected((selected) => !selected)}
                        selected={isOtherInterestSelected}
                        type="checkbox"
                      />
                    </View>

                    {isOtherInterestSelected && (
                      <CustomTextField
                        accessibilityHint="Enter one or more interests separated by commas"
                        label="Tell us what else interests you."
                        onChangeText={setCustomInterestsText}
                        onFocus={keepInputAndActionsVisible}
                        placeholder="E.g. Gardening, Astronomy"
                        value={customInterestsText}
                      />
                    )}
                  </View>
                )}

                <View style={[styles.actions, isWide && styles.actionsWide]}>
                  <Pressable
                    accessibilityHint={step === 0 ? 'Returns to the welcome screen' : `Returns to step ${step}`}
                    accessibilityRole="button"
                    onPress={goBack}
                    style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
                    <Text style={styles.backButtonLabel}>Back</Text>
                  </Pressable>

                  {step === 1 && (
                    <Pressable
                      accessibilityHint="Continues without sharing an age range"
                      accessibilityRole="button"
                      onPress={skipAgeRange}
                      style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}>
                      <Text style={styles.skipButtonLabel}>Skip</Text>
                    </Pressable>
                  )}

                  <Pressable
                    accessibilityHint={
                      step === 3
                        ? 'Completes onboarding and opens your LearnNut home screen'
                        : `Continues to step ${step + 2}`
                    }
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canContinue }}
                    disabled={!canContinue}
                    onPress={goForward}
                    style={({ pressed }) => [
                      styles.continueButton,
                      !canContinue && styles.continueButtonDisabled,
                      pressed && canContinue && styles.buttonPressed,
                    ]}>
                    <Text style={[styles.continueButtonLabel, !canContinue && styles.continueButtonLabelDisabled]}>
                      {step === 3 ? 'Start learning' : 'Continue'}
                    </Text>
                  </Pressable>
                </View>

                    {!canContinue && step !== 1 && (
                      <Text accessibilityLiveRegion="polite" style={styles.selectionHint}>
                        {step === 0
                          ? 'Choose one option to continue.'
                          : step === 2
                            ? isOtherInterestSelected
                              ? 'Add at least one custom interest to continue.'
                              : 'Choose at least one interest to continue.'
                            : 'Choose a daily learning time to continue.'}
                      </Text>
                    )}
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

type ChoiceProps = {
  isWide: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
  type: 'checkbox' | 'radio';
};

function Choice({ isWide, label, onPress, selected, type }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole={type}
      accessibilityState={type === 'checkbox' ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        isWide && styles.optionWide,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}>
      <View style={[styles.choiceIndicator, type === 'checkbox' && styles.checkbox, selected && styles.choiceIndicatorSelected]}>
        {selected && <Text style={styles.checkmark}>{type === 'checkbox' ? '✓' : '•'}</Text>}
      </View>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

type CustomTextFieldProps = {
  accessibilityHint: string;
  label: string;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  placeholder: string;
  value: string;
};

function CustomTextField({ accessibilityHint, label, onChangeText, onFocus, placeholder, value }: CustomTextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus();
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityHint={accessibilityHint}
        accessibilityLabel={label}
        autoCapitalize="sentences"
        autoCorrect
        maxLength={240}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        placeholder={placeholder}
        placeholderTextColor={Brand.colors.plumSoft}
        returnKeyType="done"
        selectionColor={Brand.colors.plum}
        style={[styles.textInput, isFocused && styles.textInputFocused]}
        value={value}
      />
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
    borderRadius: 130,
    backgroundColor: Brand.colors.lavender,
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
    paddingBottom: 22,
    paddingTop: 14,
  },
  shell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 18,
  },
  shellWide: {
    paddingTop: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  brandMark: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 12,
  },
  brandMarkText: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 19,
    fontWeight: '900',
  },
  brandName: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
  },
  progressArea: {
    gap: 8,
    paddingHorizontal: 4,
  },
  progressCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: Brand.colors.creamMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  progressPercent: {
    color: Brand.colors.creamMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 7,
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
    gap: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 26,
  },
  cardContentWide: {
    paddingHorizontal: 34,
    paddingBottom: 28,
    paddingTop: 34,
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
    maxWidth: 610,
    color: Brand.colors.plumSoft,
    fontSize: 17,
    lineHeight: 25,
  },
  options: {
    gap: 11,
  },
  optionSection: {
    gap: 11,
  },
  optionsWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  optionWide: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  optionSelected: {
    backgroundColor: Brand.colors.cream,
    borderColor: Brand.colors.walnut,
  },
  optionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.995 }],
  },
  choiceIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Brand.colors.lavender,
    borderRadius: 12,
    borderWidth: 2,
  },
  checkbox: {
    borderRadius: 7,
  },
  choiceIndicatorSelected: {
    backgroundColor: Brand.colors.plum,
    borderColor: Brand.colors.plum,
  },
  checkmark: {
    color: Brand.colors.cream,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  optionLabel: {
    flex: 1,
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  optionLabelSelected: {
    fontWeight: '800',
  },
  inputGroup: {
    gap: 8,
    paddingTop: 3,
  },
  inputLabel: {
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  textInput: {
    minHeight: 56,
    width: '100%',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.plumSoft,
    borderRadius: 17,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  actionsWide: {
    gap: 12,
  },
  backButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Brand.colors.cream,
    borderRadius: 17,
    borderWidth: 2,
    paddingHorizontal: 18,
  },
  backButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
  },
  skipButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: 8,
  },
  skipButtonLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 16,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  continueButton: {
    minHeight: 54,
    minWidth: 140,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 17,
    paddingHorizontal: 18,
  },
  continueButtonDisabled: {
    backgroundColor: '#D7CFD5',
  },
  continueButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 17,
    fontWeight: '800',
  },
  continueButtonLabelDisabled: {
    color: '#746C72',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  selectionHint: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -14,
    textAlign: 'right',
  },
});
