import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useReviewScheduleRefresh } from '@/hooks/use-review-schedule-refresh';
import {
  getSavedSource,
  isSourceReviewDue,
  recordSourceReviewOutcome,
  type ReviewOutcome,
  type SavedSource,
} from '@/services/source-storage';

type ReviewScreenState =
  | 'completed'
  | 'error'
  | 'loaded'
  | 'loading'
  | 'missing'
  | 'submitting';

type CompletedReview = Readonly<{
  nextDueAt: string;
  outcome: ReviewOutcome;
}>;

function getDisplayDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function getExactReviewDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  });
}

export default function ReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const loadRequestRef = useRef(0);
  const submissionInProgressRef = useRef(false);
  const announcedDueReviewRef = useRef<string | null>(null);
  const [source, setSource] = useState<SavedSource | null>(null);
  const [screenState, setScreenState] = useState<ReviewScreenState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  const [completedReview, setCompletedReview] = useState<CompletedReview | null>(null);

  const isNarrow = width < 390;
  const sourceId = typeof id === 'string' && id.length > 0 && id === id.trim() ? id : null;
  const isSubmitting = screenState === 'submitting';
  useReviewScheduleRefresh(source?.review === undefined ? [] : [source.review.dueAt]);
  const reviewIsDue = source?.review !== undefined && isSourceReviewDue(source);

  const loadSource = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setActionError(null);
    setCompletedReview(null);
    setSource(null);

    if (sourceId === null) {
      setScreenState('missing');
      return;
    }

    setScreenState('loading');

    try {
      const savedSource = await getSavedSource(sourceId);

      if (loadRequestRef.current !== requestId) {
        return;
      }

      if (savedSource === null) {
        setScreenState('missing');
        return;
      }

      const reviewIsDue = savedSource.review !== undefined && isSourceReviewDue(savedSource);
      setSource(savedSource);
      setScreenState('loaded');

      if (!reviewIsDue) {
        AccessibilityInfo.announceForAccessibility(
          savedSource.review === undefined
            ? `${savedSource.label} is not ready for review.`
            : `Review for ${savedSource.label} is scheduled for ${getExactReviewDate(savedSource.review.dueAt)}.`,
        );
      }
    } catch {
      if (loadRequestRef.current === requestId) {
        setScreenState('error');
      }
    }
  }, [sourceId]);

  useFocusEffect(
    useCallback(() => {
      void loadSource();

      return () => {
        loadRequestRef.current += 1;
      };
    }, [loadSource]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !isSubmitting) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => backHandler.remove();
  }, [isSubmitting]);

  useEffect(() => {
    if (screenState !== 'loaded' || !reviewIsDue || source?.review === undefined) {
      announcedDueReviewRef.current = null;
      return;
    }

    const announcementKey = `${source.id}:${source.review.dueAt}`;

    if (announcedDueReviewRef.current !== announcementKey) {
      announcedDueReviewRef.current = announcementKey;
      AccessibilityInfo.announceForAccessibility(`Review ready for ${source.label}.`);
    }
  }, [reviewIsDue, screenState, source]);

  const goBack = () => {
    if (submissionInProgressRef.current) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  };

  const goHome = () => {
    if (!submissionInProgressRef.current) {
      router.dismissTo('/home');
    }
  };

  const viewSource = () => {
    const sourceToOpen = source;

    if (sourceToOpen === null || submissionInProgressRef.current) {
      return;
    }

    router.dismissTo({
      pathname: '/source/[id]',
      params: { id: sourceToOpen.id },
    });
  };

  const submitOutcome = async (outcome: ReviewOutcome) => {
    if (
      source === null ||
      source.review === undefined ||
      screenState !== 'loaded' ||
      !reviewIsDue ||
      submissionInProgressRef.current
    ) {
      return;
    }

    const requestId = loadRequestRef.current;
    const sourceBeingReviewed = source;
    submissionInProgressRef.current = true;
    setActionError(null);
    setScreenState('submitting');

    try {
      const updatedSource = await recordSourceReviewOutcome(sourceBeingReviewed.id, outcome);

      if (loadRequestRef.current !== requestId) {
        return;
      }

      if (updatedSource === null) {
        setSource(null);
        setScreenState('missing');
        return;
      }

      if (updatedSource.review === undefined) {
        setSource(updatedSource);
        setActionError(
          'We couldn’t confirm the next review date saved on this device. Please try again.',
        );
        setScreenState('error');
        return;
      }

      const nextDueAt = updatedSource.review.dueAt;
      setSource(updatedSource);
      setCompletedReview({ nextDueAt, outcome });
      setScreenState('completed');
      AccessibilityInfo.announceForAccessibility(
        `Review saved. Next review ${getExactReviewDate(nextDueAt)}.`,
      );
    } catch {
      if (loadRequestRef.current !== requestId) {
        return;
      }

      try {
        const refreshedSource = await getSavedSource(sourceBeingReviewed.id);

        if (loadRequestRef.current !== requestId) {
          return;
        }

        if (refreshedSource === null) {
          setSource(null);
          setScreenState('missing');
          return;
        }

        const reviewIsStillDue =
          refreshedSource.review !== undefined && isSourceReviewDue(refreshedSource);
        setSource(refreshedSource);

        if (!reviewIsStillDue && refreshedSource.review !== undefined) {
          setActionError(null);
          setScreenState('loaded');
          AccessibilityInfo.announceForAccessibility(
            `This review was already updated. Next review ${getExactReviewDate(refreshedSource.review.dueAt)}.`,
          );
          return;
        }

        setActionError('We couldn’t save this review on your device. Please try again.');
        setScreenState(reviewIsStillDue ? 'loaded' : 'error');
      } catch {
        if (loadRequestRef.current === requestId) {
          setSource(null);
          setActionError(
            'We couldn’t save this review or confirm its current schedule. Please try again.',
          );
          setScreenState('error');
        }
      }
    } finally {
      submissionInProgressRef.current = false;
    }
  };

  const renderStateActions = (includeViewSource = false) => (
    <View style={styles.stateActions}>
      {includeViewSource && source !== null && (
        <Pressable
          accessibilityHint="Opens this saved source’s details"
          accessibilityRole="button"
          onPress={viewSource}
          style={({ pressed }) => [styles.statePrimaryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.statePrimaryButtonLabel}>View source</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityHint="Returns to Home"
        accessibilityRole="button"
        onPress={goHome}
        style={({ pressed }) => [
          includeViewSource ? styles.stateSecondaryButton : styles.statePrimaryButton,
          pressed && styles.buttonPressed,
        ]}>
        <Text
          style={
            includeViewSource
              ? styles.stateSecondaryButtonLabel
              : styles.statePrimaryButtonLabel
          }>
          Home
        </Text>
      </Pressable>
    </View>
  );

  const renderState = () => {
    if (screenState === 'loading') {
      return (
        <View
          accessible
          accessibilityLabel="Loading local review"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.stateCard}>
          <ActivityIndicator color={Brand.colors.plum} size="large" />
          <Text style={styles.stateTitle}>Opening your review…</Text>
          <Text style={styles.stateBody}>Reading this source from your device.</Text>
        </View>
      );
    }

    if (screenState === 'missing') {
      return (
        <View style={styles.stateCard}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.stateMessage}>
            <View aria-hidden style={styles.stateMark}>
              <Text style={styles.stateMarkLabel}>?</Text>
            </View>
            <Text accessibilityRole="header" style={styles.stateTitle}>
              We couldn’t find that source.
            </Text>
            <Text style={styles.stateBody}>
              It may have been removed from this device, or the review link may be invalid.
            </Text>
          </View>
          {renderStateActions()}
        </View>
      );
    }

    if (screenState === 'error') {
      return (
        <View style={styles.stateCard}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.stateMessage}>
            <Text style={styles.stateEyebrow}>LOCAL REVIEW</Text>
            <Text accessibilityRole="header" style={styles.stateTitle}>
              We hit a small snag.
            </Text>
            <Text style={styles.stateBody}>
              {actionError ?? 'We couldn’t open this review from your device. Please try again.'}
            </Text>
          </View>
          <View style={styles.stateActions}>
            <Pressable
              accessibilityHint="Tries to read this local review again"
              accessibilityRole="button"
              onPress={() => void loadSource()}
              style={({ pressed }) => [styles.statePrimaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.statePrimaryButtonLabel}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityHint="Returns to Home"
              accessibilityRole="button"
              onPress={goHome}
              style={({ pressed }) => [
                styles.stateSecondaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.stateSecondaryButtonLabel}>Home</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (source === null) {
      return null;
    }

    if (screenState === 'loaded' && !reviewIsDue) {
      const nextDueAt = source.review?.dueAt;

      if (nextDueAt !== undefined) {
        const nextDueDate = getExactReviewDate(nextDueAt);

        return (
          <View style={styles.stateCard}>
            <View accessibilityLiveRegion="polite" style={styles.stateMessage}>
              <View aria-hidden style={styles.stateMark}>
                <Text style={styles.stateMarkLabel}>○</Text>
              </View>
              <Text style={styles.stateEyebrow}>NOT DUE YET</Text>
              <Text accessibilityRole="header" style={styles.stateTitle}>
                You’re all caught up.
              </Text>
              <Text style={styles.stateBody}>
                This source is not ready for another review yet. Its next local review is scheduled
                for {nextDueDate}.
              </Text>
              <View
                accessible
                accessibilityLabel={`Next review ${nextDueDate}`}
                style={styles.scheduledDateCard}>
                <Text style={styles.scheduledDateLabel}>NEXT REVIEW</Text>
                <Text style={styles.scheduledDateValue}>{nextDueDate}</Text>
              </View>
            </View>
            <View style={styles.stateActions}>
              <Pressable
                accessibilityHint="Opens this saved source’s details"
                accessibilityRole="button"
                onPress={viewSource}
                style={({ pressed }) => [
                  styles.statePrimaryButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.statePrimaryButtonLabel}>View source</Text>
              </Pressable>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.stateCard}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.stateMessage}>
            <View aria-hidden style={styles.stateMark}>
              <Text style={styles.stateMarkLabel}>○</Text>
            </View>
            <Text style={styles.stateEyebrow}>NOT READY YET</Text>
            <Text accessibilityRole="header" style={styles.stateTitle}>
              This source isn’t ready for review.
            </Text>
            <Text style={styles.stateBody}>
              Open the source details and mark it ready before starting a local review.
            </Text>
          </View>
          {renderStateActions(true)}
        </View>
      );
    }

    if (screenState === 'submitting') {
      return (
        <View
          accessible
          accessibilityLabel="Saving your review on this device"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.stateCard}>
          <ActivityIndicator color={Brand.colors.plum} size="large" />
          <Text style={styles.stateTitle}>Saving your review…</Text>
          <Text style={styles.stateBody}>Keeping your outcome and next due date on this device.</Text>
        </View>
      );
    }

    if (screenState === 'completed' && completedReview !== null) {
      const nextDueDate = getExactReviewDate(completedReview.nextDueAt);

      return (
        <View style={styles.completedContent}>
          <View
            accessibilityLiveRegion="polite"
            style={styles.successCard}>
            <View aria-hidden style={styles.successMark}>
              <Text style={styles.successMarkLabel}>✓</Text>
            </View>
            <Text style={styles.successEyebrow}>REVIEW SAVED</Text>
            <Text accessibilityRole="header" style={styles.successTitle}>
              {completedReview.outcome === 'remembered'
                ? 'You remembered it.'
                : 'A revisit is scheduled.'}
            </Text>
            <Text style={styles.successBody}>
              {completedReview.outcome === 'remembered'
                ? 'This source will be due again in 7 days.'
                : 'This source will be due again in 1 day.'}
            </Text>

            <View accessible accessibilityLabel={`Next review ${nextDueDate}`} style={styles.dateCard}>
              <Text style={styles.dateLabel}>NEXT REVIEW</Text>
              <Text style={styles.dateValue}>{nextDueDate}</Text>
            </View>

            <Text style={styles.localNote}>This review and schedule stay on this device.</Text>
          </View>

          <View style={styles.completionActions}>
            <Pressable
              accessibilityHint="Returns to Home and refreshes your due reviews"
              accessibilityRole="button"
              onPress={goHome}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.primaryButtonLabel}>Home</Text>
            </Pressable>
            <Pressable
              accessibilityHint="Opens this saved source’s details"
              accessibilityRole="button"
              onPress={viewSource}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryButtonLabel}>View source</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const domain = getDisplayDomain(source.url);

    return (
      <View style={styles.reviewContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>DUE FOR REVIEW</Text>
          <Text
            accessibilityRole="header"
            style={[styles.sourceTitle, isNarrow && styles.sourceTitleNarrow]}>
            {source.label}
          </Text>
          <Text style={styles.heroDomain}>{domain}</Text>
          {source.folder && (
            <View style={styles.folderChip}>
              <Text style={styles.folderChipLabel}>{source.folder}</Text>
            </View>
          )}
        </View>

        <View style={styles.promptCard}>
          <Text style={styles.sectionEyebrow}>A QUICK SELF-CHECK</Text>
          <Text style={styles.promptTitle}>What do you remember?</Text>
          <Text style={styles.promptBody}>
            Before reopening the source, take a moment to recall what stood out or what you learned.
          </Text>
          <View style={styles.honestyNote}>
            <Text style={styles.honestyNoteText}>
              This is not a quiz. LearnNut does not use AI to test, grade, or verify your answer.
            </Text>
          </View>
        </View>

        {actionError !== null && (
          <View
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{actionError}</Text>
          </View>
        )}

        <View style={styles.outcomeSection}>
          <View style={styles.outcomeHeading}>
            <Text style={styles.sectionEyebrow}>CHOOSE YOUR OUTCOME</Text>
            <Text style={styles.outcomeIntro}>
              Your choice saves a fixed next review date on this device.
            </Text>
          </View>

          <View style={styles.outcomeActions}>
            <View style={styles.outcomeOption}>
              <Pressable
                accessibilityHint="Saves this outcome and schedules the next review in 7 days"
                accessibilityRole="button"
                onPress={() => void submitOutcome('remembered')}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.primaryButtonLabel}>I remembered it</Text>
              </Pressable>
              <Text style={styles.outcomeSchedule}>Next review: in 7 days</Text>
            </View>

            <View style={styles.outcomeOption}>
              <Pressable
                accessibilityHint="Saves this outcome and schedules the next review in 1 day"
                accessibilityRole="button"
                onPress={() => void submitOutcome('revisit')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.secondaryButtonLabel}>I need to revisit</Text>
              </Pressable>
              <Text style={styles.outcomeSchedule}>Next review: in 1 day</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ gestureEnabled: !isSubmitting }} />
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityHint="Returns to the previous screen"
              accessibilityLabel="Back"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={goBack}
              style={({ pressed }) => [
                styles.backButton,
                isSubmitting && styles.buttonDisabled,
                pressed && !isSubmitting && styles.buttonPressed,
              ]}>
              <Text aria-hidden style={styles.backButtonLabel}>
                ← Back
              </Text>
            </Pressable>

            <Text style={styles.screenEyebrow}>LOCAL REVIEW</Text>
          </View>

          {renderState()}
        </ScrollView>
      </SafeAreaView>
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
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: 22,
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 18,
  },
  contentNarrow: {
    gap: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 14,
  },
  topRow: {
    minHeight: 48,
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
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  backButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
  },
  screenEyebrow: {
    flexShrink: 1,
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  reviewContent: {
    gap: 16,
  },
  heroCard: {
    gap: 9,
    backgroundColor: Brand.colors.plum,
    borderRadius: 28,
    padding: 24,
  },
  heroEyebrow: {
    color: Brand.colors.creamMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  sourceTitle: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 40,
  },
  sourceTitleNarrow: {
    fontSize: 30,
    lineHeight: 36,
  },
  heroDomain: {
    color: Brand.colors.creamMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  folderChip: {
    maxWidth: '100%',
    alignSelf: 'flex-start',
    backgroundColor: Brand.colors.cream,
    borderRadius: 999,
    marginTop: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  folderChipLabel: {
    flexShrink: 1,
    color: Brand.colors.plum,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  promptCard: {
    gap: 11,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 19,
  },
  sectionEyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  promptTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  promptBody: {
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  honestyNote: {
    backgroundColor: Brand.colors.cream,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  honestyNoteText: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  outcomeSection: {
    gap: 14,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 19,
  },
  outcomeHeading: {
    gap: 6,
  },
  outcomeIntro: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  outcomeActions: {
    gap: 15,
  },
  outcomeOption: {
    gap: 7,
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  primaryButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  outcomeSchedule: {
    color: Brand.colors.plumSoft,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  inlineError: {
    backgroundColor: Brand.colors.cream,
    borderLeftColor: Brand.colors.walnut,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inlineErrorText: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  completedContent: {
    gap: 16,
  },
  successCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.colors.plum,
    borderRadius: 28,
    padding: 24,
  },
  successMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    marginBottom: 2,
  },
  successMarkLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 28,
    fontWeight: '900',
  },
  successEyebrow: {
    color: Brand.colors.creamMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  successTitle: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 33,
    textAlign: 'center',
  },
  successBody: {
    color: Brand.colors.creamMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  dateCard: {
    width: '100%',
    gap: 5,
    backgroundColor: Brand.colors.cream,
    borderRadius: 17,
    marginTop: 5,
    padding: 15,
  },
  dateLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  dateValue: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  localNote: {
    color: Brand.colors.creamMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  completionActions: {
    gap: 10,
  },
  stateCard: {
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
  },
  stateMessage: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  stateMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    marginBottom: 2,
  },
  stateMarkLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 27,
    fontWeight: '900',
  },
  stateEyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  stateTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    textAlign: 'center',
  },
  stateBody: {
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateActions: {
    width: '100%',
    gap: 10,
  },
  scheduledDateCard: {
    width: '100%',
    gap: 5,
    backgroundColor: Brand.colors.cream,
    borderRadius: 17,
    marginTop: 4,
    padding: 15,
  },
  scheduledDateLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  scheduledDateValue: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    textAlign: 'center',
  },
  statePrimaryButton: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  statePrimaryButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSecondaryButton: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
  },
  stateSecondaryButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.52,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
