/**
 * Utility to sanitize Instagram share/paste text and parse Instagram URLs.
 * Strips out boilerplate text like "View profile", "View more on Instagram",
 * "Add a comment ...", author lines, and music metadata lines that get copied
 * when users copy/share Instagram Reels or Posts.
 */

/**
 * Parses any Instagram URL from a text message.
 * Extracts shortcode, mediaType ('reel' | 'post' | 'tv' | 'profile'), and clean URL.
 */
export const parseInstagramUrl = (text) => {
  if (!text || typeof text !== 'string') return null;

  // 1. Reel / Post / IGTV match
  const mediaMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(reel|reels|p|tv)\/([a-zA-Z0-9-_]+)/i
  );

  if (mediaMatch && mediaMatch[2]) {
    const rawType = mediaMatch[1].toLowerCase();
    const shortcode = mediaMatch[2];
    const type = rawType.startsWith('reel') ? 'reel' : rawType === 'p' ? 'post' : 'tv';
    return {
      type,
      shortcode,
      cleanUrl: `https://www.instagram.com/${rawType.startsWith('reel') ? 'reel' : 'p'}/${shortcode}/`,
      originalUrl: mediaMatch[0],
    };
  }

  // 2. Profile match
  const profileMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:@)?([a-zA-Z0-9._]+)/i
  );

  if (
    profileMatch &&
    profileMatch[1] &&
    !['p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts', 'direct', 'login'].includes(
      profileMatch[1].toLowerCase()
    )
  ) {
    const username = profileMatch[1].replace(/^@/, '');
    return {
      type: 'profile',
      username,
      cleanUrl: `https://www.instagram.com/${username}/`,
      originalUrl: profileMatch[0],
    };
  }

  return null;
};

/**
 * Helper to get just the shortcode from message text.
 */
export const getInstagramEmbed = (text) => {
  const parsed = parseInstagramUrl(text);
  return parsed?.shortcode || null;
};

/**
 * Strips Instagram copy-share boilerplate lines.
 */
export const cleanInstagramMessage = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Detect Instagram URL if present
  const instaUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9-_]+)[^\s]*/gi;
  const instaUrls = text.match(instaUrlRegex);

  const boilerplateRegex = /^(view profile|view profile on instagram|view more on instagram|view post on instagram|add a comment \.\.\.|add a comment\.\.\.|watch on instagram|watch again|watch reel|open instagram|view profile\.\.\.)$/i;

  const lines = text.split('\n');
  const cleanedLines = [];

  const hasBoilerplateOrUrl = /view profile|view more on instagram|add a comment/i.test(text) || instaUrls !== null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Filter out explicit boilerplate phrases
    if (boilerplateRegex.test(line)) {
      continue;
    }

    const lowerLine = line.toLowerCase();
    if (
      lowerLine === 'view profile' ||
      lowerLine === 'view profile on instagram' ||
      lowerLine === 'view more on instagram' ||
      lowerLine.startsWith('add a comment')
    ) {
      continue;
    }

    // Filter out author/audio lines attached to Instagram share metadata blocks
    if (hasBoilerplateOrUrl) {
      if (
        line.includes('·') ||
        line.includes(' - Remix') ||
        lowerLine.includes('original audio')
      ) {
        continue;
      }

      // Check if this line is adjacent to a boilerplate phrase and looks like username or music title
      const isAdjacentToBoilerplate = lines.some((l, idx) => Math.abs(idx - i) <= 3 && boilerplateRegex.test(l.trim()));
      const isUrl = line.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)/i);

      if (isAdjacentToBoilerplate && !isUrl) {
        if (/^[a-zA-Z0-9_.]+$|^[a-zA-Z0-9_., -]+ \. [a-zA-Z0-9_., -]+$/i.test(line)) {
          continue;
        }
      }
    }

    cleanedLines.push(line);
  }

  const cleanedText = cleanedLines.join('\n').trim();

  // If filtering resulted in no text and an Instagram URL exists, return clean URL
  if (!cleanedText && instaUrls && instaUrls.length > 0) {
    const parsed = parseInstagramUrl(instaUrls[0]);
    return parsed?.cleanUrl || instaUrls[0];
  }

  // If an Instagram URL exists but was not included in cleanedText, append it nicely
  if (cleanedText && instaUrls && instaUrls.length > 0 && !cleanedText.includes(instaUrls[0])) {
    const parsed = parseInstagramUrl(instaUrls[0]);
    const urlToAppend = parsed?.cleanUrl || instaUrls[0];
    return `${cleanedText}\n${urlToAppend}`.trim();
  }

  return cleanedText || (instaUrls ? instaUrls[0] : text);
};
