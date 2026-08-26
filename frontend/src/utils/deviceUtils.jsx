import React from 'react';

export function detectClientDevice() {
  const ua = navigator.userAgent;
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

  return { deviceType, deviceModel, browser, os };
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

  return (
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
        marginTop: '3px',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#00a884' }}>
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}
