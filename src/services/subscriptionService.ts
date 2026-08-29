import { fetchApi } from './api';

/**
 * Subscriptions — src/subscription/subscription.router.js.
 *
 * `POST /subscriptions/subscribe` follows the same shape as event and
 * performer bookings: a free plan activates immediately, a paid one comes
 * back with `requiresPayment` and Razorpay order details, and the plan is
 * only granted once `POST /subscriptions/verify` confirms the signature.
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

/** Outcome of opening a subscription purchase. */
export interface SubscribeResult {
  /** False when the plan is free and already active. */
  requiresPayment: boolean;
  razorpayOrderId?: string;
  keyId?: string;
  amountPaise?: number;
  planName?: string;
}

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

  /**
   * Opens a subscription purchase.
   *
   * A free plan is already active when this resolves. A paid plan returns
   * the Razorpay details to hand to the checkout sheet.
   */
  async subscribe(
    planId: string,
    paymentMethod: SubscriptionPaymentMethod,
  ): Promise<SubscribeResult> {
    const res = await fetchApi<any>('/subscriptions/subscribe', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ planId, paymentMethod }),
    });
    const d = res?.data ?? res ?? {};
    return {
      requiresPayment: !!d.requiresPayment,
      razorpayOrderId: d.razorpayOrderId ?? undefined,
      keyId: d.keyId ?? undefined,
      // The API returns paise here, matching what Razorpay itself returns.
      amountPaise: typeof d.amount === 'number' ? d.amount : undefined,
      planName: d.planName ?? undefined,
    };
  },

  /** Confirms a plan payment. The server takes the plan from its own record. */
  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<void> {
    await fetchApi('/subscriptions/verify', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
  },

  async cancel(): Promise<void> {
    await fetchApi('/subscriptions/cancel', { method: 'POST', requiresAuth: true });
  },
};
