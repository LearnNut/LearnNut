import { Platform } from 'react-native';

export const Brand = {
  colors: {
    plum: '#352242',
    plumSoft: '#705F77',
    cream: '#F9E9D0',
    creamMuted: '#E8D7C2',
    lavender: '#A87B98',
    walnut: '#BD875D',
    offWhite: '#FCF8F2',
    white: '#FFFFFF',
  },
  fonts: {
    rounded: Platform.select({
      ios: 'ui-rounded',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
} as const;
