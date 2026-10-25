import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
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
