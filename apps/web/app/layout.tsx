import type { Metadata } from 'next';
import { isPlaceholderMode } from '../lib/launch';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || (isPlaceholderMode() ? 'https://loveitapp.com' : 'http://localhost:3000'),
  ),
  title: 'Love it',
  description: 'A map of the cafes and restaurants you actually love. Tel Aviv first.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
