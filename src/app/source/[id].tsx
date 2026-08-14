import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
  BackHandler,
  Linking,
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
  deleteSource,
  getSavedSource,
  isSourceReviewDue,
  markSourceReadyForReview,
  type SavedSource,
} from '@/services/source-storage';

type LoadState = 'error' | 'loading' | 'missing' | 'ready';

function getDisplayDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

function getDisplayDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDisplayReviewDate(dueAt: string) {
  return new Date(dueAt).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SourceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const loadRequestRef = useRef(0);
  const isDeletingRef = useRef(false);
  const isDeletePromptOpenRef = useRef(false);
  const isMarkingReadyRef = useRef(false);
  const isOpeningRef = useRef(false);
  const isStartingReviewRef = useRef(false);
  const [source, setSource] = useState<SavedSource | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isStartingReview, setIsStartingReview] = useState(false);

  const isNarrow = width < 390;
  const sourceId = typeof id === 'string' && id.length > 0 && id === id.trim() ? id : null;

  useReviewScheduleRefresh(source?.review === undefined ? [] : [source.review.dueAt]);

  const loadSource = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setActionError(null);
    setDeleteError(null);
    setActionSuccess(null);
    setSource(null);

    if (sourceId === null) {
      setLoadState('missing');
      return;
    }

    setLoadState('loading');

    try {
      const savedSource = await getSavedSource(sourceId);

      if (loadRequestRef.current !== requestId) {
        return;
      }

      if (savedSource === null) {
        setLoadState('missing');
        return;
      }

      setSource(savedSource);
      setLoadState('ready');
      AccessibilityInfo.announceForAccessibility(`Opened lesson overview for ${savedSource.label}`);
    } catch {
      if (loadRequestRef.current === requestId) {
        setLoadState('error');
      }
    }
  }, [sourceId]);

  useFocusEffect(
    useCallback(() => {
      isStartingReviewRef.current = false;
      setIsStartingReview(false);
      void loadSource();

      return () => {
        loadRequestRef.current += 1;
        isDeletePromptOpenRef.current = false;
      };
    }, [loadSource]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || (!isDeleting && !isMarkingReady)) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => backHandler.remove();
  }, [isDeleting, isMarkingReady]);

  const goBack = () => {
    if (isDeletingRef.current || isMarkingReadyRef.current) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/library');
  };

  const returnToLibrary = () => {
    if (!isDeletingRef.current && !isMarkingReadyRef.current) {
      router.dismissTo('/library');
    }
  };

  const openOriginalSource = async () => {
    if (
      source === null ||
      isOpeningRef.current ||
      isDeletingRef.current ||
      isMarkingReadyRef.current ||
      isStartingReviewRef.current
    ) {
      return;
    }

    isOpeningRef.current = true;
    setIsOpening(true);
    setActionError(null);
    setDeleteError(null);
    setActionSuccess(null);

    try {
      await Linking.openURL(source.url);
    } catch {
      setActionError('We couldn’t open that link. Please try again from this device.');
    } finally {
      isOpeningRef.current = false;
      setIsOpening(false);
    }
  };

  const makeSourceReadyForReview = async () => {
    if (
      source === null ||
      source.review !== undefined ||
      isMarkingReadyRef.current ||
      isDeletingRef.current ||
      isOpeningRef.current ||
      isStartingReviewRef.current
    ) {
      return;
    }

    const sourceToUpdate = source;
    const loadRequestId = loadRequestRef.current;
    isMarkingReadyRef.current = true;
    setIsMarkingReady(true);
    setActionError(null);
    setDeleteError(null);
    setActionSuccess(null);

    try {
      const updatedSource = await markSourceReadyForReview(sourceToUpdate.id);

      if (loadRequestRef.current !== loadRequestId) {
        return;
      }

      if (updatedSource === null) {
        setSource(null);
        setLoadState('missing');
        return;
      }

      if (updatedSource.review === undefined) {
        setActionError(
          'We couldn’t confirm that this lesson is ready to review. Please try again.',
        );
        return;
      }

      setSource(updatedSource);
      const successMessage = isSourceReviewDue(updatedSource)
        ? 'Ready to review. You can start a review now.'
        : `This lesson is already scheduled for ${getDisplayReviewDate(updatedSource.review.dueAt)}.`;
      setActionSuccess(successMessage);
      AccessibilityInfo.announceForAccessibility(successMessage);
    } catch {
      if (loadRequestRef.current === loadRequestId) {
        setActionError('We couldn’t make this lesson ready to review just yet. Please try again.');
      }
    } finally {
      isMarkingReadyRef.current = false;

      if (loadRequestRef.current === loadRequestId) {
        setIsMarkingReady(false);
      }
    }
  };

  const startReview = () => {
    if (
      source === null ||
      source.review === undefined ||
      !isSourceReviewDue(source) ||
      isStartingReviewRef.current ||
      isDeletingRef.current ||
      isMarkingReadyRef.current ||
      isOpeningRef.current
    ) {
      return;
    }

    isStartingReviewRef.current = true;
    setIsStartingReview(true);
    setActionError(null);
    setDeleteError(null);
    setActionSuccess(null);

    try {
      router.push({
        pathname: '/review/[id]',
        params: { id: source.id },
      });
    } catch {
      isStartingReviewRef.current = false;
      setIsStartingReview(false);
      setActionError('We couldn’t open this review just now. Please try again.');
    }
  };

  const removeSource = async (sourceToDelete: SavedSource) => {
    if (isDeletingRef.current) {
      return;
    }

    isDeletingRef.current = true;
    setIsDeleting(true);
    setActionError(null);
    setDeleteError(null);
    setActionSuccess(null);

    try {
      await deleteSource(sourceToDelete.id);
    } catch {
      isDeletingRef.current = false;
      setIsDeleting(false);
      setDeleteError('We couldn’t delete that lesson just yet. Please try again.');
      return;
    }

    isDeletingRef.current = false;
    setIsDeleting(false);
    router.dismissTo('/library');
  };

  const confirmDelete = () => {
    if (
      source === null ||
      isDeletePromptOpenRef.current ||
      isDeletingRef.current ||
      isMarkingReadyRef.current ||
      isStartingReviewRef.current
    ) {
      return;
    }

    const sourceToDelete = source;
    isDeletePromptOpenRef.current = true;

    Alert.alert(
      'Delete lesson?',
      `Remove “${sourceToDelete.label}” from your Library? This can’t be undone.`,
      [
        {
          onPress: () => {
            isDeletePromptOpenRef.current = false;
          },
          style: 'cancel',
          text: 'Keep lesson',
        },
        {
          onPress: () => {
            isDeletePromptOpenRef.current = false;
            void removeSource(sourceToDelete);
          },
          style: 'destructive',
          text: 'Delete',
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          isDeletePromptOpenRef.current = false;
        },
      },
    );
  };

  const renderState = () => {
    if (loadState === 'loading') {
      return (
        <View
          accessible
          accessibilityLabel="Loading lesson overview"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.stateCard}>
          <ActivityIndicator color={Brand.colors.plum} size="large" />
          <Text style={styles.stateTitle}>Opening lesson overview…</Text>
        </View>
      );
    }

    if (loadState === 'missing') {
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
              We couldn’t find that lesson.
            </Text>
            <Text style={styles.stateBody}>
              It may have been removed from this device, or the lesson link may be invalid.
            </Text>
          </View>
          <Pressable
            accessibilityHint="Returns to your lessons"
            accessibilityRole="button"
            onPress={returnToLibrary}
            style={({ pressed }) => [styles.statePrimaryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.statePrimaryButtonLabel}>Back to Library</Text>
          </Pressable>
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={styles.stateCard}>
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.stateMessage}>
            <Text style={styles.stateEyebrow}>LOCAL LESSON</Text>
            <Text accessibilityRole="header" style={styles.stateTitle}>
              We hit a small snag.
            </Text>
            <Text style={styles.stateBody}>
              We couldn’t open this saved lesson. Please try again.
            </Text>
          </View>
          <View style={styles.stateActions}>
            <Pressable
              accessibilityHint="Tries to load this lesson again"
              accessibilityRole="button"
              onPress={() => {
                void loadSource();
              }}
              style={({ pressed }) => [styles.statePrimaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.statePrimaryButtonLabel}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityHint="Returns to your lessons"
              accessibilityRole="button"
              onPress={returnToLibrary}
              style={({ pressed }) => [
                styles.stateSecondaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.stateSecondaryButtonLabel}>Back to Library</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (source === null) {
      return null;
    }

    const domain = getDisplayDomain(source.url);
    const reviewIsDue = source.review !== undefined && isSourceReviewDue(source);
    const actionsDisabled = isDeleting || isMarkingReady || isOpening || isStartingReview;

    return (
      <View style={styles.detailsContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>LESSON</Text>
          <Text
            accessibilityRole="header"
            style={[styles.sourceTitle, isNarrow && styles.sourceTitleNarrow]}>
            {source.label}
          </Text>
          {source.folder && (
            <View style={styles.folderChip}>
              <Text style={styles.folderChipLabel}>{source.folder}</Text>
            </View>
          )}
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.sectionEyebrow}>REVIEW STATUS</Text>

          {source.review === undefined ? (
            <>
              <View style={styles.reviewCopy}>
                <Text accessibilityRole="header" style={styles.reviewTitle}>
                  Ready to review this lesson?
                </Text>
                <Text style={styles.reviewBody}>
                  Add this lesson to your local review schedule whenever you’re ready.
                </Text>
              </View>

              <Pressable
                accessibilityHint="Adds this lesson to your local review schedule"
                accessibilityLabel={`Mark ${source.label} ready to review`}
                accessibilityRole="button"
                accessibilityState={{ busy: isMarkingReady, disabled: actionsDisabled }}
                disabled={actionsDisabled}
                onPress={() => {
                  void makeSourceReadyForReview();
                }}
                style={({ pressed }) => [
                  styles.reviewPrimaryButton,
                  actionsDisabled && styles.buttonDisabled,
                  pressed && !actionsDisabled && styles.buttonPressed,
                ]}>
                {isMarkingReady && <ActivityIndicator color={Brand.colors.cream} size="small" />}
                <Text style={styles.reviewPrimaryButtonLabel}>
                  {isMarkingReady ? 'Getting it ready…' : 'Ready to review'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.reviewCopy}>
                <View
                  accessible
                  accessibilityLabel={
                    reviewIsDue
                      ? 'Review status: due now'
                      : `Review status: scheduled for ${getDisplayReviewDate(source.review.dueAt)}`
                  }
                  style={[
                    styles.reviewStatusChip,
                    reviewIsDue && styles.reviewStatusChipDue,
                  ]}>
                  <Text
                    style={[
                      styles.reviewStatusChipLabel,
                      reviewIsDue && styles.reviewStatusChipLabelDue,
                    ]}>
                    {reviewIsDue ? 'DUE NOW' : 'SCHEDULED'}
                  </Text>
                </View>
                <Text accessibilityRole="header" style={styles.reviewTitle}>
                  {reviewIsDue
                    ? 'Ready for a quick review'
                    : `Next review ${getDisplayReviewDate(source.review.dueAt)}`}
                </Text>
                <Text style={styles.reviewBody}>
                  {reviewIsDue
                    ? 'A review is ready whenever you are.'
                    : 'You’re on track. Come back when this lesson is due for its next review.'}
                </Text>
              </View>

              {reviewIsDue && (
                <Pressable
                  accessibilityHint="Opens the review for this lesson"
                  accessibilityLabel={`Start review for ${source.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ busy: isStartingReview, disabled: actionsDisabled }}
                  disabled={actionsDisabled}
                  onPress={startReview}
                  style={({ pressed }) => [
                    styles.reviewPrimaryButton,
                    actionsDisabled && styles.buttonDisabled,
                    pressed && !actionsDisabled && styles.buttonPressed,
                  ]}>
                  <Text style={styles.reviewPrimaryButtonLabel}>
                    {isStartingReview ? 'Opening review…' : 'Start review'}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {actionError && (
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{actionError}</Text>
          </View>
        )}

        {actionSuccess && (
          <View accessibilityLiveRegion="polite" style={styles.inlineSuccess}>
            <Text style={styles.inlineSuccessText}>{actionSuccess}</Text>
          </View>
        )}

        <View style={styles.learningActionsCard}>
          <View style={styles.learningActionsCopy}>
            <Text accessibilityRole="header" style={styles.sectionEyebrow}>
              LEARNING ACTIONS
            </Text>
            <Text style={styles.learningActionsBody}>
              Return to the original material whenever you want to revisit the lesson.
            </Text>
          </View>

          <Pressable
            accessibilityHint="Opens the original material outside LearnNut"
            accessibilityLabel={`Open original for ${source.label}`}
            accessibilityRole="link"
            accessibilityState={{ busy: isOpening, disabled: actionsDisabled }}
            disabled={actionsDisabled}
            onPress={() => {
              void openOriginalSource();
            }}
            style={({ pressed }) => [
              styles.openButton,
              actionsDisabled && styles.buttonDisabled,
              pressed && !actionsDisabled && styles.buttonPressed,
            ]}>
            <Text style={styles.openButtonLabel}>{isOpening ? 'Opening…' : '↗ Open original'}</Text>
          </Pressable>
        </View>

        <View style={styles.originalMaterialCard}>
          <Text accessibilityRole="header" style={styles.sectionEyebrow}>
            ORIGINAL MATERIAL
          </Text>
          <View style={styles.originalMaterialMetadata}>
            <Text style={styles.originalMaterialType}>Website · {domain}</Text>
            <Text style={styles.originalMaterialDate}>
              Added {getDisplayDate(source.createdAt)}
            </Text>
          </View>
          <View style={styles.urlSection}>
            <Text style={styles.urlLabel}>WEB ADDRESS</Text>
            <Text selectable style={styles.urlValue}>
              {source.url}
            </Text>
          </View>
        </View>

        {deleteError && (
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{deleteError}</Text>
          </View>
        )}

        <Pressable
          accessibilityHint="Asks for confirmation before removing this lesson from this device"
          accessibilityLabel={`Delete lesson ${source.label}`}
          accessibilityRole="button"
          accessibilityState={{ busy: isDeleting, disabled: actionsDisabled }}
          disabled={actionsDisabled}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            actionsDisabled && styles.buttonDisabled,
            pressed && !actionsDisabled && styles.buttonPressed,
          ]}>
          <Text style={styles.deleteButtonLabel}>{isDeleting ? 'Deleting…' : 'Delete lesson'}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ gestureEnabled: !isDeleting && !isMarkingReady }} />
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
              accessibilityState={{ disabled: isDeleting || isMarkingReady }}
              disabled={isDeleting || isMarkingReady}
              onPress={goBack}
              style={({ pressed }) => [
                styles.backButton,
                (isDeleting || isMarkingReady) && styles.buttonDisabled,
                pressed && !isDeleting && !isMarkingReady && styles.buttonPressed,
              ]}>
              <Text aria-hidden style={styles.backButtonLabel}>
                ← Back
              </Text>
            </Pressable>

            <Text style={styles.screenEyebrow}>LESSON OVERVIEW</Text>
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
  detailsContent: {
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
  sectionEyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  urlSection: {
    minWidth: 0,
    gap: 8,
    backgroundColor: Brand.colors.cream,
    borderRadius: 16,
    padding: 14,
  },
  urlLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  urlValue: {
    flexShrink: 1,
    color: Brand.colors.plum,
    fontSize: 14,
    lineHeight: 21,
  },
  reviewCard: {
    gap: 16,
    backgroundColor: Brand.colors.cream,
    borderColor: Brand.colors.creamMuted,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  reviewCopy: {
    alignItems: 'flex-start',
    gap: 8,
  },
  reviewStatusChip: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewStatusChipDue: {
    backgroundColor: Brand.colors.plum,
  },
  reviewStatusChipLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  reviewStatusChipLabelDue: {
    color: Brand.colors.cream,
  },
  reviewTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  reviewBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  reviewPrimaryButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  reviewPrimaryButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
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
  inlineSuccess: {
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.creamMuted,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inlineSuccessText: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  learningActionsCard: {
    gap: 14,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  learningActionsCopy: {
    gap: 6,
  },
  learningActionsBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  originalMaterialCard: {
    gap: 12,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  originalMaterialMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 14,
    rowGap: 5,
  },
  originalMaterialType: {
    flexShrink: 1,
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  originalMaterialDate: {
    maxWidth: '100%',
    flexShrink: 1,
    color: Brand.colors.plumSoft,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  openButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  openButtonLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  deleteButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
  },
  deleteButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
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
