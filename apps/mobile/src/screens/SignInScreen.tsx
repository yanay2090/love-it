import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, fonts } from '../theme';

export function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { configured, signInWithApple, signInWithGoogle, sendEmailCode } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string | null>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const error = await action();
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    after?.();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sign in</Text>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <Text style={styles.lede}>Save places to your account. You can keep browsing without one.</Text>
      {!configured ? (
        <Text style={styles.message}>Add the Supabase URL and publishable key, then rebuild the app.</Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={26}
          style={styles.apple}
          onPress={() => void run(signInWithApple, () => router.back())}
        />
      ) : null}

      <Pressable
        style={styles.google}
        disabled={busy}
        onPress={() => void run(signInWithGoogle, () => router.back())}
      >
        <Ionicons name="logo-google" size={18} color={colors.ink} />
        <Text style={styles.googleText}>Sign in with Google</Text>
      </Pressable>

      <Text style={styles.or}>or use your email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@gmail.com"
        placeholderTextColor={colors.faint}
        style={styles.input}
        returnKeyType="send"
        blurOnSubmit
        onSubmitEditing={() => {
          const next = email.trim().toLowerCase();
          if (!next.includes('@')) {
            setMessage('Enter a valid email address.');
            return;
          }
          void run(
            () => sendEmailCode(next),
            () => router.push({ pathname: '/verify-email', params: { email: next } }),
          );
        }}
      />
      <Pressable
        style={styles.emailButton}
        disabled={busy}
        onPress={() => {
          const next = email.trim().toLowerCase();
          if (!next.includes('@')) {
            setMessage('Enter a valid email address.');
            return;
          }
          void run(
            () => sendEmailCode(next),
            () => router.push({ pathname: '/verify-email', params: { email: next } }),
          );
        }}
      >
        <Text style={styles.emailButtonText}>{busy ? 'Sending…' : 'Email me a code'}</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  close: { color: colors.ink, fontFamily: fonts.sansSemibold, fontSize: 16 },
  lede: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.stone, marginBottom: 8 },
  apple: { width: '100%', height: 52 },
  google: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.linen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  or: { textAlign: 'center', color: colors.stone, fontFamily: fonts.sans, marginTop: 8 },
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
  emailButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  emailButtonText: { fontFamily: fonts.sansSemibold, fontSize: 16, color: colors.ink },
  message: { color: colors.stone, fontFamily: fonts.sans, lineHeight: 20 },
});
