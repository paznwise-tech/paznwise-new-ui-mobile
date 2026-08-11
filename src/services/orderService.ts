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
      requiresAuth: true,
    });
  },
};
