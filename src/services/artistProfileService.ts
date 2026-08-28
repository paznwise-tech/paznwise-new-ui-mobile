import { fetchApi } from './api';

/**
 * Artist onboarding — src/artist-profile/artistProfile.routes.js.
 *
 * Becoming an artist is a multi-step server-side process: create the
 * profile, pay the registration fee, then submit for admin review. Only
 * the first step is wired today; payment and review are pending.
 */

export interface ArtistProfile {
  id: string;
  displayName: string;
  bio?: string;
  city?: string;
  artStyles?: string[];
  /** e.g. DRAFT | PAYMENT_PENDING | UNDER_REVIEW | APPROVED | REJECTED */
  status?: string;
  isPaid?: boolean;
}

function unwrap(res: any): any {
  return res?.data ?? res?.profile ?? res;
}

export const ArtistProfileService = {
  /** The current user's artist profile, or null if they have not started one. */
  async getMyProfile(): Promise<ArtistProfile | null> {
    try {
      const res = await fetchApi<any>('/artist-profile/me', { requiresAuth: true });
      const data = unwrap(res);
      return data?.id ? (data as ArtistProfile) : null;
    } catch {
      return null;
    }
  },

  async createProfile(payload: {
    displayName: string;
    bio?: string;
    city?: string;
    artStyles?: string[];
  }): Promise<ArtistProfile> {
    const res = await fetchApi<any>('/artist-profile', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return unwrap(res) as ArtistProfile;
  },

  async updateProfile(id: string, payload: Partial<ArtistProfile>): Promise<ArtistProfile> {
    const res = await fetchApi<any>(`/artist-profile/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return unwrap(res) as ArtistProfile;
  },

  async submitForReview(id: string): Promise<void> {
    await fetchApi(`/artist-profile/${id}/submit-for-review`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};
