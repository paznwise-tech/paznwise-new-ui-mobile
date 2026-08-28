import { fetchApi, MEDIA_BASE_URL } from './api';
import { apiBaseUrl } from '@/config/env';

/**
 * Performer service bookings — src/artistService/artistService.routes.js.
 *
 * Bookings hang off `/artist-services/bookings`, not off a service:
 * there is no `POST /artist-services/:id/book` and no
 * `GET /artist-services/my-bookings`, which is what this called before.
 */

export type ServiceBookingStatus =
  | 'PENDING' | 'ACCEPTED' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';

/** What POST /artist-services/bookings accepts. */
export type ServicePaymentMethod = 'CARD' | 'UPI' | 'WALLET' | 'NET_BANKING';

export interface ServiceSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  bookedCount: number;
  isBlocked: boolean;
  /** Derived: no capacity left, or the artist blocked it. */
  isFull: boolean;
}

export interface ServiceBooking {
  id: string;
  bookingRef: string;
  serviceId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  address?: string | null;
  specialNotes?: string | null;
  totalAmount: number;
  status: ServiceBookingStatus;
  paymentStatus?: string;
  artistDeclineReason?: string | null;
  service?: { id: string; title?: string; bannerImage?: string | null };
  artist?: { id?: string; name?: string; avatar?: string | null };
  review?: { rating: number; review?: string } | null;
  createdAt?: string;
}

/** POST /artist-services/bookings returns the booking plus a payment order. */
export interface ServiceBookingResult extends ServiceBooking {
  razorpayOrderId?: string | null;
  keyId?: string | null;
}

export function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeSlot(s: any): ServiceSlot {
  const maxBookings = Number(s.maxBookings ?? 1);
  const bookedCount = Number(s.bookedCount ?? 0);
  return {
    id: String(s.id),
    date: s.date,
    startTime: s.startTime ?? '',
    endTime: s.endTime ?? '',
    maxBookings,
    bookedCount,
    isBlocked: !!s.isBlocked,
    isFull: !!s.isBlocked || bookedCount >= maxBookings,
  };
}

function normalizeBooking(b: any): ServiceBooking {
  return {
    id: String(b.id),
    bookingRef: b.bookingRef ?? `#${String(b.id).slice(0, 8).toUpperCase()}`,
    serviceId: String(b.serviceId ?? b.service?.id ?? ''),
    bookingDate: b.bookingDate ?? b.date ?? '',
    startTime: b.startTime ?? '',
    endTime: b.endTime ?? '',
    hours: Number(b.hours ?? 0),
    address: b.address,
    specialNotes: b.specialNotes,
    totalAmount: Number(b.totalAmount ?? b.totalPrice ?? 0),
    status: (b.status ?? 'PENDING') as ServiceBookingStatus,
    paymentStatus: b.paymentStatus,
    artistDeclineReason: b.artistDeclineReason,
    service: b.service
      ? {
          id: String(b.service.id ?? ''),
          title: b.service.title,
          bannerImage: resolveImage(b.service.bannerImage ?? b.service.coverImages?.[0]) ?? null,
        }
      : undefined,
    artist: b.artist
      ? { id: b.artist.id, name: b.artist.name, avatar: resolveImage(b.artist.avatar) ?? null }
      : undefined,
    review: b.review ?? null,
    createdAt: b.createdAt,
  };
}

function toList(res: any): any[] {
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : (data?.items ?? data?.bookings ?? []);
}

export const BookingService = {
  async getServiceSlots(serviceId: string): Promise<ServiceSlot[]> {
    const res = await fetchApi<any>(`/artist-services/${serviceId}/slots`, { requiresAuth: false });
    return toList(res).map(normalizeSlot);
  },

  /**
   * Creates the booking. Returns a Razorpay order when the amount is
   * payable and the gateway is configured; the booking stays PENDING until
   * the artist accepts it.
   */
  async bookService(payload: {
    serviceId: string;
    slotId: string;
    bookingDate: string;
    address?: string;
    specialNotes?: string;
    paymentMethod: ServicePaymentMethod;
  }): Promise<ServiceBookingResult> {
    const res = await fetchApi<any>('/artist-services/bookings', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    const data = res?.data ?? res;
    return { ...normalizeBooking(data), razorpayOrderId: data.razorpayOrderId, keyId: data.keyId };
  },

  async verifyPayment(
    bookingId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ): Promise<ServiceBooking> {
    const res = await fetchApi<any>(`/artist-services/bookings/${bookingId}/verify`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return normalizeBooking(res?.data ?? res);
  },

  async getMyBookings(): Promise<ServiceBooking[]> {
    const res = await fetchApi<any>('/artist-services/bookings/my', { requiresAuth: true });
    return toList(res).map(normalizeBooking);
  },

  /**
   * Requests received by the artist for their own services.
   *
   * Distinct from getMyBookings, which is what the signed-in user has
   * booked from others — an artist dashboard showing that list would be
   * displaying its owner's own purchases as incoming requests.
   */
  async getIncomingBookings(): Promise<ServiceBooking[]> {
    const res = await fetchApi<any>('/artist-services/bookings/incoming', { requiresAuth: true });
    return toList(res).map(normalizeBooking);
  },

  async acceptBooking(bookingId: string): Promise<void> {
    await fetchApi(`/artist-services/bookings/${bookingId}/accept`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /** The reason is shown to the customer, so it is never sent empty. */
  async declineBooking(bookingId: string, reason: string): Promise<void> {
    await fetchApi(`/artist-services/bookings/${bookingId}/decline`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reason }),
    });
  },

  async getBookingDetail(bookingId: string): Promise<ServiceBooking> {
    const res = await fetchApi<any>(`/artist-services/bookings/${bookingId}`, {
      requiresAuth: true,
    });
    return normalizeBooking(res?.data ?? res);
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    await fetchApi(`/artist-services/bookings/${bookingId}/cancel`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ reason }),
    });
  },

  async submitReview(bookingId: string, rating: number, review?: string): Promise<void> {
    await fetchApi(`/artist-services/bookings/${bookingId}/review`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ rating, review }),
    });
  },

  /** Absolute URL for the receipt; the caller downloads it with the auth header. */
  receiptUrl(bookingId: string): string {
    return `${apiBaseUrl}/api/artist-services/bookings/${bookingId}/receipt`;
  },
};

/** Statuses a buyer can still cancel. */
export const CANCELLABLE_BOOKING_STATUSES: ServiceBookingStatus[] = [
  'PENDING',
  'ACCEPTED',
  'CONFIRMED',
];
