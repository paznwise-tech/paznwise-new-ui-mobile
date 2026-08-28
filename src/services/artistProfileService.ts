import { fetchApi } from './api';

/**
 * Artist onboarding — src/artist-profile/artistProfile.routes.js.
 *
 * Becoming an artist is a multi-step server-side process: create the
 * profile, pay the ₹499 registration fee, then submit for admin review.
 * Each step is recorded on the profile, so the flow is resumable — the
 * client reads /artist-profile/me and continues from wherever it stopped
 * rather than restarting.
 */

export type OnboardingStatus =
  | 'BASIC_INFO' | 'PORTFOLIO' | 'PAYMENT_SETUP' | 'ADMIN_REVIEW' | 'COMPLETED';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type ArtistPaymentStatus = 'NOT_SETUP' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface ArtistProfile {
  id: string;
  displayName: string;
  bio?: string | null;
  city?: string | null;
  artStyles?: string[];
  onboardingStatus: OnboardingStatus;
  verificationStatus: VerificationStatus;
  paymentStatus: ArtistPaymentStatus;
  rejectionReason?: string | null;
}

/**
 * What `POST /artist-profile/:id/payment` returns.
 *
 * The two branches differ in units: with Razorpay configured `amount` is
 * paise (49900); without it the same field is rupees (499). Only trust
 * `amount` when `razorpayOrderId` is present.
 */
export interface ArtistPaymentInit {
  profileId: string;
  paymentStatus: ArtistPaymentStatus;
  amount: number;
  currency: string;
  razorpayOrderId?: string | null;
  keyId?: string | null;
}

/** The registration fee, in rupees. Fixed server-side. */
export const REGISTRATION_FEE = 499;

function unwrap(res: any): any {
  return res?.data ?? res?.profile ?? res;
}

function normalizeProfile(d: any): ArtistProfile {
  return {
    id: String(d.id),
    displayName: d.displayName ?? '',
    bio: d.bio,
    city: d.city,
    artStyles: d.artStyles ?? [],
    onboardingStatus: (d.onboardingStatus ?? 'BASIC_INFO') as OnboardingStatus,
    verificationStatus: (d.verificationStatus ?? 'UNVERIFIED') as VerificationStatus,
    paymentStatus: (d.paymentStatus ?? 'NOT_SETUP') as ArtistPaymentStatus,
    rejectionReason: d.rejectionReason ?? d.adminNotes ?? null,
  };
}

export const ArtistProfileService = {
  /** The current user's artist profile, or null if they have not started one. */
  async getMyProfile(): Promise<ArtistProfile | null> {
    try {
      const res = await fetchApi<any>('/artist-profile/me', { requiresAuth: true });
      const data = unwrap(res);
      return data?.id ? normalizeProfile(data) : null;
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
    return normalizeProfile(unwrap(res));
  },

  async updateProfile(id: string, payload: Partial<ArtistProfile>): Promise<ArtistProfile> {
    const res = await fetchApi<any>(`/artist-profile/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return normalizeProfile(unwrap(res));
  },

  /** Creates the Razorpay order for the ₹499 registration fee. */
  async initiatePayment(id: string): Promise<ArtistPaymentInit> {
    const res = await fetchApi<any>(`/artist-profile/${id}/payment`, {
      method: 'POST',
      requiresAuth: true,
    });
    return unwrap(res) as ArtistPaymentInit;
  },

  async verifyPayment(
    id: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ): Promise<void> {
    await fetchApi(`/artist-profile/${id}/payment/verify`, {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
  },

  /**
   * Hands the profile to admin review.
   *
   * The server rejects this unless display name, bio, city, art styles are
   * all present AND payment is ACTIVE — so the UI must not offer it before
   * those hold, or the user gets an opaque failure.
   */
  async submitForReview(id: string): Promise<void> {
    await fetchApi(`/artist-profile/${id}/submit-for-review`, {
      method: 'POST',
      requiresAuth: true,
    });
  },
};

/** Everything the server requires before submit-for-review will succeed. */
export function isProfileComplete(p: ArtistProfile): boolean {
  return !!(
    p.displayName?.trim() &&
    p.bio?.trim() &&
    p.city?.trim() &&
    p.artStyles?.length &&
    p.paymentStatus === 'ACTIVE'
  );
}
