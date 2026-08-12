import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>LEARNNUT</Text>
              <Text accessibilityRole="header" style={styles.title}>
                What are we cracking today?
              </Text>
            </View>
            <View accessibilityLabel="Current learning streak: zero days" style={styles.streak}>
              <Text style={styles.streakNumber}>0</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>START A LESSON</Text>
            <Text style={styles.heroTitle}>Turn a source into something you can teach.</Text>
            <Text style={styles.heroBody}>
              Add a video, PDF, audio file or text. LearnNut will build a grounded learning session.
            </Text>
            <Pressable
              accessibilityHint="Source importing will be connected in the next build step"
              accessibilityRole="button"
              style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}>
              <Text style={styles.addButtonLabel}>＋ Add your first source</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your learning loop</Text>
            <Text style={styles.sectionMeta}>4 steps</Text>
          </View>

          <View style={styles.steps}>
            {[
              ['01', 'Learn', 'Watch or read with source bookmarks.'],
              ['02', 'Prove', 'Answer questions and inspect the evidence.'],
              ['03', 'Teach', 'Explain it to Milo, Ari and Nova.'],
              ['04', 'Keep', 'Repair gaps and return for short reviews.'],
            ].map(([number, title, body]) => (
              <View key={number} style={styles.stepCard}>
                <Text style={styles.stepNumber}>{number}</Text>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={styles.stepBody}>{body}</Text>
                </View>
              </View>
            ))}
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
    gap: 24,
    paddingHorizontal: 22,
    paddingBottom: 48,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {
    color: Brand.colors.walnut,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 37,
    marginTop: 6,
    maxWidth: 280,
  },
  streak: {
    minWidth: 66,
    alignItems: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  streakNumber: {
    color: Brand.colors.plum,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 23,
  },
  streakLabel: {
    color: Brand.colors.plumSoft,
    fontSize: 10,
    fontWeight: '700',
  },
  heroCard: {
    gap: 13,
    backgroundColor: Brand.colors.plum,
    borderRadius: 28,
    padding: 24,
    shadowColor: Brand.colors.plum,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 5,
  },
  heroEyebrow: {
    color: Brand.colors.lavender,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: Brand.colors.cream,
    fontFamily: Brand.fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  heroBody: {
    color: Brand.colors.creamMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  addButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 18,
    marginTop: 4,
    paddingHorizontal: 18,
  },
  addButtonLabel: {
    color: Brand.colors.plum,
    fontSize: 16,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 21,
    fontWeight: '800',
  },
  sectionMeta: {
    color: Brand.colors.plumSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  steps: {
    gap: 11,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: Brand.colors.white,
    borderColor: Brand.colors.cream,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  stepNumber: {
    color: Brand.colors.walnut,
    fontFamily: Brand.fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
  },
  stepCopy: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    color: Brand.colors.plum,
    fontSize: 17,
    fontWeight: '800',
  },
  stepBody: {
    color: Brand.colors.plumSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});
