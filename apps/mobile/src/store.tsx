import {
  CURRENT_USER_ID,
  GMAPS_IMPORT_PLACE_IDS,
  SEED_VERSION,
  addReport,
  blockUser as blockUserRow,
  cloneSeed,
  importPlaces,
  profileById,
  removeEntry,
  saveEntry,
  toggleFollow as toggleFollowRow,
  toggleQuickSave,
  unblockUser as unblockUserRow,
  updateProfile as updateProfileRow,
  type Entry,
  type LoveItData,
  type ReportTargetType,
  type SaveEntryInput,
  type UserProfile,
} from '@love-it/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { track } from './analytics';
import { colors } from './theme';

const STORAGE_KEY = 'loveit.demo.v1';
let didOpen = false;

interface Envelope {
  seedVersion: number;
  data: LoveItData;
  demoSignupTracked: boolean;
}

interface AppContextValue {
  ready: boolean;
  data: LoveItData;
  me: UserProfile;
  lastTab: 'explore' | 'me';
  setLastTab: (tab: 'explore' | 'me') => void;
  save: (input: Omit<SaveEntryInput, 'userId'>) => Entry;
  removeSave: (entryId: string) => void;
  quickSave: (placeId: string) => { saved: boolean; entry?: Entry };
  toggleFollow: (userId: string) => boolean;
  editProfile: (patch: { displayName?: string; handle?: string; bio?: string }) => string | null;
  block: (userId: string) => void;
  unblock: (userId: string) => void;
  report: (input: { targetType: ReportTargetType; targetId: string; reason: string; details?: string }) => void;
  importDemo: () => number;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LoveItData>(() => cloneSeed());
  const [ready, setReady] = useState(false);
  const [demoSignupTracked, setDemoSignupTracked] = useState(false);
  const [lastTab, setLastTab] = useState<'explore' | 'me'>('explore');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Envelope;
        if (parsed.seedVersion !== SEED_VERSION || !parsed.data?.places) return;
        setData(parsed.data);
        setDemoSignupTracked(Boolean(parsed.demoSignupTracked));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const envelope: Envelope = { seedVersion: SEED_VERSION, data, demoSignupTracked };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope)).catch(() => undefined);
  }, [data, demoSignupTracked, ready]);

  useEffect(() => {
    if (!ready || didOpen) return;
    didOpen = true;
    track('app_opened', { source: 'cold_start' });
    if (!demoSignupTracked) {
      track('signup_completed', { method: 'demo' });
      setDemoSignupTracked(true);
    }
  }, [ready, demoSignupTracked]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const commit = useCallback((next: LoveItData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const me = profileById(data, CURRENT_USER_ID) ?? cloneSeed().profiles[0]!;

  const save = useCallback(
    (input: Omit<SaveEntryInput, 'userId'>) => {
      const result = saveEntry(dataRef.current, { ...input, userId: CURRENT_USER_ID });
      commit(result.data);
      return result.entry;
    },
    [commit],
  );

  const removeSave = useCallback(
    (entryId: string) => {
      commit(removeEntry(dataRef.current, entryId));
    },
    [commit],
  );

  const quickSave = useCallback(
    (placeId: string) => {
      const next = toggleQuickSave(dataRef.current, CURRENT_USER_ID, placeId);
      commit(next.data);
      return { saved: next.saved, entry: next.entry };
    },
    [commit],
  );

  const toggleFollow = useCallback(
    (userId: string) => {
      const next = toggleFollowRow(dataRef.current, CURRENT_USER_ID, userId);
      commit(next.data);
      return next.following;
    },
    [commit],
  );

  const editProfile = useCallback(
    (patch: { displayName?: string; handle?: string; bio?: string }) => {
      try {
        commit(updateProfileRow(dataRef.current, CURRENT_USER_ID, patch));
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : 'Could not save your page.';
      }
    },
    [commit],
  );

  const block = useCallback(
    (userId: string) => {
      commit(blockUserRow(dataRef.current, CURRENT_USER_ID, userId));
    },
    [commit],
  );

  const unblock = useCallback(
    (userId: string) => {
      commit(unblockUserRow(dataRef.current, CURRENT_USER_ID, userId));
    },
    [commit],
  );

  const report = useCallback(
    (input: { targetType: ReportTargetType; targetId: string; reason: string; details?: string }) => {
      commit(addReport(dataRef.current, { ...input, reporterId: CURRENT_USER_ID }));
    },
    [commit],
  );

  const importDemo = useCallback(() => {
    const result = importPlaces(dataRef.current, CURRENT_USER_ID, GMAPS_IMPORT_PLACE_IDS);
    commit(result.data);
    return result.imported.length;
  }, [commit]);

  const resetDemo = useCallback(() => {
    setData(cloneSeed());
    setDemoSignupTracked(false);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      data,
      me,
      lastTab,
      setLastTab,
      save,
      removeSave,
      quickSave,
      toggleFollow,
      editProfile,
      block,
      unblock,
      report,
      importDemo,
      resetDemo,
    }),
    [
      ready,
      data,
      me,
      lastTab,
      save,
      removeSave,
      quickSave,
      toggleFollow,
      editProfile,
      block,
      unblock,
      report,
      importDemo,
      resetDemo,
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
