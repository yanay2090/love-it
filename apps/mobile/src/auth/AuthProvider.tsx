import type { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { getSupabase } from './client';
import { migrateLocalDiary } from './migrateLocal';

export interface AccountProfile {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
}

interface AuthContextValue {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  needsHandle: boolean;
  refreshProfile: () => Promise<void>;
  signInWithApple: () => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  claimHandle: (handle: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let googleConfigured = false;

function configureGoogle(): string | null {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!iosClientId || !webClientId) {
    return 'Google sign-in needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.';
  }
  if (!googleConfigured) {
    GoogleSignin.configure({ iosClientId, webClientId });
    googleConfigured = true;
  }
  return null;
}

function mapProfile(row: { id: string; handle: string; display_name: string; bio: string | null }): AccountProfile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, handle, display_name, bio')
      .eq('id', session.user.id)
      .maybeSingle();
    setProfile(data ? mapProfile(data) : null);
  }, [session?.user.id, supabase]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      appState.remove();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      return;
    }
    void refreshProfile();
    void migrateLocalDiary(supabase, session.user.id).catch(() => undefined);
  }, [refreshProfile, session?.user.id, supabase]);

  const needsHandle = Boolean(session && profile && session.user.user_metadata?.handle_chosen !== true);

  const signInWithApple = useCallback(async () => {
    if (!supabase) return 'Supabase is not configured. Add the publishable key and restart.';
    if (Platform.OS !== 'ios') return 'Sign in with Apple is available on iPhone.';
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) return 'Sign in with Apple is not available on this device yet.';
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) return 'Apple did not return an identity token.';
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) return error.message;
      const given = credential.fullName?.givenName;
      const family = credential.fullName?.familyName;
      const fullName = [given, family].filter(Boolean).join(' ');
      if (fullName) {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
      return null;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return null;
      return error instanceof Error ? error.message : 'Apple sign-in failed.';
    }
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return 'Supabase is not configured. Add the publishable key and restart.';
    const missing = configureGoogle();
    if (missing) return missing;
    try {
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return null;
      const token = response.data.idToken;
      if (!token) return 'Google did not return an ID token. Check the Web client ID.';
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
      return error ? error.message : null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Google sign-in failed.';
    }
  }, [supabase]);

  const claimHandle = useCallback(
    async (handle: string, displayName: string) => {
      if (!supabase || !session?.user.id) return 'Sign in first.';
      const name = displayName.trim() || 'New on Love it';
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
      const write = existing
        ? supabase.from('profiles').update({ handle, display_name: name }).eq('id', session.user.id)
        : supabase.from('profiles').insert({ id: session.user.id, handle, display_name: name });
      const { error } = await write;
      if (error) {
        if (error.code === '23505' || /duplicate key|profiles_handle/i.test(error.message)) return 'That handle is taken.';
        return error.message;
      }
      const { error: metaError } = await supabase.auth.updateUser({ data: { handle_chosen: true, handle } });
      if (metaError) return metaError.message;
      await refreshProfile();
      return null;
    },
    [refreshProfile, session?.user.id, supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [supabase]);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) return 'Sign in first.';
    const { error } = await supabase.rpc('delete_own_account');
    if (error) return error.message;
    await supabase.auth.signOut();
    setProfile(null);
    return null;
  }, [session, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: Boolean(supabase),
      session,
      user: session?.user ?? null,
      profile,
      needsHandle,
      refreshProfile,
      signInWithApple,
      signInWithGoogle,
      claimHandle,
      signOut,
      deleteAccount,
    }),
    [
      claimHandle,
      deleteAccount,
      needsHandle,
      profile,
      ready,
      refreshProfile,
      session,
      signInWithApple,
      signInWithGoogle,
      signOut,
      supabase,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
