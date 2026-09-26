import { getApiBaseUrl } from '../utils/apiConfig';

/**
 * Movie & Series Discovery Service
 * Integrates TMDB API (Metadata, Posters, Trending, Search)
 * and Consumet API (Direct .m3u8 HLS Streams & Subtitles)
 */
export async function getTrendingMovies(page = 1) {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/movies/trending?page=${page}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('[movieService] Failed to fetch trending movies:', err);
    return [];
  }
}

export async function searchMovies(query) {
  if (!query?.trim()) return [];
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/movies/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.warn('[movieService] Failed to search movies:', err);
    return [];
  }
}

export async function getStreamSources(title, tmdbId, mediaType = 'movie', season = 1, episode = 1) {
  try {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams({
      title: title || '',
      ...(tmdbId ? { tmdbId: String(tmdbId) } : {}),
      mediaType: mediaType || 'movie',
      season: String(season || 1),
      episode: String(episode || 1),
    });

    const res = await fetch(`${baseUrl}/movies/sources?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('[movieService] Failed to fetch stream sources:', err);
    return null;
  }
}

/**
 * Wraps a remote .m3u8 or media chunk URL through our backend CORS relayer
 */
export function getProxiedStreamUrl(originalUrl) {
  if (!originalUrl) return '';
  if (originalUrl.includes('/movies/proxy?url=')) return originalUrl;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/movies/proxy?url=${encodeURIComponent(originalUrl)}`;
}
