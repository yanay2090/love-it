import { useRouter } from 'expo-router';
import { useAuth } from './AuthProvider';

/** Saving to an account requires a session. Browsing does not. */
export function useAccountGate(): () => boolean {
  const { session } = useAuth();
  const router = useRouter();
  return () => {
    if (session) return true;
    router.push('/sign-in');
    return false;
  };
}
