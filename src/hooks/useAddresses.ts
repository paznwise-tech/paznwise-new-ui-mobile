import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressService } from '@/services/addressService';
import type { AddressPayload } from '@/types';

export const addressKeys = {
  all: ['addresses'] as const,
};

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: addressKeys.all,
    queryFn: addressService.getAddresses,
    enabled,
  });
}

function useAddressMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Setting one address as default clears the flag on the others
    // server-side, so the whole list is refetched rather than patched.
    onSettled: () => qc.invalidateQueries({ queryKey: addressKeys.all }),
  });
}

export function useAddAddress() {
  return useAddressMutation((payload: AddressPayload) => addressService.addAddress(payload));
}

export function useUpdateAddress() {
  return useAddressMutation(({ id, payload }: { id: string; payload: AddressPayload }) =>
    addressService.updateAddress(id, payload),
  );
}

export function useDeleteAddress() {
  return useAddressMutation(({ id }: { id: string }) => addressService.deleteAddress(id));
}
