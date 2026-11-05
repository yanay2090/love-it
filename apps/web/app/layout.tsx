import { publicSiteOrigin } from '@love-it/shared';
import type { Metadata } from 'next';
import { Instrument_Serif, Inter_Tight } from 'next/font/google';
import './globals.css';

const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter_Tight({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL)),
  title: 'Love it',
  description: 'A map of the cafes and restaurants you actually love. Tel Aviv first.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
