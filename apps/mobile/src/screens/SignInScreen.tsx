import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIGN_IN_CANCELLED, useAuth } from '../auth/AuthProvider';
import { colors, fonts } from '../theme';

const appleSignInEnabled = Constants.expoConfig?.extra?.appleSignIn === true;

type SignInProvider = 'google' | 'apple';

export function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { configured, signInWithApple, signInWithGoogle } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<SignInProvider | null>(null);
  const busyRef = useRef(false);

  async function run(provider: SignInProvider, action: () => Promise<string | null>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyProvider(provider);
    setMessage(null);
    try {
      const error = await action();
      if (error === SIGN_IN_CANCELLED) return;
      if (error) {
        setMessage(error);
        return;
      }
      router.back();
    } finally {
      busyRef.current = false;
      setBusyProvider(null);
    }
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
        busyProvider === 'apple' ? (
          <View style={[styles.apple, styles.appleBusy]} accessibilityState={{ disabled: true, busy: true }}>
            <Text style={styles.appleBusyText}>Signing in…</Text>
          </View>
        ) : (
          <View pointerEvents={busyProvider ? 'none' : 'auto'} style={busyProvider ? styles.disabled : undefined}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={26}
              style={styles.apple}
              onPress={() => void run('apple', signInWithApple)}
            />
          </View>
        )
      ) : null}

      <Pressable
        style={[styles.google, busyProvider ? styles.disabled : null]}
        disabled={busyProvider !== null}
        onPress={() => void run('google', signInWithGoogle)}
      >
        <Ionicons name="logo-google" size={18} color={colors.ink} />
        <Text style={styles.googleText}>{busyProvider === 'google' ? 'Signing in…' : 'Sign in with Google'}</Text>
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
  appleBusy: {
    borderRadius: 26,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleBusyText: { color: '#fff', fontFamily: fonts.sansMedium, fontSize: 16 },
  disabled: { opacity: 0.45 },
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
