import { fetchApi } from './api';
import { ApiResponse } from '@/types';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  provider?: string;
  isVerified: boolean;
  isActive?: boolean;
  // Extended profile fields (populated after login)
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  isArtist?: boolean;
  isPerformer?: boolean;
  location?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

// Smart-routing response from verify-otp
export type VerifyOtpResponse =
  | { isNewUser: false; user: AuthUser; accessToken: string; refreshToken?: string }
  | { isNewUser: true; registrationToken: string };

export const AuthService = {
  /** Send OTP — phone number (10-digit or E.164 e.g. +919876543210) */
  async sendOtp(phone: string): Promise<{ message: string; otp?: string }> {
    // API response has no `data` wrapper: { success, message, otp? }
    const res = await fetchApi<{ success: boolean; message: string; otp?: string }>('/auth/send-otp', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ phone }),
    });
    return { message: res.message, otp: res.otp };
  },

  /**
   * Verify OTP — smart routing:
   * - Existing user → { isNewUser: false, user, accessToken, refreshToken }
   * - New user     → { isNewUser: true, registrationToken }
   */
  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const res = await fetchApi<ApiResponse<VerifyOtpResponse>>('/auth/verify-otp', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ phone, otp }),
    });
    return res.data;
  },

  /**
   * Complete registration for new users.
   * Requires registrationToken (from verify-otp PATH B) as Bearer.
   */
  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
    registrationToken: string,
  ): Promise<LoginResponse> {
    const res = await fetchApi<ApiResponse<LoginResponse>>('/auth/signup', {
      method: 'POST',
      requiresAuth: false,
      authToken: registrationToken,
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
    return res.data;
  },

  /** Password-based login (email / phone / username) */
  async login(identifier: string, password: string): Promise<LoginResponse> {
    const res = await fetchApi<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ identifier, password }),
    });
    return res.data;
  },

  /** Sends a JWT reset link to the user's email */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetchApi<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ email }),
    });
    return { message: res.message };
  },

  /** Resets password using the JWT token from the reset email */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetchApi<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ token, newPassword }),
    });
    return { message: res.message };
  },

  /** Revokes the server session — call before clearing local tokens */
  async logoutApi(refreshToken: string): Promise<void> {
    await fetchApi('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ refreshToken }),
    });
  },

  /** Token rotation — exchange a refresh token for new access + refresh tokens */
  async refreshTokens(refreshToken: string): Promise<LoginResponse> {
    const res = await fetchApi<ApiResponse<LoginResponse>>('/auth/refresh', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ refreshToken }),
    });
    return res.data;
  },

  /**
   * Deletes the signed-in user's account.
   *
   * `DELETE /users/me` does not exist — the account lives behind the
   * profile resource.
   */
  /**
   * Signs in with an OAuth provider's token.
   *
   * The provider token is exchanged server-side; nothing here trusts it
   * locally.
   */
  async socialLogin(
    provider: 'google' | 'facebook' | 'apple',
    token: string,
    name?: string,
  ): Promise<LoginResponse> {
    const res = await fetchApi<ApiResponse<LoginResponse>>('/auth/social', {
      method: 'POST',
      requiresAuth: false,
      body: JSON.stringify({ provider, token, name }),
    });
    return res.data;
  },

  /**
   * Switches the session's active role.
   *
   * Returns a NEW access token carrying the new role — storing it is not
   * optional, or the session keeps acting as the previous role. The server
   * rejects a role the user does not actually hold, and its message names
   * which, so no client-side list of available roles is invented here.
   */
  async switchRole(role: 'BUYER' | 'ARTIST' | 'ORGANIZER'): Promise<{ accessToken: string }> {
    const res = await fetchApi<any>('/auth/switch-role', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify({ role }),
    });
    const d = res?.data ?? res;
    if (!d?.accessToken) throw new Error('Role switch did not return a new session token.');
    return { accessToken: d.accessToken };
  },

  async deleteAccount(): Promise<void> {
    await fetchApi<any>('/user/profile', {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};
