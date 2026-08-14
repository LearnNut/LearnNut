import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { getSavedSources, type SavedSource } from '@/services/source-storage';

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

function sourceMatchesQuery(source: SavedSource, searchTerms: string[]) {
  const searchableText = `${source.label}\n${source.folder ?? ''}\n${source.url}`.toLowerCase();

  return searchTerms.every((term) => searchableText.includes(term));
}

export default function SearchScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const loadRequestRef = useRef(0);
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [query, setQuery] = useState('');
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
        setLoadError('We couldn’t search your lessons. Please try again.');
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

  const searchTerms = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );
  const results = useMemo(
    () =>
      searchTerms.length === 0
        ? []
        : sources.filter((source) => sourceMatchesQuery(source, searchTerms)),
    [searchTerms, sources],
  );

  const openSourceDetails = (id: string) => {
    router.push({
      pathname: '/source/[id]',
      params: { id },
    });
  };

  const renderSource = ({ item }: { item: SavedSource }) => {
    const domain = getDisplayDomain(item.url);
    const savedDate = getDisplayDate(item.createdAt);
    const accessibilityLabel = [
      `Open ${item.label}`,
      `website ${domain}`,
      ...(item.folder ? [`folder ${item.folder}`] : []),
      `saved ${savedDate}`,
    ].join(', ');

    return (
      <Pressable
        accessibilityHint="Shows this lesson’s overview"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => openSourceDetails(item.id)}
        style={({ pressed }) => [styles.resultCard, pressed && styles.resultCardPressed]}>
        <View style={styles.resultCopy}>
          <Text style={styles.resultLabel}>{item.label}</Text>
          <Text numberOfLines={1} style={styles.resultDomain}>
            {domain}
          </Text>
          <Text numberOfLines={2} style={styles.resultUrl}>
            {item.url}
          </Text>
          <View style={styles.resultMetadata}>
            {item.folder && (
              <View style={styles.folderChip}>
                <Text style={styles.folderChipLabel}>{item.folder}</Text>
              </View>
            )}
            <Text style={styles.resultDate}>Saved {savedDate}</Text>
          </View>
        </View>
        <Text aria-hidden style={styles.resultArrow}>
          →
        </Text>
      </Pressable>
    );
  };

  let emptyContent;

  if (isLoading) {
    emptyContent = (
      <View
        accessible
        accessibilityLabel="Loading your lessons"
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        style={styles.stateCard}>
        <ActivityIndicator color={Brand.colors.plum} size="large" />
        <Text style={styles.stateTitle}>Getting your Library ready…</Text>
      </View>
    );
  } else if (loadError !== null) {
    emptyContent = (
      <View style={styles.stateCard}>
        <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.stateCopy}>
          <Text style={styles.stateEyebrow}>LOCAL SEARCH</Text>
          <Text style={styles.stateTitle}>Search is taking a moment.</Text>
          <Text style={styles.stateBody}>{loadError}</Text>
        </View>
        <Pressable
          accessibilityHint="Tries to load your lessons again"
          accessibilityRole="button"
          onPress={() => void loadSources()}
          style={({ pressed }) => [styles.stateButton, pressed && styles.buttonPressed]}>
          <Text style={styles.stateButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  } else if (sources.length === 0) {
    emptyContent = (
      <View style={styles.stateCard}>
        <View aria-hidden style={styles.emptyMark}>
          <Text style={styles.emptyMarkLabel}>L</Text>
        </View>
        <View style={styles.stateCopy}>
          <Text style={styles.stateTitle}>Nothing to search yet.</Text>
          <Text style={styles.stateBody}>
            Create a lesson from a webpage or video link, then find it here by title, folder or URL.
          </Text>
        </View>
        <Pressable
          accessibilityHint="Opens the new lesson flow"
          accessibilityRole="button"
          onPress={() => router.navigate('/add-source')}
          style={({ pressed }) => [styles.stateButton, pressed && styles.buttonPressed]}>
          <Text style={styles.stateButtonLabel}>Create your first lesson</Text>
        </Pressable>
      </View>
    );
  } else if (searchTerms.length === 0) {
    emptyContent = (
      <View style={styles.stateCard}>
        <View aria-hidden style={styles.searchMark}>
          <SymbolView
            name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
            size={29}
            tintColor={Brand.colors.plum}
          />
        </View>
        <View style={styles.stateCopy}>
          <Text style={styles.stateTitle}>Search your lessons.</Text>
          <Text style={styles.stateBody}>Try a lesson title, folder name, website or part of a URL.</Text>
        </View>
      </View>
    );
  } else {
    emptyContent = (
      <View style={styles.stateCard}>
        <View accessibilityLiveRegion="polite" style={styles.stateCopy}>
          <Text style={styles.stateEyebrow}>NO MATCHES</Text>
          <Text style={styles.stateTitle}>We couldn’t find that in your lessons.</Text>
          <Text style={styles.stateBody}>Try another lesson title, folder or URL.</Text>
        </View>
        <Pressable
          accessibilityHint="Clears the current search"
          accessibilityRole="button"
          onPress={() => setQuery('')}
          style={({ pressed }) => [styles.secondaryStateButton, pressed && styles.buttonPressed]}>
          <Text style={styles.secondaryStateButtonLabel}>Clear search</Text>
        </Pressable>
      </View>
    );
  }

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.headingGroup}>
        <Text style={styles.eyebrow}>YOUR LESSONS</Text>
        <Text accessibilityRole="header" style={[styles.title, isNarrow && styles.titleNarrow]}>
          Search your lessons
        </Text>
        <Text style={styles.description}>
          Search lesson titles, folders and original URLs saved on this device.
        </Text>
      </View>

      <View style={styles.searchField}>
        <SymbolView
          accessible={false}
          name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
          size={23}
          tintColor={Brand.colors.plum}
        />
        <TextInput
          accessibilityHint="Searches lesson titles, folders and original URLs as you type"
          accessibilityLabel="Search your lessons"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          enterKeyHint="search"
          onChangeText={setQuery}
          placeholder="Lesson title, folder or URL"
          placeholderTextColor={Brand.colors.plumSoft}
          returnKeyType="search"
          spellCheck={false}
          style={styles.searchInput}
          value={query}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityHint="Clears the current search"
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            onPress={() => setQuery('')}
            style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}>
            <Text aria-hidden style={styles.clearButtonLabel}>
              ×
            </Text>
          </Pressable>
        )}
      </View>

      {!isLoading && loadError === null && searchTerms.length > 0 && (
        <Text accessibilityLiveRegion="polite" style={styles.resultCount}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          contentContainerStyle={[styles.content, isNarrow && styles.contentNarrow]}
          data={!isLoading && loadError === null ? results : []}
          ItemSeparatorComponent={() => <View style={styles.resultSeparator} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={emptyContent}
          ListHeaderComponent={listHeader}
          renderItem={renderSource}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 18,
  },
  contentNarrow: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  header: {
    gap: 18,
    marginBottom: 22,
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
  searchField: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.plumSoft,
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 15,
  },
  searchInput: {
    minWidth: 0,
    minHeight: 56,
    flex: 1,
    color: Brand.colors.plum,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearButton: {
    width: 48,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  clearButtonPressed: {
    backgroundColor: Brand.colors.cream,
  },
  clearButtonLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 27,
    fontWeight: '500',
  },
  resultCount: {
    color: Brand.colors.plumSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  resultSeparator: {
    height: 11,
  },
  resultCard: {
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
  resultCardPressed: {
    opacity: 0.72,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  resultLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  resultDomain: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  resultUrl: {
    color: Brand.colors.plumSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  resultMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
  resultDate: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  resultArrow: {
    color: Brand.colors.walnut,
    fontSize: 22,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 17,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
  },
  stateCopy: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 7,
  },
  stateEyebrow: {
    color: Brand.colors.plumSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    textAlign: 'center',
  },
  stateTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    textAlign: 'center',
  },
  stateBody: {
    color: Brand.colors.plumSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.plum,
    borderRadius: 17,
    paddingHorizontal: 20,
  },
  stateButtonLabel: {
    color: Brand.colors.cream,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryStateButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 17,
    paddingHorizontal: 20,
  },
  secondaryStateButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  emptyMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 19,
  },
  emptyMarkLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 29,
    fontWeight: '900',
  },
  searchMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 19,
  },
});
