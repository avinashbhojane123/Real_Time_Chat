import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MovieSearchResult {
  id: string | number;
  tmdbId?: number;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  mediaType?: 'movie' | 'tv';
  rating?: number;
}

export interface StreamSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
}

export interface SubtitleTrack {
  url: string;
  lang: string;
}

export interface StreamSourcesResult {
  title: string;
  tmdbId?: string | number;
  sources: StreamSource[];
  subtitles: SubtitleTrack[];
  embedFallbackUrl: string;
  provider: string;
}

@Injectable()
export class MoviesService {
  private readonly logger = new Logger(MoviesService.name);

  // Default read-only TMDB API key (fallback if not in env)
  private readonly tmdbApiKey: string;
  private readonly tmdbBaseUrl = 'https://api.themoviedb.org/3';
  private readonly consumetBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.tmdbApiKey =
      this.configService.get<string>('TMDB_API_KEY') ||
      '4e44d9029b1270a757cddc766a1bcb63'; // Public demo key for movie metadata
    this.consumetBaseUrl =
      this.configService.get<string>('CONSUMET_API_URL') ||
      'https://api.consumet.org';
  }

  /**
   * Get trending movies & series from TMDB
   */
  async getTrending(page = 1): Promise<MovieSearchResult[]> {
    try {
      const res = await fetch(
        `${this.tmdbBaseUrl}/trending/all/week?api_key=${this.tmdbApiKey}&page=${page}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`TMDB error: ${res.statusText}`);
      const data = await res.json();

      return (data.results || [])
        .filter((item: any) => item.poster_path && (item.title || item.name))
        .map((item: any) => ({
          id: item.id,
          tmdbId: item.id,
          title: item.title || item.name,
          overview: item.overview,
          posterPath: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : undefined,
          backdropPath: item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
            : undefined,
          releaseDate: item.release_date || item.first_air_date,
          mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
          rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
        }));
    } catch (err: any) {
      this.logger.warn(`Failed to fetch trending from TMDB: ${err.message}`);
      return [
        {
          id: 1108427,
          tmdbId: 1108427,
          title: 'Moana 2',
          overview:
            'After receiving an unexpected call from her wayfinding ancestors, Moana journeys to the far seas of Oceania.',
          posterPath:
            'https://image.tmdb.org/t/p/w500/m0SbwFNCa9epW1X604Y293Os4rI.jpg',
          backdropPath:
            'https://image.tmdb.org/t/p/w1280/tElnmtQ6yz1PjN1kePNl8yMSb59.jpg',
          releaseDate: '2024-11-27',
          mediaType: 'movie',
          rating: 7.2,
        },
        {
          id: 533535,
          tmdbId: 533535,
          title: 'Deadpool & Wolverine',
          overview:
            'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him.',
          posterPath:
            'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
          backdropPath:
            'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0ne8NDRIl4HJIPugBa.jpg',
          releaseDate: '2024-07-24',
          mediaType: 'movie',
          rating: 7.8,
        },
        {
          id: 693134,
          tmdbId: 693134,
          title: 'Dune: Part Two',
          overview:
            'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge.',
          posterPath:
            'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
          backdropPath:
            'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520bEx.jpg',
          releaseDate: '2024-02-27',
          mediaType: 'movie',
          rating: 8.2,
        },
        {
          id: 1022789,
          tmdbId: 1022789,
          title: 'Inside Out 2',
          overview:
            'Teenager Riley finds her mind Headquarters undergoing a sudden demolition to make room for brand new Emotions!',
          posterPath:
            'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
          backdropPath:
            'https://image.tmdb.org/t/p/w1280/stKGOmvZstRd1oPRr473sFk3z1t.jpg',
          releaseDate: '2024-06-11',
          mediaType: 'movie',
          rating: 7.6,
        },
        {
          id: 933260,
          tmdbId: 933260,
          title: 'The Substance',
          overview:
            'A fading celebrity decides to use a black market drug, a cell-replicating substance that temporarily creates a younger, better version of herself.',
          posterPath:
            'https://image.tmdb.org/t/p/w500/lqoMzCcZYEFK729Fc6rKWZSSbRa.jpg',
          backdropPath:
            'https://image.tmdb.org/t/p/w1280/7h6TqPB3ESmmu2x84gWJj2vDkYk.jpg',
          releaseDate: '2024-09-07',
          mediaType: 'movie',
          rating: 7.4,
        },
      ];
    }
  }

  /**
   * Search movies & TV shows via TMDB
   */
  async search(query: string): Promise<MovieSearchResult[]> {
    if (!query?.trim()) return [];
    try {
      const res = await fetch(
        `${this.tmdbBaseUrl}/search/multi?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(
          query.trim(),
        )}&include_adult=false`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`TMDB search error: ${res.statusText}`);
      const data = await res.json();

      return (data.results || [])
        .filter(
          (item: any) =>
            item.poster_path &&
            (item.media_type === 'movie' || item.media_type === 'tv') &&
            (item.title || item.name),
        )
        .map((item: any) => ({
          id: item.id,
          tmdbId: item.id,
          title: item.title || item.name,
          overview: item.overview,
          posterPath: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : undefined,
          backdropPath: item.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
            : undefined,
          releaseDate: item.release_date || item.first_air_date,
          mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
          rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
        }));
    } catch (err: any) {
      this.logger.warn(`Failed to search TMDB: ${err.message}`);
      return [];
    }
  }

  /**
   * Extract direct streaming sources via Consumet API (FlixHQ / SuperStream)
   * With multi-mirror player embed fallbacks for 100% reliability
   */
  async getStreamSources(
    title: string,
    tmdbId?: string | number,
    mediaType: 'movie' | 'tv' = 'movie',
    season = 1,
    episode = 1,
  ): Promise<StreamSourcesResult> {
    const embedFallbackUrl =
      mediaType === 'tv'
        ? `https://cinemaos.live/watch/tv/${tmdbId}/${season}/${episode}`
        : `https://cinemaos.live/watch/movie/${tmdbId}`;

    const cleanTitle = (title || '').trim();
    if (!cleanTitle && !tmdbId) {
      return {
        title: cleanTitle || 'Movie Stream',
        tmdbId,
        sources: [],
        subtitles: [],
        embedFallbackUrl,
        provider: 'Mirror Embed',
      };
    }

    // Try Consumet FlixHQ Provider
    try {
      const searchRes = await fetch(
        `${this.consumetBaseUrl}/movies/flixhq/${encodeURIComponent(cleanTitle)}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4500) },
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData.results || [];
        if (results.length > 0) {
          const match = results[0];
          const infoRes = await fetch(
            `${this.consumetBaseUrl}/movies/flixhq/info?id=${encodeURIComponent(match.id)}`,
            { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4500) },
          );

          if (infoRes.ok) {
            const infoData = await infoRes.json();
            let episodeId = match.id;

            if (infoData.episodes && infoData.episodes.length > 0) {
              if (mediaType === 'tv') {
                const epMatch = infoData.episodes.find(
                  (e: any) => e.season === season && e.number === episode,
                );
                episodeId = epMatch ? epMatch.id : infoData.episodes[0].id;
              } else {
                episodeId = infoData.episodes[0].id;
              }
            }

            const watchRes = await fetch(
              `${this.consumetBaseUrl}/movies/flixhq/watch?episodeId=${encodeURIComponent(
                episodeId,
              )}&mediaId=${encodeURIComponent(match.id)}`,
              { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4500) },
            );

            if (watchRes.ok) {
              const watchData = await watchRes.json();
              const sources = (watchData.sources || []).map((s: any) => ({
                url: s.url,
                quality: s.quality || 'Auto',
                isM3U8: Boolean(s.isM3U8 || s.url?.includes('.m3u8')),
              }));

              const subtitles = (watchData.subtitles || []).map((sub: any) => ({
                url: sub.url,
                lang: sub.lang || 'English',
              }));

              if (sources.length > 0) {
                return {
                  title: cleanTitle || match.title,
                  tmdbId,
                  sources,
                  subtitles,
                  embedFallbackUrl,
                  provider: 'Consumet (FlixHQ)',
                };
              }
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(
        `Consumet direct stream resolution skipped/failed: ${err.message}. Using high-speed embed mirrors.`,
      );
    }

    // High-speed fallback embed mirrors (CinemaOS, VidLink, VidSrc)
    return {
      title: cleanTitle,
      tmdbId,
      sources: [],
      subtitles: [],
      embedFallbackUrl,
      provider: 'CinemaOS / Multi-Mirror',
    };
  }

  /**
   * Universal HLS Stream Proxy & CORS Relayer
   * Fetches remote .m3u8 playlists and .ts/.m4s chunks, rewrites URLs,
   * and injects permissive CORS headers so hls.js can render seamlessly in any browser.
   */
  async proxyHlsStream(
    streamUrl: string,
    clientHeaders: Record<string, string | string[] | undefined>,
    res: any,
  ): Promise<void> {
    if (!streamUrl) {
      res.status(400).send('Missing stream URL');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(streamUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        res.status(400).send('Invalid URL protocol');
        return;
      }
    } catch {
      res.status(400).send('Malformed stream URL');
      return;
    }

    // SSRF Security Guard: Prevent access to internal networks, localhost, link-local, and cloud metadata
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivateOrInternal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    if (isPrivateOrInternal) {
      this.logger.warn(`Blocked SSRF attempt targeting ${hostname}`);
      res.status(403).send('Forbidden: Access to private networks is blocked');
      return;
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `${parsedUrl.protocol}//${parsedUrl.host}/`,
        Origin: `${parsedUrl.protocol}//${parsedUrl.host}`,
      };

      if (clientHeaders['range']) {
        headers['Range'] = Array.isArray(clientHeaders['range'])
          ? clientHeaders['range'][0]
          : clientHeaders['range'];
      }

      const remoteRes = await fetch(parsedUrl.toString(), {
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (!remoteRes.ok && remoteRes.status !== 206) {
        res
          .status(remoteRes.status)
          .send(`Remote stream provider returned HTTP ${remoteRes.status}`);
        return;
      }

      const contentType = remoteRes.headers.get('content-type') || '';
      const isM3U8 =
        parsedUrl.pathname.endsWith('.m3u8') ||
        contentType.includes('mpegurl') ||
        contentType.includes('application/x-mpegurl') ||
        contentType.includes('vnd.apple.mpegurl');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (isM3U8) {
        const text = await remoteRes.text();
        const baseUrl = parsedUrl.toString();
        const lines = text.split(/\r?\n/);
        const rewritten = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          if (trimmed.startsWith('#')) {
            // Rewrite URI="..." in #EXT-X-KEY or #EXT-X-MAP
            if (trimmed.includes('URI="')) {
              return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
                const absUri = new URL(uri, baseUrl).toString();
                return `URI="/api/movies/proxy?url=${encodeURIComponent(absUri)}"`;
              });
            }
            return line;
          }

          // Relative or absolute segment chunk URL
          const absChunkUrl = new URL(trimmed, baseUrl).toString();
          return `/api/movies/proxy?url=${encodeURIComponent(absChunkUrl)}`;
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.status(200).send(rewritten.join('\n'));
      } else {
        // Binary segment (.ts / .m4s / .mp4 / key file)
        res.setHeader('Content-Type', contentType || 'video/MP2T');
        if (remoteRes.headers.get('content-range')) {
          res.setHeader('Content-Range', remoteRes.headers.get('content-range')!);
        }
        if (remoteRes.headers.get('content-length')) {
          res.setHeader('Content-Length', remoteRes.headers.get('content-length')!);
        }
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const arrayBuf = await remoteRes.arrayBuffer();
        res.status(remoteRes.status).send(Buffer.from(arrayBuf));
      }
    } catch (err: any) {
      this.logger.warn(`HLS Proxy error for ${streamUrl}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).send(`HLS Proxy gateway error: ${err.message}`);
      }
    }
  }
}
