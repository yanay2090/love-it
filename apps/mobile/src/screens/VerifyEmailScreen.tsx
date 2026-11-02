import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { colors, fonts } from '../theme';

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

export function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const email = one(useLocalSearchParams<{ email?: string }>().email);
  const { verifyEmailCode, sendEmailCode } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(token: string) {
    if (busy || token.trim().length < 6) return;
    setBusy(true);
    setMessage(null);
    const error = await verifyEmailCode(email, token);
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    router.dismissAll();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.lede}>Enter the 6-digit code sent to {email}.</Text>
      <TextInput
        value={code}
        onChangeText={(value) => {
          const next = value.replace(/\D/g, '').slice(0, 6);
          setCode(next);
          if (next.length === 6) void submit(next);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={colors.faint}
        style={styles.code}
        autoFocus
      />
      <Pressable
        disabled={busy || code.length < 6}
        onPress={() => void submit(code)}
        style={[styles.button, code.length < 6 && { opacity: 0.45 }]}
      >
        <Text style={styles.buttonText}>{busy ? 'Checking…' : 'Continue'}</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void sendEmailCode(email).then((error) => setMessage(error ?? 'A new code is on the way.'));
        }}
      >
        <Text style={styles.again}>Send a new code</Text>
      </Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, gap: 14 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  lede: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.stone },
  code: {
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.linen,
    borderWidth: 1,
    borderColor: colors.hairline,
    textAlign: 'center',
    fontFamily: fonts.sansSemibold,
    fontSize: 28,
    letterSpacing: 8,
    color: colors.ink,
  },
  button: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.paper, fontFamily: fonts.sansSemibold, fontSize: 16 },
  again: { textAlign: 'center', color: colors.ink, fontFamily: fonts.sansMedium },
  message: { color: colors.stone, fontFamily: fonts.sans },
});
