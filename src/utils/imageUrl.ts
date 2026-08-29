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
 * Inline placeholder for a missing image: a framed-picture glyph as an SVG
 * data URI, the same asset the web app uses.
 *
 * Deliberately not a remote URL. The previous placeholder pointed at
 * via.placeholder.com, which no longer resolves at all, so every missing
 * image hung until the network timed out instead of showing anything.
 */
export const DEFAULT_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

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
  if (!url || typeof url !== 'string') return '';

  let clean = url.trim();
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

  const first = (v: any): unknown =>
    Array.isArray(v) ? (v[0]?.url ?? v[0]) : (v?.url ?? v);

  const candidates = [
    first(product.images),
    first(product.productImages),
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
