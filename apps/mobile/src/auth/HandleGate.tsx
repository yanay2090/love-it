import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

/** After the first sign-in, the person picks a handle before the account is finished. */
export function HandleGate() {
  const { needsHandle } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const top = segments[0];
    if (!needsHandle || top === 'choose-handle' || top === 'sign-in' || top === 'verify-email') return;
    router.push('/choose-handle');
  }, [needsHandle, router, segments]);

  return null;
}
