import { fetchApi } from './api';

/** Delivery options — `GET /delivery-options`, behind `authenticate`. */

export interface DeliveryOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  /** Free-text like "3-5 business days", when the API supplies it. */
  estimatedDays?: string;
}

export const DeliveryOptionService = {
  async getOptions(): Promise<DeliveryOption[]> {
    try {
      const res = await fetchApi<any>('/delivery-options', { requiresAuth: true });
      const data = res?.data ?? res;
      const list: any[] = Array.isArray(data) ? data : (data?.options ?? data?.items ?? []);
      return list.map((o: any) => ({
        id: String(o.id ?? o._id ?? ''),
        name: o.name ?? o.title ?? 'Standard',
        description: o.description ?? undefined,
        price: Number(o.price ?? o.charge ?? o.amount ?? 0),
        estimatedDays: o.estimatedDays ?? o.deliveryTime ?? o.eta ?? undefined,
      }));
    } catch {
      // Delivery options are optional: checkout stays usable without them,
      // falling back to whatever shipping the server computes.
      return [];
    }
  },
};
