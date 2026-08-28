/**
 * react-native-razorpay ships no type declarations.
 *
 * Only the surface the app uses is declared. Note that `open` REJECTS on
 * both user cancellation and gateway failure — there is no separate
 * dismiss callback like the web SDK's — which is why every call goes
 * through src/payments/razorpay.ts rather than being used directly.
 */
declare module 'react-native-razorpay' {
  export interface RazorpayOptions {
    key: string;
    /** Integer paise. Razorpay rejects a float. */
    amount: number;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    order_id: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    notes?: Record<string, string>;
  }

  export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayError {
    code?: number | string;
    description?: string;
    /** Present on some failures as a JSON string of the gateway payload. */
    error?: unknown;
  }

  const RazorpayCheckout: {
    open(options: RazorpayOptions): Promise<RazorpaySuccess>;
    onExternalWalletSelection(cb: (data: unknown) => void): void;
  };

  export default RazorpayCheckout;
}
