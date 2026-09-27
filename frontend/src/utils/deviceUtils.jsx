/**
 * Detects live Battery Status using the Battery Status API (navigator.getBattery)
 */
export async function getBatteryInfo() {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await (navigator.getBattery ? navigator.getBattery() : null);
      if (battery && typeof battery.level === 'number') {
        const level = Math.round(battery.level * 100);
        const isCharging = Boolean(battery.charging);
        const label = `${isCharging ? '⚡' : '🔋'} ${level}%`;
        return { level, isCharging, label };
      }
    } catch {
      // Fallback if Battery API is restricted or throws
    }
  }
  return { level: null, isCharging: false, label: null };
}

/**
 * Synchronous fallback battery helper
 */
export function detectBatteryInfoSync() {
  return { level: null, isCharging: false, label: null };
}

/**
 * Detects live Network Connection metrics using Network Information API
 * Does NOT fabricate fake 4G / 25ms metrics on browsers where unsupported (iOS Safari, macOS Safari, Firefox).
 */
export function detectNetworkInfo() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const connection =
    typeof navigator !== 'undefined'
      ? navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection
      : null;

  let effectiveType = null;
  let downlink = null;
  let rtt = null;
  let saveData = false;

  if (connection) {
    effectiveType = connection.effectiveType || null;
    downlink = typeof connection.downlink === 'number' ? connection.downlink : null;
    rtt = typeof connection.rtt === 'number' ? connection.rtt : null;
    saveData = Boolean(connection.saveData);
  }

  let label = null;
  if (!isOnline) {
    label = '🔴 Offline';
  } else if (connection && effectiveType) {
    label = `${effectiveType.toUpperCase()}${rtt !== null ? ` • ${rtt}ms` : ''}`;
  } else {
    label = 'Online';
  }

  return {
    isOnline,
    effectiveType,
    downlink,
    rtt,
    saveData,
    label,
  };
}

/**
 * Accurately detects client device, OS, and browser.
 * Properly recognizes iPadOS desktop User-Agents via touch points,
 * Android tablets, Chromebooks, and modern browsers.
 */
export function detectClientDevice() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0;
  const isTouchDevice = maxTouchPoints > 0;

  let deviceType = 'Desktop';
  let deviceModel = 'PC';
  let os = 'Windows';
  let browser = 'Browser';

  // 1. iPad Detection (including iPadOS desktop user-agent which masks as Macintosh)
  const isIPad = /iPad/i.test(ua) || (/Macintosh|Mac OS X/i.test(ua) && maxTouchPoints > 1);

  if (isIPad) {
    deviceType = 'Tablet';
    deviceModel = 'iPad';
    os = 'iPadOS';
  } else if (/iPhone|iPod/i.test(ua)) {
    deviceType = 'Mobile';
    deviceModel = 'iPhone';
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    const isTablet = /Tablet|Tab/i.test(ua) || (!/Mobile/i.test(ua) && isTouchDevice);
    deviceType = isTablet ? 'Tablet' : 'Mobile';
    deviceModel = isTablet ? 'Android Tablet' : 'Android Phone';
    os = 'Android';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'Chromebook';
    os = 'ChromeOS';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'Mac';
    os = 'macOS';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'Windows PC';
    os = 'Windows';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'Linux PC';
    os = 'Linux';
  }

  // 2. Browser Detection (ordered from most specific to generic)
  if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Brave/i.test(ua) || (typeof navigator !== 'undefined' && Boolean(navigator.brave))) {
    browser = 'Brave';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua)) {
    browser = 'Safari';
  }

  const network = detectNetworkInfo();
  const battery = detectBatteryInfoSync();

  return { deviceType, deviceModel, browser, os, network, battery };
}

/**
 * Subscribes to live network and battery changes to keep presence telemetry updated
 * Returns an unsubscribe cleanup function.
 */
export function subscribeDeviceTelemetry(onUpdate) {
  if (typeof window === 'undefined') return () => {};

  let activeBattery = null;

  const handleNetworkChange = () => {
    const network = detectNetworkInfo();
    onUpdate({ network });
  };

  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);

  const connection =
    typeof navigator !== 'undefined'
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null;

  if (connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', handleNetworkChange);
  }

  const handleBatteryChange = () => {
    if (activeBattery && typeof activeBattery.level === 'number') {
      const level = Math.round(activeBattery.level * 100);
      const isCharging = Boolean(activeBattery.charging);
      const label = `${isCharging ? '⚡' : '🔋'} ${level}%`;
      onUpdate({ battery: { level, isCharging, label } });
    }
  };

  if (typeof navigator !== 'undefined' && 'getBattery' in navigator && typeof navigator.getBattery === 'function') {
    navigator.getBattery()
      .then((battery) => {
        activeBattery = battery;
        battery.addEventListener('levelchange', handleBatteryChange);
        battery.addEventListener('chargingchange', handleBatteryChange);
      })
      .catch(() => {});
  }

  return () => {
    window.removeEventListener('online', handleNetworkChange);
    window.removeEventListener('offline', handleNetworkChange);
    if (connection && typeof connection.removeEventListener === 'function') {
      connection.removeEventListener('change', handleNetworkChange);
    }
    if (activeBattery) {
      activeBattery.removeEventListener('levelchange', handleBatteryChange);
      activeBattery.removeEventListener('chargingchange', handleBatteryChange);
    }
  };
}
