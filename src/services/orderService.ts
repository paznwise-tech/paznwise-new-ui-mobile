import { fetchApi } from './api';
import type { Order, CheckoutSummary, ApiResponse } from '../types';

export const orderService = {
  /**
   * Get all orders of the logged-in user
   */
  async getMyOrders(): Promise<Order[]> {
    const res = await fetchApi<ApiResponse<Order[]> | Order[] | { orders: Order[] }>('/orders', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    if ('data' in res && Array.isArray(res.data)) return res.data;
    if ('orders' in res && Array.isArray(res.orders)) return res.orders;
    return [];
  },

  /**
   * Get order details by ID
   */
  async getOrderById(id: string | number): Promise<Order> {
    const res = await fetchApi<ApiResponse<Order> | Order>(`/orders/${id}`, {
      requiresAuth: true,
    });
    if ('data' in res && res.data) return res.data;
    return res as Order;
  },

  /**
   * Create checkout session
   */
  async createCheckoutSession(): Promise<{ id: string }> {
    const res = await fetchApi<ApiResponse<{ id: string }> | { id: string }>('/checkout', {
      method: 'POST',
      requiresAuth: true,
    });
    if ('data' in res && res.data) return res.data;
    return res as { id: string };
  },

  /**
   * Fetch checkout summary
   */
  async getCheckoutSummary(): Promise<CheckoutSummary> {
    const res = await fetchApi<ApiResponse<CheckoutSummary> | CheckoutSummary>('/checkout/summary', {
      requiresAuth: true,
    });
    if ('data' in res && res.data) return res.data;
    return res as CheckoutSummary;
  },

  /**
   * Attach address to checkout session
   */
  async attachAddressToSession(sessionId: string, addressId: string): Promise<void> {
    await fetchApi(`/checkout/${sessionId}/address`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify({ addressId }),
    });
  },

  /**
   * Complete checkout and place order
   */
  async completeCheckout(sessionId: string, paymentMethod: string): Promise<{ orderId?: string; id?: string }> {
    const res = await fetchApi<any>(`/checkout/${sessionId}/complete`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ paymentMethod }),
    });
    if (res.data) return res.data;
    return res;
  },

  /**
   * Apply coupon to checkout session
   */
  async applyCoupon(sessionId: string, couponCode: string): Promise<any> {
    const res = await fetchApi<any>(`/checkout/${sessionId}/coupon`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ couponCode: couponCode.trim().toUpperCase() }),
    });
    return res.data || res;
  },

  /**
   * Remove coupon from checkout session
   */
  async removeCoupon(sessionId: string): Promise<void> {
    await fetchApi(`/checkout/${sessionId}/coupon`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
