import { fetchApi, MEDIA_BASE_URL } from './api';

export type SearchType = 'all' | 'users' | 'products' | 'posts';

export interface SearchUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isVerified?: boolean;
  role?: string;            // ARTIST | BUYER | ORGANIZER | PERFORMER
  followersCount?: number;
}

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// The search API is Elasticsearch-backed; response field names can vary, so
// pull the users array from whatever shape comes back and normalize it.
function extractUsers(payload: any): any[] {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  return d?.users ?? d?.results?.users ?? d?.results ?? [];
}

function normalizeUser(u: any): SearchUser {
  const role = u?.role ?? u?.user?.role ?? undefined;
  return {
    id: u?.userId ?? u?.id ?? u?._id ?? '',
    name: u?.name ?? u?.fullName ?? u?.user?.name ?? u?.username ?? '',
    username: u?.username ?? u?.user?.username ?? '',
    avatar: resolveAvatarUrl(u?.avatar ?? u?.picture ?? u?.profilePicture ?? u?.user?.picture),
    isVerified: u?.isVerified ?? u?.user?.isVerified ?? false,
    role: role ? String(role).toUpperCase() : undefined,
    followersCount: u?.followersCount ?? u?.followers ?? 0,
  };
}

export const SearchService = {
  async searchUsers(
    q: string,
    options?: { page?: number; limit?: number }
  ): Promise<SearchUser[]> {
    const query = q.trim();
    if (!query) return [];
    // Note: /api/search (Elasticsearch) is unavailable on this backend, so we
    // use the dedicated user-search endpoint, which returns { data: { users } }.
    const params = new URLSearchParams({ q: query });
    params.set('page', String(options?.page ?? 1));
    params.set('limit', String(options?.limit ?? 15));

    const res = await fetchApi<any>(`/users/search?${params.toString()}`, { requiresAuth: true });
    return extractUsers(res)
      .map(normalizeUser)
      .filter(u => u.id);
  },
};
