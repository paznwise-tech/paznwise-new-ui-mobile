import { fetchApi, MEDIA_BASE_URL } from './api';

/**
 * Catalogue taxonomy and homepage content.
 *
 * These endpoints are all public, and were never called by the app — the
 * category chips, hero carousel and performer-type filters were hardcoded
 * in src/constants/data.ts, so they could not match what the catalogue
 * actually contains.
 */

export interface Category {
  id: string;
  label: string;
  slug: string;
  color: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  caption: string;
  img: string;
  /** Category slug or product id the slide links to, when the API supplies one. */
  targetSlug?: string;
}

export interface PerformerCategory {
  id: string;
  key: string;
  label: string;
}

function resolveImage(url: string | null | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=500&fit=crop';
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// The API has no colour for a category, but the chips are colour-coded.
// Hashing the name keeps a category the same colour between sessions and
// across screens without needing a lookup table that drifts from the data.
const CHIP_COLORS = [
  '#E65100', '#BF360C', '#1565C0', '#880E4F', '#6A1B9A', '#AD1457', '#00695C', '#4E342E',
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CHIP_COLORS[hash % CHIP_COLORS.length];
}

function toList(res: any, ...keys: string[]): any[] {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
}

export const TaxonomyService = {
  /** Product categories. The leading "All" chip is added by the caller. */
  async getCategories(): Promise<Category[]> {
    const res = await fetchApi<any>('/categories?isActive=true', { requiresAuth: false });
    return toList(res, 'categories', 'items').map((c: any) => {
      const label = c.name ?? c.title ?? c.label ?? '';
      return {
        id: String(c.id ?? c._id ?? label),
        label,
        slug: c.slug ?? label.toLowerCase().replace(/\s+/g, '-'),
        color: colorFor(label),
      };
    });
  },

  async getHeroSlides(): Promise<HeroSlide[]> {
    const res = await fetchApi<any>('/hero-slides', { requiresAuth: false });
    return toList(res, 'slides', 'items').map((s: any) => ({
      id: String(s.id ?? s._id ?? ''),
      title: s.title ?? s.heading ?? '',
      caption: s.caption ?? s.subtitle ?? s.description ?? '',
      img: resolveImage(s.image ?? s.imageUrl ?? s.img ?? s.bannerImage),
      targetSlug: s.targetSlug ?? s.slug ?? s.link ?? undefined,
    }));
  },

  /** Bookable performer/service categories, for the Hire filters. */
  async getPerformerCategories(): Promise<PerformerCategory[]> {
    const res = await fetchApi<any>('/artist-services/categories', { requiresAuth: false });
    return toList(res, 'categories', 'items').map((c: any) => {
      const label = c.name ?? c.title ?? c.label ?? '';
      return {
        id: String(c.id ?? c._id ?? label),
        key: c.slug ?? String(c.id ?? label).toLowerCase(),
        label,
      };
    });
  },
};
