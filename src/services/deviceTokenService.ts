import { fetchApi } from './api';

/** Device push tokens — src/device-token/deviceToken.routes.js. */

export type DevicePlatform = 'ANDROID' | 'IOS' | 'WEB';

export interface RegisteredDevice {
  id: string;
  platform: DevicePlatform;
  deviceId?: string | null;
  appVersion?: string | null;
  lastSeenAt: string;
}

export const DeviceTokenService = {
  /**
   * Registers this device for push.
   *
   * Idempotent server-side, so it is safe to call on every sign-in and on
   * token rotation without tracking whether it has been sent before.
   */
  async register(payload: {
    token: string;
    platform: DevicePlatform;
    deviceId?: string;
    appVersion?: string;
  }): Promise<void> {
    await fetchApi('/device-tokens', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
  },

  /** Called before tokens are cleared on sign-out. */
  async unregister(token: string): Promise<void> {
    await fetchApi(`/device-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  async listDevices(): Promise<RegisteredDevice[]> {
    const res = await fetchApi<any>('/device-tokens', { requiresAuth: true });
    const d = res?.data ?? res;
    return Array.isArray(d) ? d : [];
  },
};
