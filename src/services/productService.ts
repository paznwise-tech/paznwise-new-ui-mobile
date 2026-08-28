import { fetchApi } from './api';
import {
  ProductResponse,
  ProductListResponse,
  ProductSellerListResponse,
  ApiResponse,
} from '@/types';

export interface SellerDashboard {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    activeListings: number;
    pendingApproval: number;
    draftProducts: number;
    rejectedProducts: number;
    outOfStock: number;
    avgRating: number;
  };
  recentOrders: Array<{
    orderId: string;
    productId: string;
    productName: string;
    quantity: number;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  topProducts: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    revenue: number;
    unitsSold: number;
  }>;
  revenueByMonth: Array<{ date: string; revenue: number }>;
}

export interface MerchandiseRoyalty {
  productId: string;
  title: string;
  thumbnailUrl: string | null;
  cumulativePayout: number;
  /** Fraction, e.g. 0.1 for 10%. Steps down past a payout threshold. */
  currentRate: number;
}

export const ProductService = {
  // GET /api/products — cursor-based, public
  async getMarketplaceProducts(params?: {
    cursor?: string;
    limit?: number;
    categoryId?: string;
    status?: string;
    /** Full-text search; the API also accepts it as `q`. */
    search?: string;
    /** See src/product/product.repository.js — anything else falls back to newest. */
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating';
  }): Promise<ProductListResponse> {
    const q = new URLSearchParams();
    if (params?.cursor)     q.append('cursor', params.cursor);
    if (params?.limit)      q.append('limit', params.limit.toString());
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    if (params?.status)     q.append('status', params.status);
    if (params?.search)     q.append('search', params.search);
    if (params?.sort)       q.append('sort', params.sort);

    const qs = q.toString();
    return fetchApi<ProductListResponse>(`/products${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      requiresAuth: false,
    });
  },

  /**
   * Seller dashboard.
   *
   * Revenue, order count and listing counts are computed server-side from
   * the seller's own paid order items. The screen previously summed the
   * user's entire order history client-side, so their own purchases
   * inflated their seller earnings.
   */
  async getSellerDashboard(): Promise<SellerDashboard> {
    const res = await fetchApi<any>('/products/seller/dashboard', { requiresAuth: true });
    const d = res?.data ?? res;
    return {
      stats: {
        totalRevenue: Number(d?.stats?.totalRevenue ?? 0),
        totalOrders: Number(d?.stats?.totalOrders ?? 0),
        activeListings: Number(d?.stats?.activeListings ?? 0),
        pendingApproval: Number(d?.stats?.pendingApproval ?? 0),
        draftProducts: Number(d?.stats?.draftProducts ?? 0),
        rejectedProducts: Number(d?.stats?.rejectedProducts ?? 0),
        outOfStock: Number(d?.stats?.outOfStock ?? 0),
        avgRating: Number(d?.stats?.avgRating ?? 0),
      },
      recentOrders: d?.recentOrders ?? [],
      topProducts: d?.topProducts ?? [],
      revenueByMonth: d?.revenueByMonth ?? [],
    };
  },

  /** Quick stock edit from the listings screen. */
  async updateStock(productId: string, stock: number): Promise<void> {
    await fetchApi(`/products/${productId}/stock`, {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify({ stock }),
    });
  },

  /** Send a rejected product back for review after fixing it. */
  async resubmit(productId: string): Promise<void> {
    await fetchApi(`/products/${productId}/resubmit`, { method: 'POST', requiresAuth: true });
  },

  async duplicate(productId: string): Promise<void> {
    await fetchApi(`/products/${productId}/duplicate`, { method: 'POST', requiresAuth: true });
  },

  /** Hides a listing without deleting it or its order history. */
  async archive(productId: string): Promise<void> {
    await fetchApi(`/products/${productId}/archive`, { method: 'PATCH', requiresAuth: true });
  },

  /**
   * Cumulative royalty payout per source artwork, with the rate currently
   * applied. The rate steps down once an artwork passes a payout
   * threshold, so both numbers matter to the artist.
   */
  async getMerchandiseRoyalties(): Promise<MerchandiseRoyalty[]> {
    const res = await fetchApi<any>('/products/my/merchandise-royalties', { requiresAuth: true });
    const d = res?.data ?? res;
    const list: any[] = Array.isArray(d) ? d : [];
    return list.map((r: any) => ({
      productId: String(r.sourceProduct?.id ?? ''),
      title: r.sourceProduct?.title ?? 'Artwork',
      thumbnailUrl: r.sourceProduct?.thumbnailUrl ?? null,
      cumulativePayout: Number(r.cumulativePayout ?? 0),
      currentRate: Number(r.currentRate ?? 0),
    }));
  },

  /** Approved merchandise licensed from one artwork. */
  async getMerchandiseForProduct(productId: string): Promise<any[]> {
    const res = await fetchApi<any>(`/products/${productId}/merchandise`, { requiresAuth: false });
    const d = res?.data ?? res;
    return Array.isArray(d) ? d : (d?.items ?? []);
  },

  async getProductOrders(productId: string): Promise<any[]> {
    const res = await fetchApi<any>(`/products/${productId}/orders`, { requiresAuth: true });
    const d = res?.data ?? res;
    return Array.isArray(d) ? d : (d?.orders ?? d?.items ?? []);
  },

  // GET /api/products/{id} — public
  async getProductById(id: string): Promise<ApiResponse<ProductResponse>> {
    return fetchApi<ApiResponse<ProductResponse>>(`/products/${id}`, {
      method: 'GET',
      requiresAuth: false,
    });
  },

  // GET /api/products/seller/me — auth required
  async getMyProducts(): Promise<ProductSellerListResponse> {
    return fetchApi<ProductSellerListResponse>('/products/seller/me', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  // POST /api/products — multipart/form-data
  async createProduct(data: FormData): Promise<ApiResponse<ProductResponse>> {
    return fetchApi<ApiResponse<ProductResponse>>('/products', {
      method: 'POST',
      body: data,
      requiresAuth: true,
    });
  },

  // PUT /api/products/{id}
  async updateProduct(id: string, data: FormData): Promise<ApiResponse<ProductResponse>> {
    return fetchApi<ApiResponse<ProductResponse>>(`/products/${id}`, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    });
  },

  // DELETE /api/products/{id}
  async deleteProduct(id: string): Promise<ApiResponse<null>> {
    return fetchApi<ApiResponse<null>>(`/products/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  // PUT /api/products/{productId}/category
  async assignCategory(productId: string, categoryId: string): Promise<ApiResponse<ProductResponse>> {
    return fetchApi<ApiResponse<ProductResponse>>(`/products/${productId}/category`, {
      method: 'PUT',
      body: JSON.stringify({ categoryId }),
      requiresAuth: true,
    });
  },

  // DELETE /api/products/{productId}/category
  async removeCategory(productId: string): Promise<ApiResponse<ProductResponse>> {
    return fetchApi<ApiResponse<ProductResponse>>(`/products/${productId}/category`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
