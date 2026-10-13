'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import {
  addProductImage,
  deleteImage,
  reorderImages,
  setPrimaryImage,
  updateImageAlt,
} from '@/app/admin/(dash)/products/actions';
import { IMAGE_BUCKET } from '@/lib/env';
import { imageUrl } from '@/lib/images';
import { shrinkPhoto } from '@/lib/image-compress';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { ProductImage } from '@/lib/types';

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

export default function ImageManager({ productId, productName, images }: { productId: string; productName: string; images: ProductImage[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  async function upload(files: FileList | null, replace?: ProductImage) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    setLog([]);
    const supabase = getBrowserClient();
    for (const file of Array.from(files)) {
      try {
        setLog((l) => [...l, `Shrinking ${file.name} (${kb(file.size)})…`]);
        const { full, thumb } = await shrinkPhoto(file);
        const id = crypto.randomUUID();
        const path = `products/${productId}/${id}.${full.ext}`;
        const thumbPath = `products/${productId}/${id}_thumb.${thumb.ext}`;
        const opts = (b: Blob) => ({ contentType: b.type, cacheControl: '31536000', upsert: false });
        const up1 = await supabase.storage.from(IMAGE_BUCKET).upload(path, full.blob, opts(full.blob));
        if (up1.error) throw new Error(up1.error.message);
        const up2 = await supabase.storage.from(IMAGE_BUCKET).upload(thumbPath, thumb.blob, opts(thumb.blob));
        if (up2.error) {
          await supabase.storage.from(IMAGE_BUCKET).remove([path]);
          throw new Error(up2.error.message);
        }
        const res = await addProductImage(productId, path, thumbPath, replace?.alt_text ?? productName);
        if (res.error) throw new Error(res.error);
        if (replace) {
          await deleteImage(productId, replace.id);
        }
        setLog((l) => [...l, `✓ ${file.name}: ${kb(file.size)} → ${kb(full.blob.size)} (+ ${kb(thumb.blob.size)} thumbnail)`]);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    if (input.current) input.current.value = '';
    router.refresh();
  }

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const ids = sorted.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => reorderImages(productId, ids));
  }

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Photos</h2>
      <p className="small muted">
        Photos are shrunk automatically on this device before upload (max 1600 px, WebP) to save storage space. The first
        &ldquo;Main&rdquo; photo is shown on product cards.
      </p>
      <div className="image-manager">
        {sorted.map((img, i) => (
          <div className="image-tile" key={img.id}>
            <img src={imageUrl(img.thumb_path || img.path)!} alt={img.alt_text ?? ''} />
            <div className="tools">
              {img.is_primary ? <span className="badge badge-sale">Main</span> : (
                <button type="button" className="btn btn-outline" disabled={pending} onClick={() => run(() => setPrimaryImage(productId, img.id))}>
                  Make main
                </button>
              )}
              <button type="button" className="btn btn-outline" aria-label="Move earlier" disabled={pending || i === 0} onClick={() => move(i, -1)}>
                ←
              </button>
              <button type="button" className="btn btn-outline" aria-label="Move later" disabled={pending || i === sorted.length - 1} onClick={() => move(i, 1)}>
                →
              </button>
              <label className="btn btn-outline" style={{ margin: 0, fontWeight: 600 }}>
                Replace
                <input type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden disabled={busy} onChange={(e) => upload(e.target.files, img)} />
              </label>
              <button
                type="button"
                className="btn btn-danger"
                disabled={pending}
                onClick={() => {
                  if (window.confirm('Delete this photo? This cannot be undone.')) run(() => deleteImage(productId, img.id));
                }}
              >
                Delete
              </button>
            </div>
            <div style={{ padding: '0 8px 8px' }}>
              <input
                type="text"
                aria-label="Photo description for screen readers"
                placeholder="Describe the photo"
                defaultValue={img.alt_text ?? ''}
                maxLength={200}
                onBlur={(e) => {
                  if (e.target.value !== (img.alt_text ?? '')) run(() => updateImageAlt(img.id, e.target.value));
                }}
                style={{ minHeight: 34, fontSize: '0.85rem' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <label className="btn btn-outline" style={{ margin: 0 }}>
          {busy ? 'Uploading…' : '+ Add photos'}
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple hidden disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
      {log.length ? (
        <ul className="small muted">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
