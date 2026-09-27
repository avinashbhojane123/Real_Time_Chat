/**
 * Session Security & History Protection Utility
 * Implements:
 * A) Inactivity Timeout & TTL Expiration
 * B) One-Time In-Memory Auth Guard (Direct Chrome History Entry Blocker)
 * C) History Masking & ReplaceState Route Protection
 * D) Auto-Expire on Tab/Browser Close (with seamless F5 reload support)
 */

// Inactivity timeout: 25 minutes of zero interaction
export const SESSION_INACTIVITY_TTL_MS = 25 * 60 * 1000;

// In-memory token: Exists ONLY in current running JavaScript heap memory
let inMemorySessionToken = null;

/**
 * Initializes a new verified session upon successful passcode authentication.
 */
export function startSession({ nickname, passcode, baseUrl, avatarUrl }) {
  if (typeof window === 'undefined') return;

  const token = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  inMemorySessionToken = token;

  const expiresAt = Date.now() + SESSION_INACTIVITY_TTL_MS;

  sessionStorage.setItem('nickname', nickname.trim());
  sessionStorage.setItem('passcode', passcode.trim());
  if (baseUrl) sessionStorage.setItem('baseUrl', baseUrl.trim());
  if (avatarUrl) sessionStorage.setItem('avatarUrl', avatarUrl);
  sessionStorage.setItem('sessionExpiresAt', String(expiresAt));
  sessionStorage.setItem('sessionAuthToken', token);
  sessionStorage.removeItem('sessionTerminated');
  sessionStorage.removeItem('isReloading');

  // Prevent credentials in persistent storage
  localStorage.removeItem('nickname');
  localStorage.removeItem('passcode');
}

/**
 * Refreshes the session expiration TTL on user activity (keystrokes, mouse, touch).
 */
export function touchSessionActivity() {
  if (typeof window === 'undefined') return;
  const currentExpiry = Number(sessionStorage.getItem('sessionExpiresAt') || 0);
  if (!currentExpiry) return;

  // If already expired, do not extend
  if (Date.now() > currentExpiry) return;

  const newExpiry = Date.now() + SESSION_INACTIVITY_TTL_MS;
  sessionStorage.setItem('sessionExpiresAt', String(newExpiry));
}

/**
 * Checks if the current session is valid and authorized to view the chat room.
 * Returns { valid: boolean, reason?: string }
 */
export function validateSession() {
  if (typeof window === 'undefined') {
    return { valid: false, reason: 'No window environment' };
  }

  const nickname = (sessionStorage.getItem('nickname') || '').trim();
  const passcode = (sessionStorage.getItem('passcode') || '').trim();

  if (!nickname || !passcode) {
    return { valid: false, reason: 'Missing credentials' };
  }

  // Check 1: Was the session terminated when the tab/browser previously closed?
  const wasTerminated = sessionStorage.getItem('sessionTerminated') === 'true';
  if (wasTerminated) {
    terminateSession();
    return { valid: false, reason: 'Session ended when browser was closed' };
  }

  // Check 2: Inactivity TTL Expiration
  const expiresAt = Number(sessionStorage.getItem('sessionExpiresAt') || 0);
  if (!expiresAt || Date.now() > expiresAt) {
    terminateSession();
    return { valid: false, reason: 'Session expired due to inactivity' };
  }

  // Check 3: Chrome History direct entry protection
  const storedToken = sessionStorage.getItem('sessionAuthToken');
  const isReloading = sessionStorage.getItem('isReloading') === 'true';

  if (!storedToken) {
    terminateSession();
    return { valid: false, reason: 'Unverified session token' };
  }

  // If in-memory token is missing and it was NOT a page reload (F5):
  // This means user opened /chat directly from Chrome History in a fresh session!
  if (!inMemorySessionToken && !isReloading) {
    terminateSession();
    return { valid: false, reason: 'Direct history entry blocked. Please verify room passcode.' };
  }

  // If it was a valid page reload, restore in-memory token and clear reload flag
  if (isReloading) {
    inMemorySessionToken = storedToken;
    sessionStorage.removeItem('isReloading');
  }

  return { valid: true };
}

/**
 * Terminates the current session and purges all security credentials.
 */
export function terminateSession() {
  if (typeof window === 'undefined') return;

  inMemorySessionToken = null;
  sessionStorage.removeItem('nickname');
  sessionStorage.removeItem('passcode');
  sessionStorage.removeItem('sessionAuthToken');
  sessionStorage.removeItem('sessionExpiresAt');
  sessionStorage.removeItem('avatarUrl');
  sessionStorage.setItem('sessionTerminated', 'true');
  sessionStorage.removeItem('isReloading');

  localStorage.removeItem('nickname');
  localStorage.removeItem('passcode');
  localStorage.removeItem('avatarUrl');
}

/**
 * Installs window lifecycle listeners to detect tab close vs page reload.
 */
export function setupSessionLifecycleWatchers() {
  if (typeof window === 'undefined') return () => { };

  const handleBeforeUnload = () => {
    // When unloading, mark that a potential reload is occurring
    sessionStorage.setItem('isReloading', 'true');
  };

  const handlePageHide = (e) => {
    // If not persisted in BFCache, user is closing the tab or navigating away
    if (!e.persisted) {
      // Keep reload flag if beforeunload just marked it, otherwise mark terminated
      const isReload = sessionStorage.getItem('isReloading') === 'true';
      if (!isReload) {
        sessionStorage.setItem('sessionTerminated', 'true');
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handlePageHide);

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('pagehide', handlePageHide);
  };
}
