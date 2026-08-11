import { fetchApi, MEDIA_BASE_URL } from './api';

export interface Review {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful?: number;
}

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeReview(r: any): Review {
  return {
    id: r.id ?? r._id ?? '',
    productId: r.productId ?? r.product?.id ?? '',
    productTitle: r.product?.title ?? r.productTitle ?? 'Product',
    productImage: resolveImage(r.product?.images?.[0] ?? r.productImage),
    rating: r.rating ?? r.stars ?? 0,
    comment: r.comment ?? r.review ?? r.text ?? '',
    createdAt: r.createdAt ?? new Date().toISOString(),
    helpful: r.helpful ?? r.helpfulCount ?? 0,
  };
}

export const ReviewService = {
  async getMyReviews(): Promise<Review[]> {
    const res = await fetchApi<any>('/api/reviews/my', { requiresAuth: true });
    const data = res.data ?? res;
    if (Array.isArray(data)) return data.map(normalizeReview);
    return (data?.reviews ?? data?.items ?? []).map(normalizeReview);
  },

  async submitReview(input: {
    productId: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    const res = await fetchApi<any>('/api/reviews', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(input),
    });
    return normalizeReview(res.data ?? res.review ?? res);
  },

  async getProductReviews(productId: string): Promise<{ reviews: Review[]; avgRating: number; count: number }> {
    try {
      const res = await fetchApi<any>(`/api/reviews?productId=${productId}`, { requiresAuth: false });
      const data = res.data ?? res;
      const items: any[] = Array.isArray(data) ? data : (data?.reviews ?? data?.items ?? []);
      const reviews = items.map(normalizeReview);
      const count = reviews.length;
      const avgRating = count > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
        : 0;
      return { reviews, avgRating, count };
    } catch {
      return { reviews: [], avgRating: 0, count: 0 };
    }
  },
};
