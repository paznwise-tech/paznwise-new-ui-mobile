import { fetchApi } from './api';
import type { CartItem } from '@/types';

interface DeliveryAddress {
  name: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
}

export interface ApiOrderItem {
  productId: string;
  title?: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ApiOrder {
  id: string;
  status?: string;
  totalAmount?: number;
  estimatedDelivery?: string;
  createdAt?: string;
  items?: ApiOrderItem[];
  deliveryAddress?: DeliveryAddress;
  paymentMethod?: string;
}

interface OrderApiResponse {
  success: boolean;
  data?: ApiOrder;
  order?: ApiOrder;
  id?: string;
}

function normalizeOrder(o: any): ApiOrder {
  return {
    id: o.id ?? o._id ?? '',
    status: o.status ?? 'processing',
    totalAmount: o.totalAmount ?? o.total ?? o.amount,
    estimatedDelivery: o.estimatedDelivery ?? o.deliveryDate,
    createdAt: o.createdAt,
    items: (o.items ?? o.orderItems ?? []).map((i: any) => ({
      productId: i.productId ?? i.product?.id ?? '',
      title: i.title ?? i.product?.title ?? i.productTitle,
      price: i.price ?? i.unitPrice ?? 0,
      quantity: i.quantity ?? 1,
      image: i.image ?? i.product?.images?.[0],
    })),
    deliveryAddress: o.deliveryAddress ?? o.shippingAddress,
    paymentMethod: o.paymentMethod,
  };
}

export const OrderService = {
  async createOrder(
    cartItems: CartItem[],
    address: DeliveryAddress,
    platformFee: number
  ): Promise<ApiOrder> {
    const items = cartItems.map(i => ({
      productId: String(i.id),
      quantity: 1,
      price: i.price,
    }));
    const totalAmount = cartItems.reduce((s, i) => s + i.price, 0) + platformFee;

    const res = await fetchApi<OrderApiResponse>('/api/orders', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({
        items,
        deliveryAddress: address,
        paymentMethod: 'COD',
        totalAmount,
        platformFee,
      }),
    });

    return (
      res.data ??
      res.order ??
      { id: res.id ?? `ORD-${Math.floor(10000000 + Math.random() * 90000000)}` }
    );
  },

  async getMyOrders(): Promise<ApiOrder[]> {
    const res = await fetchApi<any>('/api/orders', { requiresAuth: true });
    const data = res.data ?? res;
    if (Array.isArray(data)) return data.map(normalizeOrder);
    return (data?.orders ?? data?.items ?? []).map(normalizeOrder);
  },

  async cancelOrder(id: string): Promise<void> {
    await fetchApi<any>(`/api/orders/${id}/cancel`, {
      method: 'POST',
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
