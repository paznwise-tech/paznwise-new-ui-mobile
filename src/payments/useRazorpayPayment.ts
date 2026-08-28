import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { startRazorpayCheckout, type RazorpayOrderInit, type RazorpayResult } from './razorpay';

type SuccessResult = Extract<RazorpayResult, { status: 'success' }>;

export interface RazorpayFlow<TResult> {
  /**
   * Creates the order server-side. Return null when nothing is payable —
   * a free event, a zero-total order — so the gateway is skipped entirely.
   */
  createOrder: () => Promise<(RazorpayOrderInit & { internalId?: string }) | null>;
  /** Called only after a successful payment; must verify the signature server-side. */
  verify: (payment: SuccessResult, internalId?: string) => Promise<TResult>;
  /** Settles the free path when createOrder returns null. */
  onFree?: () => Promise<TResult>;
  onSuccess: (result: TResult) => void;
  /** Caches to refresh once the payment lands (cart, orders, bookings). */
  invalidate?: QueryKey[];
}

/**
 * Drives the create → pay → verify sequence shared by every paid flow:
 * cart checkout, event tickets, performer bookings and the artist
 * registration fee.
 *
 * The API exposes two shapes for this — an explicit create-order endpoint
 * for the cart, and an order returned inline from the domain POST for the
 * others — so `createOrder` is supplied by the caller and everything after
 * it is identical.
 */
export function useRazorpayPayment<TResult>({
  createOrder,
  verify,
  onFree,
  onSuccess,
  invalidate,
}: RazorpayFlow<TResult>) {
  const [processing, setProcessing] = useState(false);
  const qc = useQueryClient();

  const settle = useCallback(
    (result: TResult) => {
      invalidate?.forEach(key => qc.invalidateQueries({ queryKey: key }));
      onSuccess(result);
    },
    [invalidate, onSuccess, qc],
  );

  const pay = useCallback(async () => {
    if (processing) return;
    setProcessing(true);

    try {
      const init = await createOrder();

      // Nothing to pay for — settle without opening the gateway.
      if (!init || !init.razorpayOrderId || !init.keyId) {
        if (onFree) settle(await onFree());
        return;
      }

      const payment = await startRazorpayCheckout(init);

      if (payment.status === 'cancelled') {
        Alert.alert('Payment cancelled', 'You have not been charged.');
        return;
      }

      if (payment.status === 'failed') {
        Alert.alert('Payment failed', payment.description ?? 'Please try again.');
        return;
      }

      try {
        settle(await verify(payment, init.internalId));
      } catch (e: any) {
        // The money has left the customer's account but the order is not
        // confirmed. The payment id is the only handle support has to
        // reconcile or refund it, so it must reach the user.
        Alert.alert(
          'Payment received, confirmation pending',
          `Your payment went through but we could not confirm the order.\n\n` +
            `Payment ID: ${payment.razorpay_payment_id}\n\n` +
            `Please contact support with this ID — do not pay again.`,
        );
      }
    } catch (e: any) {
      Alert.alert('Could not start payment', e?.message ?? 'Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [processing, createOrder, verify, onFree, settle]);

  return { pay, processing };
}
