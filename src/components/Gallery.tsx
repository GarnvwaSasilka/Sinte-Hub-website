'use client';

import { useState } from 'react';

export interface GalleryImage {
  src: string;
  thumb: string;
  alt: string;
}

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const current = images[index];

  if (!current) {
    return (
      <div className="gallery-main">
        <div className="placeholder-img">
          <img src="/monogram.png" alt="" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`gallery-main${zoom ? ' zoomed' : ''}`}
        onClick={() => setZoom((z) => !z)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        role="button"
        tabIndex={0}
        aria-label={zoom ? 'Zoom out' : 'Zoom in'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setZoom((z) => !z);
          }
        }}
      >
        <img src={current.src} alt={current.alt} style={{ transformOrigin: origin }} />
      </div>
      {images.length > 1 ? (
        <div className="gallery-thumbs">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              onClick={() => {
                setIndex(i);
                setZoom(false);
              }}
            >
              <img src={img.thumb} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
