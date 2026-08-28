import { fetchApi } from './api';
import type { ApiResponse } from '@/types';

/**
 * Artwork rentals — src/rental/rental.routes.js.
 *
 * The whole router sits behind `authenticate`; there is no public "browse
 * rentable artworks" route. Discovery of rentable pieces comes from the
 * product catalogue, not from here.
 */

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
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'CANCELLED'
    | 'DISPATCHED'
    | 'RETURNED'
    | 'COMPLETED';
  product?: { id: string; title: string; thumbnailUrl: string | null };
}

export const rentalService = {
  /** Request an artwork rental. Dates and payment method are required by the server schema. */
  async createRental(payload: {
    productId: string;
    startDate: string;
    endDate: string;
    address?: string;
    specialNotes?: string;
    paymentMethod: string;
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
