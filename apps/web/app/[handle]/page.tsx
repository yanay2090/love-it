import { placeListMeta, ratingLabel, validateHandle } from '@love-it/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenAppButton } from '../../components/OpenAppButton';
import { PinMap } from '../../components/PinMap';
import { TrackPublicPage } from '../../components/TrackPublicPage';
import { loadPublicProfile, seedHandles } from '../../lib/data';

export function generateStaticParams() {
  return seedHandles().flatMap((handle) => (validateHandle(handle).ok ? [{ handle }] : []));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  // Static folders (app/places, and later app/about, app/login, …) are matched
  // before this dynamic segment. Reserved names that have no page 404 here.
  if (!validateHandle(handle).ok) return { title: 'Love it' };
  const page = await loadPublicProfile(handle);
  if (!page) return { title: 'Love it' };
  return {
    title: `${page.profile.displayName} (@${page.profile.handle}) · Love it`,
    description: page.profile.bio || `Places ${page.profile.displayName} loves in Tel Aviv.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!validateHandle(handle).ok) notFound();
  const page = await loadPublicProfile(handle);
  if (!page) notFound();
  const { profile } = page;

  return (
    <>
      <TrackPublicPage handle={profile.handle} />
      <header className="topbar">
        <a className="wordmark" href="/">
          Love it <i>♥</i>
        </a>
        <OpenAppButton handle={profile.handle} label="Open" />
      </header>
      <main className="page">
        <article className="sheet">
          <div className="profile-head">
            <div className="avatar" style={{ background: profile.avatarColor }}>
              {profile.initials}
            </div>
            <div className="stats">
              <div>
                <b>{page.loved}</b>
                <span>Loved</span>
              </div>
              <div>
                <b>{page.followers}</b>
                <span>Followers</span>
              </div>
              <div>
                <b>{page.following}</b>
                <span>Following</span>
              </div>
            </div>
            <p className="handle">@{profile.handle}</p>
            <h1>{profile.displayName}</h1>
            <p className="bio">{profile.bio}</p>
            <PinMap
              pins={page.places.map((item) => ({
                id: item.place.id,
                lat: item.place.lat,
                lng: item.place.lng,
                name: item.place.name,
                href: `/places/${item.place.id}`,
                initials: profile.initials,
                color: profile.avatarColor,
              }))}
            />
            <p className="section-label">{profile.displayName.split(' ')[0]}&apos;s places {page.loved}</p>
            {page.places.length === 0 ? (
              <p className="empty">No public places yet.</p>
            ) : (
              <ul className="place-list">
                {page.places.map((item) => (
                  <li key={item.place.id}>
                    <a className="place-row" href={`/places/${item.place.id}`}>
                      {item.cover ? (
                        <img className="thumb" src={item.cover} alt="" />
                      ) : (
                        <span className="thumb ph">♥</span>
                      )}
                      <span>
                        <h2>{item.place.name}</h2>
                        <p>{placeListMeta(item.place)}</p>
                        {item.note ? <p>{item.note}</p> : null}
                      </span>
                      <span className="rating">
                        {ratingLabel(item.rating)} {item.rating}/5
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="sticky-cta">
            <OpenAppButton handle={profile.handle} />
            <p className="muted">Public page · {profile.city}</p>
          </div>
        </article>
      </main>
    </>
  );
}
