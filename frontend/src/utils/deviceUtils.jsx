import React from 'react';

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

  // Format human-readable connection label (e.g., '📶 4G • 25ms')
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

  return { deviceType, deviceModel, browser, os, network };
}

export function renderDeviceBadge(user) {
  if (!user) return null;
  const os = user.os || '';
  const deviceType = user.deviceType || '';
  const browser = user.browser || '';

  let icon = 'computer';
  let label = 'Desktop';

  if (os === 'iOS' || user.deviceModel?.includes('iPhone')) {
    icon = 'phone_iphone';
    label = 'iPhone';
  } else if (os === 'Android') {
    icon = 'smartphone';
    label = 'Android';
  } else if (os === 'Mac') {
    icon = 'laptop_mac';
    label = 'MacBook';
  } else if (os === 'Windows') {
    icon = 'desktop_windows';
    label = 'Windows PC';
  } else if (deviceType === 'Mobile') {
    icon = 'smartphone';
    label = 'Mobile';
  }

  if (browser) label += ` • ${browser}`;

  const networkLabel = user.network?.label || user.networkLabel || '4G • 18ms';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.68rem',
          color: '#8696a0',
          backgroundColor: '#202c33',
          padding: '2px 6px',
          borderRadius: '4px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#00a884' }}>
          {icon}
        </span>
        <span>{label}</span>
      </span>

      {/* Network Info Badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.68rem',
          color: '#00a884',
          backgroundColor: 'rgba(0, 168, 132, 0.1)',
          border: '1px solid rgba(0, 168, 132, 0.25)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 600,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
          wifi
        </span>
        <span>{networkLabel}</span>
      </span>
    </div>
  );
}
