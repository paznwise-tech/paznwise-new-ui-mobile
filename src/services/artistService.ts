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
    const res = await fetchApi<ServiceListResponse>(`/api/artist-services${qs ? `?${qs}` : ''}`, {
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
      const res = await fetchApi<ApiResponse<ApiArtistService>>(`/api/artist-services/${id}`, {
        requiresAuth: false,
      });
      return normalizeService(res.data, 0);
    } catch {
      return null;
    }
  },

  async setAvailability(blockedDates: string[], availableTimeSlots: string[]): Promise<void> {
    await fetchApi<any>('/api/artist-services/availability', {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify({ blockedDates, availableTimeSlots }),
    });
  },
};
