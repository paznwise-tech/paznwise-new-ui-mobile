// ─────────────────────────────────────────────────────────
// Paznwise Mobile — API client
//
// Single HTTP layer for the app. Mirrors the web client's public surface
// (`apiClient.get/post/put/patch/delete`) so hooks can be ported from
// paznwise-new-ui with no edits, and additionally exports `fetchApi` as a
// back-compat shim for the 25 existing service files.
//
// Responsibilities:
//   • Base URL from src/config/env (app.json → expo.extra)
//   • Bearer injection, with a public-path allowlist
//   • 401 → single-flight refresh → retry once
//   • 403 plan-limit → authEvents('plan-limit')
//   • 30s timeout, FormData passthrough, 204 → {}
//   • Request/response logging gated behind __DEV__
// ─────────────────────────────────────────────────────────

import { apiBaseUrl, isDev } from '@/config/env';
import { AuthStorage } from '@/services/authStorage';
import { clearAuthUserIdCache } from '@/services/currentUser';
import { authEvents } from './authEvents';

const BASE_URL = `${apiBaseUrl}/api`;

const TIMEOUT_MS = 30_000;

// ── Public routes (never receive an Authorization header) ─────────────
// Sending a stale/expired token to these makes the backend's auth
// middleware return 401 before the handler runs, which permanently
// breaks login and OTP after a session expires.
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/social',
  '/auth/send-otp',
  '/auth/resend-otp',
  '/auth/verify-otp',
  '/auth/check-availability',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(`${p}?`));
}

// ── Errors ───────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code: string;
  data: unknown;

  constructor(message: string, status: number, code: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function messageFromBody(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const b = body as { message?: string; error?: string };
    return b.message || b.error || `Request failed (${status})`;
  }
  if (typeof body === 'string' && body) return body;
  return `Request failed (${status})`;
}

// ── Token refresh (single-flight) ────────────────────────
//
// Deliberately uses raw fetch rather than AuthService.refreshTokens: that
// method calls fetchApi, which calls back into this module, and a refresh
// triggered by a 401 would recurse. Raw fetch keeps the cycle broken and
// guarantees the refresh request itself can never be retried.

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await AuthStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    // The API wraps most payloads as { success, data }, but not uniformly.
    const payload = json?.data ?? json;
    const accessToken: string | undefined = payload?.accessToken;
    if (!accessToken) return null;

    await AuthStorage.setAccessToken(accessToken);
    if (payload.refreshToken) await AuthStorage.setRefreshToken(payload.refreshToken);

    // The JWT subject drives messaging identity — it must be re-read.
    clearAuthUserIdCache();
    return accessToken;
  } catch {
    return null;
  }
}

/** Refreshes at most once concurrently; parallel 401s all await the same attempt. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function endSession(): Promise<void> {
  await AuthStorage.clearTokens();
  clearAuthUserIdCache();
  authEvents.emit('signed-out');
}

// ── Core request ─────────────────────────────────────────

export interface RequestConfig {
  method?: string;
  /** Plain object → JSON. FormData → passthrough. String → sent verbatim. */
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  /** Default true. Public paths never get a token regardless. */
  requiresAuth?: boolean;
  /** Explicit token override, e.g. the registrationToken during signup. */
  authToken?: string;
  signal?: AbortSignal;
}

async function request<T>(path: string, config: RequestConfig = {}, retried = false): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    params,
    requiresAuth = true,
    authToken,
    signal,
  } = config;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') qs.append(key, String(value));
    }
    const qsStr = qs.toString();
    if (qsStr) url += (url.includes('?') ? '&' : '?') + qsStr;
  }

  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };

  const isFormData = body instanceof FormData;
  if (!isFormData && body !== undefined && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  // Let fetch set the multipart boundary itself.
  if (isFormData) delete finalHeaders['Content-Type'];

  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  } else if (requiresAuth && !isPublicPath(path)) {
    const token = await AuthStorage.getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  // Body is already a string in the legacy services (they JSON.stringify at
  // the call site); plain objects come from the apiClient.* helpers.
  const payload =
    body === undefined
      ? undefined
      : isFormData || typeof body === 'string'
        ? (body as BodyInit)
        : JSON.stringify(body);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  // Honour a caller-supplied signal alongside the timeout.
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  if (isDev) console.log(`[API →] ${method} ${path}`);

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      signal: controller.signal,
    });

    if (res.status === 204) return {} as T;

    const contentType = res.headers.get('content-type');
    const isJson = contentType?.includes('application/json') ?? false;
    const text = await res.text();
    const data: unknown = isJson && text ? JSON.parse(text) : text || {};

    if (!res.ok) {
      // 401 on a protected path: try exactly one silent refresh + replay.
      // `retried` makes a second 401 terminal, so this can never loop.
      if (res.status === 401 && !isPublicPath(path) && !retried && !authToken) {
        const newToken = await refreshAccessToken();
        if (newToken) return request<T>(path, config, true);
        await endSession();
      }

      const message = messageFromBody(data, res.status);

      // Plan-limit errors come back as 403 with no dedicated code, so match
      // the wording the backend's subscriptionLimits.js always uses.
      if (res.status === 403 && /limit (exceeded|reached)/i.test(message)) {
        authEvents.emit('plan-limit', message);
      }

      if (isDev) {
        console.log(`[API ✗] ${method} ${path} → ${res.status}`);
        console.log(JSON.stringify(data, null, 2));
      }

      throw new ApiError(message, res.status, String(res.status), data);
    }

    if (isDev) {
      console.log(`[API ✓] ${method} ${path} → ${res.status}`);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      if (isDev) console.warn(`[API ⏱] ${method} ${path}`);
      throw new ApiError(
        'Request timed out. Please check your connection and try again.',
        0,
        'TIMEOUT',
      );
    }
    if (!(error instanceof ApiError) && isDev) {
      console.warn(`[API 💥] ${method} ${path}:`, error?.message ?? error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

// ── Public surface ───────────────────────────────────────

type BodylessConfig = Omit<RequestConfig, 'method' | 'body'>;

export const apiClient = {
  get: <T>(path: string, config?: BodylessConfig) => request<T>(path, { ...config, method: 'GET' }),

  post: <T>(path: string, body?: unknown, config?: BodylessConfig) =>
    request<T>(path, { ...config, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, config?: BodylessConfig) =>
    request<T>(path, { ...config, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, config?: BodylessConfig) =>
    request<T>(path, { ...config, method: 'PATCH', body }),

  delete: <T>(path: string, body?: unknown, config?: BodylessConfig) =>
    request<T>(path, { ...config, method: 'DELETE', body }),
};

/**
 * Back-compat shim for the existing service files, which call
 * `fetchApi(endpoint, { method, requiresAuth, authToken, body })` with an
 * already-stringified body. New code should use `apiClient` instead.
 */
export function fetchApi<T>(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean; authToken?: string } = {},
): Promise<T> {
  const { method, body, headers, signal, requiresAuth, authToken } = options;
  return request<T>(endpoint, {
    method: method ?? 'GET',
    body: body ?? undefined,
    headers: headers as Record<string, string> | undefined,
    signal: signal ?? undefined,
    requiresAuth,
    authToken,
  });
}
