// ─────────────────────────────────────────────────────────
// Paznwise Mobile — Auth / session event bus
//
// The HTTP client sits below React and cannot call hooks, but it is the
// only place that sees a failed token refresh or a plan-limit 403. This
// tiny emitter lets it notify the app without importing any component.
//
// Mirrors the web app's `loginPromptBus` / `subscriptionModalBus` pair.
//
//   'signed-out'  — refresh failed; the session is gone. AuthContext
//                   listens and flips to signedOut, which unmounts the
//                   protected stack.
//   'plan-limit'  — a 403 whose message matches the backend's
//                   subscriptionLimits.js wording. The paywall sheet
//                   listens and opens wherever the user hit the limit.
// ─────────────────────────────────────────────────────────

export type AuthEvent = 'signed-out' | 'plan-limit';

type Handler = (payload?: string) => void;

const handlers: Record<AuthEvent, Set<Handler>> = {
  'signed-out': new Set(),
  'plan-limit': new Set(),
};

export const authEvents = {
  /** Subscribe. Returns an unsubscribe function suitable for a useEffect cleanup. */
  on(event: AuthEvent, handler: Handler): () => void {
    handlers[event].add(handler);
    return () => {
      handlers[event].delete(handler);
    };
  },

  emit(event: AuthEvent, payload?: string): void {
    // Copy before iterating: a handler may unsubscribe itself.
    for (const handler of [...handlers[event]]) {
      try {
        handler(payload);
      } catch (e) {
        console.warn(`[authEvents] handler for "${event}" threw:`, e);
      }
    }
  },
};
