import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ColorValue, PixelRatio, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';

type TabSymbolProps = Readonly<{
  color: ColorValue;
  name: SymbolViewProps['name'];
  size?: number;
}>;

function TabSymbol({ color, name, size = 24 }: TabSymbolProps) {
  return (
    <SymbolView
      accessible={false}
      fallback={<View style={{ height: size, width: size }} />}
      name={name}
      size={size}
      tintColor={color}
      weight="semibold"
    />
  );
}

function AddTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      accessible={false}
      style={[styles.addIconOuter, focused && styles.addIconOuterFocused]}>
      <View style={styles.addIconInner}>
        <Text allowFontScaling={false} style={styles.addIconLabel}>
          +
        </Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const labelScale = Math.min(PixelRatio.getFontScale(), 2);
  const tabBarContentHeight = 70 + Math.max(0, labelScale - 1) * 14;

  return (
    <Tabs
      backBehavior="initialRoute"
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Brand.colors.offWhite },
        tabBarActiveTintColor: Brand.colors.plum,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: Brand.colors.plumSoft,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarContentHeight + insets.bottom,
            paddingLeft: Math.max(4, insets.left),
            paddingRight: Math.max(4, insets.right),
          },
        ],
      }}>
      <Tabs.Screen
        name="home"
        options={{
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color }) => (
            <TabSymbol
              color={color}
              name={{ android: 'home', ios: 'house.fill', web: 'home' }}
            />
          ),
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarAccessibilityLabel: 'Search tab',
          tabBarIcon: ({ color }) => (
            <TabSymbol
              color={color}
              name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
            />
          ),
          title: 'Search',
        }}
      />
      <Tabs.Screen
        name="add-source"
        options={{
          tabBarAccessibilityLabel: 'Add source tab',
          tabBarIcon: ({ focused }) => <AddTabIcon focused={focused} />,
          tabBarIconStyle: styles.addTabIconContainer,
          tabBarLabel: 'Add',
          title: 'Add',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarAccessibilityLabel: 'Library tab',
          tabBarIcon: ({ color }) => (
            <TabSymbol
              color={color}
              name={{ android: 'library_books', ios: 'books.vertical.fill', web: 'library_books' }}
            />
          ),
          title: 'Library',
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          tabBarAccessibilityLabel: 'Me tab',
          tabBarIcon: ({ color }) => (
            <TabSymbol
              color={color}
              name={{ android: 'person', ios: 'person.fill', web: 'person' }}
            />
          ),
          title: 'Me',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    backgroundColor: Brand.colors.offWhite,
    borderColor: Brand.colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: Brand.colors.plum,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
  },
  tabBarItem: {
    minHeight: 60,
    paddingTop: 5,
  },
  tabBarLabel: {
    fontFamily: Brand.fonts.rounded,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  addIconOuter: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.walnut,
    borderColor: Brand.colors.plumSoft,
    borderRadius: 23,
    borderWidth: 2,
  },
  addTabIconContainer: {
    width: 46,
    height: 46,
  },
  addIconOuterFocused: {
    borderColor: Brand.colors.plum,
  },
  addIconInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.cream,
    borderRadius: 18,
  },
  addIconLabel: {
    color: Brand.colors.plum,
    fontFamily: Brand.fonts.rounded,
    fontSize: 29,
    fontWeight: '500',
    lineHeight: 32,
    marginTop: -2,
  },
});
