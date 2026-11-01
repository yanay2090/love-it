import { placeDetailMeta, priceLabel, ratingLabel } from '@love-it/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OpenAppButton } from '../../../components/OpenAppButton';
import { PhotoGallery } from '../../../components/PhotoGallery';
import { TrackPublicPage } from '../../../components/TrackPublicPage';
import { loadPublicPlace, seedPlaceIds } from '../../../lib/data';
import { isPlaceholderMode } from '../../../lib/launch';

export function generateStaticParams() {
  if (isPlaceholderMode()) return [];
  return seedPlaceIds().map((placeId) => ({ placeId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeId: string }>;
}): Promise<Metadata> {
  const { placeId } = await params;
  if (isPlaceholderMode()) return { title: 'Love it', robots: { index: false, follow: false } };
  const loaded = await loadPublicPlace(placeId);
  if (!loaded) return { title: 'Love it', robots: { index: false, follow: false } };
  return {
    title: `${loaded.view.place.name} · Love it`,
    description: placeDetailMeta(loaded.view.place),
  };
}

export default async function PlacePage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  if (isPlaceholderMode()) notFound();
  const loaded = await loadPublicPlace(placeId);
  if (!loaded) notFound();
  const { view } = loaded;
  const { place } = view;
  const sharer = view.friendLovers[0]?.profile.handle ?? 'yael.loves';

  return (
    <>
      <TrackPublicPage handle={sharer} />
      <main className="page">
        <article className="sheet">
          <a className="back" href="/" aria-label="Back">
            ←
          </a>
          <PhotoGallery photos={view.heroPhotos} alt={place.name} />
          <div className="place-body">
            <h1>{place.name}</h1>
            <p className="meta">
              {placeDetailMeta(place)} · {priceLabel(place.priceLevel)}
            </p>
            <OpenAppButton handle={sharer} placeId={place.id} label="Love it" />
            {view.friendPhotos.length > 0 ? (
              <>
                <p className="section-label">Photos from friends {view.friendPhotos.length}</p>
                <div className="friend-strip">
                  {view.friendPhotos.map(({ photo, profile }) => (
                    <a key={photo.id} className="friend-photo" href={`/${profile.handle}`} title={profile.displayName}>
                      <img src={photo.uri} alt="" />
                      <i style={{ background: profile.avatarColor }}>{profile.initials}</i>
                    </a>
                  ))}
                </div>
              </>
            ) : null}
            <p className="section-label">Notes from friends {view.notes.length}</p>
            {view.notes.length === 0 ? <p className="empty">No public notes yet.</p> : null}
            {view.notes.map((note) => (
              <article key={note.entry.id} className="note-card">
                <header>
                  <a className="who" href={`/${note.profile.handle}`}>
                    <i style={{ background: note.profile.avatarColor }}>{note.profile.initials}</i>
                    {note.profile.displayName}
                  </a>
                  <span className="rating">
                    {ratingLabel(note.entry.rating)} {note.entry.rating}/5
                  </span>
                </header>
                {note.entry.note ? <p>{note.entry.note}</p> : null}
                <div className="tags">
                  {note.entry.tags.map((tag) => (
                    <span key={tag} className="tag on">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            <p className="muted">{place.address}</p>
            <p>
              <a href={`https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`}>
                Directions in Apple Maps
              </a>
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
