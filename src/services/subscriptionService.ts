import { fetchApi } from './api';

/**
 * Subscriptions — src/subscription/subscription.router.js.
 *
 * Note: `POST /subscriptions/subscribe` records the subscription directly.
 * Unlike orders, event tickets and performer bookings, the API creates no
 * payment order for a plan, so nothing here can take money — the plan is
 * activated on the server's word alone.
 */

export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  tier: string;
  billingCycle: BillingCycle;
  durationDays: number;
  postLimit: number;
  productLimit: number;
  eventLimit: number;
  organizerEventLimit: number;
  commissionPercent: number;
  artworkRentalEligible?: boolean;
  merchandiseLicensingEligible?: boolean;
  galleryExhibitionEligible?: boolean;
  finePrintsEligible?: boolean;
}

export interface UsageMeter {
  limit: number;
  used: number;
  remaining: number;
}

/** The five quotas the server tracks per cycle. */
export interface SubscriptionLimits {
  posts: UsageMeter;
  products: UsageMeter;
  events: UsageMeter;
  serviceListings: UsageMeter;
  eventListings: UsageMeter;
}

export interface MySubscription {
  subscription: {
    planName: string;
    price: number;
    commissionPercent: number;
    startDate?: string;
    endDate?: string;
    status: string;
  };
  limits: SubscriptionLimits;
  plan?: { name: string; tier: string } & Record<string, unknown>;
}

/** What POST /subscriptions/subscribe accepts. */
export type SubscriptionPaymentMethod = 'CARD' | 'UPI' | 'WALLET';

/** Human labels for the quota keys, in the order they are shown. */
export const LIMIT_LABELS: Array<{ key: keyof SubscriptionLimits; label: string }> = [
  { key: 'posts', label: 'Posts' },
  { key: 'products', label: 'Products' },
  { key: 'serviceListings', label: 'Performer services' },
  { key: 'events', label: 'Events' },
  { key: 'eventListings', label: 'Organizer events' },
];

function normalizePlan(p: any): SubscriptionPlan {
  return {
    id: String(p.id),
    name: p.name ?? '',
    price: Number(p.price ?? 0),
    tier: p.tier ?? 'FREE',
    billingCycle: (p.billingCycle ?? 'MONTHLY') as BillingCycle,
    durationDays: Number(p.durationDays ?? 30),
    postLimit: Number(p.postLimit ?? 0),
    productLimit: Number(p.productLimit ?? 0),
    eventLimit: Number(p.eventLimit ?? 0),
    organizerEventLimit: Number(p.organizerEventLimit ?? 0),
    commissionPercent: Number(p.commissionPercent ?? 0),
    artworkRentalEligible: p.artworkRentalEligible,
    merchandiseLicensingEligible: p.merchandiseLicensingEligible,
    galleryExhibitionEligible: p.galleryExhibitionEligible,
    finePrintsEligible: p.finePrintsEligible,
  };
}

export const SubscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const res = await fetchApi<any>('/subscriptions/plans', { requiresAuth: false });
    const data = res?.data ?? res;
    const list: any[] = Array.isArray(data) ? data : (data?.plans ?? data?.items ?? []);
    return list.map(normalizePlan);
  },

  async getMySubscription(): Promise<MySubscription | null> {
    try {
      const res = await fetchApi<any>('/subscriptions/my-subscription', { requiresAuth: true });
      return (res?.data ?? res) as MySubscription;
    } catch {
      return null;
    }
  },

  async subscribe(planId: string, paymentMethod: SubscriptionPaymentMethod): Promise<void> {
    await fetchApi('/subscriptions/subscribe', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ planId, paymentMethod }),
    });
  },

  async cancel(): Promise<void> {
    await fetchApi('/subscriptions/cancel', { method: 'POST', requiresAuth: true });
  },
};
