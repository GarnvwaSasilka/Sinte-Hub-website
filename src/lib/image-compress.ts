'use client';

// Shrinks photos in the browser BEFORE they are uploaded, so the free 1 GB
// of photo storage lasts much longer. A typical 4 MB phone photo becomes a
// ~150–300 KB full-size image plus a ~30–60 KB thumbnail.

export const FULL_MAX_SIDE = 1600;
export const THUMB_MAX_SIDE = 600;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

export interface ShrunkImage {
  blob: Blob;
  ext: 'webp' | 'jpg';
  width: number;
  height: number;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Older browsers: fall back to an <img> element
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<ShrunkImage> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        // Some older Safari versions cannot make WebP and silently return PNG.
        if (webp && webp.type === 'image/webp') {
          resolve({ blob: webp, ext: 'webp', width: canvas.width, height: canvas.height });
          return;
        }
        canvas.toBlob(
          (jpg) => (jpg ? resolve({ blob: jpg, ext: 'jpg', width: canvas.width, height: canvas.height }) : reject(new Error('encode failed'))),
          'image/jpeg',
          quality,
        );
      },
      'image/webp',
      quality,
    );
  });
}

function draw(source: ImageBitmap | HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function shrinkPhoto(file: File): Promise<{ full: ShrunkImage; thumb: ShrunkImage }> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not a photo.`);
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error(`${file.name} is larger than 25 MB.`);
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadBitmap(file);
  } catch {
    throw new Error(`${file.name} could not be opened. Please use a JPG, PNG or WebP photo.`);
  }
  const full = await encode(draw(source, FULL_MAX_SIDE), FULL_QUALITY);
  const thumb = await encode(draw(source, THUMB_MAX_SIDE), THUMB_QUALITY);
  if ('close' in source) source.close();
  return { full, thumb };
}
