export function getApiBaseUrl() {
  // 1. Explicit production / environment URL has first priority
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
  }

  // 2. Explicit session/local storage override (filter out stale localhost URLs when running on remote domains)
  const stored =
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('baseUrl')) ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('baseUrl'));

  if (stored && stored.trim()) {
    const cleaned = stored.trim().replace(/\/+$/, '');
    const isLiveOrigin =
      typeof window !== 'undefined' &&
      window.location &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1');

    // Do not let stale localhost storage values break a live production session
    if (!isLiveOrigin || (!cleaned.includes('localhost') && !cleaned.includes('127.0.0.1'))) {
      return cleaned;
    }
  }

  // 3. Fallback default environment configuration
  if (import.meta.env.VITE_DEFAULT_API_URL && import.meta.env.VITE_DEFAULT_API_URL.trim()) {
    return import.meta.env.VITE_DEFAULT_API_URL.trim().replace(/\/+$/, '');
  }

  // 4. Browser origin resolution
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:10000/api';
    }
    return `${origin.replace(/\/+$/, '')}/api`;
  }

  return 'http://localhost:10000/api';
}

export function getSocketBaseUrl(apiUrl) {
  if (import.meta.env.VITE_SOCKET_URL && import.meta.env.VITE_SOCKET_URL.trim()) {
    return import.meta.env.VITE_SOCKET_URL.trim().replace(/\/+$/, '');
  }
  const url = apiUrl || getApiBaseUrl();
  return url.replace(/\/api\/?$/, '');
}
