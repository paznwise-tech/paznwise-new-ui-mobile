import { fetchApi } from './api';
import type { Order, OrderItem, CheckoutSummary, ApiResponse } from '@/types';

/**
 * Orders and checkout.
 *
 * Orders are NOT created by a `POST /orders` — no such route exists on either
 * order router. An order is the product of a checkout session:
 *
 *   POST /checkout                    → session
 *   PUT  /checkout/:id/address        → attach a delivery address
 *   POST /checkout/:id/coupon         → apply a discount (authoritative)
 *   GET  /checkout/summary            → server-computed totals
 *   POST /checkout/:id/complete       → places the order
 */

function normalizeOrderItem(i: any): OrderItem {
  return {
    ...i,
    productId: i.productId ?? i.product?.id ?? '',
    title: i.title ?? i.product?.title ?? i.productTitle,
    price: i.price ?? i.unitPrice ?? 0,
    quantity: i.quantity ?? 1,
    image: i.image ?? i.product?.images?.[0],
  };
}

/**
 * Collapses the several shapes the API returns for an order into one.
 * The list and detail endpoints differ (`_id` vs `id`, `orderItems` vs
 * `items`, `total`/`amount` vs `totalAmount`), so screens should never read
 * a raw order straight off the wire.
 */
export function normalizeOrder(o: any): Order {
  return {
    ...o,
    id: o.id ?? o._id ?? '',
    status: o.status ?? 'processing',
    totalAmount: o.totalAmount ?? o.total ?? o.amount,
    createdAt: o.createdAt ?? new Date().toISOString(),
    items: (o.items ?? o.orderItems ?? o.products ?? []).map(normalizeOrderItem),
    shippingAddress: o.shippingAddress ?? o.deliveryAddress,
  };
}

export const orderService = {
  /** Buyer's orders. */
  async getMyOrders(): Promise<Order[]> {
    const res = await fetchApi<any>('/orders', { requiresAuth: true });
    const data = res?.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.orders ?? data?.items ?? []);
    return list.map(normalizeOrder);
  },

  async getOrderById(id: string | number): Promise<Order> {
    const res = await fetchApi<ApiResponse<Order> | Order>(`/orders/${id}`, {
      requiresAuth: true,
    });
    const data = (res as ApiResponse<Order>)?.data ?? res;
    return normalizeOrder(data);
  },

  /** `PATCH`, not `POST` — see src/order/order.routes.js. */
  async cancelOrder(id: string | number, reason?: string): Promise<void> {
    await fetchApi(`/orders/${id}/cancel`, {
      method: 'PATCH',
      requiresAuth: true,
      body: JSON.stringify({ reason: reason ?? 'Cancelled by user' }),
    });
  },

  // ── Checkout session ───────────────────────────────────

  async createCheckoutSession(): Promise<{ id: string }> {
    const res = await fetchApi<ApiResponse<{ id: string }> | { id: string }>('/checkout', {
      method: 'POST',
      requiresAuth: true,
    });
    if ('data' in res && res.data) return res.data;
    return res as { id: string };
  },

  async getCheckoutSummary(): Promise<CheckoutSummary> {
    const res = await fetchApi<ApiResponse<CheckoutSummary> | CheckoutSummary>(
      '/checkout/summary',
      { requiresAuth: true },
    );
    if ('data' in res && res.data) return res.data;
    return res as CheckoutSummary;
  },

  async attachAddressToSession(sessionId: string, addressId: string): Promise<void> {
    await fetchApi(`/checkout/${sessionId}/address`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify({ addressId }),
    });
  },

  async completeCheckout(
    sessionId: string,
    paymentMethod: string,
  ): Promise<{ orderId?: string; id?: string }> {
    const res = await fetchApi<any>(`/checkout/${sessionId}/complete`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ paymentMethod }),
    });
    return res?.data ?? res;
  },

  /** Authoritative coupon application — the server recomputes the total. */
  async applyCoupon(sessionId: string, couponCode: string): Promise<any> {
    const res = await fetchApi<any>(`/checkout/${sessionId}/coupon`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ couponCode: couponCode.trim().toUpperCase() }),
    });
    return res?.data ?? res;
  },

  async removeCoupon(sessionId: string): Promise<void> {
    await fetchApi(`/checkout/${sessionId}/coupon`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
