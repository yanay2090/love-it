import type { ConfigContext, ExpoConfig } from 'expo/config';

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
