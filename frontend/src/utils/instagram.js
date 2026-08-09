/**
 * Utility to sanitize Instagram share/paste text.
 * Strips out boilerplate text like "View profile", "View more on Instagram",
 * "Add a comment ...", author lines, and music metadata lines that get copied
 * when users copy/share Instagram Reels or Posts.
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
        // If line is short username or music credit without sentence punctuation
        if (/^[a-zA-Z0-9_.]+$|^[a-zA-Z0-9_., -]+ \. [a-zA-Z0-9_., -]+$/i.test(line)) {
          continue;
        }
      }
    }

    cleanedLines.push(line);
  }

  const cleanedText = cleanedLines.join('\n').trim();

  // If filtering resulted in no text (or only metadata stripped) and an Instagram URL exists, return the URL
  if (!cleanedText && instaUrls && instaUrls.length > 0) {
    return instaUrls[0];
  }

  // If an Instagram URL exists but was not included in cleanedText, append it nicely
  if (cleanedText && instaUrls && instaUrls.length > 0 && !cleanedText.includes(instaUrls[0])) {
    return `${cleanedText}\n${instaUrls[0]}`.trim();
  }

  return cleanedText || (instaUrls ? instaUrls[0] : text);
};
