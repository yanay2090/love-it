import type { Metadata } from 'next';
import { isPlaceholderMode } from '../lib/launch';

export const metadata: Metadata = {
  title: 'Page not found · Love it',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  const placeholder = isPlaceholderMode();
  return (
    <main className="page home">
      <a className="wordmark" href="/">
        Love it <i>♥</i>
      </a>
      <h1>That page isn’t on the map.</h1>
      <p className="lede">
        {placeholder ? 'Love it is coming soon to iPhone in Tel Aviv.' : 'Try a demo profile while the city is still just Tel Aviv.'}
      </p>
      {placeholder ? (
        <p>
          <a href="/">Back home</a>
        </p>
      ) : (
        <div className="home-links">
          <a className="person-link" href="/yael.loves">
            <span style={{ background: '#F08A3A' }}>YD</span>
            <b>@yael.loves</b>
          </a>
          <a className="person-link" href="/tom.sips">
            <span style={{ background: '#3D8BFF' }}>TS</span>
            <b>@tom.sips</b>
          </a>
        </div>
      )}
    </main>
  );
}
