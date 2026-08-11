import { fetchApi, MEDIA_BASE_URL } from './api';
import { Artwork } from '@/types';

function resolveImage(url: string | null | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400';
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeArtwork(p: any): Artwork {
  return {
    id: typeof p.id === 'number' ? p.id : parseInt(p.id ?? '0') || Math.floor(Math.random() * 99999),
    title: p.title ?? p.name ?? 'Untitled',
    price: p.price ?? 0,
    artist: p.artist?.name ?? p.createdBy?.name ?? p.sellerName ?? p.seller?.name ?? '',
    location: p.location ?? p.city ?? '',
    img: resolveImage(p.images?.[0] ?? p.image ?? p.img ?? p.thumbnail),
    medium: p.medium ?? p.mediumType ?? undefined,
    category: p.category ?? p.categoryName ?? undefined,
  };
}

export const WishlistService = {
  async getWishlist(): Promise<Array<Artwork & { wishlistId: string }>> {
    const res = await fetchApi<any>('/api/wishlist', { requiresAuth: true });
    const data = res.data ?? res;
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.wishlist ?? []);
    return items.map((i: any) => ({
      ...normalizeArtwork(i.product ?? i),
      wishlistId: i.id ?? i.productId ?? String(Math.random()),
    }));
  },

  async addToWishlist(productId: string): Promise<void> {
    await fetchApi<any>('/api/wishlist', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ productId }),
    });
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await fetchApi<any>(`/api/wishlist/${productId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
