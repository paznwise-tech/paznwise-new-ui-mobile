import { fetchApi } from './api';

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactService = {
  async submit(input: ContactInput): Promise<void> {
    await fetchApi<any>('/api/contact', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify(input),
    });
  },
};
