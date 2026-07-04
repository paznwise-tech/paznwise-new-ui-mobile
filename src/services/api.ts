import { AuthStorage } from './authStorage';

// Base URL for the API
export const API_BASE_URL = 'https://paznwise.gujberry.com';

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  authToken?: string; // explicit token override (e.g. registrationToken for signup)
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requiresAuth = true, authToken, headers, ...restOptions } = options;

  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json');
  }

  if (!(options.body instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (authToken) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  } else if (requiresAuth) {
    const token = await AuthStorage.getAccessToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('API call requires auth but no token found in storage.');
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'object' && data !== null
          ? data.message || data.error || `Request failed (${response.status})`
          : (data as string) || `Request failed (${response.status})`;
      const error: any = new Error(message);
      error.status = response.status;
      error.data = data;

      console.log(`\n[API Error Response] ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));

      throw error;
    }

    console.log(`\n[API Success Response] ${options.method || 'GET'} ${endpoint}`);
    if (typeof data === 'object' && data !== null) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out. Please check your connection and try again.');
      console.warn(`[API Timeout] ${options.method || 'GET'} ${endpoint}`);
      throw timeoutErr;
    }
    console.warn(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
    throw error;
  }
}
