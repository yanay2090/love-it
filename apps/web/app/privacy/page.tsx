import type { Metadata } from 'next';
import { LegalPage } from '../../components/LegalPage';
import { isPlaceholderMode } from '../../lib/launch';

export function generateMetadata(): Metadata {
  return {
    title: 'Privacy · Love it',
    description: 'How Love it handles your account, places, and photos.',
    robots: isPlaceholderMode() ? { index: false, follow: false } : undefined,
  };
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" todo="replace this notice before the App Store submission.">
      <p className="bio">
        Love it is a diary of places you love. When the app is open, an account will hold your profile, the places
        you save, notes, and photos you choose to attach. Public saves can appear on your page. Friends-only and
        private saves stay limited to the people you allow.
      </p>
      <p className="bio">This page is a placeholder. It is not the final privacy policy.</p>
    </LegalPage>
  );
}
