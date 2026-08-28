import { fetchApi, MEDIA_BASE_URL } from './api';
import { Performer } from '@/types';
import { ApiResponse } from '@/types';

export interface ApiArtistService {
  id: string;
  title?: string;
  description?: string;
  basePrice?: string | number;
  currency?: string;
  pricingType?: string;
  sampleWorkUrls?: string[];
  rating?: number | null;
  reviewsCount?: number;
  artist?: {
    id?: string;
    name?: string | null;
    picture?: string | null;
    username?: string | null;
  };
  categories?: Array<{
    id?: string;
    name?: string | null;
    iconUrl?: string | null;
  }>;
}

interface ServiceListResponse {
  success: boolean;
  data: ApiArtistService[] | { services?: ApiArtistService[]; items?: ApiArtistService[] };
  count?: number;
}

const VIDEO_HOST_RE = /(youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.mov|\.webm)/i;

function toAbsolute(url: string): string {
  if (url.startsWith('http')) return url;
  return `${MEDIA_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Distinct initials-avatar per performer when no real image exists —
// avoids every card showing the same stock placeholder.
function fallbackAvatar(name: string): string {
  const initials = encodeURIComponent(name.trim() || 'Artist');
  return `https://ui-avatars.com/api/?name=${initials}&size=400&background=1C2F45&color=E8C15F&bold=true`;
}

// Prefer a real sample-work image, then the artist avatar, then category icon.
function resolveServiceImage(s: ApiArtistService, name: string): string {
  const sample = s.sampleWorkUrls?.find(u => u && !VIDEO_HOST_RE.test(u));
  const src = sample ?? s.artist?.picture ?? s.categories?.[0]?.iconUrl;
  return src ? toAbsolute(src) : fallbackAvatar(name);
}

function resolvePrice(s: ApiArtistService): string {
  const type = (s.pricingType ?? '').toUpperCase();
  if (type === 'CUSTOM_QUOTE') return 'Custom Quote';
  const raw = typeof s.basePrice === 'string' ? parseFloat(s.basePrice) : s.basePrice;
  if (!raw || isNaN(raw)) return 'Contact';
  const amount = `₹${raw.toLocaleString('en-IN')}`;
  return type === 'FIXED' ? amount : `${amount}+`;
}

function normalizeService(s: ApiArtistService, idx: number): Performer & { serviceId: string } {
  const name = s.artist?.name ?? s.artist?.username ?? s.title ?? 'Artist';
  return {
    serviceId: s.id,
    id: idx + 1,
    name,
    type:    s.categories?.[0]?.name ?? s.title ?? 'Artist',
    price:   resolvePrice(s),
    rating:  s.rating ?? 4.5,
    reviews: s.reviewsCount ?? 0,
    img:     resolveServiceImage(s, name),
  };
}

export interface ArtistSlot {
  id: string;
  date: string;
  /** "HH:MM", the format the server's pattern requires. */
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringDays: number[];
  maxBookings: number;
  bookedCount: number;
  isBlocked: boolean;
}

export interface NewArtistSlot {
  date: string;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  recurringDays?: number[];
  maxBookings?: number;
}

function normalizeSlot(s: any): ArtistSlot {
  return {
    id: String(s.id),
    date: s.date,
    startTime: s.startTime ?? '',
    endTime: s.endTime ?? '',
    isRecurring: !!s.isRecurring,
    recurringDays: s.recurringDays ?? [],
    maxBookings: Number(s.maxBookings ?? 1),
    bookedCount: Number(s.bookedCount ?? 0),
    isBlocked: !!s.isBlocked,
  };
}

export const ArtistServiceApi = {
  async getServices(params?: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<Array<Performer & { serviceId: string }>> {
    const q = new URLSearchParams();
    if (params?.page)                                               q.append('page', String(params.page));
    if (params?.limit)                                              q.append('limit', String(params.limit));
    if (params?.category && params.category !== 'All')              q.append('category', params.category);

    const qs = q.toString();
    const res = await fetchApi<ServiceListResponse>(`/artist-services${qs ? `?${qs}` : ''}`, {
      requiresAuth: false,
    });

    let list: ApiArtistService[] = [];
    if (Array.isArray(res.data)) {
      list = res.data;
    } else if (res.data && typeof res.data === 'object') {
      const d = res.data as any;
      list = d.services ?? d.items ?? [];
    }
    return list.map(normalizeService);
  },

  async getServiceById(id: string): Promise<(Performer & { serviceId: string }) | null> {
    try {
      const res = await fetchApi<ApiResponse<ApiArtistService>>(`/artist-services/${id}`, {
        requiresAuth: false,
      });
      return normalizeService(res.data, 0);
    } catch {
      return null;
    }
  },

  // ── Artist-side service management ─────────────────────

  /** The signed-in artist's own services. */
  async getMyServices(): Promise<ApiArtistService[]> {
    const res = await fetchApi<any>('/artist-services/my', { requiresAuth: true });
    const d = res?.data ?? res;
    return Array.isArray(d) ? d : (d?.services ?? d?.items ?? []);
  },

  /**
   * Creates a bookable service.
   *
   * `timeSlots` is required with at least one entry — the API will not
   * create a service nobody can book. `serviceLocations` accepts exactly
   * one value, not several.
   *
   * Sent as multipart because cover images are file uploads.
   */
  async createService(input: {
    title: string;
    description: string;
    categoryIds: string[];
    pricingType: 'HOURLY' | 'PER_SESSION' | 'FIXED' | 'CUSTOM_QUOTE';
    basePrice: number;
    serviceLocation: 'HOME_VISIT' | 'VENUE';
    cities?: string[];
    venueAddress?: string;
    serviceRadius?: string;
    timeSlots: NewArtistSlot[];
    coverImages?: Array<{ uri: string; name: string }>;
  }): Promise<{ id: string }> {
    const form = new FormData();
    form.append('title', input.title);
    form.append('description', input.description);
    form.append('pricingType', input.pricingType);
    form.append('basePrice', String(input.basePrice));
    // Arrays go as JSON strings; the server's parseFormDataArrays accepts
    // either that or a comma-separated list.
    form.append('categoryIds', JSON.stringify(input.categoryIds));
    form.append('serviceLocations', JSON.stringify([input.serviceLocation]));
    form.append('cities', JSON.stringify(input.cities ?? []));
    form.append('timeSlots', JSON.stringify(input.timeSlots));
    if (input.venueAddress) form.append('venueAddress', input.venueAddress);
    if (input.serviceRadius) form.append('serviceRadius', input.serviceRadius);

    for (const img of input.coverImages ?? []) {
      form.append('coverImages', { uri: img.uri, name: img.name, type: 'image/jpeg' } as unknown as Blob);
    }

    const res = await fetchApi<any>('/artist-services', {
      method: 'POST',
      requiresAuth: true,
      body: form,
    });
    const d = res?.data ?? res;
    return { id: String(d?.id ?? '') };
  },

  async deleteService(serviceId: string): Promise<void> {
    await fetchApi(`/artist-services/${serviceId}`, { method: 'DELETE', requiresAuth: true });
  },

  /**
   * Availability slots for one service.
   *
   * There is no `/artist-services/availability` endpoint — slots hang off a
   * service. The previous call to `PUT /artist-services/availability`
   * matched `PUT /:serviceId`, so it was served as an attempt to update a
   * service with the id "availability".
   */
  async getSlots(serviceId: string): Promise<ArtistSlot[]> {
    const res = await fetchApi<any>(`/artist-services/${serviceId}/slots`, { requiresAuth: false });
    const d = res?.data ?? res;
    const list: any[] = Array.isArray(d) ? d : (d?.slots ?? d?.items ?? []);
    return list.map(normalizeSlot);
  },

  /** Creates one slot or several; the server accepts either shape. */
  async addSlots(serviceId: string, slots: NewArtistSlot[]): Promise<void> {
    await fetchApi(`/artist-services/${serviceId}/slots`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(slots.length === 1 ? slots[0] : slots),
    });
  },

  async updateSlot(serviceId: string, slotId: string, patch: Partial<NewArtistSlot>): Promise<void> {
    await fetchApi(`/artist-services/${serviceId}/slots/${slotId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(patch),
    });
  },

  async deleteSlot(serviceId: string, slotId: string): Promise<void> {
    await fetchApi(`/artist-services/${serviceId}/slots/${slotId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
