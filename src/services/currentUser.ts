import { AuthStorage } from './authStorage';

// The backend authorizes messaging (conversation membership, receiverId, socket
// events) against the user id carried in the JWT. That id is NOT necessarily the
// same as the profile `userId` we surface as `user.id` in AppContext (which is
// used for the social graph / feed). To avoid "not a participant" 403s, messaging
// must identify the current user by the JWT subject. We read it straight from the
// access token so it always matches what the server checks.

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Minimal base64url decoder (JWT payloads are ASCII JSON — no atob dependency).
function base64UrlDecode(input: string): string {
  const str = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = B64_CHARS.indexOf(str[i]);
    if (idx === -1) continue;
    buffer = (count % 4 ? buffer * 64 + idx : idx);
    if (count++ % 4) {
      output += String.fromCharCode(255 & (buffer >> ((-2 * count) & 6)));
    }
  }
  return output;
}

/** Extracts the user id claim from a JWT access token, or null if it can't be read. */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload?.id ?? payload?.userId ?? payload?.sub ?? payload?._id ?? null;
  } catch {
    return null;
  }
}

let cachedId: string | null = null;

/**
 * Current user's messaging identity (the JWT subject). Cached after first read;
 * call clearAuthUserIdCache() on logout / token change.
 */
export async function getAuthUserId(): Promise<string | null> {
  if (cachedId) return cachedId;
  const token = await AuthStorage.getAccessToken();
  if (!token) return null;
  cachedId = extractUserIdFromToken(token);
  return cachedId;
}

/**
 * The role the server will actually enforce.
 *
 * `authorize()` checks `decoded.activeRole || decoded.role` from the access
 * token, while `/user/profile/me` returns the account's role. Those differ
 * whenever a user holds a role they have not switched into — an account
 * registered as ARTIST browsing with an active role of BUYER — so gating the
 * UI on the profile role showed entry points the server then refused.
 */
export function extractActiveRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const role = payload?.activeRole ?? payload?.role ?? null;
    return role ? String(role).toUpperCase() : null;
  } catch {
    return null;
  }
}

let cachedRole: string | null = null;

/** Cached active role; cleared on logout and on any token change. */
export async function getActiveRole(): Promise<string | null> {
  if (cachedRole) return cachedRole;
  const token = await AuthStorage.getAccessToken();
  if (!token) return null;
  cachedRole = extractActiveRoleFromToken(token);
  return cachedRole;
}

export function clearAuthUserIdCache(): void {
  cachedId = null;
  cachedRole = null;
}
