import type { ReactNode } from 'react';

// Interim App Store pages. Replace the body copy before submission; do not put developer notes in the markup.
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="/">
          Love it <i>♥</i>
        </a>
      </header>
      <main className="page home legal">
        <h1>{title}</h1>
        {children}
        <p>
          <a href="/">Back home</a>
        </p>
      </main>
    </>
  );
}
