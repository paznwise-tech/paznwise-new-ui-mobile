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
  const raw =
    coupon.discountType === 'percentage'
      ? Math.floor((orderAmount * coupon.discount) / 100)
      : coupon.discount;
  return Math.min(raw, orderAmount);
}

export const CouponService = {
  /**
   * Publicly listable coupons.
   *
   * `GET /coupons/public` is the *only* route on the backend's coupon router
   * (src/coupon/coupon.routes.js) — there is no `/coupons` list endpoint.
   */
  async getCoupons(): Promise<Coupon[]> {
    const res = await fetchApi<any>('/coupons/public', { requiresAuth: false });
    const data = res?.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.coupons ?? data?.items ?? []);
    return list.map(normalizeCoupon);
  },

  /**
   * Client-side eligibility check, used to give immediate feedback in the cart.
   *
   * There is deliberately no server call here: the backend has no standalone
   * coupon-validation endpoint. Authoritative application happens during
   * checkout via `POST /checkout/:sessionId/coupon`, which recomputes the
   * discount server-side — so this result is advisory only and must never be
   * trusted for the final total.
   */
  async validateCoupon(code: string, orderAmount: number): Promise<AppliedCoupon> {
    const all = await CouponService.getCoupons();
    const found = all.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!found) throw new Error('Invalid or expired coupon code');
    if (!found.isActive) throw new Error('This coupon is no longer active');
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      throw new Error('This coupon has expired');
    }
    if (found.minOrderAmount && orderAmount < found.minOrderAmount) {
      throw new Error(
        `Minimum order of ₹${found.minOrderAmount.toLocaleString('en-IN')} required`,
      );
    }

    return {
      code: found.code,
      discount: found.discount,
      discountType: found.discountType,
      discountAmount: computeDiscount(found, orderAmount),
    };
  },
};
