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
  /** After this date the event stops accepting bookings. */
  bookingDeadline?: string | null;
  city?: ApiEventCity | string;
  cityId?: string;
  isFree?: boolean;
  /** Sent as a decimal STRING (e.g. "500"), or null for free events. */
  price?: number | string | null;
  capacity?: number;
  /** Moderation state. The API sends `approvalStatus`; `status` is always null. */
  approvalStatus?: string;
  status?: string;
  rejectionReason?: string | null;
  /** The API sends both, equal. `attendeeCount` (singular) does not exist. */
  going?: number;
  attendeesCount?: number;
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
    id: String(e.id ?? idx),
    title: e.title,
    date: formatEventDate(e.eventDate, e.eventEndDate),
    city: getCityName(e.city),
    category: e.category ?? 'Exhibition',
    img: resolveEventImage(e.bannerImage ?? e.eventImages?.[0]),
    // Price arrives as a decimal string, so it is coerced — `Event.price` is
    // typed number and screens compare it against 0 to show "Free".
    price: e.isFree ? 0 : Number(e.price ?? 0),
    going: e.going ?? e.attendeesCount ?? e._count?.attendees ?? 0,
  };
}

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';

export interface EventSeat {
  id: string;
  seatNumber: string;
  status: SeatStatus;
  lockedUntil?: string;
}

/** What POST /events/book returns: the booking, plus a payment order if payable. */
export interface EventBookingResult {
  id: string;
  bookingId?: string;
  totalPrice?: number | string;
  status?: string;
  /** Null for a free event, or when Razorpay is not configured. */
  razorpayOrderId?: string | null;
  keyId?: string | null;
}

export const EventService = {
  async getEvents(params?: {
    category?: string;
    city?: string;
    page?: number;
    limit?: number;
    search?: string;
    /** Only events hosted by this artist. */
    artistId?: string;
  }): Promise<Event[]> {
    const q = new URLSearchParams();
    if (params?.page)                                  q.append('page', String(params.page));
    if (params?.limit)                                 q.append('limit', String(params.limit));
    if (params?.category && params.category !== 'All') q.append('category', params.category);
    if (params?.city && params.city !== 'All Cities')  q.append('city', params.city);
    if (params?.search)                                q.append('search', params.search);
    if (params?.artistId)                              q.append('artistId', params.artistId);

    const qs = q.toString();
    const res = await fetchApi<EventListResponse>(`/events${qs ? `?${qs}` : ''}`, {
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
      const res = await fetchApi<any>(`/events/${id}`, { requiresAuth: false });
      const data = res.data ?? res.event ?? res;
      if (!data?.id && !data?.title) return null;
      return data as ApiEventDetail;
    } catch {
      return null;
    }
  },

  /** Seats for a slot, when the event is seat-mapped. */
  async getSeats(slotId: string): Promise<EventSeat[]> {
    const res = await fetchApi<any>(`/slots/${slotId}/seats`, { requiresAuth: false });
    const data = res?.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.seats ?? []);
    return list.map((s: any) => ({
      id: String(s.id),
      seatNumber: String(s.seatNumber ?? ''),
      status: (s.status ?? 'AVAILABLE') as SeatStatus,
      lockedUntil: s.lockedUntil ?? undefined,
    }));
  },

  /**
   * Reserves seats for a short window before payment.
   *
   * Throws with `unavailableSeats` on a 409 — someone else took one of them
   * between rendering the map and confirming. Callers must drop those seats
   * and refresh rather than retrying blind.
   */
  async lockSeats(slotId: string, seatIds: string[]): Promise<{ lockedUntil?: string }> {
    const res = await fetchApi<any>(`/slots/${slotId}/seats/lock`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ seatIds }),
    });
    return res?.data ?? res ?? {};
  },

  /** Existing booking for this slot, so a user is not shown a map twice. */
  async getMyBookingForSlot(slotId: string): Promise<any | null> {
    try {
      const res = await fetchApi<any>(`/slots/${slotId}/my-booking`, { requiresAuth: true });
      return res?.data ?? res ?? null;
    } catch {
      return null;
    }
  },

  /** Server-side signature check; this is what confirms a paid booking. */
  async verifyBookingPayment(
    bookingId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ): Promise<any> {
    const res = await fetchApi<any>(`/events/bookings/${bookingId}/verify`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  async getEventSlots(eventId: string): Promise<any[]> {
    const res = await fetchApi<any>(`/events/${eventId}/slots`, { requiresAuth: false });
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : (data?.slots ?? []);
  },

  /**
   * Reserve a booking.
   *
   * `POST /events/book` — there is no `/events/:id/register` route. When the
   * event is paid the response carries a Razorpay order to settle; a free
   * event comes back with no `razorpayOrderId` and is finished with
   * `confirmBooking` instead.
   */
  async bookEvent(payload: {
    eventId: string;
    slotId?: string;
    ticketTierId?: string;
    seatsBooked: number;
    seatIds?: string[];
    totalPrice?: number;
  }): Promise<any> {
    const res = await fetchApi<any>('/events/book', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return res?.data ?? res;
  },

  /** Finalises a booking that needed no payment. */
  async confirmBooking(bookingId: string): Promise<any> {
    const res = await fetchApi<any>(`/events/bookings/${bookingId}/confirm`, {
      method: 'POST',
      requiresAuth: true,
    });
    return res?.data ?? res;
  },

  async cancelBooking(bookingId: string): Promise<void> {
    await fetchApi(`/events/bookings/${bookingId}/cancel`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  /** The buyer's booked tickets. `GET /my-bookings` — there is no `/events/my-tickets`. */
  async getMyEventTickets(): Promise<ApiEventTicket[]> {
    const res = await fetchApi<any>('/my-bookings', { requiresAuth: true });
    const data = res?.data ?? res;
    if (Array.isArray(data)) return data as ApiEventTicket[];
    return (data?.bookings ?? data?.tickets ?? data?.items ?? []) as ApiEventTicket[];
  },

  /** Events created by the current artist. */
  async getMyCreatedEvents(): Promise<any[]> {
    const res = await fetchApi<any>('/events/my-events', { requiresAuth: true });
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : (data?.events ?? data?.items ?? []);
  },

  /** Attendees for one of the artist's own events. */
  async getEventBookings(eventId: string): Promise<any[]> {
    const res = await fetchApi<any>(`/events/${eventId}/bookings`, { requiresAuth: true });
    const d = res?.data ?? res;
    return Array.isArray(d) ? d : (d?.bookings ?? d?.items ?? []);
  },

  /** Bookings across all of the artist's events, newest first. */
  async getIncomingEventBookings(): Promise<any[]> {
    const res = await fetchApi<any>('/events/artist-incoming-bookings', { requiresAuth: true });
    const d = res?.data ?? res;
    return Array.isArray(d) ? d : (d?.bookings ?? d?.items ?? []);
  },

  /** Check-in: marks an attendee's booking as verified at the door. */
  async verifyBooking(bookingId: string): Promise<void> {
    await fetchApi(`/events/bookings/${bookingId}/verify`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    await fetchApi(`/events/delete/${eventId}`, { method: 'DELETE', requiresAuth: true });
  },

  /** `POST /events/create` (ARTIST role) — plain `POST /events` is not a route. */
  async createEvent(data: {
    eventType: string;
    title: string;
    description: string;
    organiserName?: string;
    /** UUID from `/event-categories`; the API validates this, not the name. */
    categoryId: string;
    city: string;
    /** City UUID; the API prefers this over the free-text name. */
    cityId?: string;
    venue: string;
    address: string;
    dateFrom: string;
    dateTo?: string;
    timeFrom?: string;
    timeTo?: string;
    isFree: boolean;
    ticketPrice?: number;
    capacity?: number;
    bookingDeadline?: string;
  }): Promise<{ id?: string; submissionId?: string }> {
    const res = await fetchApi<any>('/events/create', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        venueName: data.venue,
        venueAddress: data.address,
        city: data.city,
        cityId: data.cityId,
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
    const d = res?.data ?? res?.event ?? res;
    return { id: d?.id, submissionId: d?.submissionId ?? d?.id };
  },
};
