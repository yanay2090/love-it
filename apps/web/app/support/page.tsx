import type { Metadata } from 'next';
import { LegalPage } from '../../components/LegalPage';
import { isPlaceholderMode } from '../../lib/launch';

export function generateMetadata(): Metadata {
  return {
    title: 'Support · Love it',
    description: 'Help for the Love it iPhone app.',
    robots: isPlaceholderMode() ? { index: false, follow: false } : undefined,
  };
}

export default function SupportPage() {
  return (
    <LegalPage title="Support" todo="add a real contact address before the App Store submission.">
      <p className="bio">
        Love it is coming soon to iPhone in Tel Aviv. This page is here so the App Store listing has a support URL.
        A contact address will replace this note.
      </p>
      <p className="bio">This page is a placeholder.</p>
    </LegalPage>
  );
}
