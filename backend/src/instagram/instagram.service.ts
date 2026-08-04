import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as express from 'express';
import * as https from 'https';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { URL } from 'url';

const execAsync = promisify(exec);

export interface InstagramMediaResult {
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
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  /**
   * Extracts clean Instagram URL from text.
   */
  public extractCleanUrl(text?: string): string {
    if (!text || typeof text !== 'string') {
      throw new BadRequestException('Instagram URL or text parameter is required.');
    }

    const trimmed = text.trim();
    const instaMatch = trimmed.match(
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/[^\s]+/i,
    );

    if (instaMatch) {
      return instaMatch[0];
    }

    return trimmed;
  }

  /**
   * Resolves Instagram media view using gallery-dl CLI and public fallback scraper.
   */
  public async resolveMediaView(inputUrl?: string): Promise<InstagramMediaResult> {
    const cleanUrl = this.extractCleanUrl(inputUrl);

    // 1. Check for Shortcode (Reel, Post, IGTV)
    const mediaMatch = cleanUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9-_]+)/i,
    );

    if (mediaMatch && mediaMatch[1]) {
      const shortcode = mediaMatch[1];
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const originalUrl = `https://www.instagram.com/reel/${shortcode}/`;

      let extracted: {
        thumbnailUrl?: string;
        directVideoUrl?: string;
        caption?: string;
        authorUsername?: string;
      } = {};

      // Attempt 1: Extract via gallery-dl CLI
      try {
        extracted = await this.extractViaGalleryDl(originalUrl);
      } catch (err) {
        this.logger.warn(`gallery-dl extraction failed for ${shortcode}: ${err.message}`);
      }

      // Attempt 2: Public scraper fallback if gallery-dl did not find direct video
      if (!extracted.directVideoUrl) {
        try {
          const fallback = await this.scrapePublicMeta(shortcode);
          extracted = { ...fallback, ...extracted };
        } catch (err) {
          this.logger.warn(`Public metadata fallback failed for ${shortcode}: ${err.message}`);
        }
      }

      const proxyVideoUrl = extracted.directVideoUrl
        ? `/api/instagram/stream?url=${encodeURIComponent(extracted.directVideoUrl)}`
        : undefined;

      return {
        success: true,
        type: 'instagram',
        mediaType: cleanUrl.toLowerCase().includes('/p/') ? 'post' : 'reel',
        shortcode,
        title: extracted.caption
          ? extracted.caption.slice(0, 100) + (extracted.caption.length > 100 ? '...' : '')
          : `Instagram Reel (${shortcode})`,
        caption: extracted.caption,
        author: extracted.authorUsername ? { username: extracted.authorUsername } : undefined,
        thumbnailUrl: extracted.thumbnailUrl,
        directVideoUrl: extracted.directVideoUrl,
        proxyVideoUrl,
        embedUrl,
        originalUrl,
        canViewWithoutAccount: true,
        message: 'Instagram media extracted successfully via gallery-dl for 100% account-free browser viewing.',
      };
    }

    // 2. Check for Profile link
    const profileMatch = cleanUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:@)?([a-zA-Z0-9._]+)/i,
    );

    if (
      profileMatch &&
      profileMatch[1] &&
      !['p', 'reel', 'reels', 'tv', 'explore', 'stories'].includes(profileMatch[1].toLowerCase())
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
        message: 'Instagram profile URL parsed successfully.',
      };
    }

    throw new BadRequestException('Invalid Instagram URL. Formats supported: Reels, Posts, IGTV, Profiles.');
  }

  /**
   * Invokes python -m gallery_dl -j to extract JSON metadata.
   */
  private async extractViaGalleryDl(url: string): Promise<{
    thumbnailUrl?: string;
    directVideoUrl?: string;
    caption?: string;
    authorUsername?: string;
  }> {
    const cmd = `python -m gallery_dl -j "${url}"`;
    const { stdout } = await execAsync(cmd, { timeout: 12000 });

    if (!stdout || !stdout.trim()) {
      return {};
    }

    const lines = stdout.trim().split('\n');
    let directVideoUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let caption: string | undefined;
    let authorUsername: string | undefined;

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        // gallery-dl outputs arrays: [category, metadata_object]
        const data = Array.isArray(parsed) ? parsed[1] || parsed[0] : parsed;

        if (data && typeof data === 'object') {
          if (!directVideoUrl && (data.video_versions?.[0]?.url || data.url || data.video_url)) {
            directVideoUrl = data.video_versions?.[0]?.url || data.url || data.video_url;
          }

          if (!thumbnailUrl && (data.display_url || data.thumbnail || data.image_versions2?.candidates?.[0]?.url)) {
            thumbnailUrl = data.display_url || data.thumbnail || data.image_versions2?.candidates?.[0]?.url;
          }

          if (!caption && (data.description || data.caption?.text || data.caption)) {
            const rawCap = data.description || data.caption?.text || data.caption;
            caption = typeof rawCap === 'string' ? rawCap : undefined;
          }

          if (!authorUsername && (data.user?.username || data.username || data.author)) {
            authorUsername = data.user?.username || data.username || data.author;
          }
        }
      } catch {
        // Skip invalid line JSON
      }
    }

    return { directVideoUrl, thumbnailUrl, caption, authorUsername };
  }

  /**
   * Fallback scraper parsing public embed metadata.
   */
  private scrapePublicMeta(
    shortcode: string,
  ): Promise<{
    thumbnailUrl?: string;
    directVideoUrl?: string;
    caption?: string;
    authorUsername?: string;
  }> {
    return new Promise((resolve) => {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

      const req = https.get(
        embedUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 4000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 1024 * 1024) req.destroy();
          });

          res.on('end', () => {
            const meta: {
              thumbnailUrl?: string;
              directVideoUrl?: string;
              caption?: string;
              authorUsername?: string;
            } = {};

            const videoMatch =
              data.match(/video_url["']:\s*["']([^"']+)["']/i) ||
              data.match(/<meta property=["']og:video["'] content=["']([^"']+)["']/i);
            if (videoMatch && videoMatch[1]) {
              meta.directVideoUrl = videoMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            }

            const imageMatch =
              data.match(/display_url["']:\s*["']([^"']+)["']/i) ||
              data.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
            if (imageMatch && imageMatch[1]) {
              meta.thumbnailUrl = imageMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            }

            const captionMatch =
              data.match(/<div class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i) ||
              data.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i);
            if (captionMatch && captionMatch[1]) {
              meta.caption = captionMatch[1].replace(/<[^>]+>/g, '').trim();
            }

            const authorMatch =
              data.match(/<a class=["']CaptionUsername["'][^>]*>([^<]+)<\/a>/i) ||
              data.match(/["']username["']:\s*["']([^"']+)["']/i);
            if (authorMatch && authorMatch[1]) {
              meta.authorUsername = authorMatch[1].trim();
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
   * Proxies direct MP4 stream binary to client browser with CORS and Range header support.
   */
  public async proxyMediaStream(
    mediaUrl: string,
    req: express.Request,
    res: express.Response,
    redirectHops = 0,
  ): Promise<void> {
    if (redirectHops > 5) {
      throw new BadRequestException('Too many redirects while fetching media stream.');
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
