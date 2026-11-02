import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, fonts } from '../theme';

const appleSignInEnabled = Constants.expoConfig?.extra?.appleSignIn === true;

export function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { configured, signInWithApple, signInWithGoogle } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const error = await action();
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    router.back();
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

      {appleSignInEnabled && Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={26}
          style={styles.apple}
          onPress={() => void run(signInWithApple)}
        />
      ) : null}

      <Pressable style={styles.google} disabled={busy} onPress={() => void run(signInWithGoogle)}>
        <Ionicons name="logo-google" size={18} color={colors.ink} />
        <Text style={styles.googleText}>{busy ? 'Signing in…' : 'Sign in with Google'}</Text>
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
  message: { color: colors.stone, fontFamily: fonts.sans, lineHeight: 20 },
});
