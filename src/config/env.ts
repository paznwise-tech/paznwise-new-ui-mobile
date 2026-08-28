// ─────────────────────────────────────────────────────────
// Paznwise Mobile — Environment config
//
// Values come from `expo.extra` in app.json, read through expo-constants.
// Nothing here is a secret: the API base URL and the public S3 media host
// are both visible in any network trace. Secrets (Razorpay keys, etc.)
// always arrive from the server in a response body.
// ─────────────────────────────────────────────────────────

import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  mediaBaseUrl?: string;
  appEnv?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// Fail loudly rather than silently issuing requests against "undefined/api/...".
// A missing base URL is always a build/config mistake, never a runtime condition.
if (!extra.apiBaseUrl) {
  throw new Error(
    'Missing expo.extra.apiBaseUrl in app.json — the API base URL is required to start the app.',
  );
}

/** API origin, no trailing slash. The `/api` prefix is added by the HTTP client. */
export const apiBaseUrl: string = extra.apiBaseUrl.replace(/\/$/, '');

/** S3 origin for uploaded media. Relative keys like "users/<id>/avatar.jpg" resolve against this. */
export const mediaBaseUrl: string = (extra.mediaBaseUrl ?? '').replace(/\/$/, '');

export const appEnv: string = extra.appEnv ?? 'production';

export const isDev: boolean = __DEV__;

export const env = { apiBaseUrl, mediaBaseUrl, appEnv, isDev };
