import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService, type SubscriptionPaymentMethod } from '@/services/subscriptionService';

export const subscriptionKeys = {
  plans: ['subscription-plans'] as const,
  mine: ['my-subscription'] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans,
    queryFn: SubscriptionService.getPlans,
    staleTime: 30 * 60_000,
  });
}

export function useMySubscription(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: SubscriptionService.getMySubscription,
    enabled,
  });
}

// `useSubscribe` was removed with the payment rewrite. Subscribing is no
// longer a single mutation: `subscribe` now only opens the purchase, and a
// paid plan is not active until `verifyPayment` succeeds. A hook that
// resolved on the first call would report success before payment.
// See `useRazorpayPayment` in app/subscription/index.tsx.

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SubscriptionService.cancel(),
    onSettled: () => qc.invalidateQueries({ queryKey: subscriptionKeys.mine }),
  });
}
