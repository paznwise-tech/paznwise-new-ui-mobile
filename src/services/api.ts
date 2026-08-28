// ─────────────────────────────────────────────────────────
// Back-compat shim.
//
// The real HTTP layer now lives in src/api/client.ts and its configuration
// in src/config/env.ts. This file stays only so the existing service files
// keep compiling while they are migrated onto `apiClient` domain by domain.
//
// New code should import from '@/api/client' and '@/config/env' directly.
// ─────────────────────────────────────────────────────────

import { apiBaseUrl, mediaBaseUrl } from '@/config/env';

export { fetchApi } from '@/api/client';

/** @deprecated import `apiBaseUrl` from '@/config/env' */
export const API_BASE_URL = apiBaseUrl;

/** @deprecated import `mediaBaseUrl` from '@/config/env' */
export const MEDIA_BASE_URL = mediaBaseUrl;
