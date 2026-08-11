import { fetchApi } from './api';
import type { ApiResponse } from '../types';

export interface ArtistServiceItem {
  id: string;
  title: string;
  description: string;
  pricingType: 'HOURLY' | 'PER_SESSION' | 'FIXED' | 'CUSTOM_QUOTE';
  basePrice: number | string;
  currency: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  sampleWorkUrls?: string[];
  artist?: { id: string; username: string; name: string; picture: string | null };
}

export const performerService = {
  /**
   * Get all active performer services
   */
  async getServices(params?: { categoryId?: string; search?: string }): Promise<ArtistServiceItem[]> {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.search) qs.set('search', params.search);

    const query = qs.toString();
    const res = await fetchApi<ApiResponse<ArtistServiceItem[]> | ArtistServiceItem[]>(
      `/artist-services${query ? `?${query}` : ''}`,
      { requiresAuth: false }
    );
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Get service detail by ID
   */
  async getServiceById(id: string | number): Promise<ArtistServiceItem | null> {
    const res = await fetchApi<ApiResponse<ArtistServiceItem> | ArtistServiceItem>(
      `/artist-services/${id}`,
      { requiresAuth: false }
    );
    if ('data' in res && res.data) return res.data;
    return (res as ArtistServiceItem) || null;
  },

  /**
   * Get my created services (for logged-in performer)
   */
  async getMyServices(): Promise<ArtistServiceItem[]> {
    const res = await fetchApi<ApiResponse<ArtistServiceItem[]> | ArtistServiceItem[]>(
      '/artist-services/my',
      { requiresAuth: true }
    );
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Book a performer service
   */
  async bookPerformerService(payload: {
    artistServiceId: string;
    bookingDate: string;
    hours?: number;
    notes?: string;
  }): Promise<any> {
    const res = await fetchApi<any>('/artist-services/bookings', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  /**
   * Get incoming booking requests for artist
   */
  async getIncomingBookings(): Promise<any[]> {
    const res = await fetchApi<ApiResponse<any[]> | any[]>('/artist-services/bookings/incoming', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },
};
