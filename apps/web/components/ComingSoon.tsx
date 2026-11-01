import { WaitlistForm } from './WaitlistForm';

export function ComingSoon() {
  return (
    <main className="soon">
      <p className="wordmark">
        Love it <i>♥</i>
      </p>
      <h1>Love it — coming soon to iPhone in Tel Aviv</h1>
      <p className="lede">A map of the cafes and restaurants you actually love, and one page to share them.</p>
      <WaitlistForm />
    </main>
  );
}
