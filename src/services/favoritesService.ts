import { fetchApi } from './api';
import { getProductImageUrl } from '@/utils/imageUrl';
import { Artwork } from '@/types';

/**
 * Saved artworks ("favorites").
 *
 * There is no `/wishlist` mount on the API — favorites are a property of a
 * product (`/products/:id/favorite`) plus one list endpoint on the user
 * (`/users/favorites`). Adding and removing are distinct verbs on the same
 * path, not a single toggle.
 */



function normalizeArtwork(p: any): Artwork {
  return {
    id: typeof p.id === 'number' ? p.id : parseInt(p.id ?? '0') || Math.floor(Math.random() * 99999),
    title: p.title ?? p.name ?? 'Untitled',
    price: p.price ?? 0,
    artist: p.artist?.name ?? p.createdBy?.name ?? p.sellerName ?? p.seller?.name ?? '',
    location: p.location ?? p.city ?? '',
    img: getProductImageUrl(p),
    medium: p.medium ?? p.mediumType ?? undefined,
    category: p.category ?? p.categoryName ?? undefined,
  };
}

export type FavoriteItem = Artwork & { favoriteId: string; productId: string };

export const FavoritesService = {
  async getFavorites(): Promise<FavoriteItem[]> {
    const res = await fetchApi<any>('/users/favorites', { requiresAuth: true });
    const data = res?.data ?? res;
    const items: any[] = Array.isArray(data)
      ? data
      : (data?.items ?? data?.favorites ?? data?.products ?? []);

    return items.map((i: any) => {
      // A favorite row may be the product itself, or a join row wrapping it.
      const product = i.product ?? i;
      return {
        ...normalizeArtwork(product),
        favoriteId: String(i.id ?? product.id ?? ''),
        productId: String(product.id ?? i.productId ?? ''),
      };
    });
  },

  async addFavorite(productId: string | number): Promise<void> {
    await fetchApi(`/products/${productId}/favorite`, { method: 'POST', requiresAuth: true });
  },

  async removeFavorite(productId: string | number): Promise<void> {
    await fetchApi(`/products/${productId}/favorite`, { method: 'DELETE', requiresAuth: true });
  },

  async isFavorite(productId: string | number): Promise<boolean> {
    try {
      const res = await fetchApi<any>(`/products/${productId}/favorite-status`, {
        requiresAuth: true,
      });
      return res?.data?.isFavorite ?? res?.isFavorite ?? false;
    } catch {
      return false;
    }
  },
};
