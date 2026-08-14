import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import {
  getDisplayNameValidationError,
  getMetadataDisplayName,
  getValidDisplayName,
  normalizeDisplayName,
} from '@/lib/display-name';
import { supabase } from '@/lib/supabase';

type AuthContextValue = Readonly<{
  displayName: string | null;
  displayNameError: string | null;
  displayNameLoading: boolean;
  loading: boolean;
  refreshDisplayName: () => Promise<void>;
  session: Session | null;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  user: User | null;
}>;

type DisplayNameState = Readonly<{
  displayName: string | null;
  error: string | null;
  hasResolved: boolean;
  loading: boolean;
  userId: string | null;
}>;

const EMPTY_DISPLAY_NAME_STATE: DisplayNameState = {
  displayName: null,
  error: null,
  hasResolved: false,
  loading: false,
  userId: null,
};

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
  const [authLoading, setAuthLoading] = useState(true);
  const [displayNameState, setDisplayNameState] = useState<DisplayNameState>(
    EMPTY_DISPLAY_NAME_STATE,
  );
  const sessionRef = useRef<Session | null>(null);
  const displayNameRequestRef = useRef(0);
  const displayNameUpdateInProgressRef = useRef(false);

  const resolveDisplayName = useCallback(async (user: User) => {
    const requestId = displayNameRequestRef.current + 1;
    const metadataDisplayName = getMetadataDisplayName(user.user_metadata);
    displayNameRequestRef.current = requestId;

    setDisplayNameState((currentState) => {
      const canPreserveResolvedName =
        currentState.userId === user.id && currentState.hasResolved;

      return {
        displayName: canPreserveResolvedName ? currentState.displayName : null,
        error: null,
        hasResolved: canPreserveResolvedName,
        loading: true,
        userId: user.id,
      };
    });

    const isCurrentRequest = () =>
      displayNameRequestRef.current === requestId &&
      sessionRef.current?.user.id === user.id;

    const finishResolution = (
      displayName: string | null,
      error: string | null = null,
      preserveResolvedNameOnError = false,
    ) => {
      if (!isCurrentRequest()) {
        return;
      }

      setDisplayNameState((currentState) => {
        if (currentState.userId !== user.id) {
          return currentState;
        }

        const resolvedDisplayName =
          preserveResolvedNameOnError && currentState.hasResolved
            ? (currentState.displayName ?? displayName)
            : displayName;

        return {
          displayName: resolvedDisplayName,
          error,
          hasResolved: true,
          loading: false,
          userId: user.id,
        };
      });
    };

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!isCurrentRequest()) {
        return;
      }

      if (profileError !== null) {
        finishResolution(
          metadataDisplayName,
          'We couldn’t load your saved profile name just now.',
          true,
        );
        return;
      }

      if (profile === null) {
        finishResolution(
          metadataDisplayName,
          metadataDisplayName === null
            ? 'We couldn’t find your profile, so your saved name isn’t available right now.'
            : 'Your account name is available, but we couldn’t find a profile to sync it to.',
          true,
        );
        return;
      }

      const profileDisplayName = getValidDisplayName(profile.display_name);

      if (profileDisplayName !== null) {
        if (metadataDisplayName !== profileDisplayName) {
          const accountSyncError =
            'Your profile name is available, but we couldn’t sync it to your account details just now.';

          try {
            const { data, error } = await supabase.auth.updateUser({
              data: { display_name: profileDisplayName },
            });

            if (!isCurrentRequest()) {
              return;
            }

            if (error !== null || data.user.id !== user.id) {
              finishResolution(profileDisplayName, accountSyncError);
              return;
            }

            const currentSession = sessionRef.current;

            if (currentSession !== null && currentSession.user.id === user.id) {
              const nextSession = { ...currentSession, user: data.user };
              sessionRef.current = nextSession;
              setSession(nextSession);
            }
          } catch {
            finishResolution(profileDisplayName, accountSyncError);
            return;
          }
        }

        finishResolution(profileDisplayName);
        return;
      }

      if (profile.display_name !== null) {
        finishResolution(
          metadataDisplayName,
          'Your saved profile name couldn’t be read just now.',
          true,
        );
        return;
      }

      if (metadataDisplayName === null) {
        finishResolution(null);
        return;
      }

      const { data: syncedProfile, error: syncError } = await supabase
        .from('profiles')
        .update({ display_name: metadataDisplayName })
        .eq('id', user.id)
        .is('display_name', null)
        .select('display_name')
        .maybeSingle();

      if (!isCurrentRequest()) {
        return;
      }

      if (syncError !== null) {
        finishResolution(
          metadataDisplayName,
          'Your account name is available, but we couldn’t sync it to your profile just now.',
          true,
        );
        return;
      }

      if (syncedProfile !== null) {
        const syncedName = getValidDisplayName(syncedProfile.display_name);

        if (syncedName !== null) {
          finishResolution(syncedName);
          return;
        }
      }

      const { data: refreshedProfile, error: refreshError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!isCurrentRequest()) {
        return;
      }

      const refreshedName = getValidDisplayName(refreshedProfile?.display_name);

      if (refreshError === null && refreshedName !== null) {
        finishResolution(refreshedName);
        return;
      }

      finishResolution(
        metadataDisplayName,
        refreshedProfile === null
          ? 'Your account name is available, but we couldn’t find a profile to sync it to.'
          : 'Your account name is available, but we couldn’t sync it to your profile just now.',
        true,
      );
    } catch {
      finishResolution(
        metadataDisplayName,
        'We couldn’t load your saved profile name just now.',
        true,
      );
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let authEventVersion = 0;

    const publishSession = (nextSession: Session | null) => {
      const previousUserId = sessionRef.current?.user.id ?? null;
      const nextUserId = nextSession?.user.id ?? null;

      if (previousUserId !== nextUserId) {
        displayNameRequestRef.current += 1;
        setDisplayNameState(EMPTY_DISPLAY_NAME_STATE);
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventVersion += 1;

      if (!isActive) {
        return;
      }

      publishSession(nextSession);
      setAuthLoading(false);
    });

    const restoreVersion = authEventVersion;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) {
          return;
        }

        if (authEventVersion === restoreVersion) {
          publishSession(error ? null : data.session);
        }

        setAuthLoading(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        if (authEventVersion === restoreVersion) {
          publishSession(null);
        }

        setAuthLoading(false);
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

  const sessionUserId = session?.user.id;

  useEffect(() => {
    const user = sessionRef.current?.user;

    if (user === undefined) {
      displayNameRequestRef.current += 1;
      setDisplayNameState(EMPTY_DISPLAY_NAME_STATE);
      return;
    }

    void resolveDisplayName(user);

    return () => {
      displayNameRequestRef.current += 1;
    };
  }, [resolveDisplayName, sessionUserId]);

  const refreshDisplayName = useCallback(async () => {
    const user = sessionRef.current?.user;

    if (user !== undefined && !displayNameUpdateInProgressRef.current) {
      await resolveDisplayName(user);
    }
  }, [resolveDisplayName]);

  const updateDisplayName = useCallback(async (name: string) => {
    const validationError = getDisplayNameValidationError(name);

    if (validationError !== null) {
      throw new Error(validationError);
    }

    const normalizedName = normalizeDisplayName(name);
    const userId = sessionRef.current?.user.id;

    if (userId === undefined) {
      throw new Error('Your session ended before we could save your name. Please sign in again.');
    }

    if (displayNameUpdateInProgressRef.current) {
      throw new Error('Your name is already being saved.');
    }

    displayNameUpdateInProgressRef.current = true;

    const requestId = displayNameRequestRef.current + 1;
    displayNameRequestRef.current = requestId;

    setDisplayNameState((currentState) => ({
      displayName: currentState.userId === userId ? currentState.displayName : null,
      error: null,
      hasResolved: currentState.userId === userId && currentState.hasResolved,
      loading: true,
      userId,
    }));

    const isCurrentUpdate = () =>
      displayNameRequestRef.current === requestId &&
      sessionRef.current?.user.id === userId;

    const finishUpdate = (displayName: string, error: string | null = null) => {
      if (!isCurrentUpdate()) {
        return;
      }

      setDisplayNameState({
        displayName,
        error,
        hasResolved: true,
        loading: false,
        userId,
      });
    };

    try {
      let updatedProfile: { display_name: unknown } | null;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ display_name: normalizedName })
          .eq('id', userId)
          .select('display_name')
          .maybeSingle();

        if (error !== null) {
          throw error;
        }

        updatedProfile = data;
      } catch {
        throw new Error('We couldn’t confirm that your name was saved. Check your connection and try again.');
      }

      if (!isCurrentUpdate()) {
        throw new Error('Your session changed before we could finish saving your name.');
      }

      const updatedProfileName = getValidDisplayName(updatedProfile?.display_name);

      if (updatedProfile === null) {
        throw new Error(
          'We couldn’t find your profile, so your name was not saved. Please try again later.',
        );
      }

      if (updatedProfileName !== normalizedName) {
        throw new Error('We couldn’t confirm that your name was saved. Check your connection and try again.');
      }

      setDisplayNameState({
        displayName: normalizedName,
        error: null,
        hasResolved: true,
        loading: true,
        userId,
      });

      const partialSyncError =
        'Your name was saved to your profile, but we couldn’t confirm the account sync. Try saving it again.';
      let updatedAuthUser: User;

      try {
        const { data, error } = await supabase.auth.updateUser({
          data: { display_name: normalizedName },
        });

        if (error !== null) {
          throw error;
        }

        updatedAuthUser = data.user;
      } catch {
        finishUpdate(normalizedName, partialSyncError);
        throw new Error(partialSyncError);
      }

      if (!isCurrentUpdate() || updatedAuthUser.id !== userId) {
        throw new Error('The active session changed.');
      }

      const currentSession = sessionRef.current;

      if (currentSession !== null && currentSession.user.id === userId) {
        const nextSession = { ...currentSession, user: updatedAuthUser };
        sessionRef.current = nextSession;
        setSession(nextSession);
      }

      finishUpdate(normalizedName);
    } catch (error) {
      if (isCurrentUpdate()) {
        setDisplayNameState((currentState) =>
          currentState.loading
            ? {
                ...currentState,
                error: error instanceof Error ? error.message : 'We couldn’t save your name just now.',
                hasResolved: true,
                loading: false,
              }
            : currentState,
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('We couldn’t save your name just now. Check your connection and try again.');
    } finally {
      displayNameUpdateInProgressRef.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      throw error;
    }

    displayNameRequestRef.current += 1;
    sessionRef.current = null;
    setDisplayNameState(EMPTY_DISPLAY_NAME_STATE);
    setSession(null);
  }, []);

  const currentUserId = session?.user.id ?? null;
  const displayNameBelongsToCurrentUser =
    currentUserId !== null && displayNameState.userId === currentUserId;
  const displayName = displayNameBelongsToCurrentUser
    ? displayNameState.displayName
    : null;
  const displayNameError = displayNameBelongsToCurrentUser
    ? displayNameState.error
    : null;
  const displayNameLoading =
    currentUserId !== null &&
    (!displayNameBelongsToCurrentUser || displayNameState.loading);
  const loading = authLoading;

  const value = useMemo<AuthContextValue>(
    () => ({
      displayName,
      displayNameError,
      displayNameLoading,
      loading,
      refreshDisplayName,
      session,
      signOut,
      updateDisplayName,
      user: session?.user ?? null,
    }),
    [
      displayName,
      displayNameError,
      displayNameLoading,
      loading,
      refreshDisplayName,
      session,
      signOut,
      updateDisplayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
