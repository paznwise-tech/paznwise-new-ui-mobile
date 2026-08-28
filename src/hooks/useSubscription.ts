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

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, paymentMethod }: { planId: string; paymentMethod: SubscriptionPaymentMethod }) =>
      SubscriptionService.subscribe(planId, paymentMethod),
    onSuccess: () => {
      // New quotas take effect immediately, so anything that was blocked by
      // the old plan needs to stop being blocked without an app restart.
      qc.invalidateQueries({ queryKey: subscriptionKeys.mine });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SubscriptionService.cancel(),
    onSettled: () => qc.invalidateQueries({ queryKey: subscriptionKeys.mine }),
  });
}
