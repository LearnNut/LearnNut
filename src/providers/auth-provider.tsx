import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

type AuthContextValue = Readonly<{
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let authEventVersion = 0;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1;

      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setLoading(false);
    });

    const restoreVersion = authEventVersion;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) {
          return;
        }

        if (authEventVersion === restoreVersion) {
          setSession(error ? null : data.session);
        }

        setLoading(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        if (authEventVersion === restoreVersion) {
          setSession(null);
        }

        setLoading(false);
      });

    const updateAutoRefresh = (state: string | null) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            updateAutoRefresh(state);
          });

    if (Platform.OS !== 'web') {
      updateAutoRefresh(AppState.currentState);
    }

    return () => {
      isActive = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();

      if (Platform.OS !== 'web') {
        supabase.auth.stopAutoRefresh();
      }
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      throw error;
    }

    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      signOut,
      user: session?.user ?? null,
    }),
    [loading, session, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
