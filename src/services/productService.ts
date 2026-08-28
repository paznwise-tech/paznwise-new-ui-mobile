import { fetchApi } from './api';
import {
  ProductResponse,
  ProductListResponse,
  ProductSellerListResponse,
  ApiResponse,
} from '@/types';

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
