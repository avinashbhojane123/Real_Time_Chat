export function getApiBaseUrl() {
  const stored = localStorage.getItem('baseUrl');
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

  const defaultApiUrl = import.meta.env.VITE_DEFAULT_API_URL || 'http://localhost:10000/api';

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return defaultApiUrl;
    }
    return `${origin.replace(/\/+$/, '')}/api`;
  }

  return defaultApiUrl;
}

export function getSocketBaseUrl(apiUrl) {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, '');
  }
  const url = apiUrl || getApiBaseUrl();
  return url.replace(/\/api\/?$/, '');
}
