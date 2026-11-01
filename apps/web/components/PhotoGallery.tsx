'use client';

import { useState } from 'react';

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return <div className="hero-fallback" aria-hidden />;
  }
  return (
    <div className="gallery-wrap">
      <div
        className="gallery"
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth || 1;
          const next = Math.round(event.currentTarget.scrollLeft / width);
          setIndex(Math.min(photos.length - 1, Math.max(0, next)));
        }}
      >
        {photos.map((src) => (
          <img key={src} src={src} alt={alt} />
        ))}
      </div>
      <div className="counter">
        {index + 1}/{photos.length}
      </div>
      <div className="dots" aria-hidden>
        {photos.slice(0, 8).map((src, dot) => (
          <span key={src} className={dot === index ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}
