import { fetchApi } from './api';
import { getProductImageUrl } from '@/utils/imageUrl';

/**
 * Cart — src/cart/cart.routes.js.
 *
 * The whole router is behind `authenticate`, so there is no guest cart:
 * adding to the cart requires a session. Quantity is server-owned; the
 * previous in-memory cart could not represent it at all.
 */

export interface CartLine {
  /** Cart line id — what the item endpoints address. */
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  img: string;
  /** Available stock, when the API reports it. */
  stock?: number;
}



function normalizeLine(i: any): CartLine {
  const product = i.product ?? i;
  return {
    id: String(i.id ?? i._id ?? product.id ?? ''),
    productId: String(product.id ?? i.productId ?? ''),
    title: product.title ?? product.name ?? 'Untitled',
    price: Number(i.price ?? product.price ?? 0),
    quantity: Number(i.quantity ?? 1),
    // `images` is empty on live data; the real URLs are in productImages
    // and thumbnailUrl, which this helper checks in turn.
    img: getProductImageUrl(product),
    stock: product.stock ?? product.availableStock,
  };
}

export const CartService = {
  async getCart(): Promise<CartLine[]> {
    const res = await fetchApi<any>('/cart', { requiresAuth: true });
    const data = res?.data ?? res;
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? data?.cartItems ?? []);
    return items.map(normalizeLine);
  },

  /** Adds to the existing quantity for this product. */
  async addToCart(productId: string | number, quantity = 1): Promise<void> {
    await fetchApi('/cart', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ productId: String(productId), quantity }),
    });
  },

  /** Sets an absolute quantity for a product, regardless of what is there. */
  async setQuantityByProduct(productId: string | number, quantity: number): Promise<void> {
    await fetchApi('/cart', {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify({ productId: String(productId), quantity }),
    });
  },

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    await fetchApi(`/cart/${itemId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify({ quantity }),
    });
  },

  async removeItem(itemId: string): Promise<void> {
    await fetchApi(`/cart/${itemId}`, { method: 'DELETE', requiresAuth: true });
  },

  async clearCart(): Promise<void> {
    await fetchApi('/cart/clear', { method: 'DELETE', requiresAuth: true });
  },
};
