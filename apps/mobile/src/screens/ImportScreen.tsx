import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

/** Hidden from the My page menu until a real Google Takeout import exists. */
export function ImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Import from Google Maps</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.body}>
        Takeout import isn’t available yet. Nothing was added to your page.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', flex: 1, letterSpacing: -0.4 },
  cancel: { color: colors.coral, fontWeight: '800', marginTop: 8 },
  body: { fontSize: 16, lineHeight: 22, color: '#5C554E' },
});
