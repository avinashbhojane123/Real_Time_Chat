/**
 * IndexedDB Wallpaper Offline Storage Utility
 * Provides persistent, quota-free offline storage for room wallpapers.
 * This guarantees custom wallpapers survive browser refreshes, server spin-downs,
 * container restarts on Render, and network disconnects.
 */

const DB_NAME = 'RealTimeChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'wallpapers';

/**
 * Open or create the IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'passcode' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save custom wallpaper offline into IndexedDB and localStorage fallback
 * @param {string} passcode - Room passcode
 * @param {Object} data - { url, dataUrl, theme, timestamp }
 */
export async function saveWallpaperOffline(passcode, { url, dataUrl, theme = 'custom' }) {
  if (!passcode) return;
  const cleanPasscode = String(passcode).trim();
  const timestamp = Date.now();

  const record = {
    passcode: cleanPasscode,
    url: url || '',
    dataUrl: dataUrl || '',
    theme: theme || 'custom',
    updatedAt: timestamp,
  };

  // 1. Try IndexedDB (handles large Base64 blobs with no 5MB quota limit)
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    console.warn('[WallpaperStorage] IndexedDB put failed, falling back to localStorage:', idbErr);
  }

  // 2. LocalStorage fallback (safely guarded against QuotaExceededError)
  try {
    if (theme) {
      localStorage.setItem(`chat_theme_${cleanPasscode}`, theme);
      localStorage.setItem('chat_theme', theme);
    }
    // Only store URL or compact dataUrl in localStorage to avoid QuotaExceededError
    const storageValue = url || (dataUrl && dataUrl.length < 500000 ? dataUrl : '');
    if (storageValue) {
      localStorage.setItem(`chat_custom_wallpaper_${cleanPasscode}`, storageValue);
      localStorage.setItem('chat_custom_wallpaper', storageValue);
    }
  } catch (storageErr) {
    console.warn('[WallpaperStorage] localStorage write skipped (quota exceeded or restricted):', storageErr);
  }
}

/**
 * Retrieve saved wallpaper for a passcode from IndexedDB, falling back to localStorage
 * @param {string} passcode - Room passcode
 * @returns {Promise<{ url: string, dataUrl: string, theme: string, preferred: string } | null>}
 */
export async function getWallpaperOffline(passcode) {
  if (!passcode) return null;
  const cleanPasscode = String(passcode).trim();

  // 1. Try IndexedDB first
  try {
    const db = await openDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanPasscode);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (record) {
      return {
        ...record,
        preferred: record.dataUrl || record.url,
      };
    }
  } catch (idbErr) {
    console.warn('[WallpaperStorage] IndexedDB read failed, trying localStorage:', idbErr);
  }

  // 2. Fallback to localStorage
  try {
    const localWp =
      localStorage.getItem(`chat_custom_wallpaper_${cleanPasscode}`) ||
      localStorage.getItem('chat_custom_wallpaper');
    const localTheme =
      localStorage.getItem(`chat_theme_${cleanPasscode}`) ||
      localStorage.getItem('chat_theme') ||
      'wa-doodle';

    if (localWp) {
      return {
        passcode: cleanPasscode,
        url: localWp.startsWith('data:') ? '' : localWp,
        dataUrl: localWp.startsWith('data:') ? localWp : '',
        theme: localTheme,
        preferred: localWp,
      };
    }
  } catch (err) {
    console.warn('[WallpaperStorage] localStorage read error:', err);
  }

  return null;
}

/**
 * Remove wallpaper offline from IndexedDB & localStorage
 * @param {string} passcode - Room passcode
 */
export async function removeWallpaperOffline(passcode) {
  if (!passcode) return;
  const cleanPasscode = String(passcode).trim();

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(cleanPasscode);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    console.warn('[WallpaperStorage] IndexedDB delete error:', idbErr);
  }

  try {
    localStorage.removeItem(`chat_custom_wallpaper_${cleanPasscode}`);
  } catch {}
}

/**
 * Verifies if an image URL loads properly.
 * Resolves true if valid, false if 404 / 403 / network error.
 * @param {string} url - Image URL to check
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export function checkImageUrlValid(url, timeoutMs = 4000) {
  if (!url) return Promise.resolve(false);
  if (url.startsWith('data:image/')) return Promise.resolve(true);

  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}
