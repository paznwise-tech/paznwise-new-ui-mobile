import { fetchApi, MEDIA_BASE_URL } from './api';
import { Event } from '@/types';

interface ApiEventCity {
  id: string;
  name: string;
}

interface ApiEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  bannerImage?: string;
  eventImages?: string[];
  venueName?: string;
  venueAddress?: string;
  eventDate?: string;
  eventEndDate?: string;
  city?: ApiEventCity | string;
  cityId?: string;
  isFree?: boolean;
  price?: number;
  capacity?: number;
  status?: string;
  attendeeCount?: number;
  _count?: { attendees?: number };
}

interface EventListResponse {
  success: boolean;
  data: ApiEvent[] | { events?: ApiEvent[]; items?: ApiEvent[] };
  count?: number;
}

export interface ApiTicketTier {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: number;
  capacity?: number;
}

export interface ApiEventDetail extends ApiEvent {
  startTime?: string;
  endTime?: string;
  ticketTiers?: ApiTicketTier[];
  organizer?: {
    id?: string;
    name?: string;
    avatar?: string | null;
    username?: string;
  };
  isRegistered?: boolean;
}

export interface ApiEventTicket {
  id: string;
  event?: {
    id: string;
    title: string;
    bannerImage?: string;
    eventDate?: string;
    venueName?: string;
    venueAddress?: string;
    city?: ApiEventCity | string;
  };
  ticketTier?: { id?: string; name?: string; price?: number };
  ticketNumber?: string;
  quantity?: number;
  totalPrice?: number;
  status: string;
  createdAt?: string;
}

export function resolveEventImage(url: string | null | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop';
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function getCityName(city: ApiEventCity | string | undefined): string {
  if (!city) return '';
  if (typeof city === 'string') return city;
  return city.name ?? '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatEventDate(eventDate?: string, eventEndDate?: string): string {
  if (!eventDate) return '';
  const d = new Date(eventDate);
  if (isNaN(d.getTime())) return eventDate;
  const start = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (!eventEndDate) return start;
  const e = new Date(eventEndDate);
  if (isNaN(e.getTime())) return start;
  if (e.getMonth() === d.getMonth()) return `${start}–${e.getDate()}`;
  return `${start}–${MONTHS[e.getMonth()]} ${e.getDate()}`;
}

function normalizeEvent(e: ApiEvent, idx: number): Event {
  return {
    id: parseInt(e.id) || idx + 1,
    title: e.title,
    date: formatEventDate(e.eventDate, e.eventEndDate),
    city: getCityName(e.city),
    category: e.category ?? 'Exhibition',
    img: resolveEventImage(e.bannerImage ?? e.eventImages?.[0]),
    price: e.isFree ? 0 : (e.price ?? 0),
    going: e._count?.attendees ?? e.attendeeCount ?? 0,
  };
}

export const EventService = {
  async getEvents(params?: {
    category?: string;
    city?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<Event[]> {
    const q = new URLSearchParams();
    if (params?.page)                                          q.append('page', String(params.page));
    if (params?.limit)                                         q.append('limit', String(params.limit));
    if (params?.category && params.category !== 'All')         q.append('category', params.category);
    if (params?.city && params.city !== 'All Cities')          q.append('city', params.city);
    if (params?.search)                                        q.append('search', params.search);

    const qs = q.toString();
    const res = await fetchApi<EventListResponse>(`/api/events${qs ? `?${qs}` : ''}`, {
      requiresAuth: false,
    });

    let list: ApiEvent[] = [];
    if (Array.isArray(res.data)) {
      list = res.data;
    } else if (res.data && typeof res.data === 'object') {
      const d = res.data as any;
      list = d.events ?? d.items ?? [];
    }
    return list.map(normalizeEvent);
  },

  async getEventById(id: string): Promise<ApiEventDetail | null> {
    try {
      const res = await fetchApi<any>(`/api/events/${id}`, { requiresAuth: false });
      const data = res.data ?? res.event ?? res;
      if (!data?.id && !data?.title) return null;
      return data as ApiEventDetail;
    } catch {
      return null;
    }
  },

  async bookEvent(
    eventId: string,
    tierId: string,
    quantity: number,
  ): Promise<{ ticketNumber?: string; id?: string }> {
    const res = await fetchApi<any>(`/api/events/${eventId}/register`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ ticketTierId: tierId, quantity }),
    });
    return res.data ?? res.ticket ?? res;
  },

  async getMyEventTickets(): Promise<ApiEventTicket[]> {
    const res = await fetchApi<any>('/api/events/my-tickets', { requiresAuth: true });
    const data = res.data ?? res;
    if (Array.isArray(data)) return data as ApiEventTicket[];
    return (data?.tickets ?? data?.items ?? []) as ApiEventTicket[];
  },

  async createEvent(data: {
    eventType: string;
    title: string;
    description: string;
    organiserName?: string;
    city: string;
    venue: string;
    address?: string;
    dateFrom: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
    isFree: boolean;
    ticketPrice?: number;
    capacity?: number;
    bookingDeadline?: string;
  }): Promise<{ id?: string; submissionId?: string }> {
    const res = await fetchApi<any>('/api/events', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: data.eventType,
        venueName: data.venue,
        venueAddress: data.address,
        city: data.city,
        eventDate: data.dateFrom,
        eventEndDate: data.dateTo,
        startTime: data.timeFrom,
        endTime: data.timeTo,
        isFree: data.isFree,
        price: data.ticketPrice,
        capacity: data.capacity,
        bookingDeadline: data.bookingDeadline,
        organiserName: data.organiserName,
      }),
    });
    const d = res.data ?? res.event ?? res;
    return { id: d?.id, submissionId: d?.submissionId ?? d?.id };
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
