/**
 * Safe localStorage wrappers. `localStorage` can throw on *any* access — Safari Private
 * Browsing, blocked third-party/site storage, exhausted quota — and a throw inside a
 * `useState` initializer or a render-time call happens with no ErrorBoundary above it to stop
 * at just that component, so it blanks the whole app. These swallow that and fall back to
 * doing nothing / returning null instead of crashing.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable or blocked — the app still works, just without persistence
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
