import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as express from 'express';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface IgMediaResult {
  success: boolean;
  type: string;
  mediaType: 'reel' | 'post' | 'video' | 'profile';
  shortcode?: string;
  username?: string;
  title?: string;
  caption?: string;
  author?: {
    username?: string;
    name?: string;
  };
  thumbnailUrl?: string;
  directVideoUrl?: string;
  proxyVideoUrl?: string;
  embedUrl: string;
  originalUrl: string;
  canViewWithoutAccount: boolean;
  message: string;
}

@Injectable()
export class IgshareService {
  private readonly logger = new Logger(IgshareService.name);

  /**
   * Sanitizes pasted text or Instagram share string to extract the raw URL.
   */
  public extractCleanUrl(text?: string): string {
    if (!text || typeof text !== 'string') {
      throw new BadRequestException('Instagram URL or text parameter is required.');
    }

    const trimmed = text.trim();

    // Find Instagram URL within text
    const instaMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/[^\s]+/i,
    );

    if (instaMatch) {
      return instaMatch[0];
    }

    return trimmed;
  }

  /**
   * Resolves Instagram media metadata, embed links, and direct stream URLs.
   */
  public async resolveMediaView(inputUrl?: string): Promise<IgMediaResult> {
    const cleanUrl = this.extractCleanUrl(inputUrl);

    // 1. Check for Media Shortcode (Reel, Post, Video/IGTV)
    const mediaMatch = cleanUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9-_]+)/i,
    );

    if (mediaMatch && mediaMatch[1]) {
      const shortcode = mediaMatch[1];
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const originalUrl = `https://www.instagram.com/reel/${shortcode}/`;

      // Try scraping public embed & page metadata
      let fetchedMeta: {
        thumbnailUrl?: string;
        directVideoUrl?: string;
        caption?: string;
        authorUsername?: string;
      } = {};

      try {
        fetchedMeta = await this.scrapePublicEmbedMeta(shortcode);
      } catch (err) {
        this.logger.warn(`Scraping metadata for shortcode ${shortcode} failed: ${err.message}`);
      }

      const proxyVideoUrl = fetchedMeta.directVideoUrl
        ? `/api/igshare/proxy?url=${encodeURIComponent(fetchedMeta.directVideoUrl)}`
        : undefined;

      return {
        success: true,
        type: 'instagram',
        mediaType: cleanUrl.toLowerCase().includes('/p/') ? 'post' : 'reel',
        shortcode,
        title: fetchedMeta.caption
          ? fetchedMeta.caption.slice(0, 100) + (fetchedMeta.caption.length > 100 ? '...' : '')
          : `Instagram Media (${shortcode})`,
        caption: fetchedMeta.caption,
        author: fetchedMeta.authorUsername ? { username: fetchedMeta.authorUsername } : undefined,
        thumbnailUrl: fetchedMeta.thumbnailUrl,
        directVideoUrl: fetchedMeta.directVideoUrl,
        proxyVideoUrl,
        embedUrl,
        originalUrl,
        canViewWithoutAccount: true,
        message: 'Instagram media stream and metadata resolved successfully for account-free browser viewing.',
      };
    }

    // 2. Check for Profile Link
    const profileMatch = cleanUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:@)?([a-zA-Z0-9._]+)/i,
    );

    if (
      profileMatch &&
      profileMatch[1] &&
      !['p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts', 'developer'].includes(
        profileMatch[1].toLowerCase(),
      )
    ) {
      const username = profileMatch[1].replace(/^@/, '');
      const profileUrl = `https://www.instagram.com/${username}/`;

      return {
        success: true,
        type: 'instagram',
        mediaType: 'profile',
        username,
        title: `@${username} on Instagram`,
        caption: `View Instagram profile @${username}`,
        author: { username },
        embedUrl: profileUrl,
        originalUrl: profileUrl,
        canViewWithoutAccount: true,
        message: 'Instagram profile viewer URL parsed successfully.',
      };
    }

    throw new BadRequestException(
      'Invalid Instagram URL. Supported formats include Reels (/reel/code), Posts (/p/code), IGTV (/tv/code), and Profiles (/@username).',
    );
  }

  /**
   * Scrapes public HTML metadata from Instagram embed endpoint and main page JSON-LD.
   */
  private async scrapePublicEmbedMeta(
    shortcode: string,
  ): Promise<{
    thumbnailUrl?: string;
    directVideoUrl?: string;
    caption?: string;
    authorUsername?: string;
  }> {
    const urlsToTry = [
      `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
      `https://www.instagram.com/reel/${shortcode}/`,
    ];

    try {
      const results = await Promise.allSettled(
        urlsToTry.map((url) => this.fetchAndExtractMeta(url)),
      );

      for (const res of results) {
        if (res.status === 'fulfilled') {
          const meta = res.value;
          if (meta.directVideoUrl || meta.thumbnailUrl || meta.caption) {
            return meta;
          }
        }
      }
    } catch {
      // Ignore
    }

    return {};
  }

  private fetchAndExtractMeta(targetUrl: string): Promise<{
    thumbnailUrl?: string;
    directVideoUrl?: string;
    caption?: string;
    authorUsername?: string;
  }> {
    return new Promise((resolve) => {
      const req = https.get(
        targetUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 2500,
        },
        (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 2 * 1024 * 1024) {
              req.destroy();
            }
          });

          res.on('end', () => {
            const meta: {
              thumbnailUrl?: string;
              directVideoUrl?: string;
              caption?: string;
              authorUsername?: string;
            } = {};

            // 1. JSON-LD Schema Extraction
            const jsonLdMatch = data.match(
              /<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
            );
            if (jsonLdMatch) {
              for (const scriptTag of jsonLdMatch) {
                try {
                  const content = scriptTag.replace(/<[^>]+>/g, '');
                  const parsed = JSON.parse(content);
                  const item = Array.isArray(parsed) ? parsed[0] : parsed;

                  if (item) {
                    if (item.contentUrl) meta.directVideoUrl = item.contentUrl;
                    if (item.video?.contentUrl) meta.directVideoUrl = item.video.contentUrl;
                    if (item.thumbnailUrl) meta.thumbnailUrl = item.thumbnailUrl;
                    if (item.caption) meta.caption = item.caption;
                    if (item.description && !meta.caption) meta.caption = item.description;
                    if (item.author?.identifier?.value || item.author?.name) {
                      meta.authorUsername = item.author.identifier?.value || item.author.name;
                    }
                  }
                } catch {
                  // Ignore JSON parse failures
                }
              }
            }

            // 2. Regex fallbacks for direct video_url and og:video
            if (!meta.directVideoUrl) {
              const videoMatch =
                data.match(/video_url["']:\s*["']([^"']+)["']/i) ||
                data.match(/<meta property=["']og:video["'] content=["']([^"']+)["']/i) ||
                data.match(/<meta property=["']og:video:secure_url["'] content=["']([^"']+)["']/i) ||
                data.match(/["']video_versions["']:\s*\[\s*\{\s*["']url["']:\s*["']([^"']+)["']/i);
              if (videoMatch && videoMatch[1]) {
                meta.directVideoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
              }
            }

            // 3. Regex fallbacks for display_url and og:image
            if (!meta.thumbnailUrl) {
              const imageMatch =
                data.match(/display_url["']:\s*["']([^"']+)["']/i) ||
                data.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i) ||
                data.match(/thumbnail_src["']:\s*["']([^"']+)["']/i);
              if (imageMatch && imageMatch[1]) {
                meta.thumbnailUrl = imageMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
              }
            }

            // 4. Regex fallbacks for caption
            if (!meta.caption) {
              const captionMatch =
                data.match(/<div class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i) ||
                data.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i);
              if (captionMatch && captionMatch[1]) {
                meta.caption = captionMatch[1].replace(/<[^>]+>/g, '').trim();
              }
            }

            // 5. Author fallback
            if (!meta.authorUsername) {
              const authorMatch =
                data.match(/<a class=["']CaptionUsername["'][^>]*>([^<]+)<\/a>/i) ||
                data.match(/["']username["']:\s*["']([^"']+)["']/i);
              if (authorMatch && authorMatch[1]) {
                meta.authorUsername = authorMatch[1].trim();
              }
            }

            resolve(meta);
          });
        },
      );

      req.on('error', () => resolve({}));
      req.on('timeout', () => {
        req.destroy();
        resolve({});
      });
    });
  }

  /**
   * Proxies binary media streams (video/image) from Instagram CDN to client browser with CORS support and HTTP redirect following.
   */
  public async proxyMediaStream(
    mediaUrl: string,
    req: express.Request,
    res: express.Response,
    redirectHops = 0,
  ): Promise<void> {
    if (redirectHops > 5) {
      throw new BadRequestException('Too many redirects while fetching Instagram media stream.');
    }

    if (!mediaUrl || typeof mediaUrl !== 'string') {
      throw new BadRequestException('Media URL parameter "url" is required.');
    }

    try {
      const parsedUrl = new URL(mediaUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException('Invalid protocol. Only HTTP and HTTPS media URLs are supported.');
      }

      const client = parsedUrl.protocol === 'https:' ? https : http;

      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const proxyReq = client.request(
        parsedUrl,
        {
          method: 'GET',
          headers,
        },
        (proxyRes) => {
          // Handle HTTP redirects (301, 302, 303, 307, 308) from CDN
          if (
            proxyRes.statusCode &&
            proxyRes.statusCode >= 300 &&
            proxyRes.statusCode < 400 &&
            proxyRes.headers.location
          ) {
            const redirectUrl = new URL(proxyRes.headers.location, mediaUrl).toString();
            return this.proxyMediaStream(redirectUrl, req, res, redirectHops + 1);
          }

          res.status(proxyRes.statusCode || 200);

          // Forward essential headers for media streaming
          const headersToForward = [
            'content-type',
            'content-length',
            'accept-ranges',
            'content-range',
            'cache-control',
            'etag',
            'last-modified',
          ];

          headersToForward.forEach((h) => {
            if (proxyRes.headers[h]) {
              res.setHeader(h, proxyRes.headers[h] as string);
            }
          });

          // Enable open CORS for client browsers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

          proxyRes.pipe(res);
        },
      );

      proxyReq.on('error', (err) => {
        this.logger.error(`Proxy stream error: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Failed to proxy Instagram media stream.' });
        }
      });

      proxyReq.end();
    } catch (err) {
      throw new BadRequestException(`Failed to parse target media URL: ${err.message}`);
    }
  }
}
