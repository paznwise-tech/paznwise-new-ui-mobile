import { fetchApi } from './api';
import type { Event, ApiResponse } from '../types';

export const eventService = {
  /**
   * Get all public events with optional filtering
   */
  async getEvents(params?: { category?: string; search?: string; venueName?: string }): Promise<Event[]> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.venueName) qs.set('venueName', params.venueName);

    const query = qs.toString();
    const res = await fetchApi<ApiResponse<Event[]> | Event[]>(`/events${query ? `?${query}` : ''}`, {
      requiresAuth: false,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Get event detail by ID
   */
  async getEventById(id: string | number): Promise<Event | null> {
    const res = await fetchApi<ApiResponse<Event> | Event>(`/events/${id}`, {
      requiresAuth: false,
    });
    if ('data' in res && res.data) return res.data;
    return (res as Event) || null;
  },

  /**
   * Create an event (Organizer/Artist)
   */
  async createEvent(formData: FormData): Promise<any> {
    const res = await fetchApi<any>('/events/create', {
      method: 'POST',
      requiresAuth: true,
      body: formData,
    });
    return res.data || res;
  },

  /**
   * Reserve seats/ticket for an event
   */
  async bookEvent(payload: { eventId: string; slotId?: string; seatsBooked: number }): Promise<any> {
    const res = await fetchApi<any>('/events/book', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return res.data || res;
  },

  /**
   * Confirm event ticket booking after payment
   */
  async confirmBooking(bookingId: string): Promise<any> {
    const res = await fetchApi<any>(`/events/bookings/${bookingId}/confirm`, {
      method: 'POST',
      requiresAuth: true,
    });
    return res.data || res;
  },

  /**
   * Get logged-in user's event ticket bookings
   */
  async getMyEventBookings(): Promise<any[]> {
    const res = await fetchApi<ApiResponse<any[]> | any[]>('/my-bookings', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },

  /**
   * Get organizer's created events
   */
  async getMyCreatedEvents(): Promise<Event[]> {
    const res = await fetchApi<ApiResponse<Event[]> | Event[]>('/events/my-events', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return res.data || [];
  },
};
