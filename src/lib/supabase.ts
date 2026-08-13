import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

function requirePublicEnvironmentVariable(value: string | undefined, name: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing ${name}. Add it to your local environment before using Supabase.`);
  }

  return value.trim();
}

const supabaseUrl = requirePublicEnvironmentVariable(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  'EXPO_PUBLIC_SUPABASE_URL',
);
const supabasePublishableKey = requirePublicEnvironmentVariable(
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type LearnNutSupabaseClient = typeof supabase;
