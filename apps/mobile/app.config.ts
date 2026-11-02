import type { ConfigContext, ExpoConfig } from 'expo/config';

function reversedGoogleScheme(iosClientId: string | undefined): string | undefined {
  const clientId = iosClientId?.trim();
  if (!clientId?.endsWith('.apps.googleusercontent.com')) return undefined;
  const prefix = clientId.slice(0, -'.apps.googleusercontent.com'.length);
  return `com.googleusercontent.apps.${prefix}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? []), 'expo-apple-authentication'];
  const scheme = reversedGoogleScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (scheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]);
  }
  return {
    ...config,
    name: config.name ?? 'Love it',
    slug: config.slug ?? 'love-it',
    plugins,
  };
};
