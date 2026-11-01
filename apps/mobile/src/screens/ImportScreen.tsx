import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui';
import { track } from '../analytics';
import { useApp } from '../store';
import { colors } from '../theme';

export function ImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importDemo } = useApp();
  const [count, setCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  async function start() {
    if (running) return;
    setRunning(true);
    track('gmaps_import_started', { source: 'my_page' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const imported = importDemo();
    track('gmaps_import_completed', { imported_count: imported });
    setCount(imported);
    setRunning(false);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Import from Google Maps</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.body}>
        Bring a saved list into your Love it page. This starter records the day-one import events and adds a few Tel
        Aviv places you don’t have yet. The Google Takeout parser connects here once the backend is live.
      </Text>
      {count === null ? (
        <PrimaryButton label={running ? 'Importing' : 'Start import'} onPress={() => void start()} disabled={running} />
      ) : (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Imported {count} {count === 1 ? 'place' : 'places'}</Text>
          <PrimaryButton label="See my page" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', flex: 1, letterSpacing: -0.4 },
  cancel: { color: colors.coral, fontWeight: '800', marginTop: 8 },
  body: { fontSize: 16, lineHeight: 22, color: '#5C554E' },
  result: { gap: 12 },
  resultTitle: { fontSize: 20, fontWeight: '800' },
});
