import { fetchApi } from './api';
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
