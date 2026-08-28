import RazorpayCheckout, { type RazorpayError } from 'react-native-razorpay';
import { Colors } from '@/constants/theme';

/**
 * Razorpay checkout, normalized.
 *
 * The native SDK rejects its promise for BOTH user cancellation and real
 * payment failure — unlike the web SDK, which separates `ondismiss` from
 * `payment.failed`. Every call site would otherwise have to re-derive that
 * distinction, and getting it wrong means reporting "payment failed" to
 * someone who simply backed out. This module is the one place that decides.
 */

export interface RazorpayOrderInit {
  razorpayOrderId: string;
  keyId: string;
  /** Integer paise. Callers converting from rupees must round. */
  amountPaise: number;
  currency?: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export type RazorpayResult =
  | { status: 'success'; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  | { status: 'cancelled' }
  | { status: 'failed'; code?: number | string; description?: string };

/**
 * Razorpay's cancellation code differs between platforms and SDK versions
 * (Android's Checkout.PAYMENT_CANCELED is 2; iOS has reported 0 and 2), and
 * react-native-razorpay does not re-map them. Matching the code *or* the
 * description keeps a back-press classified as a cancellation rather than
 * surfacing as a payment failure the user has to worry about.
 */
function isCancellation(err: RazorpayError): boolean {
  const code = typeof err?.code === 'string' ? Number(err.code) : err?.code;
  if (code === 2) return true;
  return /cancel/i.test(String(err?.description ?? ''));
}

export async function startRazorpayCheckout(init: RazorpayOrderInit): Promise<RazorpayResult> {
  try {
    const data = await RazorpayCheckout.open({
      key: init.keyId,
      amount: Math.round(init.amountPaise),
      currency: init.currency ?? 'INR',
      name: 'Paznwise',
      description: init.description,
      order_id: init.razorpayOrderId,
      prefill: init.prefill,
      theme: { color: Colors.gold },
    });

    return {
      status: 'success',
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_order_id: data.razorpay_order_id,
      razorpay_signature: data.razorpay_signature,
    };
  } catch (e) {
    const err = (e ?? {}) as RazorpayError;
    if (isCancellation(err)) return { status: 'cancelled' };
    return { status: 'failed', code: err.code, description: err.description };
  }
}

/** Rupees → integer paise, the only unit Razorpay accepts. */
export function toPaise(rupees: number | string): number {
  return Math.round(Number(rupees) * 100);
}
