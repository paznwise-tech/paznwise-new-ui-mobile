import { fetchApi, MEDIA_BASE_URL } from './api';
import { ApiResponse, Booking } from '@/types';

function resolveImage(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface BookServiceInput {
  date: string;
  startTime?: string;
  duration?: string;
  venue: string;
  guestCount?: number;
  notes?: string;
  totalPrice?: number;
}

interface ApiBooking {
  id: string;
  serviceId?: string;
  service?: {
    id?: string;
    title?: string;
    category?: string;
    artist?: { name?: string; avatar?: string; username?: string };
  };
  artistName?: string;
  artistImage?: string;
  date?: string;
  eventDate?: string;
  venue?: string;
  eventDetails?: string;
  guestCount?: number;
  notes?: string;
  totalPrice?: number;
  price?: string | number;
  status: string;
  createdAt?: string;
}

interface BookingListResponse {
  success: boolean;
  data: ApiBooking[] | { bookings?: ApiBooking[]; items?: ApiBooking[] };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(raw: string | undefined): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

function normalizeStatus(s: string): Booking['status'] {
  const lower = s.toLowerCase();
  if (lower === 'confirmed' || lower === 'approved') return 'confirmed';
  if (lower === 'cancelled' || lower === 'rejected' || lower === 'declined') return 'cancelled';
  if (lower === 'completed') return 'completed';
  return 'pending';
}

function normalizeBooking(b: ApiBooking): Booking {
  const performerName = b.service?.artist?.name ?? b.artistName ?? b.service?.title ?? 'Artist';
  const performerImg  = resolveImage(b.service?.artist?.avatar ?? b.artistImage);
  const performerType = b.service?.category ?? b.service?.title ?? '';
  const date          = formatDate(b.date ?? b.eventDate);
  const eventDetails  = b.venue ?? b.eventDetails ?? '';

  let price = '';
  if (typeof b.price === 'string')  price = b.price.startsWith('₹') ? b.price : `₹${b.price}`;
  else if (typeof b.price === 'number') price = `₹${b.price.toLocaleString('en-IN')}`;
  else if (b.totalPrice)            price = `₹${b.totalPrice.toLocaleString('en-IN')}`;

  return {
    id: b.id,
    performerId: 0,
    performerName,
    performerType,
    performerImg,
    date,
    eventDetails,
    price,
    status: normalizeStatus(b.status),
    createdAt: b.createdAt ?? new Date().toISOString(),
  };
}

export const BookingService = {
  async bookService(serviceId: string, input: BookServiceInput): Promise<Booking> {
    const res = await fetchApi<ApiResponse<ApiBooking>>(
      `/artist-services/${serviceId}/book`,
      { method: 'POST', requiresAuth: true, body: JSON.stringify(input) }
    );
    return normalizeBooking(res.data);
  },

  async getMyBookings(): Promise<Booking[]> {
    const res = await fetchApi<BookingListResponse>('/artist-services/my-bookings', {
      requiresAuth: true,
    });
    let list: ApiBooking[] = [];
    if (Array.isArray(res.data)) {
      list = res.data;
    } else if (res.data && typeof res.data === 'object') {
      const d = res.data as any;
      list = d.bookings ?? d.items ?? [];
    }
    return list.map(normalizeBooking);
  },
};
