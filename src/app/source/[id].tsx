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
import {
  deleteSource,
  getSavedSource,
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

export default function SourceDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { width } = useWindowDimensions();
  const loadRequestRef = useRef(0);
  const isDeletingRef = useRef(false);
  const isDeletePromptOpenRef = useRef(false);
  const isOpeningRef = useRef(false);
  const [source, setSource] = useState<SavedSource | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const isNarrow = width < 390;
  const sourceId = typeof id === 'string' && id.length > 0 && id === id.trim() ? id : null;

  const loadSource = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setActionError(null);
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
      AccessibilityInfo.announceForAccessibility(`Opened source details for ${savedSource.label}`);
    } catch {
      if (loadRequestRef.current === requestId) {
        setLoadState('error');
      }
    }
  }, [sourceId]);

  useFocusEffect(
    useCallback(() => {
      void loadSource();

      return () => {
        loadRequestRef.current += 1;
        isDeletePromptOpenRef.current = false;
      };
    }, [loadSource]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !isDeleting) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => backHandler.remove();
  }, [isDeleting]);

  const goBack = () => {
    if (isDeletingRef.current) {
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/library');
  };

  const returnToLibrary = () => {
    if (!isDeletingRef.current) {
      router.dismissTo('/library');
    }
  };

  const openOriginalSource = async () => {
    if (source === null || isOpeningRef.current || isDeletingRef.current) {
      return;
    }

    isOpeningRef.current = true;
    setIsOpening(true);
    setActionError(null);

    try {
      await Linking.openURL(source.url);
    } catch {
      setActionError('We couldn’t open that link. Please try again from this device.');
    } finally {
      isOpeningRef.current = false;
      setIsOpening(false);
    }
  };

  const removeSource = async (sourceToDelete: SavedSource) => {
    if (isDeletingRef.current) {
      return;
    }

    isDeletingRef.current = true;
    setIsDeleting(true);
    setActionError(null);

    try {
      await deleteSource(sourceToDelete.id);
    } catch {
      isDeletingRef.current = false;
      setIsDeleting(false);
      setActionError('We couldn’t delete that source just yet. Please try again.');
      return;
    }

    isDeletingRef.current = false;
    setIsDeleting(false);
    router.dismissTo('/library');
  };

  const confirmDelete = () => {
    if (source === null || isDeletePromptOpenRef.current || isDeletingRef.current) {
      return;
    }

    const sourceToDelete = source;
    isDeletePromptOpenRef.current = true;

    Alert.alert(
      'Delete source?',
      `Remove “${sourceToDelete.label}” from your Library? This can’t be undone.`,
      [
        {
          onPress: () => {
            isDeletePromptOpenRef.current = false;
          },
          style: 'cancel',
          text: 'Keep source',
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
          accessibilityLabel="Loading source details"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          accessibilityState={{ busy: true }}
          style={styles.stateCard}>
          <ActivityIndicator color={Brand.colors.plum} size="large" />
          <Text style={styles.stateTitle}>Opening source details…</Text>
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
              We couldn’t find that source.
            </Text>
            <Text style={styles.stateBody}>
              It may have been removed from this device, or the source link may be invalid.
            </Text>
          </View>
          <Pressable
            accessibilityHint="Returns to your saved sources"
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
            <Text style={styles.stateEyebrow}>LOCAL SOURCE</Text>
            <Text accessibilityRole="header" style={styles.stateTitle}>
              We hit a small snag.
            </Text>
            <Text style={styles.stateBody}>
              We couldn’t open this saved source. Please try again.
            </Text>
          </View>
          <View style={styles.stateActions}>
            <Pressable
              accessibilityHint="Tries to load this source again"
              accessibilityRole="button"
              onPress={() => {
                void loadSource();
              }}
              style={({ pressed }) => [styles.statePrimaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.statePrimaryButtonLabel}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityHint="Returns to your saved sources"
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
    const actionsDisabled = isDeleting || isOpening;

    return (
      <View style={styles.detailsContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>SAVED WEBSITE</Text>
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

        <View style={styles.infoCard}>
          <Text style={styles.sectionEyebrow}>SOURCE INFORMATION</Text>
          <View style={styles.infoRows}>
            <DetailRow label="Source type" value="Website" />
            <DetailRow label="Website" value={domain} />
            <DetailRow label="Date added" value={getDisplayDate(source.createdAt)} />
          </View>

          <View style={styles.urlSection}>
            <Text style={styles.urlLabel}>ORIGINAL URL</Text>
            <Text selectable style={styles.urlValue}>
              {source.url}
            </Text>
          </View>
        </View>

        {actionError && (
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{actionError}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            accessibilityHint="Opens this website outside LearnNut"
            accessibilityLabel={`Open ${source.label} in its original app or browser`}
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
            <Text style={styles.openButtonLabel}>
              {isOpening ? 'Opening…' : '↗ Open original source'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityHint="Asks for confirmation before removing this source from this device"
            accessibilityLabel={`Delete ${source.label}`}
            accessibilityRole="button"
            accessibilityState={{ busy: isDeleting, disabled: actionsDisabled }}
            disabled={actionsDisabled}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              actionsDisabled && styles.buttonDisabled,
              pressed && !actionsDisabled && styles.buttonPressed,
            ]}>
            <Text style={styles.deleteButtonLabel}>{isDeleting ? 'Deleting…' : 'Delete source'}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ gestureEnabled: !isDeleting }} />
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
              accessibilityState={{ disabled: isDeleting }}
              disabled={isDeleting}
              onPress={goBack}
              style={({ pressed }) => [
                styles.backButton,
                isDeleting && styles.buttonDisabled,
                pressed && !isDeleting && styles.buttonPressed,
              ]}>
              <Text aria-hidden style={styles.backButtonLabel}>
                ← Back
              </Text>
            </Pressable>

            <Text style={styles.screenEyebrow}>SOURCE DETAILS</Text>
          </View>

          {renderState()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  infoCard: {
    gap: 16,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  sectionEyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  infoRows: {
    borderColor: Brand.colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomColor: Brand.colors.cream,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: {
    width: 88,
    color: Brand.colors.plumSoft,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  detailValue: {
    flex: 1,
    minWidth: 0,
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'right',
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
  actions: {
    gap: 10,
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
