import { apiBaseUrl, mediaBaseUrl } from '@/config/env';

/**
 * Image URL resolution, ported from the web app's `resolveAttachmentUrl`
 * (paznwise-new-ui/src/utils/attachmentUtils.ts) so both clients agree.
 *
 * The rule that matters, and that this app previously had backwards:
 *
 *   `/uploads/...`          → the API host
 *   any other relative path → the S3 bucket
 *
 * The API is inconsistent about which it returns. `getS3FileUrl` in the
 * server's utils/s3Service.js absolutises top-level image fields but never
 * runs on nested relations, so a single feed response carries absolute URLs
 * in `imageUrls` and bare S3 keys in `artist.picture`. Sending those keys to
 * the API host — which is what every resolver here used to do — returns 404.
 */

const S3_BASE = mediaBaseUrl.replace(/\/$/, '');
const API_HOST = apiBaseUrl.replace(/\/api$/, '').replace(/\/$/, '');

/**
 * Inline placeholder for a missing image.
 *
 * A PNG, not the SVG data URI the web app uses: Android decodes images
 * through Glide, which does not handle `data:image/svg+xml` sources, so an
 * SVG placeholder renders as nothing — indistinguishable from the broken
 * images it is meant to stand in for.
 *
 * Deliberately not a remote URL either. The placeholder before this one
 * pointed at via.placeholder.com, which no longer resolves at all, so every
 * missing image hung until the network timed out.
 */
export const DEFAULT_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mOQ0nUgCTGMahjVMHw1AAChIocBYn1EZwAAAABJRU5ErkJggg==';

/**
 * Pulls a usable image value out of whatever the API returned.
 *
 * Image fields are not consistently strings. `event.eventImages` is an array
 * of rows — `{ id, eventId, imageUrl, sortOrder, url }` — so indexing it gave
 * an object, `resolveImageUrl` rejected the non-string, and the event fell
 * back to a stock photo even though a real upload existed. Both `url` (already
 * absolute) and `imageUrl` (a bare S3 key) appear on those rows.
 */
export function pickImageValue(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = pickImageValue(entry);
      if (found) return found;
    }
    return '';
  }

  if (typeof value === 'object') {
    const row = value as Record<string, unknown>;
    // `url` first: it is already absolute where both are present.
    for (const key of ['url', 'imageUrl', 'src', 'uri', 'image', 'thumbnailUrl', 'path', 'key']) {
      const found = pickImageValue(row[key]);
      if (found) return found;
    }
  }

  return '';
}

/**
 * Turns whatever the API returned into a URL that actually loads.
 *
 * Handles the shapes the web resolver had to grow defences against — each
 * one is something the API has genuinely returned:
 *   - a stringified JSON array, `'["https://..."]'`
 *   - a value wrapped in stray quotes
 *   - an `s3://` protocol URL
 *   - an S3 host with the protocol missing
 *   - a YouTube link, where the thumbnail is what should be shown
 *
 * Returns '' for empty input so callers can decide on their own fallback.
 */
export function resolveImageUrl(url?: unknown): string {
  // Accepts objects and arrays as well as strings — see `pickImageValue`.
  const raw = pickImageValue(url);
  if (!raw) return '';

  let clean = raw.trim();
  if (!clean) return '';

  // A YouTube link has no image of its own; use its poster frame.
  const lower = clean.toLowerCase();
  if (lower.includes('youtu')) {
    let videoId = '';
    if (clean.includes('youtu.be/')) {
      videoId = clean.split('youtu.be/')[1]?.split(/[?&]/)[0] ?? '';
    } else if (clean.includes('youtube.com/shorts/')) {
      videoId = clean.split('youtube.com/shorts/')[1]?.split(/[?&]/)[0] ?? '';
    } else if (clean.includes('v=')) {
      videoId = clean.split('v=')[1]?.split('&')[0] ?? '';
    } else if (clean.includes('embed/')) {
      videoId = clean.split('embed/')[1]?.split(/[?&]/)[0] ?? '';
    }
    if (videoId.length === 11) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // Some rows store the whole array as a single string.
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) clean = String(parsed[0]);
    } catch {
      // Not valid JSON after all — fall through and treat it as a path.
    }
  }

  clean = clean.replace(/^["']|["']$/g, '').trim();
  if (!clean) return '';

  // s3://bucket/key, in any of the forms that have shown up.
  if (clean.startsWith('s3://')) {
    const s3Path = clean.replace(/^s3:\/\//, '');
    if (/^https?:\/\//i.test(s3Path)) return s3Path;
    if (s3Path.includes('.s3.') || s3Path.includes('.amazonaws.com')) return `https://${s3Path}`;
    return `${S3_BASE}/${s3Path.replace(/^\//, '')}`;
  }

  // An S3 host that arrived without its protocol.
  if (
    (clean.includes('.s3.') || clean.includes('.amazonaws.com')) &&
    !/^https?:\/\//i.test(clean)
  ) {
    return `https://${clean.replace(/^\/\//, '')}`;
  }

  // Already usable.
  if (/^(https?:|blob:|data:|file:)/i.test(clean)) return clean;

  // Locally-served uploads live on the API host; everything else relative is
  // an S3 object key.
  const isLocalUpload = clean.startsWith('uploads/') || clean.startsWith('/uploads/');
  if (!isLocalUpload) return `${S3_BASE}/${clean.replace(/^\//, '')}`;

  return `${API_HOST}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

/** Resolves, falling back to the inline placeholder when there is nothing. */
export function resolveImageOrDefault(url?: unknown): string {
  return resolveImageUrl(url) || DEFAULT_IMAGE;
}

/**
 * Picks a product's cover image across the three fields the API uses.
 *
 * `images` is usually an empty array on live data while the real URLs sit in
 * `productImages` and `thumbnailUrl`, so reading only the first — which
 * several services did — always fell through to the placeholder. Entries may
 * be plain strings or `{ url }` objects.
 */
export function getProductImageUrl(product: any): string {
  if (!product) return DEFAULT_IMAGE;

  const candidates = [
    product.images,
    product.productImages,
    product.thumbnailUrl,
    product.image,
    product.img,
    product.thumbnail,
  ];

  for (const c of candidates) {
    const resolved = resolveImageUrl(c);
    if (resolved) return resolved;
  }
  return DEFAULT_IMAGE;
}

/**
 * Avatar URL, falling back to a generated initials avatar rather than an
 * empty frame — matching the web app.
 */
export function getAvatarUrl(picture?: unknown, name?: string | null): string {
  const resolved = resolveImageUrl(picture);
  if (resolved) return resolved;
  const label = (name ?? '').trim() || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=random`;
}

// ─── Deterministic stand-ins ─────────────────────────────────────────────────
//
// Ported from the web app's `getPostFallbackImage`. A single shared fallback
// made every event card in a list look like the same event; seeding the
// choice by id keeps each one distinct and stable across renders.

const EVENT_FALLBACKS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop',
];

/** Stable pseudo-random pick, so the same event always gets the same image. */
export function pickFallback(pool: string[], seed: string | number): string {
  const key = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

export function getEventFallbackImage(seed: string | number): string {
  return pickFallback(EVENT_FALLBACKS, seed);
}
