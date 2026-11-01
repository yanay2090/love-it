import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/ui';
import { useApp } from '../store';
import { colors } from '../theme';

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { me, editProfile } = useApp();
  const [displayName, setDisplayName] = useState(me.displayName);
  const [handle, setHandle] = useState(me.handle);
  const [bio, setBio] = useState(me.bio);
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit page</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Name</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />
      <Text style={styles.label}>Handle</Text>
      <TextInput
        value={handle}
        onChangeText={(value) => setHandle(value.toLowerCase().replace(/^@/, ''))}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Text style={styles.label}>Bio</Text>
      <TextInput value={bio} onChangeText={setBio} style={[styles.input, styles.bio]} multiline />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Save"
        onPress={() => {
          const message = editProfile({ displayName, handle, bio });
          if (message) {
            setError(message);
            return;
          }
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 16, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  cancel: { color: colors.coral, fontWeight: '800' },
  label: { fontWeight: '800', marginTop: 8 },
  input: { backgroundColor: colors.white, borderRadius: 14, padding: 12, fontSize: 16, color: colors.ink },
  bio: { minHeight: 90, textAlignVertical: 'top' },
  error: { color: colors.coral, fontWeight: '700' },
});
