/**
 * Detects live Battery Status using the Battery Status API (navigator.getBattery)
 */
export async function getBatteryInfo() {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100);
      const isCharging = battery.charging;
      const label = `${isCharging ? '⚡' : '🔋'} ${level}%`;
      return { level, isCharging, label };
    } catch (e) {
      // Fallback if Battery API throws
    }
  }
  return { level: 100, isCharging: false, label: '🔋 100%' };
}

/**
 * Synchronous fallback battery helper
 */
export function detectBatteryInfoSync() {
  return { level: 100, isCharging: false, label: '🔋 100%' };
}

/**
 * Detects live Network Connection metrics using Network Information API
 */
export function detectNetworkInfo() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const connection =
    typeof navigator !== 'undefined'
      ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
      : null;

  let effectiveType = '4g';
  let downlink = 10; // Mbps
  let rtt = 25; // ms
  let saveData = false;

  if (connection) {
    effectiveType = connection.effectiveType || '4g';
    downlink = connection.downlink || 10;
    rtt = connection.rtt || 25;
    saveData = Boolean(connection.saveData);
  }

  const label = isOnline
    ? `${effectiveType.toUpperCase()} • ${rtt}ms`
    : '🔴 Offline';

  return {
    isOnline,
    effectiveType,
    downlink,
    rtt,
    saveData,
    label,
  };
}

export function detectClientDevice() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let deviceType = 'Desktop';
  let deviceModel = 'PC';
  let os = 'Windows';
  let browser = 'Browser';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceType = 'Mobile';
    deviceModel = 'iPhone';
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    deviceType = 'Mobile';
    deviceModel = 'Android Phone';
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'MacBook';
    os = 'Mac';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'Windows PC';
    os = 'Windows';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Desktop';
    deviceModel = 'Linux PC';
    os = 'Linux';
  }

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  }

  const network = detectNetworkInfo();
  const battery = detectBatteryInfoSync();

  return { deviceType, deviceModel, browser, os, network, battery };
}
