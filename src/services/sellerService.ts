import { fetchApi } from './api';

export interface SellerSetupInput {
  shopName: string;
  shopDescription?: string;
  gstNumber?: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
}

export const SellerService = {
  async setup(input: SellerSetupInput): Promise<void> {
    await fetchApi<any>('/sellers/setup', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(input),
    });
  },
};
