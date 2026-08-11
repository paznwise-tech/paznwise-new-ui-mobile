import { fetchApi, MEDIA_BASE_URL } from './api';

export interface RentalListing {
  id: string;
  title: string;
  artist: string;
  img: string;
  rentalPrice: number;
  rentalPeriod: string;
  deposit?: number;
  available: boolean;
}

export interface ActiveRental {
  id: string;
  productTitle: string;
  productImg: string;
  startDate: string;
  endDate: string;
  rentalPrice: number;
  status: string;
}

function resolveImg(url: string | null | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400';
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeRental(p: any, idx: number): RentalListing {
  return {
    id: p.id ?? String(idx),
    title: p.title ?? p.name ?? 'Artwork',
    artist: p.artist?.name ?? p.createdBy?.name ?? '',
    img: resolveImg(p.images?.[0]?.url ?? p.images?.[0] ?? p.image),
    rentalPrice: p.rentalPrice ?? p.pricePerMonth ?? p.price ?? 0,
    rentalPeriod: p.rentalPeriod ?? 'per month',
    deposit: p.deposit ?? p.securityDeposit,
    available: p.isAvailableForRent ?? p.available ?? true,
  };
}

function normalizeActiveRental(r: any): ActiveRental {
  return {
    id: r.id ?? '',
    productTitle: r.product?.title ?? r.productTitle ?? 'Artwork',
    productImg: resolveImg(r.product?.images?.[0]?.url ?? r.product?.images?.[0] ?? r.productImage),
    startDate: r.startDate ?? r.rentalStart ?? '',
    endDate: r.endDate ?? r.rentalEnd ?? '',
    rentalPrice: r.totalPrice ?? r.rentalPrice ?? 0,
    status: r.status ?? 'active',
  };
}

export const RentalService = {
  async getListings(): Promise<RentalListing[]> {
    const res = await fetchApi<any>('/api/rentals?available=true', { requiresAuth: false });
    const data = res.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.items ?? data?.rentals ?? []);
    return list.map(normalizeRental);
  },

  async getMyRentals(): Promise<ActiveRental[]> {
    const res = await fetchApi<any>('/api/rentals/my', { requiresAuth: true });
    const data = res.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.items ?? data?.rentals ?? []);
    return list.map(normalizeActiveRental);
  },

  async requestRental(productId: string): Promise<void> {
    await fetchApi<any>('/api/rentals', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ productId }),
import { fetchApi } from './api';
import type { ApiResponse } from '../types';

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
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'DISPATCHED' | 'RETURNED' | 'COMPLETED';
  product?: { id: string; title: string; thumbnailUrl: string | null };
}

export const rentalService = {
  /**
   * Request artwork rental
   */
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

  /**
   * Get my rental history (renter)
   */
  async getMyRentals(): Promise<RentalBookingItem[]> {
    const res = await fetchApi<ApiResponse<RentalBookingItem[]> | RentalBookingItem[]>('/rentals/my', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Get incoming rental requests (artist)
   */
  async getIncomingRentals(): Promise<RentalBookingItem[]> {
    const res = await fetchApi<ApiResponse<RentalBookingItem[]> | RentalBookingItem[]>('/rentals/incoming', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Accept rental request (artist)
   */
  async acceptRental(id: string): Promise<void> {
    await fetchApi(`/rentals/${id}/accept`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /**
   * Decline rental request (artist)
   */
  async declineRental(id: string, reason?: string): Promise<void> {
    await fetchApi(`/rentals/${id}/decline`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reason }),
    });
  },
};
