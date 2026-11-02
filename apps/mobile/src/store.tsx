import {
  CURRENT_USER_ID,
  cloneSeed,
  profileById,
  searchProfiles,
  type Entry,
  type LoveItData,
  type ReportTargetType,
  type SaveEntryInput,
  type UserProfile,
} from '@love-it/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { track } from './analytics';
import { useAuth } from './auth/AuthProvider';
import { getSupabase } from './auth/client';
import { migrateLocalDiary } from './auth/migrateLocal';
import {
  accountToProfile,
  blockRemote,
  emptyDiary,
  fetchProfileByHandle,
  loadAccountDiary,
  mergeProfiles,
  quickSaveRemote,
  removeRemoteEntry,
  reportRemote,
  saveRemoteEntry,
  searchRemoteProfiles,
  toggleRemoteFollow,
  unblockRemote,
  updateRemoteProfile,
} from './remoteDiary';
import { colors } from './theme';

let didOpen = false;

interface AppContextValue {
  ready: boolean;
  signedIn: boolean;
  data: LoveItData;
  me: UserProfile;
  diaryError: string | null;
  lastTab: 'explore' | 'me';
  setLastTab: (tab: 'explore' | 'me') => void;
  reloadDiary: () => Promise<void>;
  save: (input: Omit<SaveEntryInput, 'userId'>) => Promise<Entry>;
  removeSave: (entryId: string) => Promise<void>;
  quickSave: (placeId: string) => Promise<{ saved: boolean; entry?: Entry }>;
  toggleFollow: (userId: string) => Promise<boolean>;
  editProfile: (patch: { displayName?: string; handle?: string; bio?: string }) => Promise<string | null>;
  block: (userId: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
  report: (input: { targetType: ReportTargetType; targetId: string; reason: string; details?: string }) => Promise<string | null>;
  searchPeople: (query: string) => Promise<UserProfile[]>;
  ensureProfile: (handle: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const supabase = getSupabase();
  const [diary, setDiary] = useState<LoveItData | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [diaryError, setDiaryError] = useState<string | null>(null);
  const [lastTab, setLastTab] = useState<'explore' | 'me'>('explore');
  const userId = auth.session?.user.id ?? null;

  const reloadDiary = useCallback(async () => {
    if (!supabase || !userId) return;
    const next = await loadAccountDiary(supabase, userId);
    setDiary(next);
    setDiaryError(null);
  }, [supabase, userId]);

  useEffect(() => {
    if (!auth.ready) return;
    if (!userId || !supabase) {
      setDiary(null);
      setDiaryError(null);
      setAccountReady(true);
      return;
    }
    let cancelled = false;
    setAccountReady(false);
    void (async () => {
      try {
        await migrateLocalDiary(supabase, userId);
        const next = await loadAccountDiary(supabase, userId);
        if (!cancelled) {
          setDiary(next);
          setDiaryError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setDiaryError(error instanceof Error ? error.message : 'Could not load your page.');
        }
      } finally {
        if (!cancelled) setAccountReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.ready, supabase, userId]);

  useEffect(() => {
    if (!auth.ready || !accountReady || didOpen) return;
    didOpen = true;
    track('app_opened', { source: 'cold_start' });
  }, [accountReady, auth.ready]);

  const signedIn = Boolean(userId && auth.profile);
  const seed = useMemo(() => cloneSeed(), []);
  const me = useMemo<UserProfile>(() => {
    if (auth.profile) return accountToProfile(auth.profile);
    if (userId) {
      return accountToProfile({ id: userId, handle: '', displayName: '', bio: '' });
    }
    return profileById(seed, CURRENT_USER_ID) ?? seed.profiles[0]!;
  }, [auth.profile, seed, userId]);

  const data = useMemo<LoveItData>(() => {
    if (!userId) return seed;
    const base = diary ?? emptyDiary();
    return mergeProfiles(base, [me]);
  }, [diary, me, seed, userId]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const requireSignedIn = useCallback(() => {
    if (!supabase || !userId) throw new Error('Sign in to change your page.');
    return { supabase, userId };
  }, [supabase, userId]);

  const save = useCallback(
    async (input: Omit<SaveEntryInput, 'userId'>) => {
      const client = requireSignedIn();
      const entry = await saveRemoteEntry(client.supabase, client.userId, input);
      await reloadDiary();
      return entry;
    },
    [reloadDiary, requireSignedIn],
  );

  const removeSave = useCallback(
    async (entryId: string) => {
      const client = requireSignedIn();
      await removeRemoteEntry(client.supabase, entryId);
      await reloadDiary();
    },
    [reloadDiary, requireSignedIn],
  );

  const quickSave = useCallback(
    async (placeId: string) => {
      const client = requireSignedIn();
      const place = dataRef.current.places.find((item) => item.id === placeId);
      if (!place) return { saved: false as const };
      const result = await quickSaveRemote(client.supabase, client.userId, place);
      await reloadDiary();
      return result;
    },
    [reloadDiary, requireSignedIn],
  );

  const toggleFollow = useCallback(
    async (targetId: string) => {
      const client = requireSignedIn();
      const following = await toggleRemoteFollow(client.supabase, client.userId, targetId);
      await reloadDiary();
      return following;
    },
    [reloadDiary, requireSignedIn],
  );

  const editProfile = useCallback(
    async (patch: { displayName?: string; handle?: string; bio?: string }) => {
      if (!supabase || !userId) return 'Sign in to edit your page.';
      const message = await updateRemoteProfile(supabase, userId, patch);
      if (message) return message;
      await auth.refreshProfile();
      await reloadDiary();
      return null;
    },
    [auth, reloadDiary, supabase, userId],
  );

  const block = useCallback(
    async (targetId: string) => {
      const client = requireSignedIn();
      await blockRemote(client.supabase, client.userId, targetId);
      await reloadDiary();
    },
    [reloadDiary, requireSignedIn],
  );

  const unblock = useCallback(
    async (targetId: string) => {
      const client = requireSignedIn();
      await unblockRemote(client.supabase, client.userId, targetId);
      await reloadDiary();
    },
    [reloadDiary, requireSignedIn],
  );

  const report = useCallback(
    async (input: { targetType: ReportTargetType; targetId: string; reason: string; details?: string }) => {
      if (!supabase || !userId) return 'Sign in to report.';
      return reportRemote(supabase, userId, input);
    },
    [supabase, userId],
  );

  const searchPeople = useCallback(
    async (query: string) => {
      if (!userId || !supabase) return searchProfiles(seed, CURRENT_USER_ID, query);
      const q = query.trim();
      if (q.length >= 2) {
        const found = await searchRemoteProfiles(supabase, q);
        setDiary((current) => (current ? mergeProfiles(current, found) : current));
        return found.filter((profile) => profile.id !== userId);
      }
      return searchProfiles(dataRef.current, userId, query);
    },
    [seed, supabase, userId],
  );

  const ensureProfile = useCallback(
    async (handle: string) => {
      if (!supabase || !userId) return;
      const found = await fetchProfileByHandle(supabase, handle);
      if (!found) return;
      setDiary((current) => (current ? mergeProfiles(current, [found]) : current));
    },
    [supabase, userId],
  );

  const ready = auth.ready && (!userId || accountReady || Boolean(diaryError));

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      signedIn,
      data,
      me,
      diaryError,
      lastTab,
      setLastTab,
      reloadDiary,
      save,
      removeSave,
      quickSave,
      toggleFollow,
      editProfile,
      block,
      unblock,
      report,
      searchPeople,
      ensureProfile,
    }),
    [
      ready,
      signedIn,
      data,
      me,
      diaryError,
      lastTab,
      reloadDiary,
      save,
      removeSave,
      quickSave,
      toggleFollow,
      editProfile,
      block,
      unblock,
      report,
      searchPeople,
      ensureProfile,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {ready ? (
        children
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.ink, letterSpacing: -1 }}>
            Love it <Text style={{ color: colors.coral }}>♥</Text>
          </Text>
        </View>
      )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
