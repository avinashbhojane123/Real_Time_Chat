export function getApiBaseUrl() {
  const stored = localStorage.getItem('baseUrl');
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }

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
  const url = apiUrl || getApiBaseUrl();
  return url.replace(/\/api\/?$/, '');
}
