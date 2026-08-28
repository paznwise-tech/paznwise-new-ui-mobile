import { useState, useEffect, useCallback } from 'react';
import { ProductService } from '../services/productService';
import { ProductResponse } from '@/types';

export interface MarketplaceFilters {
  categoryId?: string;
  search?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating';
}

/**
 * Cursor-based infinite scroll for the public marketplace.
 *
 * Search and sort are sent to the server rather than applied to the loaded
 * page: filtering client-side only ever saw the products already fetched,
 * so results were wrong as soon as there was more than one page.
 */
export function useMarketplaceProducts(limit = 20, filters: MarketplaceFilters = {}) {
  const { categoryId, search, sort } = filters;
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(async (cursorParam?: string, isRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await ProductService.getMarketplaceProducts({
        cursor: cursorParam,
        limit,
        categoryId,
        search,
        sort,
      });

      const items = Array.isArray(res.data) ? res.data : [];
      if (isRefresh) {
        setProducts(items);
      } else {
        setProducts(prev => [...prev, ...items]);
      }
      setCursor(res.nextCursor ?? undefined);
      setHasMore(!!res.nextCursor);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [limit, categoryId, search, sort]);

  // Reset and refetch whenever the filters change
  useEffect(() => {
    setCursor(undefined);
    setHasMore(true);
    fetchProducts(undefined, true);
  }, [fetchProducts]);

  const loadMore = () => {
    if (!loading && hasMore && cursor) {
      fetchProducts(cursor);
    }
  };

  const refresh = () => {
    setCursor(undefined);
    setHasMore(true);
    fetchProducts(undefined, true);
  };

  return { products, loading, error, hasMore, loadMore, refresh };
}

// Single product detail
export function useProductDetail(id: string) {
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ProductService.getProductById(id);
      if (res.success && res.data) {
        setProduct(res.data);
      } else {
        setError('Product not found');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return { product, loading, error, refresh: fetchProduct };
}

// Seller's own listings
export function useMyProducts() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ProductService.getMyProducts();
      if (res.success) {
        setProducts(Array.isArray(res.data) ? res.data : []);
      } else {
        setError('Failed to fetch your products');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  const deleteProduct = async (id: string) => {
    try {
      const res = await ProductService.deleteProduct(id);
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return { products, loading, error, refresh: fetchMyProducts, deleteProduct };
}
