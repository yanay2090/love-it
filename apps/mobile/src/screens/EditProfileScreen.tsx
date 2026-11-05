import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton, rtlInput } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { useApp } from '../store';
import { colors } from '../theme';

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const { me, editProfile } = useApp();
  const source = session && profile ? profile : null;
  const [displayName, setDisplayName] = useState(source?.displayName ?? me.displayName);
  const [handle, setHandle] = useState(source?.handle ?? me.handle);
  const [bio, setBio] = useState(source?.bio ?? me.bio);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit page</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      {session ? null : <Text style={styles.error}>Sign in to edit your page.</Text>}
      <Text style={styles.label}>Name</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} style={[styles.input, rtlInput]} editable={Boolean(session)} />
      <Text style={styles.label}>Handle</Text>
      <TextInput
        value={handle}
        onChangeText={(value) => setHandle(value.toLowerCase().replace(/^@/, ''))}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, rtlInput]}
        editable={Boolean(session)}
      />
      <Text style={styles.label}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={[styles.input, styles.bio, rtlInput]}
        multiline
        editable={Boolean(session)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label={busy ? 'Saving' : 'Save'}
        onPress={() => {
          if (!session || busy) {
            setError('Sign in to edit your page.');
            return;
          }
          setBusy(true);
          setError(null);
          void editProfile({ displayName, handle, bio })
            .then((message) => {
              if (message) {
                setError(message);
                return;
              }
              router.back();
            })
            .finally(() => setBusy(false));
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
