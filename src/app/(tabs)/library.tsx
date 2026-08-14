import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { deleteSource, getSavedSources, type SavedSource } from '@/services/source-storage';

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
    month: 'short',
    year: 'numeric',
  });
}

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const deletingSourceRef = useRef<string | null>(null);
  const loadRequestRef = useRef(0);
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteSource, setPendingDeleteSource] = useState<SavedSource | null>(null);

  const isNarrow = width < 390;

  const loadSources = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;

    setIsLoading(true);
    setLoadError(null);
    setActionError(null);

    try {
      const savedSources = await getSavedSources();

      if (loadRequestRef.current === requestId) {
        setSources(savedSources);
      }
    } catch {
      if (loadRequestRef.current === requestId) {
        setLoadError('We couldn’t open your local Library. Please try again.');
      }
    } finally {
      if (loadRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSources();

      return () => {
        loadRequestRef.current += 1;
      };
    }, [loadSources]),
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/home');
  };

  const openAddSource = () => {
    router.navigate('/add-source');
  };

  const openSourceDetails = (id: string) => {
    router.push({
      pathname: '/source/[id]',
      params: { id },
    });
  };

  const removeSavedSource = async (source: SavedSource) => {
    if (deletingSourceRef.current !== null) {
      return;
    }

    deletingSourceRef.current = source.id;
    setDeletingId(source.id);
    setActionError(null);

    try {
      await deleteSource(source.id);
      setSources((currentSources) =>
        currentSources.filter((currentSource) => currentSource.id !== source.id),
      );
    } catch {
      setActionError('We couldn’t delete that source just yet. Please try again.');
    } finally {
      deletingSourceRef.current = null;
      setDeletingId(null);
      setPendingDeleteSource(null);
    }
  };

  const confirmDelete = (source: SavedSource) => {
    setPendingDeleteSource(source);
  };

  const dismissDeleteConfirmation = () => {
    if (deletingSourceRef.current === null) {
      setPendingDeleteSource(null);
    }
  };

  const renderSource = ({ item }: { item: SavedSource }) => {
    const isDeleting = deletingId === item.id;
    const isDeleteDisabled = deletingId !== null;
    const domain = getDisplayDomain(item.url);
    const savedDate = getDisplayDate(item.createdAt);
    const sourceDetailsAccessibilityLabel = [
      `Open ${item.label}`,
      `website ${domain}`,
      ...(item.folder ? [`folder ${item.folder}`] : []),
      `saved ${savedDate}`,
    ].join(', ');

    return (
      <View style={styles.sourceCard}>
        <Pressable
          accessibilityHint="Shows this saved source’s details"
          accessibilityLabel={sourceDetailsAccessibilityLabel}
          accessibilityRole="button"
          onPress={() => openSourceDetails(item.id)}
          style={({ pressed }) => [
            styles.sourceDetailsButton,
            pressed && styles.sourceDetailsButtonPressed,
          ]}>
          <View style={styles.sourceHeadingRow}>
            <View style={styles.sourceCopy}>
              <Text style={styles.sourceLabel}>{item.label}</Text>
              <Text numberOfLines={2} selectable style={styles.sourceDomain}>
                {domain}
              </Text>
            </View>

            <View aria-hidden style={styles.detailsArrow}>
              <Text style={styles.detailsArrowLabel}>→</Text>
            </View>
          </View>

          <View style={styles.sourceMetadata}>
            {item.folder && (
              <View style={styles.folderChip}>
                <Text style={styles.folderChipLabel}>{item.folder}</Text>
              </View>
            )}
            <Text style={styles.sourceDate}>Saved {savedDate}</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityHint="Asks for confirmation before removing this source from this device"
          accessibilityLabel={`Delete ${item.label}`}
          accessibilityRole="button"
          accessibilityState={{ busy: isDeleting, disabled: isDeleteDisabled }}
          disabled={isDeleteDisabled}
          onPress={() => confirmDelete(item)}
          style={({ pressed }) => [
            styles.deleteButton,
            isDeleteDisabled && styles.deleteButtonDisabled,
            pressed && !isDeleteDisabled && styles.buttonPressed,
          ]}>
          <Text style={styles.deleteButtonLabel}>{isDeleting ? 'Deleting…' : 'Delete source'}</Text>
        </Pressable>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityHint="Returns to the previous screen"
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
          <Text aria-hidden style={styles.backButtonLabel}>
            ← Back
          </Text>
        </Pressable>

        {!isLoading && !loadError && (
          <Text accessibilityLiveRegion="polite" style={styles.sourceCount}>
            {sources.length} {sources.length === 1 ? 'SOURCE' : 'SOURCES'}
          </Text>
        )}
      </View>

      <View style={styles.headingGroup}>
        <Text style={styles.eyebrow}>YOUR SOURCES</Text>
        <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
          Library
        </Text>
        <Text style={styles.description}>Sources you save stay on this device.</Text>
      </View>

      {!isLoading && !loadError && sources.length > 0 && (
        <Pressable
          accessibilityHint="Opens the Add Source flow"
          accessibilityRole="button"
          onPress={openAddSource}
          style={({ pressed }) => [styles.addSourceButton, pressed && styles.buttonPressed]}>
          <Text style={styles.addSourceButtonLabel}>＋ Add another source</Text>
        </Pressable>
      )}

      {actionError && (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{actionError}</Text>
        </View>
      )}
    </View>
  );

  const emptyContent = isLoading ? (
    <View
      accessible
      accessibilityLabel="Loading your Library"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={styles.stateCard}>
      <ActivityIndicator color={Brand.colors.plum} size="large" />
      <Text style={styles.stateTitle}>Opening your Library…</Text>
    </View>
  ) : loadError ? (
    <View style={styles.stateCard}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.stateMessage}>
        <Text style={styles.stateEyebrow}>LOCAL LIBRARY</Text>
        <Text style={styles.stateTitle}>We hit a small snag.</Text>
        <Text style={styles.stateBody}>{loadError}</Text>
      </View>
      <Pressable
        accessibilityHint="Tries to open the local Library again"
        accessibilityRole="button"
        onPress={() => {
          void loadSources();
        }}
        style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
        <Text style={styles.retryButtonLabel}>Try again</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.emptyCard}>
      <View aria-hidden style={styles.emptyMark}>
        <Text style={styles.emptyMarkLabel}>L</Text>
      </View>
      <Text style={styles.emptyTitle}>Nothing in your Library yet.</Text>
      <Text style={styles.emptyBody}>
        Saved video and webpage links will appear here. Add one when you’re ready.
      </Text>
      <Pressable
        accessibilityHint="Opens the Add Source flow"
        accessibilityRole="button"
        onPress={openAddSource}
        style={({ pressed }) => [styles.emptyButton, pressed && styles.buttonPressed]}>
        <Text style={styles.emptyButtonLabel}>＋ Add your first source</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
          data={!isLoading && !loadError ? sources : []}
          ItemSeparatorComponent={() => <View style={styles.sourceSeparator} />}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={emptyContent}
          ListHeaderComponent={listHeader}
          renderItem={renderSource}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={dismissDeleteConfirmation}
        transparent
        visible={pendingDeleteSource !== null}>
        <SafeAreaView
          style={styles.modalBackdrop}
          edges={['top', 'bottom', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={styles.confirmationScrollContent}
            showsVerticalScrollIndicator={false}
            style={styles.confirmationScroll}>
            <View accessibilityViewIsModal style={styles.confirmationCard}>
              <View style={styles.confirmationCopy}>
                <Text accessibilityRole="header" style={styles.confirmationTitle}>
                  Delete source?
                </Text>
                <Text style={styles.confirmationBody}>
                  Remove “{pendingDeleteSource?.label}” from your Library? This can’t be undone.
                </Text>
              </View>

              <View style={styles.confirmationActions}>
                <Pressable
                  accessibilityHint="Keeps this source in your Library"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: deletingId !== null }}
                  disabled={deletingId !== null}
                  onPress={dismissDeleteConfirmation}
                  style={({ pressed }) => [
                    styles.keepButton,
                    deletingId !== null && styles.confirmationButtonDisabled,
                    pressed && deletingId === null && styles.buttonPressed,
                  ]}>
                  <Text style={styles.keepButtonLabel}>Keep source</Text>
                </Pressable>

                <Pressable
                  accessibilityHint="Permanently removes this source from this device"
                  accessibilityLabel={`Delete ${pendingDeleteSource?.label ?? 'source'}`}
                  accessibilityRole="button"
                  accessibilityState={{ busy: deletingId !== null, disabled: deletingId !== null }}
                  disabled={deletingId !== null}
                  onPress={() => {
                    if (pendingDeleteSource) {
                      void removeSavedSource(pendingDeleteSource);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.confirmDeleteButton,
                    deletingId !== null && styles.confirmationButtonDisabled,
                    pressed && deletingId === null && styles.buttonPressed,
                  ]}>
                  <Text style={styles.confirmDeleteButtonLabel}>
                    {deletingId !== null ? 'Deleting…' : 'Delete'}
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
    flexGrow: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 18,
  },
  contentNarrow: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    paddingTop: 14,
  },
  header: {
    gap: 20,
    marginBottom: 24,
  },
  topRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  sourceCount: {
    flexShrink: 1,
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'right',
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
  addSourceButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  addSourceButtonLabel: {
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
  sourceSeparator: {
    height: 12,
  },
  sourceCard: {
    gap: 12,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  sourceDetailsButton: {
    minHeight: 48,
    gap: 14,
    borderRadius: 16,
  },
  sourceDetailsButtonPressed: {
    opacity: 0.72,
  },
  sourceHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sourceLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  sourceDomain: {
    flexShrink: 1,
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 21,
  },
  detailsArrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 14,
  },
  detailsArrowLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 23,
  },
  sourceMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
  },
  folderChip: {
    maxWidth: '100%',
    backgroundColor: Brand.colors.cream,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  folderChipLabel: {
    color: Brand.colors.plum,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  sourceDate: {
    flexShrink: 1,
    color: Brand.colors.plumSoft,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  deleteButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Brand.colors.cream,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  stateEyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  stateMessage: {
    alignItems: 'center',
    gap: 10,
  },
  stateTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
    textAlign: 'center',
  },
  stateBody: {
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 18,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  retryButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: Brand.colors.plum,
    borderRadius: 28,
    padding: 24,
  },
  emptyMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    marginBottom: 2,
  },
  emptyMarkLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 26,
    fontWeight: '900',
  },
  emptyTitle: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    textAlign: 'center',
  },
  emptyBody: {
    color: Brand.colors.creamMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 18,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  emptyButtonLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 12, 29, 0.56)',
    padding: 22,
  },
  confirmationScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  confirmationScroll: {
    width: '100%',
    maxWidth: 440,
  },
  confirmationCard: {
    width: '100%',
    maxWidth: 440,
    gap: 22,
    backgroundColor: Brand.colors.offWhite,
    borderColor: Brand.colors.cream,
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
  },
  confirmationCopy: {
    gap: 9,
  },
  confirmationTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
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
  keepButton: {
    minHeight: 50,
    minWidth: 140,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Brand.colors.cream,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 12,
  },
  keepButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmDeleteButton: {
    minHeight: 50,
    minWidth: 140,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  confirmDeleteButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmationButtonDisabled: {
    opacity: 0.52,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
