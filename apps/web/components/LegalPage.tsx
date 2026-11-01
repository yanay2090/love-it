import type { ReactNode } from 'react';

export function LegalPage({ title, todo, children }: { title: string; todo: string; children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="/">
          Love it <i>♥</i>
        </a>
      </header>
      <main className="page home legal">
        <h1>{title}</h1>
        <p className="todo">TODO: {todo}</p>
        {children}
        <p>
          <a href="/">Back home</a>
        </p>
      </main>
    </>
  );
}
