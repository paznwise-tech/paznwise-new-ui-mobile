import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReturnsService, type CreateReturnPayload } from '@/services/returnsService';

export const returnKeys = {
  all: ['returns'] as const,
  detail: (id: string) => ['returns', id] as const,
};

export function useMyReturns() {
  return useQuery({
    queryKey: returnKeys.all,
    queryFn: ReturnsService.getMyReturns,
  });
}

export function useReturnDetail(id: string) {
  return useQuery({
    queryKey: returnKeys.detail(id),
    queryFn: () => ReturnsService.getReturnById(id),
    enabled: !!id,
  });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => ReturnsService.createReturn(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      // A raised return changes what the order shows, so its cache is stale too.
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ReturnsService.cancelReturn(id),
    onSettled: (_d, _e, id) => {
      qc.invalidateQueries({ queryKey: returnKeys.all });
      qc.invalidateQueries({ queryKey: returnKeys.detail(id) });
    },
  });
}
