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

/* ─── Helpers ────────────────────────────────────────────── */
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

  // Instagram Post / Reel / TV
  const instaMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9-_]+)/i);
  if (instaMatch) {
    return {
      type: 'instagram',
      url: `https://www.instagram.com/p/${instaMatch[1]}/embed`
    };
  }

  // YouTube Shorts
  const ytMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([a-zA-Z0-9-_]+)/i);
  if (ytMatch) {
    return {
      type: 'youtube',
      url: `https://www.youtube.com/embed/${ytMatch[1]}`
    };
  }

  return null;
};

const spawnHearts = (count: number = 8) => {
  const container = document.getElementById('love-animations-container');
  if (!container) return;

  const hearts = ['❤️', '💖', '💝', '💘', '💕', '💗'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.innerText = hearts[Math.floor(Math.random() * hearts.length)];
    el.className = 'spawned-heart-animation';
    
    const size = Math.random() * 24 + 16;
    const left = Math.random() * 100;
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 0.5;

    el.style.position = 'absolute';
    el.style.left = `${left}%`;
    el.style.bottom = '-50px';
    el.style.fontSize = `${size}px`;
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
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
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 120 + 40;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 80;
    const duration = Math.random() * 1.5 + 1;

    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.fontSize = `${Math.random() * 16 + 12}px`;
    el.style.pointerEvents = 'none';
    el.style.animation = `particleBurstEffect ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;
    
    el.style.setProperty('--tx', `${destX}px`);
    el.style.setProperty('--ty', `${destY}px`);

    container.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000);
  }
};

const EMOJIS = ['❤️', '😍', '😊', '🥰', '😘', '✨', '😄', '🤗', '👍'];

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
  
  // Responsive layout: 'sidebar' shows users list, 'chat' shows current conversation
  const [view, setView] = useState<'sidebar' | 'chat'>('chat');

  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
  const [nowTime, setNowTime] = useState(Date.now());

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
      // Double check in case of slow renders
      setTimeout(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 60);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (view === 'chat') {
      scrollToBottom();
    }
  }, [view, scrollToBottom]);

  useEffect(() => {
    const interval = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.msg-bubble-container') && !target.closest('.burn-timer-dropdown')) {
        setOpenMenuMsgId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // WebRTC Stream Bindings via Callback Refs
  const localVideoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el) el.srcObject = localStream;
  }, [localStream]);

  const remoteVideoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    if (el) el.srcObject = remoteStream;
  }, [remoteStream]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const updateCallState = (state: typeof callState) => {
    setCallState(state);
    callStateRef.current = state;
  };

  const updateLocalStream = (stream: MediaStream | null) => {
    setLocalStream(stream);
    localStreamRef.current = stream;
  };

  const cleanUpCall = () => {
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
  };

  const createPeerConnection = () => {
    if (peerConnectionRef.current) peerConnectionRef.current.close();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = e => {
      if (e.candidate) {
        socketRef.current?.emit('webrtcCandidate', { passcode, candidate: e.candidate });
      }
    };
    pc.ontrack = e => {
      if (e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
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

  const declineCall = () => {
    socketRef.current?.emit('declineCall', { passcode, receiverName: nickname });
    cleanUpCall();
  };

  const endCall = () => {
    socketRef.current?.emit('endCall', { passcode });
    cleanUpCall();
  };

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
  const startEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setMessage(msg.message);
    setOpenMenuMsgId(null);
    inputRef.current?.focus();
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setMessage('');
  };

  const handleDeleteMessage = (msgId: number) => {
    socketRef.current?.emit('deleteMessage', { passcode, messageId: msgId });
    setOpenMenuMsgId(null);
  };

  const handleReactToMessage = (msgId: number, emoji: string) => {
    socketRef.current?.emit('reactToMessage', { passcode, messageId: msgId, emoji, nickname });
    setOpenMenuMsgId(null);
  };

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

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
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
      
      // Trigger love animation if message contains heart/love emojis
      if (data.message && /❤️|💖|💕|💘|💝|♥/g.test(data.message)) {
        spawnHearts(8);
      }

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
    socket.on('connect_error', () => showToast('Reconnecting…'));

    return () => {
      socket.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, passcode, navigate]);

  /* ── Send message ── */
  const sendMessage = () => {
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
  };

  const handleInputChange = (val: string) => {
    setMessage(val);
    socketRef.current?.emit('typing', { nickname, passcode });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { nickname, passcode });
    }, 1500);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const renderFile = (msg: Message) => {
    if (!msg.fileUrl) return null;
    const url = resolveUrl(msg.fileUrl);
    const type = msg.fileType || '';
    const name = msg.fileName || 'file';

    if (type.startsWith('image/'))
      return (
        <img
          src={url}
          alt={name}
          className="img-fluid rounded border my-2 d-block"
          style={{ maxWidth: 260, cursor: 'zoom-in' }}
          onClick={e => { e.stopPropagation(); setLightbox(url); }}
          loading="lazy"
          onLoad={scrollToBottom}
        />
      );

    if (type.startsWith('video/'))
      return (
        <video className="w-100 rounded border my-2 d-block" style={{ maxWidth: 300 }} controls onLoadedMetadata={scrollToBottom}>
          <source src={url} type={type} />
        </video>
      );

    if (type.startsWith('audio/'))
      return <audio className="w-100 my-2 d-block" controls src={url} onLoadedMetadata={scrollToBottom} />;

    if (type === 'application/pdf')
      return <iframe className="w-100 rounded border my-2 d-block" style={{ height: 200 }} src={url} title={name} onLoad={scrollToBottom} />;

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="btn btn-outline-secondary btn-sm my-2 d-inline-flex align-items-center gap-1">
        📎 {name} ({formatBytes(msg.fileSize)})
      </a>
    );
  };

  const displayUser = users.find(u => u.nickname !== nickname) || users[0];
  const onlineCount = users.filter(u => u.isOnline).length;

  const visibleMessages = messages.filter(msg => {
    if (!msg.expiresAt) return true;
    return new Date(msg.expiresAt).getTime() > nowTime;
  });

  const baseUrl = SOCKET_URL;

  return (
    <div className="container-fluid p-0 d-flex flex-column h-100 bg-light" style={{ overflow: 'hidden', height: '100vh' }}>
      {/* Love Animation Floating Viewport */}
      <div id="love-animations-container" className="position-fixed top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none', zIndex: 2100, overflow: 'hidden' }}></div>
      {/* Floating Hearts for Love Theme */}
      <div className="position-fixed top-0 start-0 w-100 h-100 overflow-hidden" style={{ pointerEvents: 'none', zIndex: 0 }}>
        <span className="floating-heart" style={{ left: '10%', animationDelay: '0s', animationDuration: '7s' }}>❤️</span>
        <span className="floating-heart" style={{ left: '30%', animationDelay: '2s', animationDuration: '8s' }}>💖</span>
        <span className="floating-heart" style={{ left: '55%', animationDelay: '1s', animationDuration: '6s' }}>💘</span>
        <span className="floating-heart" style={{ left: '75%', animationDelay: '3s', animationDuration: '9s' }}>💝</span>
        <span className="floating-heart" style={{ left: '90%', animationDelay: '4s', animationDuration: '7s' }}>❤️</span>
      </div>

      <style>{`
        :root {
          --tom-slate: #5e6f80; /* Tom slate blue */
          --tom-dark: #3a4b59;
          --tom-light: #eaedf0;
          --jerry-love-pink: #ff4d6d; /* Jerry strawberry love pink */
          --jerry-love-light: #ffe5ec;
          --cheese-yellow: #ffb703;
          --cheese-light: #fff5f6; /* Soft pink cream container background */
          --chat-bg: #fff0f3; /* Soft cotton candy pink conversation background */
        }

        .bg-light {
          background-color: var(--tom-light) !important;
        }

        .bg-white {
          background-color: var(--cheese-light) !important;
        }

        .msg-bubble-mine {
          background-color: var(--jerry-love-pink) !important;
          color: white !important;
          border-bottom-right-radius: 4px !important;
        }

        .msg-bubble-theirs {
          background-color: var(--tom-slate) !important;
          color: white !important;
          border-bottom-left-radius: 4px !important;
        }

        .msg-reply-mine {
          border-left: 3px solid var(--cheese-yellow) !important;
          background-color: rgba(255, 255, 255, 0.25) !important;
          color: #fff !important;
        }

        .msg-reply-theirs {
          border-left: 3px solid var(--cheese-yellow) !important;
          background-color: rgba(0, 0, 0, 0.1) !important;
          color: #fff !important;
        }

        .btn-primary {
          background-color: var(--jerry-love-pink) !important;
          border-color: var(--jerry-love-pink) !important;
        }
        .btn-primary:hover, .btn-primary:focus {
          background-color: #e03a5a !important;
          border-color: #e03a5a !important;
        }

        .btn-outline-primary {
          color: var(--jerry-love-pink) !important;
          border-color: var(--jerry-love-pink) !important;
        }
        .btn-outline-primary:hover {
          background-color: var(--jerry-love-pink) !important;
          color: white !important;
        }

        .active-member-item.active {
          background-color: var(--jerry-love-light) !important;
          border-left: 4px solid var(--jerry-love-pink) !important;
        }

        /* Cartoon Network Checkers Banner */
        .cn-checkers {
          background-image: 
            linear-gradient(45deg, #000 25%, transparent 25%), 
            linear-gradient(-45deg, #000 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #000 75%), 
            linear-gradient(-45deg, transparent 75%, #000 75%);
          background-size: 16px 16px;
          background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
          background-color: #fff;
          height: 8px;
          width: 100%;
        }

        .floating-heart {
          position: absolute;
          font-size: 24px;
          color: rgba(255, 77, 109, 0.18);
          pointer-events: none;
          animation: floatUp 7s ease-in-out infinite;
        }

        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }

        .spawned-heart-animation {
          position: absolute;
          pointer-events: none;
          z-index: 2200;
        }

        .love-burst-particle {
          position: absolute;
          pointer-events: none;
          z-index: 2200;
        }

        @keyframes floatHeartEffect {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 0.85;
          }
          90% {
            opacity: 0.85;
          }
          100% {
            transform: translateY(-110vh) rotate(360deg) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes particleBurstEffect {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
      
      {/* Lightbox / Image Preview */}
      {lightbox && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-75" 
          style={{ zIndex: 2000, cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Preview" className="img-fluid rounded shadow-lg" style={{ maxHeight: '90%' }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 bg-dark text-white py-2 px-3 rounded shadow" style={{ zIndex: 3000 }}>
          {toast}
        </div>
      )}

      {/* WebRTC Video Call Overlay */}
      {callState !== 'idle' && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-50" style={{ zIndex: 1500 }}>
          <div className="card bg-dark text-white border-0 shadow-lg w-100 m-3" style={{ maxWidth: 800, height: '80vh' }}>
            
            {callState === 'calling' && (
              <div className="card-body d-flex flex-column align-items-center justify-content-center">
                <div className="spinner-grow text-primary mb-4" style={{ width: '3rem', height: '3rem' }} role="status"></div>
                <h4 className="card-title">Calling {remoteUserName}…</h4>
                <p className="card-text text-muted mb-4">Waiting for answer...</p>
                <button className="btn btn-danger rounded-circle p-3" onClick={endCall} title="Cancel Call">
                  📞
                </button>
              </div>
            )}

            {callState === 'incoming' && (
              <div className="card-body d-flex flex-column align-items-center justify-content-center">
                <div className="spinner-grow text-success mb-4" style={{ width: '3rem', height: '3rem' }} role="status"></div>
                <h4 className="card-title">{callerName} is Calling You</h4>
                <p className="card-text text-muted mb-4">Incoming Call...</p>
                <div className="d-flex gap-3">
                  <button className="btn btn-success px-4" onClick={acceptCall}>Accept</button>
                  <button className="btn btn-danger px-4" onClick={declineCall}>Decline</button>
                </div>
              </div>
            )}

            {callState === 'active' && (
              <div className="card-body p-0 position-relative d-flex flex-column bg-black rounded" style={{ overflow: 'hidden' }}>
                {/* Remote Stream Video */}
                <div className="w-100 h-100">
                  {remoteStream ? (
                    <video ref={remoteVideoRefCallback} autoPlay playsInline className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                      <p>Connecting stream…</p>
                    </div>
                  )}
                </div>

                {/* Local Stream PIP Video */}
                <div className="position-absolute top-0 end-0 m-3 border border-secondary rounded shadow-lg bg-dark" style={{ width: 140, height: 105, overflow: 'hidden', zIndex: 10 }}>
                  {localStream ? (
                    <video ref={localVideoRefCallback} autoPlay playsInline muted className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center small">You</div>
                  )}
                </div>

                {/* Control Panel overlay */}
                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex gap-3 bg-dark bg-opacity-75 p-2 rounded-pill border border-secondary" style={{ zIndex: 20 }}>
                  <button className={`btn rounded-circle py-2 ${micMuted ? 'btn-danger' : 'btn-outline-light'}`} onClick={toggleMic}>
                    🎤
                  </button>
                  <button className={`btn rounded-circle py-2 ${cameraOff ? 'btn-danger' : 'btn-outline-light'}`} onClick={toggleCamera}>
                    📹
                  </button>
                  <button className="btn btn-danger rounded-circle py-2" onClick={endCall}>
                    📞
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Responsive Chat Layout */}
      <div className="row g-0 h-100 w-100" style={{ flex: 1 }}>
        
        {/* Sidebar Container */}
        <aside className={`col-12 col-md-4 col-lg-3 bg-white border-end h-100 flex-column ${view === 'sidebar' ? 'd-flex' : 'd-none d-md-flex'}`}>
          <div className="cn-checkers" title="Cartoon Network Space"></div>
          <header className="p-3 border-bottom bg-light d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, fontWeight: 700 }}>
                {initials(nickname)}
              </div>
              <div>
                <h6 className="m-0 text-dark fw-bold">{nickname}</h6>
                <small className="text-muted">Room: {passcode}</small>
              </div>
            </div>
            {/* Show view toggle on mobile */}
            <button className="btn btn-outline-primary btn-sm d-md-none" onClick={() => setView('chat')}>
              Go to Chat
            </button>
          </header>

          <div className="flex-grow-1 overflow-y-auto list-group list-group-flush">
            <div className="p-3 bg-light text-muted text-uppercase small fw-bold">Active Members ({onlineCount})</div>
            {users.map(user => (
              <div key={user.id} className="list-group-item d-flex align-items-center justify-content-between py-3 border-bottom">
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${baseUrl}${user.avatarUrl}`}
                        alt={user.nickname}
                        className="rounded-circle"
                        style={{ width: 42, height: 42, objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 42, height: 42 }}>
                        {initials(user.nickname)}
                      </div>
                    )}
                    <span className={`position-absolute bottom-0 end-0 p-1 border border-white rounded-circle ${user.isOnline ? 'bg-success' : 'bg-secondary'}`} style={{ width: 12, height: 12 }}></span>
                  </div>
                  <div>
                    <h6 className="m-0 text-dark fw-semibold">{user.nickname === nickname ? '🐭💕 ' : '🐱💞 '}{user.nickname} {user.nickname === nickname && <span className="badge bg-secondary">You</span>}</h6>
                    <small className="text-muted">
                      {user.isOnline ? 'Online' : user.lastSeen ? `Last seen ${fmtTime(user.lastSeen)}` : 'Offline'}
                    </small>
                  </div>
                </div>
                {(user.os || user.browser) && (
                  <span className="badge bg-light text-secondary border small">{user.os}</span>
                )}
              </div>
            ))}
          </div>

          <footer className="p-3 border-top bg-light text-center small text-muted">
            {onlineCount} users online in this space
          </footer>
        </aside>

        {/* Chat Area Container */}
        <main className={`col-12 col-md-8 col-lg-9 bg-light h-100 flex-column ${view === 'chat' ? 'd-flex' : 'd-none d-md-flex'}`}>
          <div className="cn-checkers" title="Cartoon Network Space"></div>
          {/* Header */}
          <header className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-light d-md-none me-2" onClick={() => setView('sidebar')}>
                ⬅️ Members
              </button>
              
              {displayUser && (
                <div className="d-flex align-items-center gap-2">
                  <div className="position-relative">
                    {displayUser.avatarUrl ? (
                      <img
                        src={displayUser.avatarUrl.startsWith('http') ? displayUser.avatarUrl : `${baseUrl}${displayUser.avatarUrl}`}
                        alt={displayUser.nickname}
                        className="rounded-circle"
                        style={{ width: 38, height: 38, objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 38, height: 38 }}>
                        {initials(displayUser.nickname)}
                      </div>
                    )}
                    <span className={`position-absolute bottom-0 end-0 p-1 border border-white rounded-circle ${displayUser.isOnline ? 'bg-success' : 'bg-secondary'}`} style={{ width: 10, height: 10 }}></span>
                  </div>
                  <div>
                    <h6 className="m-0 text-dark fw-bold">{displayUser.nickname === nickname ? '🐭💕 ' : '🐱💞 '}{displayUser.nickname}</h6>
                    <small className="text-muted">{displayUser.isOnline ? 'Active Now' : 'Offline'}</small>
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex align-items-center gap-2">
              {displayUser && displayUser.nickname !== nickname && (
                <button className="btn btn-outline-primary btn-sm px-3 rounded-pill" onClick={startCall}>
                  📹 Call
                </button>
              )}
              <button className="btn btn-outline-danger btn-sm px-3 rounded-pill" onClick={handleClearHistory}>
                🗑️ Clear History
              </button>
            </div>
          </header>

          {/* Chat Messages Log */}
          <div ref={chatRef} className="flex-grow-1 overflow-y-auto p-4" style={{ background: 'var(--chat-bg)' }}>
            {visibleMessages.map((msg, idx) => {
              const isMe = msg.nickname === nickname;
              const isSystem = msg.nickname === 'System';

              const senderUser = users.find(u => u.nickname === msg.nickname);
              const senderAvatar = senderUser?.avatarUrl;

              if (isSystem) {
                return (
                  <div key={msg.id ?? `${msg.nickname}-${idx}`} className="text-center my-3">
                    <span className="badge bg-secondary bg-opacity-10 text-muted border py-2 px-3 rounded-pill">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id ?? `${msg.nickname}-${idx}`} className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                  
                  {/* Left avatar for theirs */}
                  {!isMe && (
                    <div className="me-2 align-self-end">
                      {senderAvatar ? (
                        <img
                          src={senderAvatar.startsWith('http') ? senderAvatar : `${baseUrl}${senderAvatar}`}
                          alt={msg.nickname}
                          className="rounded-circle"
                          style={{ width: 32, height: 32, objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 32, height: 32, fontSize: 11 }}>
                          {initials(msg.nickname)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="msg-bubble-container position-relative" style={{ maxWidth: '75%' }}>
                    <div
                      onClick={() => setOpenMenuMsgId(openMenuMsgId === msg.id ? null : msg.id ?? null)}
                      className={`card border-0 shadow-sm p-3 rounded-4 ${isMe ? 'msg-bubble-mine' : 'msg-bubble-theirs'}`}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Nickname for theirs */}
                      {!isMe && (
                        <div className="small fw-bold mb-1 opacity-75">🐱💞 {msg.nickname}</div>
                      )}

                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className={`border-start border-3 ps-2 mb-2 ${isMe ? 'msg-reply-mine' : 'msg-reply-theirs'}`} style={{ fontSize: 11 }}>
                          <span className="d-block fw-bold">{msg.replyTo.nickname === nickname ? '🐭💕 ' : '🐱💞 '}{msg.replyTo.nickname}</span>
                          <span>{msg.replyTo.message ? msg.replyTo.message.slice(0, 60) : '📎 Attachment'}</span>
                        </div>
                      )}

                      {/* Message Content */}
                      <p className={`m-0 ${msg.isDeleted ? 'fst-italic opacity-50' : ''}`}>
                        {msg.message}
                      </p>

                      {/* Instagram Reel / YouTube Shorts Embed preview */}
                      {!msg.isDeleted && (() => {
                        const embed = getVideoEmbed(msg.message);
                        if (!embed) return null;
                        return (
                          <div className="video-embed-wrapper my-2" style={{ maxWidth: 280, borderRadius: 8, overflow: 'hidden' }}>
                            <iframe
                              src={embed.url}
                              onLoad={scrollToBottom}
                              width="100%"
                              height="400"
                              frameBorder="0"
                              scrolling="no"
                              allowFullScreen={embed.type === 'youtube'}
                              allow="encrypted-media; picture-in-picture"
                              title={`${embed.type === 'instagram' ? 'Instagram Reel' : 'YouTube Shorts'} Embed`}
                              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}
                            />
                          </div>
                        );
                      })()}

                      {renderFile(msg)}

                      <div className="d-flex align-items-center justify-content-end gap-1 mt-2 opacity-50" style={{ fontSize: 10 }}>
                        <span>{fmtTime(msg.createdAt)}</span>
                        {msg.isEdited && <span>(edited)</span>}
                      </div>

                      {/* Self-Destruct Countdowns */}
                      {msg.expiresAt && (
                        <div className="small text-danger fw-bold mt-1">
                          🔥 Expires in: {Math.max(0, Math.round((new Date(msg.expiresAt).getTime() - nowTime) / 1000))}s
                        </div>
                      )}
                    </div>

                    {/* Reactions Pill Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="d-flex gap-1 mt-1 flex-wrap">
                        {Object.entries(msg.reactions).map(([emoji, reactionUsers]) => {
                          const hasReacted = reactionUsers.includes(nickname);
                          return (
                            <span
                              key={emoji}
                              onClick={e => { e.stopPropagation(); handleReactToMessage(msg.id!, emoji); }}
                              className={`badge rounded-pill border py-1 px-2 ${hasReacted ? 'bg-info text-dark border-info' : 'bg-white text-dark'}`}
                              style={{ cursor: 'pointer', fontSize: 10 }}
                              title={reactionUsers.join(', ')}
                            >
                              {emoji} {reactionUsers.length}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Action dropdown overlay */}
                    {openMenuMsgId === msg.id && !msg.isDeleted && (
                      <div className="card shadow border-light position-absolute p-2 bg-white rounded-3 mt-1" style={{ zIndex: 100, minWidth: 220, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0 }}>
                        <div className="d-flex justify-content-around pb-2 border-bottom mb-2">
                          {['❤️', '👍', '😂', '😮', '😢'].map(emoji => (
                            <span
                              key={emoji}
                              onClick={() => handleReactToMessage(msg.id!, emoji)}
                              style={{ cursor: 'pointer', fontSize: 16 }}
                              className="hover-scale"
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                        <div className="d-grid gap-1">
                          <button className="btn btn-sm btn-light text-start border-0 py-1" onClick={() => { setReplyTo(msg); setOpenMenuMsgId(null); inputRef.current?.focus(); }}>
                            ↩️ Reply
                          </button>
                          {isMe && (
                            <>
                              <button className="btn btn-sm btn-light text-start border-0 py-1" onClick={() => startEditMessage(msg)}>
                                ✏️ Edit Message
                              </button>
                              <button className="btn btn-sm btn-light text-danger text-start border-0 py-1" onClick={() => handleDeleteMessage(msg.id!)}>
                                🗑️ Delete Message
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right avatar for mine */}
                  {isMe && (
                    <div className="ms-2 align-self-end">
                      {senderAvatar ? (
                        <img
                          src={senderAvatar.startsWith('http') ? senderAvatar : `${baseUrl}${senderAvatar}`}
                          alt={msg.nickname}
                          className="rounded-circle"
                          style={{ width: 32, height: 32, objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 32, height: 32, fontSize: 11 }}>
                          {initials(msg.nickname)}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Typing status info */}
          <div className="px-4 py-1 text-muted small fst-italic" style={{ minHeight: 24 }}>
            {typingUser && `✍️ ${typingUser} is typing…`}
          </div>

          {/* Replying banner */}
          {replyTo && (
            <div className="bg-light p-3 border-top d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted d-block small">Replying to <strong>{replyTo.nickname}</strong></span>
                <span className="text-truncate d-block small text-dark" style={{ maxWidth: 300 }}>
                  {replyTo.message ? replyTo.message : '📎 Attachment'}
                </span>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-circle" onClick={() => setReplyTo(null)}>✕</button>
            </div>
          )}

          {/* Editing banner */}
          {editingMessage && (
            <div className="bg-light p-3 border-top d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted d-block small">Editing your message</span>
                <span className="text-truncate d-block small text-dark" style={{ maxWidth: 300 }}>
                  "{editingMessage.message}"
                </span>
              </div>
              <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={cancelEditMessage}>Cancel</button>
            </div>
          )}

          {/* Emojis selection overlay */}
          {showEmoji && (
            <div className="bg-white border-top p-3 d-flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button key={e} className="btn btn-outline-light border shadow-sm fs-4 px-3" onClick={() => insertEmoji(e)}>
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Input Panel footer */}
          <footer className="p-3 bg-white border-top d-flex align-items-center gap-2">
            <label htmlFor="lr-file" className="btn btn-light rounded-circle p-2 fs-5" title="Upload Attachment">
              {uploading ? '⏳' : '📎'}
            </label>
            <input type="file" id="lr-file" multiple style={{ display: 'none' }} onChange={handleFile} />

            <button className="btn btn-light rounded-circle p-2 fs-5" onClick={() => setShowEmoji(v => !v)}>
              😊
            </button>

            <input
              ref={inputRef}
              type="text"
              className="form-control rounded-pill px-4"
              value={message}
              placeholder={editingMessage ? "Edit message..." : "Type a message…"}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              style={{ padding: '10px 20px' }}
            />

            {/* Self-Destruct Timer Select */}
            <div className="burn-timer-dropdown dropdown d-flex align-items-center">
              <select
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
              className="btn btn-outline-danger rounded-circle p-2 fs-5 d-flex align-items-center justify-content-center"
              style={{ width: 44, height: 44 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                spawnHearts(8);
                spawnLoveParticles(rect.left + 22, rect.top + 22, 12);
                socketRef.current?.emit('sendMessage', { nickname, passcode, message: '❤️', replyTo: null });
              }}
              title="Send Heart Burst"
            >
              ❤️
            </button>

            <button className="btn btn-primary rounded-circle p-2 fs-5 d-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }} onClick={sendMessage}>
              ➡️
            </button>
          </footer>

        </main>
      </div>
    </div>
  );
}

export default ChatRoom;