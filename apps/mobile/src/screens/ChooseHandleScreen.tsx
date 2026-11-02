import { handleForSignup } from '../signup';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { identityFromUser, isPlaceholderName } from '../auth/identity';
import { colors, fonts } from '../theme';

export function ChooseHandleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, profileError, claimHandle } = useAuth();
  const identity = identityFromUser(user);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const nextName = identity.displayName || (profile && !isPlaceholderName(profile.displayName) ? profile.displayName : '');
    if (nextName) setDisplayName((current) => current || nextName);
    if (identity.suggestedHandle) setHandle((current) => current || identity.suggestedHandle);
  }, [identity.displayName, identity.suggestedHandle, profile]);

  async function save() {
    if (busy) return;
    const parsed = handleForSignup(handle);
    if (!parsed.ok) {
      setMessage(parsed.message);
      return;
    }
    setBusy(true);
    setMessage(null);
    const error = await claimHandle(parsed.handle, displayName);
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    router.back();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Choose your handle</Text>
      <Text style={styles.lede}>This is the public page people open from your bio. Letters, numbers, dots, underscores.</Text>
      {identity.avatarUrl ? <Image source={{ uri: identity.avatarUrl }} style={styles.photo} contentFit="cover" /> : null}
      <Text style={styles.label}>Name</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholder="Your name" placeholderTextColor={colors.faint} />
      <Text style={styles.label}>Handle</Text>
      <TextInput
        value={handle}
        onChangeText={(value) => setHandle(value.toLowerCase().replace(/^@/, ''))}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        placeholder="yael.loves"
        placeholderTextColor={colors.faint}
      />
      <Pressable style={[styles.button, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => void save()}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save handle'}</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {profileError && !message ? <Text style={styles.message}>{profileError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, gap: 10 },
  photo: { width: 72, height: 72, borderRadius: 36, marginTop: 8 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  lede: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.stone, marginBottom: 8 },
  label: { fontFamily: fonts.sansSemibold, color: colors.ink, marginTop: 6 },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.linen,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  button: {
    marginTop: 12,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.paper, fontFamily: fonts.sansSemibold, fontSize: 16 },
  message: { color: colors.stone, fontFamily: fonts.sans },
});
