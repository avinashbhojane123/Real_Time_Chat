import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { animate, stagger } from 'animejs';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://backend-9i6w.onrender.com';

/* ═══════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════ */
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
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: Record<string, string[]> | null;
  expiresAt?: string;
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
  avatarUrl?: string;
}

/* ═══════════════════════════════════════════════════════════
   Constants
   Centralising "magic numbers" makes the design system
   consistent and easy to tweak from one place.
═══════════════════════════════════════════════════════════ */
const AVATAR_SIZE = { sm: 32, md: 38, lg: 40, xl: 42 } as const;

// Single source of truth for stacking order — avoids scattered
// hard-coded z-index values that are hard to reason about.
const Z = {
  floatingHearts: 0,
  loveAnimations: 2100,
  spawnedParticles: 2200,
  menu: 100,
  pip: 10,
  callControls: 20,
  call: 1500,
  lightbox: 2000,
  toast: 3000,
} as const;

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢'];
const EMOJIS = ['❤️', '😍', '😊', '🥰', '😘', '✨', '😄', '🤗', '👍'];

/* ═══════════════════════════════════════════════════════════
   Pure helpers (unchanged logic, kept outside the component
   so they aren't re-created on every render)
═══════════════════════════════════════════════════════════ */
const resolveUrl = (url: string) => {
  if (!url) return '';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
    return 'about:blank';
  }
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:')) {
    return trimmed;
  }
  const baseUrl = SOCKET_URL.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
};

const formatBytes = (bytes?: number | string) => {
  if (!bytes) return '';
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return '';
  if (numBytes < 1024) return `${numBytes} B`;
  if (numBytes < 1048576) return `${(numBytes / 1024).toFixed(1)} KB`;
  return `${(numBytes / 1048576).toFixed(1)} MB`;
};

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/') && !file.type.includes('svg')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width / height > MAX_WIDTH / MAX_HEIGHT) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
          resolve(dataUrl);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };
      img.src = url;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

const getVideoEmbed = (text: string) => {
  if (!text) return null;

  const instaMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9-_]+)/i);
  if (instaMatch) {
    return { type: 'instagram' as const, url: `https://www.instagram.com/p/${instaMatch[1]}/embed` };
  }

  const ytMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([a-zA-Z0-9-_]+)/i);
  if (ytMatch) {
    return { type: 'youtube' as const, url: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  return null;
};

/* Decorative particle animations — purely visual, wrapped in
   try/catch-free guards since they touch the DOM directly. */
const spawnHearts = (count: number = 8) => {
  const container = document.getElementById('love-animations-container');
  if (!container) return;

  const hearts = ['❤️', '💖', '💝', '💘', '💕', '💗'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.innerText = hearts[Math.floor(Math.random() * hearts.length)];
    el.className = 'spawned-heart-animation';
    el.setAttribute('aria-hidden', 'true');

    const size = Math.random() * 24 + 16;
    const left = Math.random() * 100;
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 0.5;

    el.style.left = `${left}%`;
    el.style.bottom = '-50px';
    el.style.fontSize = `${size}px`;
    el.style.animation = `floatHeartEffect ${duration}s ease-in-out ${delay}s forwards`;

    container.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay) * 1000);
  }
};

const spawnLoveParticles = (x: number, y: number, count: number = 12) => {
  const container = document.getElementById('love-animations-container');
  if (!container) return;

  const particles = ['❤️', '💖', '💘', '✨', '🌸', '💕'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.innerText = particles[Math.floor(Math.random() * particles.length)];
    el.className = 'love-burst-particle';
    el.setAttribute('aria-hidden', 'true');

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 120 + 40;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 80;
    const duration = Math.random() * 1.5 + 1;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${Math.random() * 16 + 12}px`;
    el.style.animation = `particleBurstEffect ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;
    el.style.setProperty('--tx', `${destX}px`);
    el.style.setProperty('--ty', `${destY}px`);

    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000);
  }
};

/* ═══════════════════════════════════════════════════════════
   Small presentational components
   Pulling these out of the giant ChatRoom body (a) makes the
   markup readable, (b) lets React.memo stop unrelated state
   changes (e.g. typing in the input) from re-rendering every
   message/user row, and (c) gives every icon-only control a
   place to carry its own aria-label.
═══════════════════════════════════════════════════════════ */

function Avatar({
  src, name, size, baseUrl, online,
}: { src?: string; name: string; size: number; baseUrl: string; online?: boolean }) {
  const resolved = src ? (src.startsWith('http') ? src : `${baseUrl}${src}`) : '';
  return (
    <div className="position-relative flex-shrink-0" style={{ width: size, height: size }}>
      {resolved ? (
        <img
          src={resolved}
          alt={name}
          className="rounded-circle w-100 h-100"
          style={{ objectFit: 'cover' }}
          loading="lazy"
        />
      ) : (
        <div
          className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold w-100 h-100"
          style={{ fontSize: Math.max(10, size * 0.3) }}
          aria-hidden="true"
        >
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`position-absolute bottom-0 end-0 border border-white rounded-circle ${online ? 'bg-success' : 'bg-secondary'}`}
          style={{ width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28) }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/** AnimeJS powered Sound Wave Visualizer for audio files & live calls */
const AudioWaveVisualizer = memo(function AudioWaveVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const bars = containerRef.current.querySelectorAll('.audio-bar');
      animate(bars, {
        scaleY: [0.2, 1, 0.25, 0.85, 0.3],
        delay: stagger(90),
        duration: 1100,
        loop: true,
        direction: 'alternate',
        ease: 'inOutSine'
      });
    }
  }, []);

  return (
    <div ref={containerRef} className="d-flex align-items-center gap-1 my-2 py-1 px-2 rounded-3 bg-dark bg-opacity-25" style={{ height: 28, width: 140 }}>
      {[0.4, 0.9, 0.3, 0.7, 1.0, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4].map((_, i) => (
        <span
          key={i}
          className="audio-bar rounded-pill flex-grow-1"
          style={{
            height: '100%',
            background: 'linear-gradient(to top, #7c4dff, #00e5ff)',
            transformOrigin: 'bottom',
            display: 'inline-block'
          }}
        />
      ))}
    </div>
  );
});

/** Countdown text for a self-destructing message. Owns its own
 *  1-second interval so a "burning" message never forces the
 *  entire chat log to re-render — only this one line updates. */
const ExpiryCountdown = memo(function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secondsLeft = Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
  return (
    <div className="small text-danger fw-bold mt-1">
      🔥 Expires in: {secondsLeft}s
    </div>
  );
});

interface MessageRowProps {
  msg: Message;
  isMe: boolean;
  nickname: string;
  senderAvatar?: string;
  baseUrl: string;
  isMenuOpen: boolean;
  onToggleMenu: (id: number | null) => void;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (id: number) => void;
  onReact: (id: number, emoji: string) => void;
  onImageClick: (url: string) => void;
  onMediaLoad: () => void;
}

/** One chat bubble. Memoized so typing in the composer, opening
 *  the emoji picker, etc. doesn't re-render the whole message list. */
const MessageRow = memo(function MessageRow({
  msg, isMe, nickname, senderAvatar, baseUrl, isMenuOpen,
  onToggleMenu, onReply, onEdit, onDelete, onReact, onImageClick, onMediaLoad,
}: MessageRowProps) {
  // Locally "self-destructs": once expiresAt passes, this row
  // stops rendering itself instead of the parent re-filtering
  // the entire message array every second.
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!msg.expiresAt) return;
    const remainingMs = new Date(msg.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      setExpired(true);
      return;
    }
    const timeout = setTimeout(() => setExpired(true), remainingMs);
    return () => clearTimeout(timeout);
  }, [msg.expiresAt]);

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (msg.isDeleted) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('select') || target.closest('video')) {
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    dragStartRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStartRef.current;
    let offset = diff;
    if (isMe) {
      if (offset > 0) offset = 0;
      if (offset < -100) offset = -100;
    } else {
      if (offset < 0) offset = 0;
      if (offset > 100) offset = 100;
    }
    setDragOffset(offset);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (Math.abs(dragOffset) >= 50) {
      onReply(msg);
    }
    setDragOffset(0);
  };

  if (expired) return null;

  if (msg.nickname === 'System') {
    return (
      <div className="text-center my-3">
        <span className="badge bg-secondary bg-opacity-10 text-muted border py-2 px-3 rounded-pill fw-normal">
          {msg.message}
        </span>
      </div>
    );
  }

  const embed = !msg.isDeleted ? getVideoEmbed(msg.message) : null;
  const reactionEntries = msg.reactions ? Object.entries(msg.reactions) : [];

  const renderFile = () => {
    if (!msg.fileUrl) return null;
    const url = resolveUrl(msg.fileUrl);
    const type = msg.fileType || '';
    const name = msg.fileName || 'file';

    const isImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i.test(url || name || msg.fileUrl);
    const isVideo = type.startsWith('video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url || name || msg.fileUrl);
    const isAudio = type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(url || name || msg.fileUrl);
    const isPdf = type === 'application/pdf' || /\.pdf(\?.*)?$/i.test(url || name || msg.fileUrl);

    if (isImage)
      return (
        <button
          type="button"
          className="btn p-0 border-0 bg-transparent d-block my-2 overflow-hidden text-start"
          onClick={() => onImageClick(url)}
          aria-label={`Open image ${name} in full screen`}
        >
          <img
            src={url}
            alt={name || 'Shared image'}
            className="img-fluid rounded border chat-media"
            loading="lazy"
            onLoad={onMediaLoad}
            onError={(e) => {
              const imgEl = e.currentTarget;
              if (!imgEl.dataset.retried) {
                imgEl.dataset.retried = 'true';
                if (url.includes('/uploads/')) {
                  imgEl.src = url.replace('/uploads/', '/api/uploads/');
                  return;
                } else if (url.includes('/api/uploads/')) {
                  imgEl.src = url.replace('/api/uploads/', '/uploads/');
                  return;
                }
              }
              imgEl.style.display = 'none';
            }}
          />
        </button>
      );

    if (isVideo)
      return (
        <video className="w-100 rounded border my-2 d-block chat-media" controls onLoadedMetadata={onMediaLoad}>
          <source src={url} type={type || 'video/mp4'} />
          Your browser does not support embedded video.
        </video>
      );

    if (isAudio)
      return (
        <div className="my-2">
          <AudioWaveVisualizer />
          <audio className="w-100 d-block" controls src={url} onLoadedMetadata={onMediaLoad} />
        </div>
      );

    if (isPdf)
      return <iframe className="w-100 rounded border my-2 d-block chat-pdf" src={url} title={name} onLoad={onMediaLoad} />;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline-secondary btn-sm my-2 d-inline-flex align-items-center gap-1"
      >
        📎 {name} <span className="text-muted">({formatBytes(msg.fileSize)})</span>
      </a>
    );
  };

  return (
    <div className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
      {!isMe && (
        <div className="me-2 align-self-end">
          <Avatar src={senderAvatar} name={msg.nickname} size={AVATAR_SIZE.sm} baseUrl={baseUrl} />
        </div>
      )}

      <div className="msg-bubble-container position-relative" style={{ maxWidth: '75%' }}>
        {/* Reply drag icon indicator */}
        {Math.abs(dragOffset) > 10 && (
          <div 
            className="position-absolute top-50 translate-middle-y d-flex align-items-center justify-content-center text-white"
            style={{
              left: isMe ? 'auto' : -35,
              right: isMe ? -35 : 'auto',
              width: 30,
              opacity: Math.min(1, Math.abs(dragOffset) / 50),
              transform: `scale(${Math.min(1.2, Math.abs(dragOffset) / 50)})`,
              zIndex: 0,
              pointerEvents: 'none'
            }}
          >
            ↩️
          </div>
        )}

        <div 
          className={`card border-0 shadow-sm p-3 rounded-4 ${isMe ? 'msg-bubble-mine' : 'msg-bubble-theirs'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            cursor: msg.isDeleted ? 'default' : (isDragging ? 'grabbing' : 'grab'),
            touchAction: 'none',
            zIndex: 1
          }}
        >
          {!isMe && <div className="small fw-bold mb-1 opacity-75">🐱💞 {msg.nickname}</div>}

          {msg.replyTo && (
            <div className={`border-start border-3 ps-2 mb-2 small ${isMe ? 'msg-reply-mine' : 'msg-reply-theirs'}`}>
              <span className="d-block fw-bold">{msg.replyTo.nickname === nickname ? '🐭💕 ' : '🐱💞 '}{msg.replyTo.nickname}</span>
              <span>{msg.replyTo.message ? msg.replyTo.message.slice(0, 60) : '📎 Attachment'}</span>
            </div>
          )}

       
