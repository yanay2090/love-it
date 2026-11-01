export function ComingSoon() {
  return (
    <main className="soon">
      <p className="wordmark">
        Love it <i>♥</i>
      </p>
      <h1>Love it — coming soon to iPhone in Tel Aviv</h1>
      <p className="lede">A map of the cafes and restaurants you actually love, and one page to share them.</p>
      <form className="waitlist" aria-disabled="true">
        <label htmlFor="waitlist-email">Email</label>
        <input id="waitlist-email" type="email" name="email" placeholder="you@gmail.com" disabled />
        <button type="button" disabled>
          Notify me
        </button>
      </form>
      <p className="muted">TODO: the waitlist is not open yet. This field does not send anywhere.</p>
    </main>
  );
}
