import { fetchApi, MEDIA_BASE_URL } from './api';

/**
 * Organizer events and ticketing — src/organizerEvents/organizerEvents.routes.js.
 *
 * Everything here MUST use the `/organizer/*` prefix. The same router is
 * also mounted at `/api/events`, but `app.use('/api', eventRoutes)` is
 * registered first in server.js, so the artist events router shadows it for
 * every overlapping path — an organizer call to `/events/...` is served by
 * the wrong controller.
 */

export interface OrganizerTier {
  id: string;
  tierName: string;
  description?: string | null;
  price: number;
  totalSeats: number;
  bookedSeats: number;
  saleStartDate?: string;
  saleEndDate?: string;
}

export interface OrganizerEvent {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  venueAddress?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  totalCapacity?: number;
  status?: string;
  bannerImage?: string | null;
  ticketTiers?: OrganizerTier[];
}

export interface TierSummary {
  tierId: string;
  tierName: string;
  price: number;
  totalSeats: number;
  bookedSeats: number;
  remainingSeats: number;
}

export interface EventSales {
  event: OrganizerEvent;
  salesSummary: {
    totalTicketsSold: number;
    totalCapacity: number;
    totalRevenue: number;
    /** Platform's cut — organizers see both this and their net payout. */
    totalCommission: number;
    totalPayout: number;
  };
  tierSummary: TierSummary[];
}

export interface NewTier {
  tierName: string;
  description?: string;
  price: number;
  totalSeats: number;
  saleStartDate: string;
  saleEndDate: string;
}

export type TicketPaymentMethod = 'CARD' | 'UPI' | 'WALLET' | 'NET_BANKING';

function resolveImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function toList(res: any): any[] {
  const d = res?.data ?? res;
  return Array.isArray(d) ? d : (d?.events ?? d?.items ?? d?.orders ?? []);
}

function normalizeEvent(e: any): OrganizerEvent {
  return {
    id: String(e.id),
    title: e.title ?? '',
    description: e.description,
    venue: e.venue ?? e.venueName,
    venueAddress: e.venueAddress,
    eventDate: e.eventDate,
    startTime: e.startTime,
    endTime: e.endTime,
    totalCapacity: e.totalCapacity,
    status: e.status,
    bannerImage: resolveImage(e.bannerImage ?? e.coverImage),
    ticketTiers: (e.ticketTiers ?? []).map((t: any) => ({
      id: String(t.id),
      tierName: t.tierName ?? '',
      description: t.description,
      price: Number(t.price ?? 0),
      totalSeats: Number(t.totalSeats ?? 0),
      bookedSeats: Number(t.bookedSeats ?? 0),
      saleStartDate: t.saleStartDate,
      saleEndDate: t.saleEndDate,
    })),
  };
}

export const OrganizerService = {
  // ── Public ─────────────────────────────────────────────

  async getCategories(): Promise<Array<{ id: string; name: string }>> {
    try {
      const res = await fetchApi<any>('/organizer/categories', { requiresAuth: false });
      return toList(res).map((c: any) => ({ id: String(c.id), name: c.name ?? c.title ?? '' }));
    } catch {
      return [];
    }
  },

  async getPublicEvents(): Promise<OrganizerEvent[]> {
    const res = await fetchApi<any>('/organizer', { requiresAuth: false });
    return toList(res).map(normalizeEvent);
  },

  // ── Buyer ──────────────────────────────────────────────

  /**
   * Buys tickets. Note the API creates no payment order for this — the
   * order is recorded with a payment method and no gateway step.
   */
  async purchaseTickets(payload: {
    eventId: string;
    items: Array<{ tierId: string; quantity: number }>;
    paymentMethod: TicketPaymentMethod;
  }): Promise<{ id: string }> {
    const res = await fetchApi<any>('/organizer/tickets/purchase', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    const d = res?.data ?? res;
    return { id: String(d?.id ?? '') };
  },

  async getMyTicketOrders(): Promise<any[]> {
    const res = await fetchApi<any>('/organizer/tickets/my', { requiresAuth: true });
    return toList(res);
  },

  async getTicketOrder(orderId: string): Promise<any> {
    const res = await fetchApi<any>(`/organizer/tickets/orders/${orderId}`, { requiresAuth: true });
    return res?.data ?? res;
  },

  async cancelTicketOrder(orderId: string): Promise<void> {
    await fetchApi(`/organizer/tickets/orders/${orderId}/cancel`, {
      method: 'POST',
      requiresAuth: true,
    });
  },

  // ── Organizer ──────────────────────────────────────────

  async getMyEvents(): Promise<OrganizerEvent[]> {
    const res = await fetchApi<any>('/organizer/events', { requiresAuth: true });
    return toList(res).map(normalizeEvent);
  },

  /** Event detail with sales, commission and per-tier breakdown. */
  async getEventSales(eventId: string): Promise<EventSales> {
    const res = await fetchApi<any>(`/organizer/events/${eventId}`, { requiresAuth: true });
    const d = res?.data ?? res;
    return {
      event: normalizeEvent(d?.event ?? {}),
      salesSummary: {
        totalTicketsSold: Number(d?.salesSummary?.totalTicketsSold ?? 0),
        totalCapacity: Number(d?.salesSummary?.totalCapacity ?? 0),
        totalRevenue: Number(d?.salesSummary?.totalRevenue ?? 0),
        totalCommission: Number(d?.salesSummary?.totalCommission ?? 0),
        totalPayout: Number(d?.salesSummary?.totalPayout ?? 0),
      },
      tierSummary: (d?.tierSummary ?? []).map((t: any) => ({
        tierId: String(t.tierId),
        tierName: t.tierName ?? '',
        price: Number(t.price ?? 0),
        totalSeats: Number(t.totalSeats ?? 0),
        bookedSeats: Number(t.bookedSeats ?? 0),
        remainingSeats: Number(t.remainingSeats ?? 0),
      })),
    };
  },

  /** At least one ticket tier is required — the API will not create an event without one. */
  async createEvent(input: {
    title: string;
    description: string;
    categoryIds: string[];
    venue: string;
    venueAddress: string;
    cities: string[];
    eventDate: string;
    startTime: string;
    endTime: string;
    totalCapacity: number;
    refundPolicy?: string;
    ticketTiers: NewTier[];
    banner?: { uri: string; name: string };
  }): Promise<{ id: string }> {
    const form = new FormData();
    form.append('title', input.title);
    form.append('description', input.description);
    form.append('venue', input.venue);
    form.append('venueAddress', input.venueAddress);
    form.append('eventDate', input.eventDate);
    form.append('startTime', input.startTime);
    form.append('endTime', input.endTime);
    form.append('totalCapacity', String(input.totalCapacity));
    form.append('categoryIds', JSON.stringify(input.categoryIds));
    form.append('cities', JSON.stringify(input.cities));
    form.append('ticketTiers', JSON.stringify(input.ticketTiers));
    if (input.refundPolicy) form.append('refundPolicy', input.refundPolicy);
    if (input.banner) {
      form.append('bannerImage', {
        uri: input.banner.uri, name: input.banner.name, type: 'image/jpeg',
      } as unknown as Blob);
    }

    const res = await fetchApi<any>('/organizer/events', {
      method: 'POST',
      requiresAuth: true,
      body: form,
    });
    const d = res?.data ?? res;
    return { id: String(d?.id ?? '') };
  },

  async addTier(eventId: string, tier: NewTier): Promise<void> {
    await fetchApi(`/organizer/events/${eventId}/tiers`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(tier),
    });
  },

  async updateTier(eventId: string, tierId: string, patch: Partial<NewTier>): Promise<void> {
    await fetchApi(`/organizer/events/${eventId}/tiers/${tierId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(patch),
    });
  },

  async getAttendees(eventId: string): Promise<any[]> {
    const res = await fetchApi<any>(`/organizer/events/${eventId}/attendees`, { requiresAuth: true });
    return toList(res);
  },

  /** Cancelling keeps the event and its orders; deleting removes it. */
  async cancelEvent(eventId: string): Promise<void> {
    await fetchApi(`/organizer/events/${eventId}/cancel`, { method: 'POST', requiresAuth: true });
  },

  async deleteEvent(eventId: string): Promise<void> {
    await fetchApi(`/organizer/events/${eventId}`, { method: 'DELETE', requiresAuth: true });
  },
};
