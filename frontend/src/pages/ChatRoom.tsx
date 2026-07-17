import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

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
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return 'about:blank';
  }
  return url.startsWith('http') ? url : `${SOCKET_URL}${url}`;
};

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

    if (type.startsWith('image/'))
      return (
        <button
          type="button"
          className="btn p-0 border-0 bg-transparent d-block my-2"
          onClick={() => onImageClick(url)}
          aria-label={`Open image ${name} in full screen`}
        >
          <img
            src={url}
            alt={name}
            className="img-fluid rounded border chat-media"
            loading="lazy"
            onLoad={onMediaLoad}
          />
        </button>
      );

    if (type.startsWith('video/'))
      return (
        <video className="w-100 rounded border my-2 d-block chat-media" controls onLoadedMetadata={onMediaLoad}>
          <source src={url} type={type} />
          Your browser does not support embedded video.
        </video>
      );

    if (type.startsWith('audio/'))
      return <audio className="w-100 my-2 d-block" controls src={url} onLoadedMetadata={onMediaLoad} />;

    if (type === 'application/pdf')
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

          <p className={`m-0 chat-text ${msg.isDeleted ? 'fst-italic opacity-50' : ''}`}>{msg.message}</p>

          {embed && (() => {
            const isInstagram = embed.type === 'instagram';
            return (
              <div className="video-embed-wrapper my-2 position-relative">
                <iframe
                  src={embed.url}
                  onLoad={onMediaLoad}
                  width="100%"
                  height={isInstagram ? "450" : "400"}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  allowFullScreen={embed.type === 'youtube'}
                  allow="encrypted-media; picture-in-picture"
                  title={isInstagram ? 'Instagram Reel embed' : 'YouTube Shorts embed'}
                  style={{ pointerEvents: isInstagram ? 'none' : 'auto' }}
                />
                {isInstagram && (
                  <div 
                    className="position-absolute top-0 start-0 w-100 h-100" 
                    style={{ cursor: 'default', zIndex: 5, background: 'transparent' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  />
                )}
              </div>
            );
          })()}

          {renderFile()}

          <div className="d-flex align-items-center justify-content-end gap-2 mt-2 opacity-75 message-meta">
            <span>{fmtTime(msg.createdAt)}</span>
            {msg.isEdited && <span>(edited)</span>}
            {!msg.isDeleted && (
              <button
                type="button"
                className={`btn btn-sm btn-icon-ghost ${isMe ? 'text-white' : 'text-white'}`}
                onClick={() => onToggleMenu(isMenuOpen ? null : (msg.id ?? null))}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                aria-label="Message options"
              >
                ⋮
              </button>
            )}
          </div>

          {msg.expiresAt && <ExpiryCountdown expiresAt={msg.expiresAt} />}
        </div>

        {reactionEntries.length > 0 && (
          <div className="d-flex gap-1 mt-1 flex-wrap" role="group" aria-label="Reactions">
            {reactionEntries.map(([emoji, reactionUsers]) => {
              const hasReacted = reactionUsers.includes(nickname);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(msg.id!, emoji)}
                  className={`badge rounded-pill border py-1 px-2 reaction-pill ${hasReacted ? 'bg-info text-dark border-info' : 'bg-white text-dark'}`}
                  aria-pressed={hasReacted}
                  aria-label={`${emoji} reaction, ${reactionUsers.length} ${reactionUsers.length === 1 ? 'person' : 'people'}. ${reactionUsers.join(', ')}`}
                >
                  {emoji} {reactionUsers.length}
                </button>
              );
            })}
          </div>
        )}

        {isMenuOpen && !msg.isDeleted && (
          <div
            role="menu"
            className="card shadow border-light position-absolute p-2 bg-white rounded-3 mt-1 message-menu"
            style={{ zIndex: Z.menu, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0 }}
          >
            <div className="d-flex justify-content-around pb-2 border-bottom mb-2">
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
                  onClick={() => onReact(msg.id!, emoji)}
                  className="btn btn-sm btn-icon-ghost-light fs-5 hover-scale"
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="d-grid gap-1">
              <button type="button" role="menuitem" className="btn btn-sm btn-light text-start border-0 py-2" onClick={() => onReply(msg)}>
                ↩️ Reply
              </button>
              {isMe && (
                <>
                  <button type="button" role="menuitem" className="btn btn-sm btn-light text-start border-0 py-2" onClick={() => onEdit(msg)}>
                    ✏️ Edit Message
                  </button>
                  <button type="button" role="menuitem" className="btn btn-sm btn-light text-danger text-start border-0 py-2" onClick={() => onDelete(msg.id!)}>
                    🗑️ Delete Message
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {isMe && (
        <div className="ms-2 align-self-end">
          <Avatar src={senderAvatar} name={msg.nickname} size={AVATAR_SIZE.sm} baseUrl={baseUrl} />
        </div>
      )}
    </div>
  );
});

interface UserRowProps {
  user: User;
  isSelf: boolean;
}

const UserRow = memo(function UserRow({ user, isSelf }: UserRowProps) {
  return (
    <li className="list-group-item d-flex align-items-center justify-content-between py-3 border-bottom">
      <div className="d-flex align-items-center gap-3 min-w-0">
        <Avatar src={user.avatarUrl} name={user.nickname} size={AVATAR_SIZE.xl} baseUrl={SOCKET_URL} online={user.isOnline} />
        <div className="min-w-0">
          <h6 className="m-0 text-dark fw-semibold text-truncate">
            {isSelf ? '🐭💕 ' : '🐱💞 '}{user.nickname}{' '}
            {isSelf && <span className="badge bg-secondary">You</span>}
          </h6>
          <small className="text-muted">
            {user.isOnline ? 'Online' : user.lastSeen ? `Last seen ${fmtTime(user.lastSeen)}` : 'Offline'}
          </small>
        </div>
      </div>
      {(user.os || user.browser) && (
        <span className="badge bg-light text-secondary border small d-none d-lg-inline-block">{user.os}</span>
      )}
    </li>
  );
});

/** Minimal focus trap + Escape-to-close for modal-style overlays. */
function useDialogA11y(active: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onClose]);

  return ref;
}

/* ═══════════════════════════════════════════════════════════
   ChatRoom Component
═══════════════════════════════════════════════════════════ */
function ChatRoom() {
  const navigate = useNavigate();
  const nickname = localStorage.getItem('nickname') || '';
  const passcode = localStorage.getItem('passcode') || '';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUser, setTypingUser] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');

  // Responsive layout: 'sidebar' shows users list, 'chat' shows current conversation
  const [view, setView] = useState<'sidebar' | 'chat'>('chat');

  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Video Call States
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle');
  const [callerName, setCallerName] = useState('');
  const [remoteUserName, setRemoteUserName] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const callStateRef = useRef<typeof callState>('idle');
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Message editing / reactions / self-destruct
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [openMenuMsgId, setOpenMenuMsgId] = useState<number | null>(null);
  const [burnDelay, setBurnDelay] = useState<number | null>(null);

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      setTimeout(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 60);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (view === 'chat') scrollToBottom();
  }, [view, scrollToBottom]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.msg-bubble-container') && !target.closest('.burn-timer-dropdown')) {
        setOpenMenuMsgId(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuMsgId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // WebRTC Stream Bindings via Callback Refs
  const localVideoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el) el.srcObject = localStream;
  }, [localStream]);

  const remoteVideoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el) el.srcObject = remoteStream;
  }, [remoteStream]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const updateCallState = (state: typeof callState) => {
    setCallState(state);
    callStateRef.current = state;
  };

  const updateLocalStream = (stream: MediaStream | null) => {
    setLocalStream(stream);
    localStreamRef.current = stream;
  };

  const cleanUpCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    updateCallState('idle');
    setMicMuted(false);
    setCameraOff(false);
  }, []);

  const createPeerConnection = () => {
    if (peerConnectionRef.current) peerConnectionRef.current.close();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = e => {
      if (e.candidate) socketRef.current?.emit('webrtcCandidate', { passcode, candidate: e.candidate });
    };
    pc.ontrack = e => {
      if (e.streams[0]) setRemoteStream(e.streams[0]);
    };

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });
    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async () => {
    const target = users.find(u => u.nickname !== nickname) || users[0];
    if (!target || !target.isOnline) {
      showToast('User is offline');
      return;
    }
    if (target.nickname === nickname) {
      showToast('Cannot call yourself');
      return;
    }

    setRemoteUserName(target.nickname);
    updateCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      updateLocalStream(stream);
      socketRef.current?.emit('callUser', { passcode, callerName: nickname });
    } catch {
      showToast('Camera and microphone permissions are required');
      cleanUpCall();
    }
  };

  const acceptCall = async () => {
    updateCallState('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      updateLocalStream(stream);
      socketRef.current?.emit('acceptCall', { passcode, receiverName: nickname });
    } catch {
      showToast('Camera and microphone permissions are required');
      socketRef.current?.emit('declineCall', { passcode, receiverName: nickname });
      cleanUpCall();
    }
  };

  const declineCall = useCallback(() => {
    socketRef.current?.emit('declineCall', { passcode, receiverName: nickname });
    cleanUpCall();
  }, [passcode, nickname, cleanUpCall]);

  const endCall = useCallback(() => {
    socketRef.current?.emit('endCall', { passcode });
    cleanUpCall();
  }, [passcode, cleanUpCall]);

  // Close the call overlay with Escape / trap focus while it's open.
  const handleCallDialogClose = useCallback(() => {
    if (callStateRef.current === 'incoming') declineCall();
    else if (callStateRef.current !== 'idle') endCall();
  }, [declineCall, endCall]);
  const callDialogRef = useDialogA11y(callState !== 'idle', handleCallDialogClose);
  const lightboxDialogRef = useDialogA11y(!!lightbox, () => setLightbox(null));

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicMuted(!track.enabled);
    }
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOff(!track.enabled);
    }
  };

  /* ── Message actions ── */
  const startEditMessage = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setMessage(msg.message);
    setOpenMenuMsgId(null);
    inputRef.current?.focus();
  }, []);

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setMessage('');
  };

  const handleDeleteMessage = useCallback((msgId: number) => {
    socketRef.current?.emit('deleteMessage', { passcode, messageId: msgId });
    setOpenMenuMsgId(null);
  }, [passcode]);

  const handleReactToMessage = useCallback((msgId: number, emoji: string) => {
    socketRef.current?.emit('reactToMessage', { passcode, messageId: msgId, emoji, nickname });
    setOpenMenuMsgId(null);
  }, [passcode, nickname]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    setOpenMenuMsgId(null);
    inputRef.current?.focus();
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Wipe chat history in this room permanently?')) {
      socketRef.current?.emit('clearHistory', { passcode });
    }
  };

  /* ── Socket setup ── */
  useEffect(() => {
    if (!nickname || !passcode) {
      navigate('/');
      return;
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'], upgrade: false });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      const meta = getDeviceMetadata();
      socket.emit('joinRoom', { nickname, passcode, avatarUrl: localStorage.getItem('avatarUrl') || '', ...meta });
      socket.emit('getUsers', { passcode });
    });

    socket.on('chatHistory', (data: Message[]) => {
      setMessages(data || []);
      setTimeout(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 100);
    });

    socket.on('newMessage', (data: Message) => {
      setMessages(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data]));
      if (data.message && /❤️|💖|💕|💘|💝|♥/g.test(data.message)) spawnHearts(8);
      setTimeout(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 50);
    });

    socket.on('messageEdited', ({ messageId, newMessage }: { messageId: number; newMessage: string }) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, message: newMessage, isEdited: true } : m)));
    });

    socket.on('messageDeleted', ({ messageId }: { messageId: number }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, message: 'This message was deleted', fileUrl: undefined, fileName: undefined, fileType: undefined, fileSize: undefined, isDeleted: true }
            : m
        )
      );
    });

    socket.on('historyCleared', () => {
      setMessages([]);
      showToast('Room chat history cleared');
    });

    socket.on('messageReactionsUpdated', ({ messageId, reactions }: { messageId: number; reactions: any }) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions } : m)));
    });

    socket.on('messagesExpired', ({ ids }: { ids: number[] }) => {
      setMessages(prev => prev.filter(m => !ids.includes(m.id!)));
    });

    socket.on('usersList', (data: User[]) => setUsers(data || []));

    socket.on('userOnline', ({ nickname: n }: { nickname: string }) =>
      setUsers(prev => prev.map(u => (u.nickname === n ? { ...u, isOnline: true } : u))));

    socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) =>
      setUsers(prev => prev.map(u => (u.nickname === n ? { ...u, isOnline: false, lastSeen } : u))));

    socket.on('userJoined', ({ nickname: n }: { nickname: string }) => {
      setMessages(prev => [...prev, { nickname: 'System', message: `${n} joined the space`, createdAt: new Date().toISOString() }]);
    });

    socket.on('userLeft', ({ nickname: n }: { nickname: string }) => {
      setMessages(prev => [...prev, { nickname: 'System', message: `${n} left the space`, createdAt: new Date().toISOString() }]);
    });

    socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser(n);
    });

    socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser('');
    });

    socket.on('userCalling', ({ callerName: cName }: { callerName: string }) => {
      setCallerName(cName);
      setRemoteUserName(cName);
      updateCallState('incoming');
    });

    socket.on('callAccepted', ({ receiverName: rName }: { receiverName: string }) => {
      if (callStateRef.current === 'calling') {
        setRemoteUserName(rName);
        updateCallState('active');
        const pc = createPeerConnection();
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => socket.emit('webrtcOffer', { passcode, offer: pc.localDescription }))
          .catch(err => console.error(err));
      }
    });

    socket.on('declineCall', () => {
      if (callStateRef.current !== 'idle') {
        showToast('Call declined');
        cleanUpCall();
      }
    });

    socket.on('webrtcOfferRelay', ({ offer }: { offer: any }) => {
      if (callStateRef.current === 'active') {
        const pc = createPeerConnection();
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => pc.createAnswer())
          .then(answer => pc.setLocalDescription(answer))
          .then(() => socket.emit('webrtcAnswer', { passcode, answer: pc.localDescription }))
          .catch(err => console.error(err));
      }
    });

    socket.on('webrtcAnswerRelay', ({ answer }: { answer: any }) => {
      if (callStateRef.current === 'active' && peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer)).catch(err => console.error(err));
      }
    });

    socket.on('webrtcCandidateRelay', ({ candidate }: { candidate: any }) => {
      if (callStateRef.current === 'active' && peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.error(err));
      }
    });

    socket.on('callEnded', () => {
      if (callStateRef.current !== 'idle') {
        showToast('Call ended');
        cleanUpCall();
      }
    });

    socket.on('exception', (err: any) => showToast(`Error: ${err?.message || 'Server validation failed'}`));
    socket.on('connect_error', () => {
      setConnectionStatus('reconnecting');
      showToast('Reconnecting…');
    });

    return () => {
      socket.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, passcode, navigate]);

  /* ── Send message ── */
  const sendMessage = useCallback(() => {
    const text = message.trim();
    if (!text || !socketRef.current?.connected) return;

    if (editingMessage) {
      if (editingMessage.id) {
        socketRef.current.emit('editMessage', { passcode, messageId: editingMessage.id, newMessage: text });
      }
      setEditingMessage(null);
      setMessage('');
      return;
    }

    socketRef.current.emit('stopTyping', { nickname, passcode });
    socketRef.current.emit('sendMessage', {
      nickname,
      passcode,
      message: text,
      replyTo: replyTo ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message } : null,
      expiresIn: burnDelay,
    });

    setMessage('');
    setReplyTo(null);
    setShowEmoji(false);
    inputRef.current?.focus();
  }, [message, editingMessage, nickname, passcode, replyTo, burnDelay]);

  const handleInputChange = useCallback((val: string) => {
    setMessage(val);
    socketRef.current?.emit('typing', { nickname, passcode });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { nickname, passcode });
    }, 1500);
  }, [nickname, passcode]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${SOCKET_URL}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        socketRef.current?.emit('sendMessage', {
          nickname,
          passcode,
          message: '',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          replyTo: replyTo ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message } : null,
          expiresIn: burnDelay,
        });
        setReplyTo(null);
        setBurnDelay(null);
      } catch (err) {
        showToast('Upload failed — please try again');
        console.error(err);
      }
    }

    setUploading(false);
    e.target.value = '';
  }, [nickname, passcode, replyTo, burnDelay, showToast]);

  const insertEmoji = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const displayUser = users.find(u => u.nickname !== nickname) || users[0];
  const onlineCount = useMemo(() => users.filter(u => u.isOnline).length, [users]);
  const baseUrl = SOCKET_URL;

  return (
    <div className="chatroom-root container-fluid p-0 d-flex flex-column">
      {/* Glassmorphic shifting background orbs */}
      <div className="orb o1" aria-hidden="true" />
      <div className="orb o2" aria-hidden="true" />
      <div className="orb o3" aria-hidden="true" />

      {/* Love Animation Floating Viewport */}
      <div id="love-animations-container" aria-hidden="true" className="position-fixed top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none', zIndex: Z.loveAnimations, overflow: 'hidden' }} />
      {/* Floating Hearts for Love Theme */}
      <div aria-hidden="true" className="position-fixed top-0 start-0 w-100 h-100 overflow-hidden" style={{ pointerEvents: 'none', zIndex: Z.floatingHearts }}>
        <span className="floating-heart" style={{ left: '10%', animationDelay: '0s', animationDuration: '7s' }}>❤️</span>
        <span className="floating-heart" style={{ left: '30%', animationDelay: '2s', animationDuration: '8s' }}>💖</span>
        <span className="floating-heart" style={{ left: '55%', animationDelay: '1s', animationDuration: '6s' }}>💘</span>
        <span className="floating-heart" style={{ left: '75%', animationDelay: '3s', animationDuration: '9s' }}>💝</span>
        <span className="floating-heart" style={{ left: '90%', animationDelay: '4s', animationDuration: '7s' }}>❤️</span>
      </div>

      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.1);
          --glass-highlight: rgba(255, 255, 255, 0.15);
          --text-primary: #ffffff;
          --text-secondary: rgba(255, 255, 255, 0.6);
          --focus-glow: 0 0 12px rgba(124, 77, 255, 0.45);
        }

        html, body, #root {
          height: 100%;
          background: #0c0822;
        }

        .chatroom-root {
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          background: radial-gradient(1200px 800px at 15% 10%, #4a2cb3 0%, transparent 65%),
                      radial-gradient(1000px 700px at 85% 20%, #17a2b8 0%, transparent 60%),
                      linear-gradient(135deg, #120e2e 0%, #070414 100%) !important;
          color: var(--text-primary) !important;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
        }

        /* Glowing background orbs */
        .orb {
          position: absolute;
          filter: blur(100px);
          opacity: 0.35;
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
          animation: floatOrb 25s ease-in-out infinite alternate;
        }
        .o1 { width: 450px; height: 450px; background: #7c4dff; top: -100px; left: -100px; }
        .o2 { width: 400px; height: 400px; background: #00e5ff; bottom: -50px; right: -50px; animation-delay: -6s; }
        .o3 { width: 350px; height: 350px; background: #e040fb; top: 35%; left: 45%; animation-delay: -12s; }

        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(140px, 90px) scale(1.15); }
        }

        .chatroom-layout {
          position: relative;
          z-index: 1;
          flex: 1 1 auto;
          min-height: 0;
        }

        @media (min-width: 1920px) {
          .chatroom-layout { max-width: 1800px; margin-inline: auto; }
        }

        /* Sidebar Container */
        aside[aria-label="Members list"] {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(25px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(25px) saturate(150%) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: var(--text-primary) !important;
        }

        /* Chat Area Container */
        main[aria-label] {
          background: rgba(255, 255, 255, 0.01) !important;
          backdrop-filter: blur(15px) !important;
          -webkit-backdrop-filter: blur(15px) !important;
          color: var(--text-primary) !important;
        }

        /* Glass Headers */
        #wa-sidebar-header, #wa-main-header {
          background: rgba(255, 255, 255, 0.04) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: var(--text-primary) !important;
        }
        #wa-sidebar-header h6, #wa-main-header h6 {
          color: var(--text-primary) !important;
        }
        #wa-sidebar-header small, #wa-main-header small {
          color: var(--text-secondary) !important;
        }

        /* Member rows & list group adjustments */
        .list-group-item {
          background: transparent !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
          color: var(--text-primary) !important;
          transition: background-color 0.25s ease;
        }
        .list-group-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .active-member-item.active {
          background-color: rgba(255, 255, 255, 0.08) !important;
          border-left: 4px solid #7c4dff !important;
        }

        /* Hide checkerboards & WhatsApp background patterns */
        .cn-checkers { display: none !important; }
        #wa-chat-log {
          background: transparent !important;
          background-image: none !important;
        }

        /* Message Bubbles - Glass style */
        .msg-bubble-mine {
          background: linear-gradient(135deg, rgba(124, 77, 255, 0.22) 0%, rgba(124, 77, 255, 0.08) 100%) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-bottom-right-radius: 4px !important;
          color: #ffffff !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15) !important;
        }
        .msg-bubble-theirs {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-bottom-left-radius: 4px !important;
          color: #ffffff !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1) !important;
        }
        .chat-text { overflow-wrap: anywhere; word-break: break-word; color: #ffffff !important; }

        /* Reply inside bubbles */
        .msg-reply-mine {
          border-left: 3px solid #00e5ff !important;
          background-color: rgba(255, 255, 255, 0.12) !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }
        .msg-reply-theirs {
          border-left: 3px solid #7c4dff !important;
          background-color: rgba(0, 0, 0, 0.2) !important;
          color: rgba(255, 255, 255, 0.9) !important;
        }

        /* Focus borders accessibility */
        .chatroom-root a:focus-visible,
        .chatroom-root button:focus-visible,
        .chatroom-root input:focus-visible,
        .chatroom-root select:focus-visible,
        .chatroom-root [tabindex]:focus-visible {
          outline: none;
          box-shadow: 0 0 0 0.2rem rgba(124, 77, 255, 0.4) !important;
        }

        /* Buttons & Actions styling */
        .btn-outline-primary {
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          background: rgba(255, 255, 255, 0.04) !important;
        }
        .btn-outline-primary:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        .btn-outline-danger {
          color: #ff5e7e !important;
          border-color: rgba(255, 94, 126, 0.2) !important;
          background: rgba(255, 94, 126, 0.04) !important;
        }
        .btn-outline-danger:hover {
          background: rgba(255, 94, 126, 0.15) !important;
          border-color: rgba(255, 94, 126, 0.35) !important;
          color: #ffffff !important;
        }

        .btn-icon-ghost,
        .btn-icon-ghost-light {
          border: none;
          background: transparent;
          line-height: 1;
          padding: 0.2rem 0.45rem;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .btn-icon-ghost:hover, .btn-icon-ghost:focus-visible { background: rgba(255,255,255,0.12); color: #ffffff !important; }
        .btn-icon-ghost-light:hover, .btn-icon-ghost-light:focus-visible { background: rgba(255,255,255,0.08); color: #ffffff !important; }

        /* Reaction pills */
        .reaction-pill {
          cursor: pointer;
          font-size: 0.75rem;
          background: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }
        .reaction-pill.bg-info {
          background: rgba(0, 229, 255, 0.25) !important;
          border-color: rgba(0, 229, 255, 0.4) !important;
          color: #ffffff !important;
        }

        /* Message Options Popover */
        .message-menu {
          min-width: 220px;
          background: rgba(18, 14, 42, 0.85) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4) !important;
        }
        .message-menu .btn-light {
          background: transparent !important;
          color: #ffffff !important;
        }
        .message-menu .btn-light:hover {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        .message-menu .btn-light.text-danger {
          color: #ff5e7e !important;
        }
        .message-menu .btn-light.text-danger:hover {
          background: rgba(255, 94, 126, 0.15) !important;
        }

        /* Love Theme Decorative Animations */
        .floating-heart {
          position: absolute;
          font-size: clamp(16px, 2vw, 24px);
          color: rgba(255, 77, 109, 0.15);
          pointer-events: none;
          animation: floatUp 7s ease-in-out infinite;
        }
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }
        .spawned-heart-animation, .love-burst-particle {
          position: absolute;
          pointer-events: none;
          z-index: ${Z.spawnedParticles};
        }
        @keyframes floatHeartEffect {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          10% { opacity: 0.85; }
          90% { opacity: 0.85; }
          100% { transform: translateY(-110vh) rotate(360deg) scale(1.2); opacity: 0; }
        }
        @keyframes particleBurstEffect {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(360deg); opacity: 0; }
        }

        /* Media styling */
        .chat-media {
          width: 100%;
          max-width: min(320px, 60vw);
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          border-radius: 8px;
        }
        .chat-pdf { height: clamp(160px, 28vw, 220px); border-radius: 8px; }
        .video-embed-wrapper { max-width: min(320px, 70vw); border-radius: 8px; overflow: hidden; }
        .video-embed-wrapper iframe { width: 100%; border: 1px solid rgba(255,255,255,0.15); background: #120e2e; }

        .message-meta { font-size: 0.7rem; color: rgba(255, 255, 255, 0.5) !important; }
        .banner-preview { max-width: min(300px, 65vw); }

        @media (hover: hover) {
          .hover-scale { transition: transform 0.15s ease; }
          .hover-scale:hover { transform: scale(1.25); }
        }

        /* Custom scrollbar for message area and user list */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.25);
        }

        /* Footer Input controls */
        #wa-input-footer {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          padding: 16px 20px !important;
        }

        .wa-input-pill-wrapper {
          background: rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 28px !important;
          padding: 4px 8px !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
          flex-grow: 1 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .wa-input-pill-wrapper:focus-within {
          border-color: rgba(124, 77, 255, 0.5) !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 0 10px rgba(124, 77, 255, 0.3) !important;
        }

        .wa-input-pill-wrapper input {
          border: none !important;
          background: transparent !important;
          padding: 8px 4px !important;
          box-shadow: none !important;
          color: #ffffff !important;
        }
        .wa-input-pill-wrapper input::placeholder {
          color: rgba(255, 255, 255, 0.45) !important;
        }

        .wa-input-pill-wrapper button, .wa-input-pill-wrapper label {
          background: transparent !important;
          border: none !important;
          padding: 6px !important;
          font-size: 1.25rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          border-radius: 50%;
          transition: background-color 0.2s, color 0.2s;
        }
        .wa-input-pill-wrapper button:hover, .wa-input-pill-wrapper label:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }

        .burn-timer-dropdown select {
          background-color: rgba(255, 255, 255, 0.08) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
          border-radius: 20px !important;
          padding: 0.25rem 1.5rem 0.25rem 0.75rem !important;
          width: 96px !important;
          font-size: 0.85rem !important;
        }
        .burn-timer-dropdown select option {
          background-color: #120e2e !important;
          color: #ffffff !important;
        }

        #wa-send-button {
          background: linear-gradient(135deg, #7c4dff 0%, #00e5ff 100%) !important;
          border: none !important;
          color: #ffffff !important;
          width: 42px !important;
          height: 42px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 4px 15px rgba(124, 77, 255, 0.3) !important;
          flex-shrink: 0 !important;
          padding: 0 !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        #wa-send-button:hover, #wa-send-button:focus-visible {
          transform: scale(1.06);
          box-shadow: 0 4px 20px rgba(124, 77, 255, 0.5), 0 0 10px rgba(0, 229, 255, 0.3) !important;
        }

        /* Overlay / Dialog styling */
        div[role="dialog"] {
          background-color: rgba(10, 6, 28, 0.8) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
        }
        div[role="dialog"] .card.bg-dark {
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(25px) saturate(140%) !important;
          -webkit-backdrop-filter: blur(25px) saturate(140%) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5) !important;
        }

        /* Mobile specific style optimizations */
        @media (max-width: 767.98px) {
          #wa-main-header, #wa-sidebar-header {
            padding: 10px 14px !important;
          }
          #wa-chat-log {
            padding: 12px 8px !important;
          }
          #wa-input-footer {
            padding: 10px !important;
          }
          .wa-input-pill-wrapper {
            padding: 2px 6px !important;
          }
          #wa-mobile-accessory-bar {
            padding-bottom: 0 !important;
            margin-bottom: 6px !important;
          }
          #wa-mobile-accessory-bar select {
            background-color: rgba(255, 255, 255, 0.06) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            width: 105px !important;
          }
          #wa-mobile-accessory-bar button {
            background-color: rgba(255, 255, 255, 0.06) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #ff4d6d !important;
          }
        }

        /* Attractive Glass Typing Indicator */
        .glass-typing-indicator {
          background: rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
          animation: fadeInIndicator 0.25s ease-out;
        }
        
        .glass-typing-indicator .avatar-placeholder-sm {
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 10px;
        }

        .typing-dots .dot {
          width: 5px;
          height: 5px;
          background-color: #00e5ff;
          border-radius: 50%;
          display: inline-block;
          animation: bounceDot 1.4s infinite ease-in-out both;
        }
        
        .typing-dots .dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        @keyframes fadeInIndicator {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Lightbox / Image Preview */}
      {lightbox && (
        <div
          ref={lightboxDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-75"
          style={{ zIndex: Z.lightbox, cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full size preview" className="img-fluid rounded shadow-lg" style={{ maxHeight: '90%' }} onClick={e => e.stopPropagation()} />
          <button
            type="button"
            className="btn btn-light rounded-circle position-absolute top-0 end-0 m-3"
            style={{ width: 44, height: 44 }}
            onClick={() => setLightbox(null)}
            aria-label="Close image preview"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="position-fixed bottom-0 start-50 translate-middle-x mb-4 bg-dark text-white py-2 px-3 rounded shadow"
          style={{ zIndex: Z.toast }}
        >
          {toast}
        </div>
      )}

      {connectionStatus !== 'connected' && (
        <div role="status" aria-live="polite" className="position-fixed top-0 start-50 translate-middle-x mt-2 bg-warning text-dark py-1 px-3 rounded-pill shadow small" style={{ zIndex: Z.toast }}>
          {connectionStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
        </div>
      )}

      {/* WebRTC Video Call Overlay */}
      {callState !== 'idle' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={callState === 'active' ? `Video call with ${remoteUserName}` : 'Video call'}
          ref={callDialogRef}
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-50 p-3"
          style={{ zIndex: Z.call }}
        >
          <div className="card bg-dark text-white border-0 shadow-lg w-100" style={{ maxWidth: 800, height: 'min(80vh, 600px)' }}>

            {callState === 'calling' && (
              <div className="card-body d-flex flex-column align-items-center justify-content-center">
                <div className="spinner-grow text-primary mb-4" style={{ width: '3rem', height: '3rem' }} role="status">
                  <span className="visually-hidden">Calling…</span>
                </div>
                <h4 className="card-title">Calling {remoteUserName}…</h4>
                <p className="card-text text-muted mb-4">Waiting for answer...</p>
                <button className="btn btn-danger rounded-circle p-3" onClick={endCall} aria-label="Cancel call">
                  📞
                </button>
              </div>
            )}

            {callState === 'incoming' && (
              <div className="card-body d-flex flex-column align-items-center justify-content-center">
                <div className="spinner-grow text-success mb-4" style={{ width: '3rem', height: '3rem' }} role="status">
                  <span className="visually-hidden">Incoming call</span>
                </div>
                <h4 className="card-title">{callerName} is Calling You</h4>
                <p className="card-text text-muted mb-4">Incoming Call...</p>
                <div className="d-flex gap-3">
                  <button className="btn btn-success px-4" onClick={acceptCall}>Accept</button>
                  <button className="btn btn-danger px-4" onClick={declineCall}>Decline</button>
                </div>
              </div>
            )}

            {callState === 'active' && (
              <div className="card-body p-0 position-relative d-flex flex-column bg-black rounded overflow-hidden h-100">
                <div className="w-100 h-100">
                  {remoteStream ? (
                    <video ref={remoteVideoRefCallback} autoPlay playsInline className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                      <p>Connecting stream…</p>
                    </div>
                  )}
                </div>

                <div className="position-absolute top-0 end-0 m-3 border border-secondary rounded shadow-lg bg-dark overflow-hidden" style={{ width: 'clamp(96px, 20vw, 140px)', aspectRatio: '4 / 3', zIndex: Z.pip }}>
                  {localStream ? (
                    <video ref={localVideoRefCallback} autoPlay playsInline muted className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center small">You</div>
                  )}
                </div>

                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex gap-3 bg-dark bg-opacity-75 p-2 rounded-pill border border-secondary" style={{ zIndex: Z.callControls }}>
                  <button className={`btn rounded-circle py-2 ${micMuted ? 'btn-danger' : 'btn-outline-light'}`} onClick={toggleMic} aria-pressed={micMuted} aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}>
                    🎤
                  </button>
                  <button className={`btn rounded-circle py-2 ${cameraOff ? 'btn-danger' : 'btn-outline-light'}`} onClick={toggleCamera} aria-pressed={cameraOff} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}>
                    📹
                  </button>
                  <button className="btn btn-danger rounded-circle py-2" onClick={endCall} aria-label="End call">
                    📞
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Responsive Chat Layout */}
      <div className="row g-0 h-100 w-100 chatroom-layout">

        {/* Sidebar Container */}
        <aside aria-label="Members list" className={`col-12 col-md-4 col-lg-3 bg-white border-end h-100 flex-column ${view === 'sidebar' ? 'd-flex' : 'd-none d-md-flex'}`}>
          <div className="cn-checkers" aria-hidden="true" />
          <header id="wa-sidebar-header" className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 min-w-0">
              <Avatar name={nickname} size={AVATAR_SIZE.lg} baseUrl={baseUrl} />
              <div className="min-w-0">
                <h6 className="m-0 text-dark fw-bold text-truncate">{nickname}</h6>
                <small className="text-muted">Room: {passcode}</small>
              </div>
            </div>
            <button className="btn btn-outline-primary btn-sm d-md-none" onClick={() => setView('chat')}>
              Go to Chat
            </button>
          </header>

          <div className="flex-grow-1 overflow-y-auto">
            <div className="p-3 bg-light text-muted text-uppercase small fw-bold">Active Members ({onlineCount})</div>
            <ul className="list-group list-group-flush list-unstyled m-0">
              {users.map(user => (
                <UserRow key={user.id} user={user} isSelf={user.nickname === nickname} />
              ))}
              {users.length === 0 && (
                <li className="p-4 text-center text-muted small empty-state">No one else has joined yet.</li>
              )}
            </ul>
          </div>

          <footer className="p-3 border-top bg-light text-center small text-muted">
            {onlineCount} users online in this space
          </footer>
        </aside>

        {/* Chat Area Container */}
        <main aria-label={displayUser ? `Conversation with ${displayUser.nickname}` : 'Conversation'} className={`col-12 col-md-8 col-lg-9 bg-light h-100 flex-column ${view === 'chat' ? 'd-flex' : 'd-none d-md-flex'}`}>
          <div className="cn-checkers" aria-hidden="true" />
          {/* Header */}
          <header id="wa-main-header" className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 min-w-0">

              {displayUser && (
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <Avatar src={displayUser.avatarUrl} name={displayUser.nickname} size={AVATAR_SIZE.md} baseUrl={baseUrl} online={displayUser.isOnline} />
                  <div className="min-w-0">
                    <h6 className="m-0 text-dark fw-bold text-truncate">{displayUser.nickname === nickname ? '🐭💕 ' : '🐱💞 '}{displayUser.nickname}</h6>
                    <small className="text-muted">{displayUser.isOnline ? 'Active Now' : 'Offline'}</small>
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              {displayUser && displayUser.nickname !== nickname && (
                <button className="btn btn-outline-primary btn-sm px-3 rounded-pill" onClick={startCall}>
                  📹 <span className="d-none d-sm-inline">Call</span>
                </button>
              )}
              <button className="btn btn-outline-danger btn-sm px-3 rounded-pill" onClick={handleClearHistory}>
                🗑️ <span className="d-none d-sm-inline">Clear History</span>
              </button>
            </div>
          </header>

          {/* Chat Messages Log */}
          <div id="wa-chat-log" ref={chatRef} role="log" aria-live="polite" aria-relevant="additions" aria-label="Chat messages" className="flex-grow-1 overflow-y-auto p-2 p-md-4" style={{ background: 'var(--chat-bg)' }}>
            {messages.length === 0 ? (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center empty-state">
                <span style={{ fontSize: 40 }} aria-hidden="true">👋</span>
                <p className="mb-0 mt-2">No messages yet — say hi to get the conversation started!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.nickname === nickname;
                const senderUser = users.find(u => u.nickname === msg.nickname);
                return (
                  <MessageRow
                    key={msg.id ?? `${msg.nickname}-${idx}`}
                    msg={msg}
                    isMe={isMe}
                    nickname={nickname}
                    senderAvatar={senderUser?.avatarUrl}
                    baseUrl={baseUrl}
                    isMenuOpen={openMenuMsgId === msg.id}
                    onToggleMenu={setOpenMenuMsgId}
                    onReply={handleReply}
                    onEdit={startEditMessage}
                    onDelete={handleDeleteMessage}
                    onReact={handleReactToMessage}
                    onImageClick={setLightbox}
                    onMediaLoad={scrollToBottom}
                  />
                );
              })
            )}
          </div>

          {/* Typing status info */}
          <div className="px-3 px-md-4 py-1" style={{ minHeight: 40 }} aria-live="polite">
            {typingUser && (
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1.5 rounded-pill glass-typing-indicator">
                <div className="avatar-placeholder-sm rounded-circle d-flex align-items-center justify-content-center fw-bold">
                  {typingUser.slice(0, 1).toUpperCase()}
                </div>
                <span className="small text-white opacity-75">{typingUser} is typing</span>
                <div className="typing-dots d-flex gap-1 align-items-center ms-1">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            )}
          </div>

          {/* Replying banner */}
          {replyTo && (
            <div className="bg-light p-3 border-top d-flex align-items-center justify-content-between">
              <div className="min-w-0">
                <span className="text-muted d-block small">Replying to <strong>{replyTo.nickname}</strong></span>
                <span className="text-truncate d-block small text-dark banner-preview">
                  {replyTo.message ? replyTo.message : '📎 Attachment'}
                </span>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-circle flex-shrink-0" onClick={() => setReplyTo(null)} aria-label="Cancel reply">✕</button>
            </div>
          )}

          {/* Editing banner */}
          {editingMessage && (
            <div className="bg-light p-3 border-top d-flex align-items-center justify-content-between">
              <div className="min-w-0">
                <span className="text-muted d-block small">Editing your message</span>
                <span className="text-truncate d-block small text-dark banner-preview">
                  "{editingMessage.message}"
                </span>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-pill flex-shrink-0" onClick={cancelEditMessage}>Cancel</button>
            </div>
          )}

          {/* Emoji selection overlay */}
          {showEmoji && (
            <div className="bg-white border-top p-3 d-flex gap-2 flex-wrap" role="menu" aria-label="Emoji picker">
              {EMOJIS.map(e => (
                <button key={e} type="button" role="menuitem" className="btn btn-outline-light border shadow-sm fs-4 px-3" onClick={() => insertEmoji(e)} aria-label={`Insert ${e} emoji`}>
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel footer */}
          <footer id="wa-input-footer" className="p-2 p-sm-3 bg-white border-top d-flex flex-column gap-2">
            {/* Mobile view secondary bar for Self-Destruct select and Heart Burst */}
            <div id="wa-mobile-accessory-bar" className="d-flex d-md-none align-items-center justify-content-between w-100 border-top pt-2 px-1">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted" style={{ fontSize: '11px' }}>🔥 Self-Destruct:</span>
                <label htmlFor="burn-timer-select-mobile" className="visually-hidden">Self-destruct timer</label>
                <select
                  id="burn-timer-select-mobile"
                  className="form-select form-select-sm rounded-pill"
                  value={burnDelay ?? ''}
                  onChange={e => setBurnDelay(e.target.value ? Number(e.target.value) : null)}
                  title="Self-destruct timer"
                  style={{ width: 110, padding: '0.25rem 1.5rem 0.25rem 0.75rem' }}
                >
                  <option value="">Off</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger rounded-pill px-3 py-1 btn-sm d-flex align-items-center gap-1"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  spawnHearts(8);
                  spawnLoveParticles(rect.left + 20, rect.top + 15, 12);
                  socketRef.current?.emit('sendMessage', { nickname, passcode, message: '❤️', replyTo: null });
                }}
                aria-label="Send heart burst"
                title="Send heart burst"
              >
                ❤️ Heart Burst
              </button>
            </div>

            <div className="d-flex align-items-center gap-2 w-100">
              <div className="wa-input-pill-wrapper">
                <button 
                  type="button" 
                  className="btn btn-light rounded-circle p-2 fs-5 flex-shrink-0" 
                  style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading} 
                  aria-label="Attach a file" 
                  title="Upload attachment"
                >
                  {uploading ? '⏳' : '📎'}
                </button>
                <input ref={fileInputRef} type="file" multiple className="visually-hidden" onChange={handleFile} aria-hidden="true" tabIndex={-1} />

                <button 
                  type="button" 
                  className="btn btn-light rounded-circle p-2 fs-5 flex-shrink-0" 
                  style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  onClick={() => setShowEmoji(v => !v)} 
                  aria-pressed={showEmoji} 
                  aria-label="Toggle emoji picker"
                >
                  😊
                </button>

                <label htmlFor="chat-message-input" className="visually-hidden">
                  {editingMessage ? 'Edit message' : 'Type a message'}
                </label>
                <input
                  id="chat-message-input"
                  ref={inputRef}
                  type="text"
                  className="form-control rounded-pill px-4 flex-grow-1"
                  value={message}
                  placeholder={editingMessage ? 'Edit message...' : 'Type a message…'}
                  onChange={e => handleInputChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') sendMessage();
                    if (e.key === 'Escape' && editingMessage) cancelEditMessage();
                  }}
                  onFocus={scrollToBottom}
                  style={{ padding: '10px 20px' }}
                />

                {/* Desktop view extra tools (Self-Destruct + Heart) */}
                <div className="d-none d-md-flex align-items-center gap-2">
                  <div className="burn-timer-dropdown d-flex align-items-center">
                    <label htmlFor="burn-timer-select" className="visually-hidden">Self-destruct timer</label>
                    <select
                      id="burn-timer-select"
                      className="form-select form-select-sm rounded-pill"
                      value={burnDelay ?? ''}
                      onChange={e => setBurnDelay(e.target.value ? Number(e.target.value) : null)}
                      title="Self-destruct timer"
                      style={{ width: 100 }}
                    >
                      <option value="">🔥 Off</option>
                      <option value={10}>10s</option>
                      <option value={30}>30s</option>
                      <option value={60}>1m</option>
                      <option value={300}>5m</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-danger rounded-circle p-2 fs-5 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 42, height: 42 }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      spawnHearts(8);
                      spawnLoveParticles(rect.left + 21, rect.top + 21, 12);
                      socketRef.current?.emit('sendMessage', { nickname, passcode, message: '❤️', replyTo: null });
                    }}
                    aria-label="Send heart burst"
                    title="Send heart burst"
                  >
                    ❤️
                  </button>
                </div>
              </div>

              <button 
                type="button" 
                id="wa-send-button"
                className="btn btn-primary rounded-circle p-2 fs-5 d-flex align-items-center justify-content-center flex-shrink-0" 
                style={{ width: 42, height: 42 }} 
                onClick={sendMessage} 
                aria-label={editingMessage ? 'Save edited message' : 'Send message'}
              >
                ➡️
              </button>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}

export default ChatRoom;
