import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CartService, type CartLine } from '@/services/cartService';

export const cartKeys = {
  all: ['cart'] as const,
};

/**
 * The cart is read on several screens at once (the cart itself, the tab
 * badge, product detail) and mutated from all of them. Sharing one cache
 * entry is what keeps those in step — the previous in-memory context could
 * only do that by holding the whole cart in React state.
 */
export function useCart(enabled = true) {
  return useQuery({
    queryKey: cartKeys.all,
    queryFn: CartService.getCart,
    enabled,
  });
}

function useCartMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // The server owns quantity, stock clamping and price, so the response is
    // authoritative — refetch rather than patch the cache by hand.
    onSettled: () => qc.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

export function useAddToCart() {
  return useCartMutation(({ productId, quantity = 1 }: { productId: string; quantity?: number }) =>
    CartService.addToCart(productId, quantity),
  );
}

export function useUpdateCartQuantity() {
  return useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) =>
    CartService.updateQuantity(itemId, quantity),
  );
}

export function useRemoveCartItem() {
  return useCartMutation(({ itemId }: { itemId: string }) => CartService.removeItem(itemId));
}

export function useClearCart() {
  return useCartMutation(() => CartService.clearCart());
}

/** Re-reads the cart without mutating it — for when the server changed it. */
export function useRefreshCart() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: cartKeys.all });
}

export function cartTotal(lines: CartLine[] | undefined): number {
  return (lines ?? []).reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function cartCount(lines: CartLine[] | undefined): number {
  return (lines ?? []).reduce((sum, l) => sum + l.quantity, 0);
}
