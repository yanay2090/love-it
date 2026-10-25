import { seedData } from '@love-it/shared';

const featured = ['yael.loves', 'tom.sips', 'maya.ofer'];

export default function HomePage() {
  const people = featured.flatMap((handle) => {
    const profile = seedData.profiles.find((item) => item.handle === handle);
    return profile ? [profile] : [];
  });

  return (
    <>
      <header className="topbar">
        <a className="wordmark" href="/">
          Love it <i>♥</i>
        </a>
      </header>
      <main className="page home">
        <p className="section-label">Tel Aviv</p>
        <h1>A map of the places you actually love.</h1>
        <p className="lede">
          Love it is a free, map-first diary for cafes and restaurants. Save a place in a few seconds,
          keep up to ten photos, and share one page — the link that belongs in your bio.
        </p>
        <div className="home-links">
          {people.map((person) => (
            <a key={person.id} className="person-link" href={`/${person.handle}`}>
              <span style={{ background: person.avatarColor }}>{person.initials}</span>
              <span>
                <b>@{person.handle}</b>
                <div className="muted">{person.displayName}</div>
              </span>
            </a>
          ))}
        </div>
        <div className="feature-grid">
          <div className="feature">
            <b>Explore</b>
            Friend-loved pins on a Tel Aviv map. Search is for places, not people.
          </div>
          <div className="feature">
            <b>My page</b>
            Loved, followers, following, and a public link. Find friends lives here.
          </div>
          <div className="feature">
            <b>+ Add</b>
            Rate it Loved it, Great, Good, or Okay, add a note, and up to 10 photos.
          </div>
        </div>
        <section className="install" id="get-the-app">
          <b>Get the iPhone app</b>
          <p className="bio">
            The App Store listing is not up yet. On a Mac, from the repo: <span className="mono">cd apps/mobile</span> then{' '}
            <span className="mono">npx expo start --ios</span>. Public pages on this site already open the app with the{' '}
            <span className="mono">loveit://</span> link when it is installed.
          </p>
          <p className="muted">Demo pages use the Tel Aviv seed diary until Supabase keys are set.</p>
        </section>
      </main>
    </>
  );
}
