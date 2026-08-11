import { fetchApi } from './api';

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minOrderAmount?: number;
  expiresAt?: string;
  isActive: boolean;
  usageLimit?: number;
  usedCount?: number;
}

export interface AppliedCoupon {
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
}

export function normalizeCoupon(c: any): Coupon {
  return {
    id: c.id ?? c._id ?? '',
    code: c.code ?? '',
    description: c.description ?? c.title ?? '',
    discount: c.discount ?? c.value ?? c.discountValue ?? 0,
    discountType: c.discountType ?? (c.isPercentage ? 'percentage' : 'fixed'),
    minOrderAmount: c.minOrderAmount ?? c.minimumAmount,
    expiresAt: c.expiresAt ?? c.validUntil ?? c.endDate,
    isActive: c.isActive ?? c.active ?? true,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount ?? c.used ?? 0,
  };
}

function computeDiscount(coupon: Coupon, orderAmount: number): number {
  const raw = coupon.discountType === 'percentage'
    ? Math.floor((orderAmount * coupon.discount) / 100)
    : coupon.discount;
  return Math.min(raw, orderAmount);
}

export const CouponService = {
  async getCoupons(): Promise<Coupon[]> {
    const res = await fetchApi<any>('/api/coupons', { requiresAuth: false });
    const data = res.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.coupons ?? data?.items ?? []);
    return list.map(normalizeCoupon);
  },

  async validateCoupon(code: string, orderAmount: number): Promise<AppliedCoupon> {
    // Try server-side validation first
    try {
      const res = await fetchApi<any>('/api/coupons/validate', {
        method: 'POST',
        requiresAuth: false,
        body: JSON.stringify({ code, orderAmount }),
      });
      const data = res.data ?? res;
      const coupon = normalizeCoupon(data.coupon ?? data);
      return {
        code: coupon.code || code,
        discount: coupon.discount,
        discountType: coupon.discountType,
        discountAmount: computeDiscount(coupon, orderAmount),
      };
    } catch {
      // Fall back to client-side lookup from the coupons list
      const all = await CouponService.getCoupons();
      const found = all.find(c => c.code.toUpperCase() === code.toUpperCase());
      if (!found) throw new Error('Invalid or expired coupon code');
      if (!found.isActive) throw new Error('This coupon is no longer active');
      if (found.expiresAt && new Date(found.expiresAt) < new Date()) throw new Error('This coupon has expired');
      if (found.minOrderAmount && orderAmount < found.minOrderAmount) {
        throw new Error(`Minimum order of ₹${found.minOrderAmount.toLocaleString('en-IN')} required`);
      }
      return {
        code: found.code,
        discount: found.discount,
        discountType: found.discountType,
        discountAmount: computeDiscount(found, orderAmount),
      };
import type { Coupon, ApiResponse } from '../types';

export const couponService = {
  /**
   * Fetch public coupons available for buyers
   */
  async getPublicCoupons(): Promise<Coupon[]> {
    try {
      const res = await fetchApi<ApiResponse<Coupon[]> | Coupon[]>('/coupons/public', {
        requiresAuth: false,
      });
      if (Array.isArray(res)) return res;
      if ('data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch (error) {
      console.warn('[couponService] Error fetching public coupons:', error);
      return [];
    }
  },
};
