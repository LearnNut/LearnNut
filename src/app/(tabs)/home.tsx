import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { getSavedSources, type SavedSource } from '@/services/source-storage';

const RECENT_SOURCE_LIMIT = 3;

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
  });
}

function getLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getSavedSourceStreak(sources: SavedSource[]) {
  if (sources.length === 0) {
    return 0;
  }

  const savedDays = new Set(
    sources
      .map((source) => new Date(source.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(getLocalDayKey),
  );
  const cursor = new Date();

  if (!savedDays.has(getLocalDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (savedDays.has(getLocalDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const loadRequestRef = useRef(0);
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isNarrow = width < 390;

  const loadSources = useCallback(async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setIsLoading(true);
    setLoadError(null);

    try {
      const savedSources = await getSavedSources();

      if (loadRequestRef.current === requestId) {
        setSources(savedSources);
      }
    } catch {
      if (loadRequestRef.current === requestId) {
        setLoadError('We couldn’t load your recent sources just now.');
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

  const recentSources = sources.slice(0, RECENT_SOURCE_LIMIT);
  const streak = getSavedSourceStreak(sources);

  const openSourceDetails = (id: string) => {
    router.push({
      pathname: '/source/[id]',
      params: { id },
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>LEARNNUT</Text>

          <View style={styles.greetingRow}>
            <View style={styles.greetingCopy}>
              <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
                Welcome back.
              </Text>
              <Text style={styles.prompt}>What would you like to learn today?</Text>
            </View>

            <View
              accessible
              accessibilityLabel={`${streak} day save streak, based on days when you saved a source`}
              style={styles.streak}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>day save streak</Text>
            </View>
          </View>

          <Pressable
            accessibilityHint="Opens the Add Source flow"
            accessibilityRole="button"
            onPress={() => router.navigate('/add-source')}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed]}>
            <View style={styles.primaryActionCopy}>
              <Text style={styles.primaryActionEyebrow}>ADD A SOURCE</Text>
              <Text style={styles.primaryActionLabel}>Start learning</Text>
            </View>
            <Text aria-hidden style={styles.primaryActionArrow}>
              →
            </Text>
          </Pressable>

          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Recent sources
              </Text>
              {!isLoading && loadError === null && sources.length > 0 && (
                <Pressable
                  accessibilityHint="Opens all saved sources"
                  accessibilityRole="button"
                  onPress={() => router.navigate('/library')}
                  style={({ pressed }) => [styles.viewAllButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.viewAllLabel}>View all</Text>
                </Pressable>
              )}
            </View>

            {isLoading ? (
              <View
                accessible
                accessibilityLabel="Loading recent sources"
                accessibilityLiveRegion="polite"
                accessibilityRole="progressbar"
                accessibilityState={{ busy: true }}
                style={styles.stateCard}>
                <ActivityIndicator color={Brand.colors.plum} size="small" />
                <Text style={styles.stateBody}>Loading your latest saves…</Text>
              </View>
            ) : loadError !== null ? (
              <View style={styles.stateCard}>
                <View accessibilityLiveRegion="polite" accessibilityRole="alert">
                  <Text style={styles.stateTitle}>Recent sources are taking a moment.</Text>
                  <Text style={styles.stateBody}>{loadError}</Text>
                </View>
                <Pressable
                  accessibilityHint="Tries to load recent sources again"
                  accessibilityRole="button"
                  onPress={() => void loadSources()}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.retryButtonLabel}>Try again</Text>
                </Pressable>
              </View>
            ) : recentSources.length === 0 ? (
              <View style={styles.emptyCard}>
                <View aria-hidden style={styles.emptyMark}>
                  <Text style={styles.emptyMarkLabel}>L</Text>
                </View>
                <View style={styles.emptyCopy}>
                  <Text style={styles.stateTitle}>Your recent sources will appear here.</Text>
                  <Text style={styles.stateBody}>Save a webpage or video link whenever you’re ready.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.sourceList}>
                {recentSources.map((source) => {
                  const domain = getDisplayDomain(source.url);
                  const savedDate = getDisplayDate(source.createdAt);
                  const accessibilityLabel = [
                    `Open ${source.label}`,
                    domain,
                    ...(source.folder ? [`folder ${source.folder}`] : []),
                    `saved ${savedDate}`,
                  ].join(', ');

                  return (
                    <Pressable
                      accessibilityHint="Shows this source’s details"
                      accessibilityLabel={accessibilityLabel}
                      accessibilityRole="button"
                      key={source.id}
                      onPress={() => openSourceDetails(source.id)}
                      style={({ pressed }) => [
                        styles.sourceCard,
                        pressed && styles.sourceCardPressed,
                      ]}>
                      <View style={styles.sourceCopy}>
                        <Text style={styles.sourceLabel}>{source.label}</Text>
                        <Text numberOfLines={1} style={styles.sourceDomain}>
                          {domain}
                        </Text>
                        <View style={styles.sourceMetadata}>
                          {source.folder && (
                            <View style={styles.folderChip}>
                              <Text style={styles.folderChipLabel}>{source.folder}</Text>
                            </View>
                          )}
                          <Text style={styles.sourceDate}>Saved {savedDate}</Text>
                        </View>
                      </View>
                      <Text aria-hidden style={styles.sourceArrow}>
                        →
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
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
    paddingTop: 14,
  },
  eyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  greetingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  greetingCopy: {
    minWidth: 200,
    flex: 1,
    gap: 7,
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
    fontSize: 31,
    lineHeight: 37,
  },
  prompt: {
    color: Brand.colors.plumSoft,
    fontSize: 16,
    lineHeight: 23,
  },
  streak: {
    minWidth: 76,
    alignItems: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  streakNumber: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 24,
  },
  streakLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '800',
  },
  primaryAction: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    backgroundColor: Brand.colors.plum,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 15,
    shadowColor: Brand.colors.plum,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  primaryActionEyebrow: {
    color: Brand.colors.creamMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  primaryActionLabel: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  primaryActionArrow: {
    color: Brand.colors.cream,
    fontSize: 27,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  recentSection: {
    gap: 13,
  },
  sectionHeader: {
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 21,
    fontWeight: '800',
  },
  viewAllButton: {
    minHeight: 48,
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    paddingHorizontal: 10,
  },
  viewAllLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 112,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  stateTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  stateBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    minHeight: 48,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 15,
    paddingHorizontal: 18,
  },
  retryButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  emptyMark: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 15,
  },
  emptyMarkLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 24,
    fontWeight: '900',
  },
  emptyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sourceList: {
    gap: 10,
  },
  sourceCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingVertical: 14,
  },
  sourceCardPressed: {
    opacity: 0.72,
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sourceLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  sourceDomain: {
    color: Brand.colors.plumSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  folderChip: {
    maxWidth: '100%',
    flexShrink: 1,
    backgroundColor: Brand.colors.cream,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  folderChipLabel: {
    flexShrink: 1,
    color: Brand.colors.plum,
    fontSize: 11,
    fontWeight: '800',
  },
  sourceDate: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  sourceArrow: {
    color: Brand.colors.walnut,
    fontSize: 22,
    fontWeight: '800',
  },
});
