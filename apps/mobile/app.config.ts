import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Expo loads .env before this file. Read it again so a prebuild started without exported vars still sees them. */
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

loadEnvFile(resolve(__dirname, '.env'));

function appleSignInEnabled(): boolean {
  return process.env.LOVEIT_APPLE_SIGNIN === '1';
}

function reversedGoogleScheme(iosClientId: string | undefined): string | undefined {
  const clientId = iosClientId?.trim();
  if (!clientId?.endsWith('.apps.googleusercontent.com')) return undefined;
  const prefix = clientId.slice(0, -'.apps.googleusercontent.com'.length);
  return `com.googleusercontent.apps.${prefix}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appleSignIn = appleSignInEnabled();
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];
  if (appleSignIn) plugins.push('expo-apple-authentication');
  const scheme = reversedGoogleScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (scheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]);
  }
  return {
    ...config,
    name: config.name ?? 'Love it',
    slug: config.slug ?? 'love-it',
    ios: {
      ...config.ios,
      usesAppleSignIn: appleSignIn,
    },
    extra: {
      ...config.extra,
      appleSignIn,
    },
    plugins,
  };
};
