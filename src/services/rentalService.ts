import { fetchApi } from './api';
import type { ApiResponse } from '@/types';

/**
 * Artwork rentals — src/rental/rental.routes.js.
 *
 * The whole router sits behind `authenticate`; there is no public "browse
 * rentable artworks" route. Discovery of rentable pieces comes from the
 * product catalogue, not from here.
 */

export type RentalStatus =
  | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  | 'DISPATCHED' | 'RETURNED' | 'COMPLETED';

export type DepositStatus = 'HELD' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FORFEITED';

/** What POST /rentals accepts — see schema/rentalValidationSchema.js. */
export type RentalPaymentMethod = 'CARD' | 'UPI' | 'WALLET' | 'NET_BANKING';

export interface RentalBookingItem {
  id: string;
  bookingRef: string;
  productId: string;
  renterId: string;
  artistId: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyRate: number | string;
  rentalAmount: number | string;
  status: RentalStatus;
  securityDeposit?: number | string;
  depositStatus?: DepositStatus;
  depositNotes?: string | null;
  address?: string | null;
  specialNotes?: string | null;
  paymentStatus?: string;
  artistDeclineReason?: string | null;
  /** Condition photos taken by the owner at dispatch and on return. */
  conditionReportBeforeUrls?: string[];
  conditionReportAfterUrls?: string[];
  product?: { id: string; title: string; thumbnailUrl: string | null };
  artist?: { id?: string; name?: string };
  createdAt?: string;
}

/** Statuses a renter can still withdraw. */
export const CANCELLABLE_RENTAL_STATUSES: RentalStatus[] = ['PENDING', 'ACCEPTED'];

export function rentalStatusLabel(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export const rentalService = {
  /**
   * Whether the artwork is free for this date range.
   *
   * The server only reports a yes/no — it checks for an overlapping booking.
   * Pricing is derived from the product's daily rate when the request is
   * created, not returned here.
   */
  async checkAvailability(
    productId: string,
    startDate: string,
    endDate: string,
  ): Promise<boolean> {
    const params = new URLSearchParams({ productId, startDate, endDate });
    const res = await fetchApi<any>(`/rentals/availability?${params.toString()}`, {
      requiresAuth: true,
    });
    const d = res?.data ?? res;
    return d?.available ?? false;
  },

  /** Request an artwork rental. Dates and payment method are required by the server schema. */
  async createRental(payload: {
    productId: string;
    startDate: string;
    endDate: string;
    address?: string;
    specialNotes?: string;
    paymentMethod: RentalPaymentMethod;
  }): Promise<RentalBookingItem> {
    const res = await fetchApi<ApiResponse<RentalBookingItem> | RentalBookingItem>('/rentals', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    if ('data' in res && res.data) return res.data;
    return res as RentalBookingItem;
  },

  /** Renter's own rentals. */
  async getMyRentals(): Promise<RentalBookingItem[]> {
    const res = await fetchApi<ApiResponse<RentalBookingItem[]> | RentalBookingItem[]>(
      '/rentals/my',
      { requiresAuth: true },
    );
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /** Incoming requests for artworks the current user owns. */
  async getIncomingRentals(): Promise<RentalBookingItem[]> {
    const res = await fetchApi<ApiResponse<RentalBookingItem[]> | RentalBookingItem[]>(
      '/rentals/incoming',
      { requiresAuth: true },
    );
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  async getRentalDetail(bookingId: string): Promise<RentalBookingItem> {
    const res = await fetchApi<ApiResponse<RentalBookingItem> | RentalBookingItem>(
      `/rentals/${bookingId}`,
      { requiresAuth: true },
    );
    const d = (res as ApiResponse<RentalBookingItem>)?.data ?? res;
    return d as RentalBookingItem;
  },

  async cancelRental(bookingId: string): Promise<void> {
    await fetchApi(`/rentals/${bookingId}/cancel`, { method: 'POST', requiresAuth: true });
  },

  async acceptRental(id: string): Promise<void> {
    await fetchApi(`/rentals/${id}/accept`, { method: 'POST', requiresAuth: true });
  },

  async declineRental(id: string, reason?: string): Promise<void> {
    await fetchApi(`/rentals/${id}/decline`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reason }),
    });
  },
};
