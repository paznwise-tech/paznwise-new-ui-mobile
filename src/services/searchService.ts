import { fetchApi, MEDIA_BASE_URL } from './api';

/**
 * Unified search — `GET /search?q=`, public.
 *
 * One Elasticsearch-backed call covers users, products, posts and events,
 * with a database fallback server-side when Elastic is offline. Both paths
 * return the same shape, and every result carries a `type` discriminator.
 *
 * The app previously issued three separate domain calls and merged them,
 * which meant posts were never searched at all and each tab had different
 * relevance.
 */

export type SearchType = 'all' | 'users' | 'products' | 'feed' | 'events';

export interface SearchResultBase {
  id: string;
  type: 'user' | 'product' | 'post' | 'event';
  score?: number;
  createdAt?: string;
}

export interface UserResult extends SearchResultBase {
  type: 'user';
  username: string;
  name: string;
  bio?: string;
  role?: string;
  avatar?: string;
  isVerified?: boolean;
  followersCount?: number;
}

export interface ProductResult extends SearchResultBase {
  type: 'product';
  title: string;
  description?: string;
  price: number;
  comparePrice?: number | null;
  medium?: string;
  images?: string[];
  /** Seller display name. */
  name?: string;
}

export interface PostResult extends SearchResultBase {
  type: 'post';
  title?: string;
  description?: string;
  imageUrl?: string;
  name?: string;
  username?: string;
}

export interface EventResult extends SearchResultBase {
  type: 'event';
  title: string;
  description?: string;
  category?: string;
  eventDate?: string;
  venueName?: string;
  name?: string;
}

export type SearchResult = UserResult | ProductResult | PostResult | EventResult;

/** @deprecated name kept for existing call sites; prefer `UserResult`. */
export type SearchUser = UserResult;

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

/** Resolves a bare S3 key to an absolute URL; passes through full URLs. */
export function resolveMedia(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const SearchService = {
  async search(
    q: string,
    opts: { type?: SearchType; page?: number; limit?: number } = {},
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({ q });
    if (opts.type && opts.type !== 'all') params.set('type', opts.type);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));

    const res = await fetchApi<any>(`/search?${params.toString()}`, { requiresAuth: false });
    return {
      query: res?.query ?? q,
      total: res?.total ?? 0,
      results: Array.isArray(res?.results) ? res.results : [],
    };
  },

  /** People search, used by the messaging screens to start a conversation. */
  async searchUsers(q: string, opts: { limit?: number } = {}): Promise<UserResult[]> {
    const { results } = await SearchService.search(q, { type: 'users', limit: opts.limit ?? 20 });
    return results.filter((r): r is UserResult => r.type === 'user');
  },
};
