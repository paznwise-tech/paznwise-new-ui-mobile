import { fetchApi } from './api';
import type { Address, AddressPayload, ApiResponse } from '../types';

export const addressService = {
  /**
   * Get all saved addresses of the authenticated user
   */
  async getAddresses(): Promise<Address[]> {
    const res = await fetchApi<ApiResponse<Address[]> | Address[]>('/addresses', {
      requiresAuth: true,
    });
    if (Array.isArray(res)) return res;
    return (res as ApiResponse<Address[]>).data || [];
  },

  /**
   * Add a new shipping/billing address
   */
  async addAddress(payload: AddressPayload): Promise<Address> {
    const res = await fetchApi<ApiResponse<Address>>('/addresses', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return res.data || (res as any);
  },

  /**
   * Update an existing address
   */
  async updateAddress(id: string | number, payload: AddressPayload): Promise<Address> {
    const res = await fetchApi<ApiResponse<Address>>(`/addresses/${id}`, {
      method: 'PUT',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return res.data || (res as any);
  },

  /**
   * Delete an address
   */
  async deleteAddress(id: string | number): Promise<void> {
    await fetchApi(`/addresses/${id}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
