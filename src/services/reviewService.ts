import { fetchApi, MEDIA_BASE_URL } from './api';

/**
 * Product reviews — src/product-review/product-review.router.js, mounted at
 * `/api`. There is no `/reviews` resource: every route hangs off a product
 * (`/products/:id/reviews`) or off the user (`/users/me/reviews`).
 */

export interface Review {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful?: number;
  status?: string;
}

export interface ReviewSummary {
  avgRating: number;
  count: number;
  /** Star value (1–5) → number of reviews. */
  distribution: Record<number, number>;
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
    productImage: resolveImage(r.product?.images?.[0]?.url ?? r.product?.images?.[0] ?? r.productImage),
    rating: r.rating ?? r.stars ?? 0,
    comment: r.comment ?? r.review ?? r.text ?? '',
    createdAt: r.createdAt ?? new Date().toISOString(),
    helpful: r.helpfulCount ?? r.helpful ?? 0,
    status: r.status,
  };
}

function toList(res: any): any[] {
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : (data?.reviews ?? data?.items ?? []);
}

export const ReviewService = {
  /** Reviews written by the current user. */
  async getMyReviews(): Promise<Review[]> {
    const res = await fetchApi<any>('/users/me/reviews', { requiresAuth: true });
    return toList(res).map(normalizeReview);
  },

  /** Whether the current user is allowed to review this product (purchase check). */
  async canReview(productId: string): Promise<boolean> {
    try {
      const res = await fetchApi<any>(`/products/${productId}/can-review`, { requiresAuth: true });
      return res?.data?.canReview ?? res?.canReview ?? false;
    } catch {
      return false;
    }
  },

  async submitReview(input: {
    productId: string;
    rating: number;
    comment: string;
  }): Promise<Review> {
    const { productId, ...body } = input;
    const res = await fetchApi<any>(`/products/${productId}/reviews`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(body),
    });
    return normalizeReview(res?.data ?? res?.review ?? res);
  },

  async updateReview(reviewId: string, input: { rating?: number; comment?: string }): Promise<void> {
    await fetchApi(`/products/reviews/${reviewId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(input),
    });
  },

  async deleteReview(reviewId: string): Promise<void> {
    await fetchApi(`/products/reviews/${reviewId}`, { method: 'DELETE', requiresAuth: true });
  },

  async markHelpful(reviewId: string): Promise<void> {
    await fetchApi(`/products/reviews/${reviewId}/helpful`, { method: 'POST', requiresAuth: true });
  },

  async reportReview(reviewId: string, reason: string): Promise<void> {
    await fetchApi(`/products/reviews/${reviewId}/report`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Reviews for a product, with the rating breakdown.
   *
   * The summary comes from `/review-summary` when available — it covers every
   * review, not just the page that was fetched — and falls back to computing
   * from the returned page otherwise.
   */
  async getProductReviews(productId: string): Promise<{
    reviews: Review[];
    avgRating: number;
    count: number;
    distribution: Record<number, number>;
  }> {
    try {
      const [listRes, summary] = await Promise.all([
        fetchApi<any>(`/products/${productId}/reviews`, { requiresAuth: false }),
        ReviewService.getReviewSummary(productId).catch(() => null),
      ]);

      const reviews = toList(listRes).map(normalizeReview);

      if (summary && summary.count > 0) {
        return { reviews, ...summary };
      }

      const count = reviews.length;
      const avgRating =
        count > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
          : 0;
      const distribution: Record<number, number> = {};
      for (const r of reviews) distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;

      return { reviews, avgRating, count, distribution };
    } catch {
      return { reviews: [], avgRating: 0, count: 0, distribution: {} };
    }
  },

  /** Reviews left on the signed-in seller's own products. */
  async getSellerReviews(): Promise<Review[]> {
    const res = await fetchApi<any>('/seller/reviews', { requiresAuth: true });
    return toList(res).map(normalizeReview);
  },

  /** A seller's public reply to a review of their product. */
  async replyToReview(reviewId: string, reply: string): Promise<void> {
    await fetchApi(`/products/reviews/${reviewId}/reply`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reply }),
    });
  },

  async getReviewSummary(productId: string): Promise<ReviewSummary> {
    const res = await fetchApi<any>(`/products/${productId}/review-summary`, {
      requiresAuth: false,
    });
    const d = res?.data ?? res;
    return {
      avgRating: d?.averageRating ?? d?.avgRating ?? 0,
      count: d?.totalReviews ?? d?.count ?? 0,
      distribution: d?.distribution ?? d?.ratingBreakdown ?? {},
    };
  },
};
