import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://backend-9i6w.onrender.com';

/* ─── Types ─────────────────────────────────────────────── */
interface ReplyRef {
  id?: number;
  nickname: string;
  message: string;
}

interface Message {
  id?: number;
  nickname: string;
  message: string;
  createdAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  replyTo?: ReplyRef;
}

interface User {
  id: number;
  nickname: string;
  isOnline: boolean;
  lastSeen?: string;
  deviceType?: string;
  deviceModel?: string;
  browser?: string;
  os?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
const resolveUrl = (url: string) =>
  url.startsWith('http') ? url : `${SOCKET_URL}${url}`;

const formatBytes = (bytes?: number | string) => {
  if (!bytes) return '';
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return '';
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1048576) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / 1048576).toFixed(1)} MB`;
};

const fmtTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getDeviceMetadata = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown', os = 'Unknown', deviceType = 'Desktop';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Trident')) browser = 'Internet Explorer';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
  else if (ua.includes('Linux')) os = 'Linux';
  return { deviceType, deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop', browser, os };
};

const initials = (name: string) =>
  name.replace(/[^\w\s]/g, '').trim().slice(0, 2).toUpperCase() || '??';

/* ─── CSS (injected once) ────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

:root {
  --rose:        #D4537E;
  --rose-deep:   #993556;
  --rose-mid:    #ED93B1;
  --rose-light:  #FBEAF0;
  --rose-soft:   #F4C0D1;
  --plum:        #534AB7;
  --plum-light:  #EEEDFE;
  --plum-soft:   #CECBF6;
  --gold:        #BA7517;
  --gold-light:  #FAEEDA;
  --cream:       #FFF9FB;
  --text1:       #2C1A22;
  --text2:       #72243E;
  --text3:       #9E6B7E;
  --border:      rgba(212,83,126,.18);
  --shadow:      0 4px 24px rgba(212,83,126,.10);
  --radius:      16px;
  --transition:  0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

@media (prefers-color-scheme: dark) {
  :root {
    --cream:   #1A0E14;
    --text1:   #F4C0D1;
    --text2:   #ED93B1;
    --text3:   #9E6B7E;
    --border:  rgba(212,83,126,.22);
  }
}

html, body, #root { 
  height: 100%; 
  overflow: hidden;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
}

/* ── Floating Hearts Background ── */
.floating-hearts-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.floating-heart {
  position: absolute;
  font-size: 20px;
  opacity: 0.12;
  animation: floatHeart linear infinite;
  user-select: none;
}

@keyframes floatHeart {
  0% {
    transform: translateY(100vh) rotate(0deg) scale(0.5);
    opacity: 0;
  }
  10% {
    opacity: 0.12;
  }
  90% {
    opacity: 0.12;
  }
  100% {
    transform: translateY(-10vh) rotate(720deg) scale(1);
    opacity: 0;
  }
}

/* ── Love Particles ── */
.love-particles {
  position: fixed;
  pointer-events: none;
  z-index: 1;
  inset: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  font-size: 14px;
  animation: particleFloat 3s ease-out forwards;
  user-select: none;
}

@keyframes particleFloat {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-200px) scale(0.3) rotate(360deg);
  }
}

.lr-app {
  display: flex;
  height: 100vh;
  height: 100dvh;
  background: var(--cream);
  font-family: 'Lato', sans-serif;
  color: var(--text1);
  overflow: hidden;
  position: relative;
  z-index: 1;
  width: 100%;
}

/* ── Sidebar ── */
.lr-sidebar {
  width: 280px;
  min-width: 280px;
  max-width: 85vw;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--cream);
  position: relative;
  z-index: 2;
  height: 100%;
}

.lr-sidebar-head {
  padding: 20px 16px 14px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(212,83,126,0.05), rgba(83,74,183,0.05));
  flex-shrink: 0;
}

.lr-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--rose);
  letter-spacing: 0.3px;
}

.lr-logo-heart {
  font-size: 22px;
  animation: heartbeat 1.4s ease-in-out infinite;
  display: inline-block;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.3); }
  28% { transform: scale(1); }
  42% { transform: scale(1.3); }
  70% { transform: scale(1); }
}

.lr-subtitle {
  font-size: 10px;
  color: var(--text3);
  margin-top: 2px;
  letter-spacing: 0.4px;
  font-weight: 300;
}

.lr-users {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  -webkit-overflow-scrolling: touch;
}

.lr-users::-webkit-scrollbar {
  width: 3px;
}

.lr-users::-webkit-scrollbar-thumb {
  background: var(--rose-soft);
  border-radius: 4px;
}

.lr-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all var(--transition);
  border-left: 3px solid transparent;
  position: relative;
  min-height: 56px;
}

.lr-user-item:active {
  background: var(--rose-light);
  transform: scale(0.98);
}

.lr-user-item:hover { 
  background: var(--rose-light); 
}

.lr-user-item.active {
  background: var(--rose-light);
  border-left-color: var(--rose);
}

.lr-user-item.active::after {
  content: '♥';
  position: absolute;
  right: 12px;
  color: var(--rose);
  font-size: 11px;
  animation: heartbeat 1.4s ease-in-out infinite;
}

.lr-av {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  position: relative;
}

.lr-av-rose   { background: #F4C0D1; color: #72243E; }
.lr-av-plum   { background: #CECBF6; color: #3C3489; }
.lr-av-teal   { background: #9FE1CB; color: #085041; }
.lr-av-amber  { background: #FAC775; color: #633806; }
.lr-av-gray   { background: #D3D1C7; color: #444441; }

.lr-av-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: absolute;
  bottom: -1px;
  right: -1px;
  border: 2px solid var(--cream);
  transition: all var(--transition);
}

.lr-dot-on  { 
  background: #1D9E75;
  box-shadow: 0 0 8px rgba(29, 158, 117, 0.3);
}

.lr-dot-off { 
  background: #B4B2A9; 
}

.lr-user-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text1);
  line-height: 1.2;
}

.lr-user-meta {
  font-size: 10px;
  color: var(--text3);
  margin-top: 1px;
  line-height: 1.2;
}

.lr-user-device {
  font-size: 9px;
  color: var(--text3);
  opacity: 0.6;
  line-height: 1.2;
}

.lr-sidebar-foot {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  font-size: 10px;
  color: var(--text3);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(212,83,126,0.03), rgba(83,74,183,0.03));
}

/* ── Chat Main ── */
.lr-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  z-index: 2;
  background: var(--cream);
  height: 100%;
  width: 100%;
}

.lr-chat-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--cream);
  min-height: 60px;
  flex-shrink: 0;
}

.lr-head-av {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.lr-head-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text1);
  line-height: 1.2;
}

.lr-head-status {
  font-size: 10px;
  color: var(--text3);
  margin-top: 1px;
  line-height: 1.2;
}

.lr-head-status.online {
  color: #1D9E75;
}

.lr-head-status.online::before {
  content: '●';
  margin-right: 4px;
}

.lr-head-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.lr-icon-btn {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rose);
  font-size: 14px;
  transition: all var(--transition);
  position: relative;
}

.lr-icon-btn:active {
  transform: scale(0.9);
  background: var(--rose-light);
}

.lr-icon-btn .badge {
  position: absolute;
  top: -3px;
  right: -3px;
  background: var(--rose);
  color: white;
  font-size: 8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* ── Messages ── */
.lr-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scroll-behavior: smooth;
  background: var(--cream);
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}

.lr-messages::-webkit-scrollbar {
  width: 4px;
}

.lr-messages::-webkit-scrollbar-track {
  background: transparent;
}

.lr-messages::-webkit-scrollbar-thumb {
  background: var(--rose-soft);
  border-radius: 8px;
}

.lr-date-sep {
  text-align: center;
  font-size: 10px;
  color: var(--text3);
  margin: 8px 0 6px;
  letter-spacing: 0.4px;
  font-weight: 300;
  position: relative;
}

.lr-date-sep::before,
.lr-date-sep::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 25%;
  height: 1px;
  background: var(--border);
}

.lr-date-sep::before {
  left: 0;
}

.lr-date-sep::after {
  right: 0;
}

.lr-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  animation: msgIn 0.25s ease;
  max-width: 100%;
}

@keyframes msgIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.lr-msg-row.mine {
  flex-direction: row-reverse;
}

.lr-msg-av {
  width: 26px;
  height: 26px;
  min-width: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.lr-bubble {
  max-width: 78%;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
}

.lr-bubble:active {
  transform: scale(0.97);
}

.lr-bubble.theirs {
  background: white;
  color: var(--text1);
  border: 1px solid var(--border);
  border-bottom-left-radius: 3px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.lr-bubble.mine {
  background: linear-gradient(135deg, #ED93B1 0%, #D4537E 100%);
  color: #fff;
  border-bottom-right-radius: 3px;
  box-shadow: 0 2px 8px rgba(212,83,126,0.2);
}

.lr-bubble.system-msg {
  background: none;
  border: none;
  color: var(--text3);
  font-size: 11px;
  text-align: center;
  cursor: default;
  max-width: 100%;
  padding: 4px 0;
  opacity: 0.6;
  font-style: italic;
}

.lr-bubble.system-msg:active {
  transform: none;
}

.lr-bubble-time {
  display: block;
  font-size: 9px;
  margin-top: 4px;
  opacity: 0.5;
  text-align: right;
  letter-spacing: 0.2px;
}

.lr-bubble.theirs .lr-bubble-time {
  text-align: left;
}

.lr-bubble.mine .lr-bubble-time {
  color: rgba(255,255,255,0.7);
}

.lr-reply-quote {
  border-left: 2px solid rgba(212,83,126,0.4);
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 11px;
  background: rgba(212,83,126,0.05);
}

.lr-reply-quote strong {
  display: block;
  color: var(--rose);
  margin-bottom: 2px;
  font-size: 10px;
  font-weight: 700;
}

.lr-bubble.mine .lr-reply-quote {
  background: rgba(255,255,255,0.12);
  border-left-color: rgba(255,255,255,0.5);
}

.lr-bubble.mine .lr-reply-quote strong {
  color: rgba(255,255,255,0.85);
}

.lr-bubble.mine .lr-reply-quote span {
  color: rgba(255,255,255,0.75);
}

/* ── File previews ── */
.lr-img-prev {
  max-width: 200px;
  border-radius: 10px;
  display: block;
  margin-top: 4px;
  cursor: zoom-in;
  transition: all var(--transition);
}

.lr-img-prev:active {
  transform: scale(0.98);
}

.lr-video-prev {
  max-width: 220px;
  border-radius: 10px;
  display: block;
  margin-top: 4px;
}

.lr-audio-prev {
  width: 180px;
  margin-top: 4px;
  display: block;
  border-radius: 6px;
  height: 40px;
}

.lr-pdf-prev {
  width: 100%;
  height: 200px;
  border-radius: 10px;
  border: 1px solid var(--border);
  margin-top: 4px;
}

.lr-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(212,83,126,0.08);
  text-decoration: none;
  color: var(--rose);
  font-size: 12px;
  font-weight: 700;
  transition: all var(--transition);
}

.lr-file-chip:active {
  transform: scale(0.97);
}

.lr-bubble.mine .lr-file-chip {
  background: rgba(255,255,255,0.15);
  color: #fff;
}

/* ── Typing ── */
.lr-typing {
  padding: 4px 14px 2px;
  font-size: 11px;
  color: var(--rose);
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  background: var(--cream);
  flex-shrink: 0;
}

.lr-dots {
  display: flex;
  gap: 3px;
}

.lr-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--rose);
  animation: dotBlink 1.4s infinite;
}

.lr-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.lr-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotBlink {
  0%, 80%, 100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* ── Reply banner ── */
.lr-reply-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--rose-light);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text2);
  animation: slideUp 0.2s ease;
  flex-shrink: 0;
  min-height: 36px;
}

@keyframes slideUp {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.lr-reply-bar strong {
  color: var(--rose);
  font-weight: 700;
}

.lr-reply-bar-close {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text3);
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
  transition: all var(--transition);
}

.lr-reply-bar-close:active {
  transform: rotate(90deg);
}

/* ── Lightbox ── */
.lr-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.25s ease;
  backdrop-filter: blur(10px);
  padding: 20px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.lr-lightbox img {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  animation: zoomIn 0.3s ease;
  object-fit: contain;
}

@keyframes zoomIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.lr-lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 32px;
  color: #fff;
  cursor: pointer;
  line-height: 1;
  background: none;
  border: none;
  transition: all var(--transition);
  padding: 8px;
}

.lr-lightbox-close:active {
  transform: rotate(90deg) scale(1.1);
}

/* ── Input row ── */
.lr-input-row {
  padding: 8px 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--cream);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding-bottom: calc(12px + var(--safe-bottom));
}

.lr-input-row input[type="text"] {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 9px 14px;
  font-size: 13px;
  outline: none;
  background: white;
  color: var(--text1);
  font-family: 'Lato', sans-serif;
  transition: all var(--transition);
  min-height: 38px;
  max-height: 80px;
  width: 100%;
  -webkit-appearance: none;
}

.lr-input-row input[type="text"]:focus {
  border-color: var(--rose);
  box-shadow: 0 0 0 3px rgba(212,83,126,0.08);
}

.lr-input-row input[type="text"]::placeholder {
  color: var(--text3);
  font-weight: 300;
  font-size: 12px;
}

.lr-file-label {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--rose);
  font-size: 16px;
  transition: all var(--transition);
  flex-shrink: 0;
  background: white;
}

.lr-file-label:active {
  transform: scale(0.9);
  background: var(--rose-light);
}

.lr-send-btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 20px;
  border: none;
  background: linear-gradient(135deg, #ED93B1, #D4537E);
  color: #fff;
  font-size: 13px;
  font-family: 'Lato', sans-serif;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all var(--transition);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.lr-send-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #D4537E, #993556);
  opacity: 0;
  transition: opacity var(--transition);
}

.lr-send-btn span {
  position: relative;
  z-index: 1;
}

.lr-send-btn:active {
  transform: scale(0.95);
}

.lr-emoji-btn {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: white;
  cursor: pointer;
  color: var(--rose);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  flex-shrink: 0;
}

.lr-emoji-btn:active {
  transform: scale(0.9);
  background: var(--rose-light);
}

/* ── Emoji picker ── */
.lr-emoji-picker {
  position: absolute;
  bottom: 68px;
  right: 12px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 220px;
  max-width: calc(100vw - 24px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  z-index: 100;
  animation: fadeIn 0.2s ease;
  max-height: 240px;
  overflow-y: auto;
}

.lr-emoji-picker button {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  border-radius: 8px;
  transition: all var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lr-emoji-picker button:active {
  background: var(--rose-light);
  transform: scale(1.15);
}

/* ── Heart particles (click effect) ── */
.lr-hearts-layer {
  position: fixed;
  pointer-events: none;
  inset: 0;
  z-index: 100;
  overflow: hidden;
}

.lr-heart-p {
  position: absolute;
  font-size: 16px;
  animation: floatUp 2.5s ease-out forwards;
  user-select: none;
  filter: drop-shadow(0 4px 8px rgba(212,83,126,0.2));
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-160px) scale(0.3) rotate(40deg);
  }
}

/* ── Toast ── */
.lr-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(44,26,34,0.92);
  color: #F4C0D1;
  font-size: 12px;
  padding: 10px 20px;
  border-radius: 24px;
  z-index: 999;
  animation: toastIn 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  font-weight: 500;
  letter-spacing: 0.2px;
  max-width: 90%;
  text-align: center;
  pointer-events: none;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ── Mobile Menu Toggle ── */
.lr-mobile-toggle {
  display: none;
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 50;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--cream);
  color: var(--rose);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  align-items: center;
  justify-content: center;
}

.lr-mobile-toggle:active {
  transform: scale(0.9);
}

.lr-mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 9;
  animation: fadeIn 0.25s ease;
  backdrop-filter: blur(4px);
}

/* ── Scroll to bottom button ── */
.lr-scroll-btn {
  position: absolute;
  bottom: 72px;
  right: 12px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--rose);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(212,83,126,0.25);
  transition: all var(--transition);
  z-index: 5;
}

.lr-scroll-btn.show {
  display: flex;
  animation: fadeIn 0.25s ease;
}

.lr-scroll-btn:active {
  transform: scale(0.9);
}

/* ═══════════════════════════════════════════════════════════
   MOBILE RESPONSIVE - ANDROID FIXED
═══════════════════════════════════════════════════════════ */

/* ── Mobile (up to 768px) ── */
@media (max-width: 768px) {
  .lr-mobile-toggle {
    display: flex;
  }

  .lr-mobile-overlay.show {
    display: block;
  }

  .lr-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 82vw;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
    box-shadow: 4px 0 24px rgba(0,0,0,0.08);
    height: 100%;
    height: 100dvh;
  }

  .lr-sidebar.open {
    transform: translateX(0);
  }

  .lr-chat-head {
    padding: 8px 10px 8px 52px;
    min-height: 52px;
    gap: 8px;
  }

  .lr-head-av {
    width: 32px;
    height: 32px;
    min-width: 32px;
    font-size: 11px;
  }

  .lr-head-name {
    font-size: 13px;
  }

  .lr-head-status {
    font-size: 9px;
  }

  .lr-icon-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
    font-size: 13px;
  }

  .lr-icon-btn .badge {
    width: 14px;
    height: 14px;
    font-size: 7px;
    top: -2px;
    right: -2px;
  }

  .lr-messages {
    padding: 8px 10px 4px;
    gap: 4px;
  }

  .lr-msg-av {
    width: 22px;
    height: 22px;
    min-width: 22px;
    font-size: 8px;
  }

  .lr-bubble {
    max-width: 82%;
    font-size: 12px;
    padding: 7px 10px;
    border-radius: 14px;
  }

  .lr-bubble-time {
    font-size: 8px;
    margin-top: 3px;
  }

  .lr-reply-quote {
    font-size: 10px;
    padding: 3px 6px;
    margin-bottom: 4px;
  }

  .lr-reply-quote strong {
    font-size: 9px;
  }

  .lr-date-sep {
    font-size: 9px;
    margin: 6px 0 4px;
  }

  .lr-date-sep::before,
  .lr-date-sep::after {
    width: 20%;
  }

  .lr-input-row {
    padding: 6px 8px 10px;
    gap: 5px;
    padding-bottom: calc(10px + var(--safe-bottom));
  }

  .lr-input-row input[type="text"] {
    min-height: 34px;
    padding: 7px 12px;
    font-size: 12px;
    border-radius: 18px;
  }

  .lr-input-row input[type="text"]::placeholder {
    font-size: 11px;
  }

  .lr-file-label,
  .lr-emoji-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 14px;
  }

  .lr-send-btn {
    height: 34px;
    padding: 0 12px;
    font-size: 12px;
    border-radius: 18px;
  }

  .lr-emoji-picker {
    bottom: 62px;
    right: 8px;
    width: 200px;
    padding: 8px;
    gap: 3px;
  }

  .lr-emoji-picker button {
    width: 30px;
    height: 30px;
    min-width: 30px;
    font-size: 16px;
  }

  .lr-typing {
    padding: 3px 10px 2px;
    font-size: 10px;
    min-height: 20px;
  }

  .lr-dots span {
    width: 4px;
    height: 4px;
  }

  .lr-reply-bar {
    padding: 5px 10px;
    font-size: 10px;
    min-height: 30px;
    gap: 4px;
  }

  .lr-reply-bar-close {
    font-size: 16px;
  }

  .lr-scroll-btn {
    bottom: 64px;
    right: 8px;
    width: 34px;
    height: 34px;
    font-size: 14px;
  }

  .lr-toast {
    bottom: 70px;
    font-size: 11px;
    padding: 8px 16px;
    max-width: 92%;
  }

  .lr-img-prev,
  .lr-video-prev {
    max-width: 160px;
  }

  .lr-audio-prev {
    width: 140px;
    height: 36px;
  }

  .lr-pdf-prev {
    height: 160px;
  }

  .lr-file-chip {
    font-size: 11px;
    padding: 5px 8px;
  }

  .lr-file-chip span[style*="font-size: 18px"] {
    font-size: 15px !important;
  }

  .lr-sidebar-head {
    padding: 14px 14px 10px;
  }

  .lr-logo {
    font-size: 16px;
  }

  .lr-logo-heart {
    font-size: 20px;
  }

  .lr-subtitle {
    font-size: 9px;
  }

  .lr-user-item {
    padding: 8px 12px;
    min-height: 48px;
    gap: 8px;
  }

  .lr-av {
    width: 34px;
    height: 34px;
    min-width: 34px;
    font-size: 11px;
  }

  .lr-av-dot {
    width: 8px;
    height: 8px;
    border-width: 1.5px;
  }

  .lr-user-name {
    font-size: 12px;
  }

  .lr-user-meta {
    font-size: 9px;
  }

  .lr-user-device {
    font-size: 8px;
  }

  .lr-user-item.active::after {
    font-size: 10px;
    right: 10px;
  }

  .lr-sidebar-foot {
    padding: 8px 12px;
    font-size: 9px;
  }

  .lr-head-actions .lr-icon-btn:last-child {
    display: flex;
  }
}

/* ── Small phones (up to 480px) ── */
@media (max-width: 480px) {
  .lr-chat-head {
    padding: 6px 8px 6px 48px;
    min-height: 46px;
    gap: 6px;
  }

  .lr-head-av {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 10px;
  }

  .lr-head-name {
    font-size: 12px;
  }

  .lr-head-status {
    font-size: 8px;
  }

  .lr-icon-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 12px;
  }

  .lr-messages {
    padding: 6px 8px 3px;
    gap: 3px;
  }

  .lr-msg-av {
    width: 20px;
    height: 20px;
    min-width: 20px;
    font-size: 7px;
  }

  .lr-bubble {
    max-width: 85%;
    font-size: 11px;
    padding: 6px 9px;
    border-radius: 12px;
  }

  .lr-bubble-time {
    font-size: 7px;
  }

  .lr-reply-quote {
    font-size: 9px;
    padding: 2px 5px;
  }

  .lr-reply-quote strong {
    font-size: 8px;
  }

  .lr-date-sep {
    font-size: 8px;
    margin: 4px 0 3px;
  }

  .lr-date-sep::before,
  .lr-date-sep::after {
    width: 15%;
  }

  .lr-input-row {
    padding: 4px 6px 8px;
    gap: 4px;
    padding-bottom: calc(8px + var(--safe-bottom));
  }

  .lr-input-row input[type="text"] {
    min-height: 30px;
    padding: 5px 10px;
    font-size: 11px;
    border-radius: 16px;
  }

  .lr-input-row input[type="text"]::placeholder {
    font-size: 10px;
  }

  .lr-file-label,
  .lr-emoji-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
    font-size: 12px;
  }

  .lr-send-btn {
    height: 30px;
    padding: 0 10px;
    font-size: 11px;
    border-radius: 16px;
  }

  .lr-emoji-picker {
    bottom: 56px;
    right: 4px;
    width: 180px;
    padding: 6px;
    gap: 2px;
  }

  .lr-emoji-picker button {
    width: 26px;
    height: 26px;
    min-width: 26px;
    font-size: 14px;
  }

  .lr-typing {
    padding: 2px 8px 1px;
    font-size: 9px;
    min-height: 18px;
  }

  .lr-dots span {
    width: 3px;
    height: 3px;
  }

  .lr-reply-bar {
    padding: 4px 8px;
    font-size: 9px;
    min-height: 26px;
  }

  .lr-reply-bar-close {
    font-size: 14px;
  }

  .lr-scroll-btn {
    bottom: 56px;
    right: 6px;
    width: 30px;
    height: 30px;
    font-size: 12px;
  }

  .lr-toast {
    bottom: 60px;
    font-size: 10px;
    padding: 6px 14px;
    max-width: 94%;
  }

  .lr-img-prev,
  .lr-video-prev {
    max-width: 130px;
  }

  .lr-audio-prev {
    width: 120px;
    height: 32px;
  }

  .lr-pdf-prev {
    height: 130px;
  }

  .lr-file-chip {
    font-size: 10px;
    padding: 4px 7px;
  }

  .lr-file-chip span[style*="font-size: 18px"] {
    font-size: 13px !important;
  }

  .lr-sidebar {
    width: 260px;
    max-width: 85vw;
  }

  .lr-sidebar-head {
    padding: 10px 12px 8px;
  }

  .lr-logo {
    font-size: 14px;
  }

  .lr-logo-heart {
    font-size: 18px;
  }

  .lr-subtitle {
    font-size: 8px;
  }

  .lr-user-item {
    padding: 6px 10px;
    min-height: 42px;
    gap: 6px;
  }

  .lr-av {
    width: 30px;
    height: 30px;
    min-width: 30px;
    font-size: 10px;
  }

  .lr-av-dot {
    width: 7px;
    height: 7px;
    border-width: 1.5px;
  }

  .lr-user-name {
    font-size: 11px;
  }

  .lr-user-meta {
    font-size: 8px;
  }

  .lr-user-device {
    font-size: 7px;
  }

  .lr-user-item.active::after {
    font-size: 9px;
    right: 8px;
  }

  .lr-sidebar-foot {
    padding: 6px 10px;
    font-size: 8px;
  }

  .lr-mobile-toggle {
    width: 34px;
    height: 34px;
    font-size: 16px;
    top: 6px;
    left: 6px;
  }

  .lr-head-actions .lr-icon-btn:last-child {
    display: none;
  }
}

/* ── Very small phones (up to 360px) ── */
@media (max-width: 360px) {
  .lr-chat-head {
    padding-left: 44px;
    min-height: 42px;
  }

  .lr-head-av {
    width: 24px;
    height: 24px;
    min-width: 24px;
    font-size: 9px;
  }

  .lr-head-name {
    font-size: 11px;
  }

  .lr-bubble {
    font-size: 10px;
    padding: 5px 8px;
    max-width: 90%;
  }

  .lr-input-row input[type="text"] {
    min-height: 28px;
    font-size: 10px;
    padding: 4px 8px;
  }

  .lr-file-label,
  .lr-emoji-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 11px;
  }

  .lr-send-btn {
    height: 28px;
    padding: 0 8px;
    font-size: 10px;
  }

  .lr-emoji-picker {
    width: 160px;
    bottom: 50px;
  }

  .lr-emoji-picker button {
    width: 24px;
    height: 24px;
    min-width: 24px;
    font-size: 12px;
  }

  .lr-img-prev,
  .lr-video-prev {
    max-width: 110px;
  }

  .lr-audio-prev {
    width: 100px;
    height: 28px;
  }

  .lr-pdf-prev {
    height: 110px;
  }

  .lr-sidebar {
    max-width: 90vw;
  }
}

/* ── Landscape mobile ── */
@media (max-height: 500px) and (orientation: landscape) {
  .lr-chat-head {
    min-height: 40px;
    padding: 4px 8px 4px 44px;
  }

  .lr-head-av {
    width: 26px;
    height: 26px;
    min-width: 26px;
    font-size: 9px;
  }

  .lr-head-name {
    font-size: 12px;
  }

  .lr-messages {
    padding: 4px 8px 2px;
    gap: 2px;
  }

  .lr-bubble {
    font-size: 11px;
    padding: 5px 8px;
    max-width: 75%;
  }

  .lr-msg-av {
    width: 18px;
    height: 18px;
    min-width: 18px;
    font-size: 7px;
  }

  .lr-input-row {
    padding: 4px 6px 6px;
  }

  .lr-input-row input[type="text"] {
    min-height: 28px;
    font-size: 11px;
    padding: 4px 10px;
  }

  .lr-file-label,
  .lr-emoji-btn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 12px;
  }

  .lr-send-btn {
    height: 28px;
    padding: 0 10px;
    font-size: 11px;
  }

  .lr-typing {
    min-height: 16px;
    padding: 1px 8px;
    font-size: 9px;
  }

  .lr-reply-bar {
    min-height: 24px;
    padding: 3px 8px;
    font-size: 9px;
  }

  .lr-scroll-btn {
    bottom: 48px;
    right: 6px;
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .lr-toast {
    bottom: 50px;
    font-size: 10px;
    padding: 4px 12px;
  }

  .lr-mobile-toggle {
    width: 30px;
    height: 30px;
    font-size: 14px;
    top: 4px;
    left: 4px;
  }

  .lr-img-prev,
  .lr-video-prev {
    max-width: 120px;
  }

  .lr-audio-prev {
    width: 100px;
    height: 30px;
  }
}

/* ── Fix for Android keyboard issues ── */
@media (max-width: 768px) {
  .lr-input-row input[type="text"] {
    font-size: 16px !important;
  }
}

/* ── Love text animation ── */
.love-text {
  position: fixed;
  pointer-events: none;
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--rose);
  opacity: 0;
  z-index: 50;
  animation: loveTextFloat 3s ease-out forwards;
  text-shadow: 0 4px 20px rgba(212,83,126,0.2);
}

@keyframes loveTextFloat {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translateY(-20px) scale(1.1);
  }
  80% {
    opacity: 1;
    transform: translateY(-70px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-100px) scale(0.8);
  }
}

/* ── User online count badge ── */
.lr-online-count {
  margin-left: auto;
  font-size: 9px;
  opacity: 0.6;
  background: rgba(29, 158, 117, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  color: #1D9E75;
}
`;

/* ─── Color map for avatars ──────────────────────────────── */
const AV_COLORS = ['lr-av-rose','lr-av-plum','lr-av-teal','lr-av-amber','lr-av-gray'];
const userColor = (nick: string) => AV_COLORS[nick.charCodeAt(0) % AV_COLORS.length];

const EMOJIS = ['♥','😍','🌹','💜','😊','🥰','💕','😘','✨','🌸','🦋','🌙','💫','🎀','🌷','😄','🤗','💌','🫶','🕯️'];

/* ═══════════════════════════════════════════════════════════
   ChatRoom Component
═══════════════════════════════════════════════════════════ */
function ChatRoom() {
  const navigate  = useNavigate();
  const nickname  = localStorage.getItem('nickname') || '';
  const passcode  = localStorage.getItem('passcode') || '';

  const [message,     setMessage]     = useState('');
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [users,       setUsers]       = useState<User[]>([]);
  const [replyTo,     setReplyTo]     = useState<Message | null>(null);
  const [typingUser,  setTypingUser]  = useState('');
  const [lightbox,    setLightbox]    = useState<string | null>(null);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [activeUser,  setActiveUser]  = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const socketRef      = useRef<Socket | null>(null);
  const chatRef        = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const typingTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartsLayerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* inject CSS once */
  useEffect(() => {
    if (document.getElementById('lr-styles')) return;
    const s = document.createElement('style');
    s.id = 'lr-styles';
    s.textContent = CSS;
    document.head.appendChild(s);

    // Fix viewport for mobile
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
  }, []);

  /* toast helper */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  /* ── Floating hearts background ── */
  useEffect(() => {
    const container = document.createElement('div');
    container.className = 'floating-hearts-bg';
    container.id = 'floating-hearts-bg';
    document.body.prepend(container);

    const hearts = ['♥', '💕', '❤️', '🌹', '💗'];
    for (let i = 0; i < 15; i++) {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
      heart.style.left = Math.random() * 100 + '%';
      heart.style.fontSize = (10 + Math.random() * 18) + 'px';
      heart.style.animationDuration = (20 + Math.random() * 30) + 's';
      heart.style.animationDelay = (Math.random() * 30) + 's';
      container.appendChild(heart);
    }

    return () => {
      container.remove();
    };
  }, []);

  /* ── Spawn love particles on click ── */
  const spawnLoveParticles = useCallback((x: number, y: number, count = 6) => {
    const container = document.createElement('div');
    container.className = 'love-particles';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const symbols = ['♥', '💕', '❤️', '✨', '💗', '🌹', '💜'];
    const colors = ['#D4537E', '#ED93B1', '#534AB7', '#BA7517', '#FF6B8A'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      particle.style.left = (x + (Math.random() - 0.5) * 80) + 'px';
      particle.style.top = (y + (Math.random() - 0.5) * 30) + 'px';
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.fontSize = (10 + Math.random() * 14) + 'px';
      particle.style.animationDuration = (2 + Math.random() * 2) + 's';
      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 4000);
  }, []);

  /* ── Spawn love text ── */
  const spawnLoveText = useCallback((x: number, y: number) => {
    const texts = ['Love you ♥', 'Forever ♥', 'You & Me ♥', 'Soulmate ♥', 'Together ♥', 'Always ♥', 'Eternal ♥'];
    const el = document.createElement('div');
    el.className = 'love-text';
    el.textContent = texts[Math.floor(Math.random() * texts.length)];
    el.style.left = (x - 50) + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }, []);

  /* ── Heart particles ── */
  const spawnHearts = useCallback((count = 4, x?: number, y?: number) => {
    if (!heartsLayerRef.current) return;
    const layer = heartsLayerRef.current;
    const cx = x ?? window.innerWidth * 0.65;
    const cy = y ?? window.innerHeight * 0.7;
    const shapes = ['♥', '💕', '❤️', '💗', '🌹'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'lr-heart-p';
        el.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        el.style.left = (cx + (Math.random() - 0.5) * 100) + 'px';
        el.style.top = cy + 'px';
        el.style.fontSize = (12 + Math.random() * 18) + 'px';
        el.style.color = ['#D4537E', '#ED93B1', '#534AB7', '#FF6B8A', '#FFB3C6'][Math.floor(Math.random() * 5)];
        el.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
        layer.appendChild(el);
        setTimeout(() => el.remove(), 3000);
      }, i * 80);
    }
  }, []);

  /* ── Scroll to bottom function ── */
  const scrollToBottom = useCallback((immediate = false) => {
    if (!chatRef.current) return;
    
    const doScroll = () => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    };

    if (immediate) {
      doScroll();
    } else {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      requestAnimationFrame(() => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(doScroll, 50);
      });
    }
  }, []);

  /* ── Auto-scroll to bottom on messages change ── */
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad) {
        setIsFirstLoad(false);
        setTimeout(() => scrollToBottom(true), 150);
      } else {
        scrollToBottom(false);
      }
    }
  }, [messages, isFirstLoad, scrollToBottom]);

  /* ── Scroll listener for showing scroll button ── */
  useEffect(() => {
    const handleScroll = () => {
      if (!chatRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
      setShowScrollBtn(scrollTop < scrollHeight - clientHeight - 80);
    };

    const chat = chatRef.current;
    if (chat) {
      chat.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chat) {
        chat.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  /* ── Socket setup ────────────────────────────────────── */
  useEffect(() => {
    if (!nickname || !passcode) { navigate('/'); return; }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const meta = getDeviceMetadata();
      socket.emit('joinRoom', { nickname, passcode, ...meta });
      socket.emit('getUsers', { passcode });
    });

    socket.on('chatHistory', (data: Message[]) => {
      console.log('History loaded:', data.length);
      setMessages(data || []);
      
      const attemptScroll = (attempt = 0) => {
        if (attempt > 5) return;
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
          setTimeout(() => {
            if (chatRef.current) {
              const { scrollHeight, scrollTop } = chatRef.current;
              if (scrollTop < scrollHeight - 10) {
                attemptScroll(attempt + 1);
              }
            }
          }, 100);
        } else {
          setTimeout(() => attemptScroll(attempt + 1), 100);
        }
      };
      
      setTimeout(() => attemptScroll(0), 150);
    });

    socket.on('newMessage', (data: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      if (data.nickname !== nickname) {
        spawnHearts(2);
        const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
        const y = Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.1;
        spawnLoveParticles(x, y, 5);
      }
    });

    socket.on('usersList', (data: User[]) => setUsers(data || []));

    socket.on('userOnline', ({ nickname: n }: { nickname: string }) =>
      setUsers(prev => prev.map(u => u.nickname === n ? { ...u, isOnline: true } : u)));

    socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) =>
      setUsers(prev => prev.map(u => u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)));

    socket.on('userJoined', ({ nickname: n }: { nickname: string }) => {
      setMessages(prev => [...prev, { nickname: 'System', message: `${n} joined ♥`, createdAt: new Date().toISOString() }]);
      spawnLoveParticles(window.innerWidth / 2, window.innerHeight / 2, 8);
      spawnLoveText(window.innerWidth / 2 - 50, window.innerHeight / 2 - 30);
    });

    socket.on('userLeft', ({ nickname: n }: { nickname: string }) =>
      setMessages(prev => [...prev, { nickname: 'System', message: `${n} left`, createdAt: new Date().toISOString() }]));

    socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser(n);
    });
    socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser('');
    });

    socket.on('connect_error', () => showToast('Reconnecting…'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [nickname, passcode, navigate, spawnHearts, spawnLoveParticles, spawnLoveText]);

  /* ── Send message ─────────────────────────────────── */
  const sendMessage = () => {
    const text = message.trim();
    if (!text || !socketRef.current?.connected) return;

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socketRef.current.emit('stopTyping', { nickname, passcode });

    socketRef.current.emit('sendMessage', {
      nickname, passcode, message: text,
      replyTo: replyTo ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message } : null,
    });

    const x = window.innerWidth * 0.7;
    const y = window.innerHeight * 0.8;
    spawnLoveParticles(x, y, 10);
    spawnHearts(4);
    spawnLoveText(x - 50, y - 30);

    setMessage('');
    setReplyTo(null);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  /* ── Typing indicator ─────────────────────────────── */
  const handleInputChange = (val: string) => {
    setMessage(val);
    socketRef.current?.emit('typing', { nickname, passcode });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { nickname, passcode });
    }, 1500);
  };

  /* ── File upload ──────────────────────────────────── */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res  = await fetch(`${SOCKET_URL}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        socketRef.current?.emit('sendMessage', {
          nickname, passcode, message: '',
          fileUrl: data.fileUrl, fileName: data.fileName,
          fileType: data.fileType, fileSize: data.fileSize,
          replyTo: replyTo ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message } : null,
        });
        setReplyTo(null);
        spawnHearts(4);
        const x = window.innerWidth * 0.7;
        const y = window.innerHeight * 0.8;
        spawnLoveParticles(x, y, 8);
      } catch (err) {
        showToast('Upload failed — please try again');
        console.error(err);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  /* ── Emoji insert ─────────────────────────────────── */
  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  /* ── Reply ────────────────────────────────────────── */
  const startReply = (msg: Message) => {
    if (msg.nickname === 'System') return;
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  /* ── Render file attachments ─────────────────────── */
  const renderFile = (msg: Message) => {
    if (!msg.fileUrl) return null;
    const url  = resolveUrl(msg.fileUrl);
    const type = msg.fileType || '';
    const name = msg.fileName || 'file';

    if (type.startsWith('image/'))
      return (
        <img
          className="lr-img-prev"
          src={url}
          alt={name}
          onClick={e => { e.stopPropagation(); setLightbox(url); }}
          loading="lazy"
        />
      );

    if (type.startsWith('video/'))
      return (
        <video className="lr-video-prev" controls>
          <source src={url} type={type} />
        </video>
      );

    if (type.startsWith('audio/'))
      return <audio className="lr-audio-prev" controls src={url} />;

    if (type === 'application/pdf')
      return <iframe className="lr-pdf-prev" src={url} title={name} />;

    const icon =
      type.includes('word')        ? '📝' :
      type.includes('sheet') || type.includes('excel') ? '📊' :
      type.includes('presentation') || type.includes('powerpoint') ? '📽️' :
      type === 'application/zip' || type.includes('x-zip') ? '📦' :
      type === 'text/plain'        ? '📄' :
      type === 'application/json'  ? '{ }' : '📎';

    return (
      <a
        className="lr-file-chip"
        href={url}
        target="_blank"
        rel="noreferrer"
        download={type === 'application/zip' || type.includes('x-zip')}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 11 }}>{name}</span>
          <span style={{ display: 'block', fontSize: 9, opacity: 0.6, fontWeight: 400 }}>{formatBytes(msg.fileSize)}</span>
        </span>
      </a>
    );
  };

  /* ── Sidebar active user ── */
  const displayUser = users.find(u => u.nickname !== nickname) || users[0];

  /* ── Close sidebar on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (sidebarOpen && !target.closest('.lr-sidebar') && !target.closest('.lr-mobile-toggle')) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [sidebarOpen]);

  const onlineCount = users.filter(u => u.isOnline).length;
  const currentActive = activeUser || (displayUser ? displayUser.nickname : null);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lr-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      <div
        className={`lr-mobile-overlay${sidebarOpen ? ' show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Heart particles layer */}
      <div ref={heartsLayerRef} className="lr-hearts-layer" aria-hidden="true" />

      {/* Lightbox */}
      {lightbox && (
        <div className="lr-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" onClick={e => e.stopPropagation()} />
          <button className="lr-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">×</button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="lr-toast">{toast}</div>}

      <div className="lr-app">
        {/* ── Sidebar ── */}
        <aside className={`lr-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="lr-sidebar-head">
            <div className="lr-logo">
              <span className="lr-logo-heart" aria-hidden="true">♥</span>
              Our Space
            </div>
            <p className="lr-subtitle">✨ Where love speaks ✨</p>
          </div>

          <div className="lr-users">
            {users.map(user => (
              <div
                key={user.id}
                className={`lr-user-item${currentActive === user.nickname ? ' active' : ''}`}
                onClick={() => {
                  setActiveUser(user.nickname);
                  if (window.innerWidth <= 768) setSidebarOpen(false);
                }}
              >
                <div className={`lr-av ${userColor(user.nickname)}`}>
                  {initials(user.nickname)}
                  <span className={`lr-av-dot ${user.isOnline ? 'lr-dot-on' : 'lr-dot-off'}`} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="lr-user-name">{user.nickname}</p>
                  <p className="lr-user-meta">
                    {user.isOnline
                      ? '💕 Online'
                      : user.lastSeen
                      ? `Last seen ${new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Offline'}
                  </p>
                  {(user.os || user.browser) && (
                    <p className="lr-user-device">{user.os} · {user.browser}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lr-sidebar-foot">
            <span aria-hidden="true">💝</span>
            {nickname}
            <span className="lr-online-count">{onlineCount} online</span>
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className="lr-chat">
          {/* Header */}
          <div className="lr-chat-head">
            {displayUser ? (
              <>
                <div className={`lr-head-av lr-av ${userColor(displayUser.nickname)}`}>
                  {initials(displayUser.nickname)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="lr-head-name">{displayUser.nickname}</p>
                  <p className={`lr-head-status${displayUser.isOnline ? ' online' : ''}`}>
                    {displayUser.isOnline ? 'Online 💕' : 'Offline'}
                  </p>
                </div>
              </>
            ) : (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="lr-head-name" style={{ color: 'var(--rose)' }}>
                  💕 Waiting for love…
                </p>
              </div>
            )}

            <div className="lr-head-actions">
              <button
                className="lr-icon-btn"
                title="Send hearts"
                aria-label="Send hearts"
                onClick={() => {
                  const x = window.innerWidth * 0.7;
                  const y = window.innerHeight * 0.4;
                  spawnHearts(8);
                  spawnLoveParticles(x, y, 12);
                  spawnLoveText(x - 50, y - 30);
                  socketRef.current?.emit('sendMessage', {
                    nickname, passcode, message: '♥♥♥', replyTo: null,
                  });
                }}
              >
                ♥
                <span className="badge">💕</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="lr-messages" ref={chatRef} role="log" aria-live="polite">
            {messages.map((msg, idx) => {
              const isMe     = msg.nickname === nickname;
              const isSystem = msg.nickname === 'System';

              const msgDate  = msg.createdAt ? new Date(msg.createdAt).toDateString() : '';
              const prevDate = idx > 0 && messages[idx - 1].createdAt
                ? new Date(messages[idx - 1].createdAt!).toDateString() : '';
              const showDate = msgDate && msgDate !== prevDate;

              return (
                <div key={msg.id ?? `${msg.nickname}-${idx}`} style={{ width: '100%' }}>
                  {showDate && (
                    <div className="lr-date-sep">
                      {new Date(msg.createdAt!).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                  <div className={`lr-msg-row${isMe ? ' mine' : ''}`}>
                    {!isSystem && (
                      <div
                        className={`lr-msg-av lr-av ${userColor(msg.nickname)}`}
                        title={msg.nickname}
                      >
                        {initials(msg.nickname)}
                      </div>
                    )}
                    <div
                      className={`lr-bubble${isSystem ? ' system-msg' : isMe ? ' mine' : ' theirs'}`}
                      onClick={() => !isSystem && startReply(msg)}
                      title={isSystem ? '' : 'Click to reply 💕'}
                    >
                      {msg.replyTo && (
                        <div className="lr-reply-quote">
                          <strong>{msg.replyTo.nickname}</strong>
                          <span>
                            {msg.replyTo.message
                              ? (msg.replyTo.message.length > 50 ? msg.replyTo.message.slice(0, 50) + '…' : msg.replyTo.message)
                              : '📎 Attachment'}
                          </span>
                        </div>
                      )}

                      {msg.message && <span>{msg.message}</span>}
                      {renderFile(msg)}

                      {!isSystem && (
                        <time className="lr-bubble-time">{fmtTime(msg.createdAt)}</time>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll to bottom button */}
          <button
            className={`lr-scroll-btn${showScrollBtn ? ' show' : ''}`}
            onClick={() => scrollToBottom(true)}
            aria-label="Scroll to bottom"
          >
            ↓
          </button>

          {/* Typing indicator */}
          <div className="lr-typing" aria-live="polite" style={{ visibility: typingUser ? 'visible' : 'hidden' }}>
            {typingUser && (
              <>
                <span>💕 {typingUser} is typing</span>
                <span className="lr-dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
              </>
            )}
          </div>

          {/* Reply banner */}
          {replyTo && (
            <div className="lr-reply-bar">
              💕 Replying to <strong>{replyTo.nickname}</strong>:{' '}
              <span style={{ color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyTo.message
                  ? (replyTo.message.length > 40 ? replyTo.message.slice(0, 40) + '…' : replyTo.message)
                  : '📎 Attachment'}
              </span>
              <button className="lr-reply-bar-close" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="lr-emoji-picker" role="dialog" aria-label="Emoji picker">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => insertEmoji(e)} aria-label={e}>{e}</button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="lr-input-row">
            <label className="lr-file-label" htmlFor="lr-file" title="Attach file" aria-label="Attach file">
              {uploading ? '⏳' : '📎'}
            </label>
            <input
              type="file"
              id="lr-file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFile}
            />

            <button
              className="lr-emoji-btn"
              onClick={() => setShowEmoji(v => !v)}
              aria-label="Emoji picker"
              title="Emoji"
            >
              😊
            </button>

            <input
              ref={inputRef}
              type="text"
              value={message}
              placeholder="Write something sweet… 💕"
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              aria-label="Message input"
              inputMode="text"
              autoCorrect="on"
              autoCapitalize="sentences"
            />

            <button
              className="lr-icon-btn"
              onClick={() => {
                const x = window.innerWidth * 0.7;
                const y = window.innerHeight * 0.8;
                spawnHearts(5);
                spawnLoveParticles(x, y, 8);
                socketRef.current?.emit('sendMessage', { nickname, passcode, message: '♥', replyTo: null });
              }}
              title="Send heart"
              aria-label="Send heart"
            >
              ♥
            </button>

            <button className="lr-send-btn" onClick={sendMessage} aria-label="Send message">
              <span>Send 💕</span>
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

export default ChatRoom;
