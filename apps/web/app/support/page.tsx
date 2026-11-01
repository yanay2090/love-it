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
    <LegalPage title="Support">
      <p className="bio">
        Love it is coming soon to iPhone in Tel Aviv. A contact address will be published here when the app opens.
      </p>
    </LegalPage>
  );
}
