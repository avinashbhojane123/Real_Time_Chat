import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { cleanInstagramMessage } from '../utils/instagram';
import YouTubePreview, { parseYouTubeUrl } from '../components/YouTubePreview';
import StatusViewerModal from '../components/StatusViewerModal';
import StatusCreatorModal from '../components/StatusCreatorModal';

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function InstagramVideoPlayer({ shortcode, baseUrl }) {
  const [meta, setMeta] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shortcode) return;
    let isMounted = true;
    const fetchMeta = async () => {
      try {
        setLoading(true);
        const cleanApiUrl = (baseUrl || 'https://backend-9i6w.onrender.com/api').replace(/\/+$/, '');
        const res = await axios.get(`${cleanApiUrl}/instagram/view`, {
          params: { url: `https://www.instagram.com/reel/${shortcode}/` },
        });
        if (isMounted && res.data) {
          setMeta(res.data);
        }
      } catch (err) {
        console.log('Failed to fetch Instagram metadata via gallery-dl', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMeta();
    return () => {
      isMounted = false;
    };
  }, [shortcode, baseUrl]);

  if (!shortcode) return null;

  const cleanApiUrl = (baseUrl || 'https://backend-9i6w.onrender.com/api').replace(/\/+$/, '');
  const proxyUrl = meta?.proxyVideoUrl
    ? (meta.proxyVideoUrl.startsWith('http') ? meta.proxyVideoUrl : `${cleanApiUrl.replace(/\/api\/?$/, '')}${meta.proxyVideoUrl}`)
    : null;
  const posterUrl = meta?.proxyThumbnailUrl
    ? (meta.proxyThumbnailUrl.startsWith('http') ? meta.proxyThumbnailUrl : `${cleanApiUrl.replace(/\/api\/?$/, '')}${meta.proxyThumbnailUrl}`)
    : meta?.thumbnailUrl;
  const cleanUrl = `https://www.instagram.com/reel/${shortcode}/`;

  const handleCopyCleanUrl = (e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        marginTop: '10px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--m3-outline-variant)',
        backgroundColor: '#0a0a0c',
        maxWidth: '380px',
        width: '100%',
        position: 'relative',
        boxShadow: 'var(--m3-elevation-2)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: 'rgba(18, 18, 22, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#e2e2e6', fontWeight: 600 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#e1306c' }}>movie</span>
          <span>{meta?.author?.username ? `@${meta.author.username}` : 'Instagram Reel'}</span>
        </div>

        <button
          className="m3-btn m3-btn-outlined"
          type="button"
          style={{ padding: '2px 8px', fontSize: '0.68rem', borderRadius: '10px', color: copied ? '#81c784' : '#fff', borderColor: copied ? '#81c784' : 'rgba(255,255,255,0.2)' }}
          onClick={handleCopyCleanUrl}
          title="Copy clean reel link without tracking tags"
        >
          {copied ? '✓ Clean Link Copied' : 'Copy Clean Link'}
        </button>
      </div>

      {/* Account-Free Native HTML5 Video Stream Player or Embed (No Instagram Redirection) */}
      {proxyUrl ? (
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000' }}>
          <video
            src={proxyUrl}
            controls
            loop
            playsInline
            poster={posterUrl}
            style={{ width: '100%', maxHeight: '460px', display: 'block', objectFit: 'contain' }}
          />
        </div>
      ) : loading ? (
        <div style={{ height: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: '#121216', color: '#e2e2e6' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#e1306c', animation: 'spin 1.5s linear infinite' }}>sync</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Resolving Instagram Reel (RapidAPI)...</span>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', overflow: 'hidden' }}>
          <iframe
            src={`https://www.instagram.com/p/${shortcode}/embed/captioned/`}
            style={{ width: '100%', height: '460px', border: 'none', background: '#000' }}
            title="Instagram Reel Direct Browser Preview"
            allowTransparency="true"
            allow="encrypted-media"
          />
        </div>
      )}

      {/* Caption & Account-Free Indicator Footer */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(20,20,26,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {meta?.caption ? (
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#c7c5d0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {meta.caption}
            </p>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--m3-on-surface-variant)' }}>
              {loading ? 'Resolving via gallery-dl...' : `Reel Stream (${shortcode})`}
            </span>
          )}
        </div>

        <span style={{ fontSize: '0.68rem', color: '#81c784', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span> Account Free
        </span>
      </div>
    </div>
  );
}

function formatLastSeen(lastSeenDate) {
  if (!lastSeenDate) return 'Offline';
  const date = new Date(lastSeenDate);
  if (isNaN(date.getTime())) return 'Offline';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) {
    return 'Last seen just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `Last seen ${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `Last seen ${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays < 7) {
    return `Last seen ${diffDays}d ago`;
  }
  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export default function ChatRoom() {
  const navigate = useNavigate();

  const baseUrl = localStorage.getItem('baseUrl') || 'https://backend-9i6w.onrender.com/api';
  const nickname = (localStorage.getItem('nickname') || '').trim();
  const passcode = (localStorage.getItem('passcode') || '').trim();
  const avatarUrl = localStorage.getItem('avatarUrl') || '';

  // Side-by-side Video Panel Toggle State
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState([]);

  // Drag to Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragTranslateX, setDragTranslateX] = useState(0);
  const touchStartXRef = useRef(0);

  // Message Edit State
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Clear Confirmation Modal State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Status Feature State
  const [statuses, setStatuses] = useState([]);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [activeStatusUser, setActiveStatusUser] = useState(null);

  // Reaction Picker & Toast State
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [toastText, setToastText] = useState(null);

  // Typing Feature State
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    if (socketRef.current) {
      socketRef.current.emit('typing', { passcode });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { passcode });
      }, 2000);
    }
  };

  const showToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2500);
  };

  const handleReactToMessage = (msgId, emoji) => {
    socketRef.current?.emit('reactToMessage', {
      passcode,
      messageId: msgId,
      emoji,
    });
    setActiveReactionMsgId(null);
  };

  const handleCreateStatus = (statusData) => {
    socketRef.current?.emit('createStatus', {
      passcode,
      ...statusData,
    });
  };

  const handleViewStatus = (statusId) => {
    socketRef.current?.emit('viewStatus', {
      passcode,
      statusId,
    });
  };

  const handleDeleteStatus = (statusId) => {
    socketRef.current?.emit('deleteStatus', {
      passcode,
      statusId,
    });
  };

  // Instagram Viewer State
  const [instaInputUrl, setInstaInputUrl] = useState('');
  const [instaResult, setInstaResult] = useState(null);
  const [instaLoading, setInstaLoading] = useState(false);
  const [instaError, setInstaError] = useState('');

  const startEditing = (msg) => {
    setEditingMsgId(msg.id);
    setEditingText(msg.message || '');
  };

  const cancelEditing = () => {
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleSaveEdit = (msgId, e) => {
    if (e) e.preventDefault();
    if (!editingText.trim()) return;
    socketRef.current?.emit('editMessage', {
      passcode,
      messageId: msgId,
      newMessage: editingText.trim(),
    });
    setEditingMsgId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (msgId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socketRef.current?.emit('deleteMessage', {
        passcode,
        messageId: msgId,
      });
    }
  };

  const handleClearHistory = () => {
    socketRef.current?.emit('clearHistory', { passcode });
    setShowClearConfirm(false);
  };




  // Call States & Controls
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [callerName, setCallerName] = useState('');
  const [remoteUserName, setRemoteUserName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isPipMode, setIsPipMode] = useState(false);
  const [remoteIsPip, setRemoteIsPip] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const chatBottomRef = useRef(null);
  const callStateRef = useRef('idle');
  const pendingIceCandidatesRef = useRef([]);
  const callTimerRef = useRef(null);
  const watchDogTimerRef = useRef(null);
  const lastInboundBytesRef = useRef(0);
  const stalledCountRef = useRef(0);

  const updateCallState = (state) => {
    setCallState(state);
    callStateRef.current = state;
  };

  const cleanUpCall = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (watchDogTimerRef.current) {
      clearInterval(watchDogTimerRef.current);
      watchDogTimerRef.current = null;
    }
    setCallDuration(0);
    pendingIceCandidatesRef.current = [];
    lastInboundBytesRef.current = 0;
    stalledCountRef.current = 0;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (err) {
        console.warn('Error closing peerConnection:', err);
      }
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    updateCallState('idle');
    setMicMuted(false);
    setCameraOff(false);
    setIsPipMode(false);
    setRemoteIsPip(false);
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }, []);

  const triggerIceRestart = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') return;
    console.log('[WebRTC] Connection stalled or degraded. Initiating ICE restart...');
    pc.createOffer({ iceRestart: true })
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current?.emit('webrtcOffer', { passcode, offer: pc.localDescription });
      })
      .catch((err) => console.warn('[WebRTC] ICE restart offer failed:', err));
  }, [passcode]);

  const addIceCandidateSafely = useCallback((candidate) => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
        console.warn('Error adding ICE candidate:', err);
      });
    } else {
      pendingIceCandidatesRef.current.push(candidate);
    }
  }, []);

  const processPendingIceCandidates = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      while (pendingIceCandidatesRef.current.length > 0) {
        const cand = pendingIceCandidatesRef.current.shift();
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
          console.warn('Error processing pending ICE candidate:', err);
        });
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
    }
    pendingIceCandidatesRef.current = [];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp',
          ],
          username: 'openrelay',
          credential: 'openrelay',
        },
      ],
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtcCandidate', { passcode, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      } else if (e.track) {
        setRemoteStream(new MediaStream([e.track]));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC ICE State]:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE connection state degraded, attempting automatic recovery...');
        triggerIceRestart();
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [passcode, triggerIceRestart]);

  // Video element binding effect
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, callState]);

  // Active call duration timer & media stream health watchdog
  useEffect(() => {
    if (callState === 'active') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      stalledCountRef.current = 0;
      lastInboundBytesRef.current = 0;
      watchDogTimerRef.current = setInterval(async () => {
        const pc = peerConnectionRef.current;
        if (!pc || pc.connectionState === 'closed') return;

        try {
          const stats = await pc.getStats();
          let currentInboundBytes = 0;
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
              currentInboundBytes += report.bytesReceived || 0;
            }
          });

          if (currentInboundBytes > 0 && currentInboundBytes === lastInboundBytesRef.current) {
            stalledCountRef.current += 1;
            console.warn(`[WebRTC Watchdog] Inbound bytes unchanged for ${stalledCountRef.current * 5}s`);
            if (stalledCountRef.current >= 2) {
              stalledCountRef.current = 0;
              triggerIceRestart();
            }
          } else {
            stalledCountRef.current = 0;
            lastInboundBytesRef.current = currentInboundBytes;
          }
        } catch (e) {
          console.warn('[WebRTC Watchdog] Error checking stats:', e);
        }
      }, 5000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (watchDogTimerRef.current) {
        clearInterval(watchDogTimerRef.current);
        watchDogTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (watchDogTimerRef.current) clearInterval(watchDogTimerRef.current);
    };
  }, [callState, triggerIceRestart]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket setup
  useEffect(() => {
    if (!nickname || !passcode) {
      navigate('/');
      return;
    }

    const socketUrl = baseUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { passcode, nickname, avatarUrl });
    });

    if (socket.connected) {
      socket.emit('joinRoom', { passcode, nickname, avatarUrl });
    }

    socket.on('usersList', (userList) => {
      setUsers(userList || []);
    });

    socket.on('chatHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('messageHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('newMessage', (msg) => {
      if (!msg) return;
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    });

    socket.on('userCalling', ({ callerName: cName }) => {
      setCallerName(cName);
      setRemoteUserName(cName);
      updateCallState('incoming');
      setShowVideoPanel(true);
    });

    socket.on('callAccepted', ({ receiverName: rName }) => {
      if (callStateRef.current === 'calling') {
        setRemoteUserName(rName);
        updateCallState('active');
        const pc = createPeerConnection();
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => socket.emit('webrtcOffer', { passcode, offer: pc.localDescription }))
          .catch(console.error);
      }
    });

    socket.on('callDeclined', () => {
      setToastText('Call was declined');
      setTimeout(() => setToastText(''), 3500);
      cleanUpCall();
    });

    socket.on('webrtcOfferRelay', ({ offer }) => {
      if (callStateRef.current === 'active' || callStateRef.current === 'incoming') {
        updateCallState('active');
        const pc = peerConnectionRef.current || createPeerConnection();
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => {
            processPendingIceCandidates();
            return pc.createAnswer();
          })
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => socket.emit('webrtcAnswer', { passcode, answer: pc.localDescription }))
          .catch(console.error);
      }
    });

    socket.on('webrtcAnswerRelay', ({ answer }) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current
          .setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => {
            processPendingIceCandidates();
          })
          .catch(console.error);
      }
    });

    socket.on('webrtcCandidateRelay', ({ candidate }) => {
      addIceCandidateSafely(candidate);
    });

    socket.on('callEnded', () => {
      setToastText('Call ended');
      setTimeout(() => setToastText(''), 3500);
      cleanUpCall();
    });

    socket.on('pipStateChanged', ({ nickname: n, isPip }) => {
      if (n !== nickname) {
        setRemoteIsPip(isPip);
      }
    });

    socket.on('messageEdited', ({ messageId, newMessage, fileUrl }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                message: newMessage ?? msg.message,
                fileUrl: fileUrl !== undefined ? fileUrl : msg.fileUrl,
                isEdited: true,
              }
            : msg
        )
      );
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isDeleted: true,
                message: 'This message was deleted',
                fileUrl: null,
                fileName: null,
                fileType: null,
                fileSize: null,
              }
            : msg
        )
      );
    });

    socket.on('historyCleared', () => {
      setMessages([]);
    });

    socket.on('userOffline', ({ nickname: offlineNick, lastSeen }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.nickname === offlineNick
            ? { ...u, isOnline: false, lastSeen: lastSeen || new Date() }
            : u
        )
      );
    });

    socket.on('userOnline', ({ nickname: onlineNick }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.nickname === onlineNick
            ? { ...u, isOnline: true, lastSeen: null }
            : u
        )
      );
    });

    socket.on('messageReactionsUpdated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg))
      );
    });

    // Typing status listeners
    socket.on('userTyping', ({ nickname: typingNick }) => {
      if (typingNick && typingNick !== nickname) {
        setTypingUsers((prev) => Array.from(new Set([...prev, typingNick])));
      }
    });

    socket.on('userStoppedTyping', ({ nickname: typingNick }) => {
      setTypingUsers((prev) => prev.filter((n) => n !== typingNick));
    });

    // Request initial statuses
    socket.emit('getStatuses', { passcode }, (statusList) => {
      if (Array.isArray(statusList)) {
        setStatuses(statusList);
      }
    });

    socket.on('statusesList', (statusList) => {
      if (Array.isArray(statusList)) {
        setStatuses(statusList);
      }
    });

    socket.on('statusCreated', (newStatus) => {
      if (!newStatus) return;
      setStatuses((prev) => [...prev.filter((s) => s.id !== newStatus.id), newStatus]);
    });

    socket.on('statusViewed', ({ statusId, viewers }) => {
      setStatuses((prev) =>
        prev.map((s) => (s.id === statusId ? { ...s, viewers } : s))
      );
    });

    socket.on('statusDeleted', ({ statusId }) => {
      setStatuses((prev) => prev.filter((s) => s.id !== statusId));
    });

    socket.on('exception', (err) => {
      console.warn('Socket exception:', err);
    });

    return () => {
      socket.disconnect();
      cleanUpCall();
    };
  }, [baseUrl, nickname, passcode, avatarUrl, navigate, cleanUpCall, createPeerConnection]);

  // Video refs
  const localVideoCallback = useCallback((el) => {
    if (el && localStream) el.srcObject = localStream;
  }, [localStream]);

  const remoteVideoCallback = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStream) el.srcObject = remoteStream;
  }, [remoteStream]);

  // Call Handlers
  const startCall = async () => {
    const target = users.find((u) => u.nickname !== nickname) || users[0];
    if (!target) {
      alert('No other users in room');
      return;
    }
    setRemoteUserName(target.nickname);
    updateCallState('calling');
    setShowVideoPanel(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current?.emit('callUser', { passcode, callerName: nickname });
    } catch {
      alert('Camera & microphone permissions required');
      cleanUpCall();
    }
  };

  const acceptCall = async () => {
    updateCallState('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current?.emit('acceptCall', { passcode, receiverName: nickname });
    } catch {
      alert('Camera & microphone permissions required');
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

  const togglePipMode = async () => {
    const nextPip = !isPipMode;
    setIsPipMode(nextPip);
    socketRef.current?.emit('togglePip', { passcode, isPip: nextPip });

    try {
      if (nextPip) {
        if (
          document.pictureInPictureEnabled &&
          remoteVideoRef.current &&
          remoteVideoRef.current.readyState >= 1 &&
          document.pictureInPictureElement !== remoteVideoRef.current
        ) {
          await remoteVideoRef.current.requestPictureInPicture();
        }
      } else {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      }
    } catch (err) {
      console.log('Native PiP fallback to floating layout', err);
    }
  };

  // Drag Gesture Handlers
  const handleTouchStart = (msg, e) => {
    touchStartXRef.current = e.touches[0].clientX;
    setActiveDragId(msg.id || msg.createdAt);
    setDragTranslateX(0);
  };

  const handleTouchMove = (e) => {
    if (!activeDragId) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    if (deltaX > 0 && deltaX < 140) {
      setDragTranslateX(deltaX);
    }
  };

  const handleTouchEnd = (msg) => {
    if (dragTranslateX > 40) {
      setReplyingTo({ id: msg.id, nickname: msg.nickname, message: msg.message });
    }
    setActiveDragId(null);
    setDragTranslateX(0);
  };

  const handleMouseDown = (msg, e) => {
    touchStartXRef.current = e.clientX;
    setActiveDragId(msg.id || msg.createdAt);
    setDragTranslateX(0);
  };

  const handleMouseMove = (e) => {
    if (!activeDragId) return;
    const deltaX = e.clientX - touchStartXRef.current;
    if (deltaX > 0 && deltaX < 140) {
      setDragTranslateX(deltaX);
    }
  };

  const handleMouseUp = (msg) => {
    if (dragTranslateX > 40) {
      setReplyingTo({ id: msg.id, nickname: msg.nickname, message: msg.message });
    }
    setActiveDragId(null);
    setDragTranslateX(0);
  };

  // Messaging & File Upload
  const handleInputPaste = (e) => {
    const pastedText = e.clipboardData?.getData('text');
    if (
      pastedText &&
      (/view profile|view more on instagram|add a comment/i.test(pastedText) ||
        /instagram\.com\/(?:p|reel)/i.test(pastedText))
    ) {
      e.preventDefault();
      const cleaned = cleanInstagramMessage(pastedText);
      setInputText((prev) => (prev ? `${prev} ${cleaned}` : cleaned));
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const msgText = cleanInstagramMessage(inputText.trim());
    if (!msgText) return;
    setInputText('');

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit('stopTyping', { passcode });

    socketRef.current?.emit('sendMessage', {
      passcode,
      nickname,
      message: msgText,
      replyTo: replyingTo
        ? { id: replyingTo.id, nickname: replyingTo.nickname, message: cleanInstagramMessage(replyingTo.message) }
        : null,
    });
    setReplyingTo(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);
      if (res.data && res.data.fileUrl) {
        socketRef.current?.emit('sendMessage', {
          passcode,
          nickname,
          message: `[File Attachment] ${res.data.fileName || file.name}`,
          fileUrl: res.data.fileUrl,
          replyTo: replyingTo ? { id: replyingTo.id, nickname: replyingTo.nickname, message: cleanInstagramMessage(replyingTo.message) } : null,
        });
        setReplyingTo(null);
      }
    } catch (err) {
      alert('File upload failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Instagram Viewer API Call
  const handleViewInstagram = async (e) => {
    e.preventDefault();
    const rawUrl = instaInputUrl.trim();
    if (!rawUrl) return;
    const cleanedUrl = cleanInstagramMessage(rawUrl);
    setInstaLoading(true);
    setInstaError('');
    setInstaResult(null);

    try {
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.get(`${cleanApiUrl}/upload/instagram/view`, {
        params: { url: cleanedUrl },
      });
      setInstaResult(res.data);
    } catch (err) {
      setInstaError(err.response?.data?.message || err.message || 'Failed to view Instagram media');
    } finally {
      setInstaLoading(false);
    }
  };

  // Instagram Shortcode Matcher
  const getInstagramEmbed = (text) => {
    if (!text) return null;
    const match = text.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([a-zA-Z0-9-_]+)/i);
    return match ? match[1] : null;
  };

  return (
    <div className="m3-app-container">
      {/* Floating Top Incoming Call Banner */}
      {callState === 'incoming' && (
        <div className="m3-incoming-call-banner">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--m3-tertiary-container)',
              color: 'var(--m3-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              border: '2px solid var(--m3-tertiary)',
            }}
          >
            {(callerName || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>
              {callerName || 'Someone'} is calling...
            </h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)' }}>
              Incoming Video Call
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginLeft: '12px' }}>
            <button
              type="button"
              className="m3-btn m3-btn-filled pulse-accept-btn"
              style={{ backgroundColor: '#81c784', color: '#000', padding: '8px 18px' }}
              onClick={acceptCall}
            >
              <span className="material-symbols-outlined">call</span>
              Accept
            </button>
            <button
              type="button"
              className="m3-btn m3-btn-danger"
              style={{ padding: '8px 18px' }}
              onClick={declineCall}
            >
              <span className="material-symbols-outlined">call_end</span>
              Decline
            </button>
          </div>
        </div>
      )}

      {/* M3 Top App Bar */}
      <header className="m3-top-app-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="m3-btn m3-btn-icon m3-btn-outlined"
            onClick={() => setSideDrawerOpen(!sideDrawerOpen)}
            title="Toggle Members Side Sheet"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>
              Space #{passcode}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)' }}>
              Signed in as <strong>{nickname}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="m3-btn m3-btn-tonal"
            onClick={() => setShowClearConfirm(true)}
            title="Clear All Messages in Space"
          >
            <span className="material-symbols-outlined" style={{ color: 'var(--m3-error)' }}>delete_sweep</span>
            <span className="m3-btn-label" style={{ color: 'var(--m3-error)' }}>Clear Chat</span>
          </button>
          <button
            className={`m3-btn ${showVideoPanel || callState !== 'idle' ? 'm3-btn-filled' : 'm3-btn-tonal'}`}
            onClick={() => setShowVideoPanel((prev) => !prev)}
            title="Toggle Side-by-Side Video Call Panel"
          >
            <span className="material-symbols-outlined">videocam</span>
            <span className="m3-btn-label">{showVideoPanel || callState !== 'idle' ? 'Hide Video' : 'Video Call'}</span>
          </button>
          <button
            className="m3-btn m3-btn-tonal"
            onClick={() => {
              localStorage.clear();
              navigate('/');
            }}
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="m3-content-layout">
        {/* M3 Side Sheet Drawer (Members List & Status Updates) */}
        <aside className={`m3-side-sheet ${sideDrawerOpen ? 'open' : ''}`}>
          {/* Status Updates Bar (WhatsApp Style) */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--m3-outline-variant)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--m3-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#25d366' }}>auto_awesome</span>
                Status Updates
              </h3>
              <button
                type="button"
                className="m3-btn m3-btn-icon"
                onClick={() => setShowStatusCreator(true)}
                title="Create Status"
                style={{ width: '32px', height: '32px', minWidth: 0, padding: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#25d366' }}>add_circle</span>
              </button>
            </div>

            {/* Status Avatar Strip */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {/* My Status */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => {
                  const mySts = statuses.filter((s) => s.nickname === nickname);
                  if (mySts.length > 0) {
                    setActiveStatusUser({ nickname, statuses: mySts });
                  } else {
                    setShowStatusCreator(true);
                  }
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--m3-secondary-container)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1rem',
                      border: statuses.some((s) => s.nickname === nickname) ? '2.5px solid #25d366' : '2px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      backgroundColor: '#25d366',
                      color: '#000',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #16161e',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    +
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#c7c5d0', marginTop: '4px', maxWidth: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  My Status
                </span>
              </div>

              {/* Other Members Statuses */}
              {users
                .filter((u) => u.nickname !== nickname)
                .map((u) => {
                  const userStatuses = statuses.filter((s) => s.nickname === u.nickname);
                  if (userStatuses.length === 0) return null;
                  const hasUnviewed = userStatuses.some(
                    (s) => !s.viewers || !s.viewers.includes(nickname)
                  );
                  return (
                    <div
                      key={u.id || u.nickname}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => setActiveStatusUser({ nickname: u.nickname, statuses: userStatuses })}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--m3-secondary-container)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          border: hasUnviewed ? '3px solid #25d366' : '2px solid rgba(255,255,255,0.2)',
                          boxShadow: hasUnviewed ? '0 0 8px rgba(37, 211, 102, 0.5)' : 'none',
                        }}
                      >
                        {u.nickname.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#c7c5d0', marginTop: '4px', maxWidth: '54px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nickname}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--m3-outline-variant)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--m3-primary)' }}>
              Active Space Members ({users.length})
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--m3-radius-m)',
                  backgroundColor: u.nickname === nickname ? 'var(--m3-primary-container)' : 'var(--m3-surface-container-high)',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--m3-radius-full)',
                    backgroundColor: 'var(--m3-secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {u.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.nickname} {u.nickname === nickname ? '(You)' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: u.isOnline ? '#81c784' : 'var(--m3-outline)' }}>
                    {u.isOnline ? 'Active Now' : formatLastSeen(u.lastSeen)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Dynamic View Sections based on Active Tab */}
        {/* Main Side-by-Side Workspace */}
        <main className="m3-main-chat" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: '280px' }}>
            {/* Always Visible Top WhatsApp Status Header Bar */}
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--m3-surface-container-lowest)',
                borderBottom: '1px solid var(--m3-outline-variant)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                overflowX: 'auto',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#25d366', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
                Status:
              </div>

              {/* My Status Item */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0, padding: '2px 8px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                onClick={() => {
                  const mySts = statuses.filter((s) => s.nickname === nickname);
                  if (mySts.length > 0) {
                    setActiveStatusUser({ nickname, statuses: mySts });
                  } else {
                    setShowStatusCreator(true);
                  }
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--m3-secondary-container)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      border: statuses.some((s) => s.nickname === nickname) ? '2.5px solid #25d366' : '1.5px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      backgroundColor: '#25d366',
                      color: '#000',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    +
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>My Status</span>
              </div>

              {/* Other Members Status Items */}
              {Array.from(new Set(statuses.map((s) => s.nickname)))
                .filter((n) => n !== nickname)
                .map((userNick) => {
                  const userStatuses = statuses.filter((s) => s.nickname === userNick);
                  if (userStatuses.length === 0) return null;
                  const hasUnviewed = userStatuses.some((s) => !s.viewers || !s.viewers.includes(nickname));

                  return (
                    <div
                      key={userNick}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0, padding: '2px 8px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                      onClick={() => setActiveStatusUser({ nickname: userNick, statuses: userStatuses })}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--m3-secondary-container)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: hasUnviewed ? '2.5px solid #25d366' : '1.5px solid rgba(255,255,255,0.2)',
                          boxShadow: hasUnviewed ? '0 0 6px rgba(37, 211, 102, 0.5)' : 'none',
                        }}
                      >
                        {userNick.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: hasUnviewed ? '#25d366' : '#c7c5d0', fontWeight: hasUnviewed ? 700 : 500 }}>
                        {userNick}
                      </span>
                    </div>
                  );
                })}

              <button
                type="button"
                className="m3-btn m3-btn-outlined"
                style={{ padding: '2px 10px', fontSize: '0.72rem', borderRadius: '14px', marginLeft: 'auto', flexShrink: 0, borderColor: '#25d366', color: '#25d366' }}
                onClick={() => setShowStatusCreator(true)}
              >
                + Add Status
              </button>
            </div>

            {/* Chat Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--m3-on-surface-variant)', padding: '40px 20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>forum</span>
                  <p style={{ marginTop: '8px' }}>No messages in this space yet. Drag a message to reply!</p>
                </div>
              )}

              {(() => {
                let lastDateHeader = '';
                return messages.map((m, idx) => {
                  const isSelf = m.nickname === nickname;
                  const msgId = m.id || idx;
                  const isDragging = activeDragId === msgId;
                  const currentTranslate = isDragging ? dragTranslateX : 0;
                  const instaShortcode = getInstagramEmbed(m.message);
                  const ytData = parseYouTubeUrl(m.message);
                  const currentDateHeader = formatDateHeader(m.createdAt);
                  let renderDateHeader = false;
                  if (currentDateHeader && currentDateHeader !== lastDateHeader) {
                    renderDateHeader = true;
                    lastDateHeader = currentDateHeader;
                  }

                  return (
                    <div key={msgId} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      {/* Date Separator Badge */}
                      {renderDateHeader && (
                        <div
                          style={{
                            alignSelf: 'center',
                            margin: '16px 0 8px 0',
                            padding: '4px 14px',
                            borderRadius: '16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--m3-on-surface-variant)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          {currentDateHeader}
                        </div>
                      )}

                      <div
                        style={{
                          alignSelf: isSelf ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          position: 'relative',
                          transform: `translateX(${currentTranslate}px)`,
                          transition: isDragging ? 'none' : 'transform 0.2s ease',
                          userSelect: 'none',
                          cursor: 'grab',
                        }}
                        onTouchStart={(e) => handleTouchStart(m, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(m)}
                        onMouseDown={(e) => handleMouseDown(m, e)}
                        onMouseMove={handleMouseMove}
                        onMouseUp={() => handleMouseUp(m)}
                      >
                        {/* Drag to Reply Indicator Icon */}
                        {currentTranslate > 20 && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '-32px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--m3-primary)',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined">reply</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px', paddingLeft: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)', fontWeight: 600 }}>
                            {m.nickname}
                          </span>

                          {!m.isDeleted && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              {/* Emoji Reaction Action Button */}
                              <button
                                type="button"
                                className="m3-action-btn"
                                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msgId ? null : msgId)}
                                title="React with Emoji"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add_reaction</span>
                              </button>

                              <button
                                type="button"
                                className="m3-action-btn"
                                onClick={() => setReplyingTo({ id: m.id, nickname: m.nickname, message: m.message })}
                                title="Reply"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>reply</span>
                              </button>
                              {isSelf && m.id && (
                                <>
                                  <button
                                    type="button"
                                    className="m3-action-btn"
                                    onClick={() => startEditing(m)}
                                    title="Edit message"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="m3-action-btn m3-action-btn-danger"
                                    onClick={() => handleDeleteMessage(m.id)}
                                    title="Delete message"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Floating Emoji Picker Popover */}
                        {activeReactionMsgId === msgId && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-38px',
                              right: isSelf ? '0' : 'auto',
                              left: isSelf ? 'auto' : '0',
                              zIndex: 100,
                              backgroundColor: 'rgba(20, 20, 26, 0.95)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '20px',
                              padding: '4px 8px',
                              display: 'flex',
                              gap: '6px',
                              boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            {['👍', '❤️', '😂', '😮', '😢', '🔥', '🙏'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  fontSize: '1.1rem',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  transition: 'transform 0.15s ease',
                                }}
                                onClick={() => handleReactToMessage(m.id, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        <div
                          style={{
                            padding: '12px 16px',
                            borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            backgroundColor: isSelf ? 'var(--m3-primary-container)' : 'var(--m3-surface-container-high)',
                            color: isSelf ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface)',
                            boxShadow: 'var(--m3-elevation-1)',
                          }}
                        >
                          {m.isDeleted ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', opacity: 0.8 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>block</span>
                              <span>This message was deleted</span>
                            </div>
                          ) : editingMsgId === m.id ? (
                            <form onSubmit={(e) => handleSaveEdit(m.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <input
                                type="text"
                                className="m3-text-field"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                autoFocus
                                style={{ fontSize: '0.875rem', padding: '6px 10px', borderRadius: 'var(--m3-radius-s)', color: '#fff', backgroundColor: 'rgba(0,0,0,0.3)' }}
                              />
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="m3-btn m3-btn-tonal"
                                  style={{ padding: '2px 10px', fontSize: '0.72rem' }}
                                  onClick={cancelEditing}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="m3-btn m3-btn-filled"
                                  style={{ padding: '2px 10px', fontSize: '0.72rem' }}
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              {/* Quoted Reply Card */}
                              {m.replyTo && (
                                <div
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--m3-radius-s)',
                                    backgroundColor: 'rgba(0,0,0,0.25)',
                                    borderLeft: '4px solid var(--m3-primary)',
                                    marginBottom: '8px',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <div style={{ fontWeight: 700, color: 'var(--m3-primary)' }}>{m.replyTo.nickname}</div>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>
                                    {cleanInstagramMessage(m.replyTo.message)}
                                  </div>
                                </div>
                              )}

                              <p style={{ margin: 0, wordBreak: 'break-word', lineHeight: '1.45' }}>
                                {cleanInstagramMessage(m.message)}
                                {m.isEdited && (
                                  <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '6px', fontStyle: 'italic' }}>
                                    (edited)
                                  </span>
                                )}
                              </p>

                              {/* YouTube Interactive Video Preview Card */}
                              {ytData && <YouTubePreview messageText={m.message} onCopySuccess={showToast} />}

                              {/* File Attachment Preview */}
                              {m.fileUrl && (
                                <div style={{ marginTop: '8px' }}>
                                  <a
                                    href={`${baseUrl.replace(/\/api\/?$/, '')}${m.fileUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="m3-btn m3-btn-outlined"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  >
                                    <span className="material-symbols-outlined">attachment</span>
                                    Attachment
                                  </a>
                                </div>
                              )}

                              {/* Direct In-Chat Instagram Video Preview Player */}
                              {instaShortcode && <InstagramVideoPlayer shortcode={instaShortcode} baseUrl={baseUrl} />}

                              {/* Emoji Reactions Display Pills */}
                              {m.reactions && Object.keys(m.reactions).length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                  {Object.entries(m.reactions).map(([emoji, userList]) => {
                                    const hasMyReaction = Array.isArray(userList) && userList.includes(nickname);
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleReactToMessage(m.id, emoji)}
                                        title={`Reacted by: ${Array.isArray(userList) ? userList.join(', ') : ''}`}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          backgroundColor: hasMyReaction ? 'rgba(37, 211, 102, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                                          border: hasMyReaction ? '1px solid #25d366' : '1px solid rgba(255, 255, 255, 0.1)',
                                          fontSize: '0.78rem',
                                          color: '#fff',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <span>{emoji}</span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{userList.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Visible Chat Message Timestamp */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.68rem', color: isSelf ? 'rgba(255,255,255,0.7)' : 'var(--m3-outline)', fontWeight: 500 }}>
                                  {formatMessageTime(m.createdAt)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={chatBottomRef} />
            </div>

            {/* Replying-To Active Banner */}
            {replyingTo && (
              <div
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'var(--m3-surface-container-highest)',
                  borderTop: '1px solid var(--m3-outline-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--m3-primary)' }}>reply</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Replying to <strong>{replyingTo.nickname}</strong>: <em>"{replyingTo.message}"</em>
                  </span>
                </div>
                <button
                  className="m3-btn m3-btn-icon m3-btn-outlined"
                  style={{ width: '28px', height: '28px', flexShrink: 0 }}
                  onClick={() => setReplyingTo(null)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            )}

            {/* Active Typing Indicator Bar */}
            {typingUsers.length > 0 && (
              <div
                style={{
                  padding: '6px 20px',
                  backgroundColor: 'rgba(37, 211, 102, 0.08)',
                  borderTop: '1px solid rgba(37, 211, 102, 0.2)',
                  color: '#25d366',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#25d366' }}>
                  edit
                </span>
                <span>
                  <strong>{typingUsers.join(', ')}</strong> {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            {/* Chat Input Bar */}
            <div style={{ padding: '16px 20px', backgroundColor: 'var(--m3-surface-container)', borderTop: '1px solid var(--m3-outline-variant)' }}>
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="m3-btn m3-btn-icon m3-btn-tonal" style={{ cursor: 'pointer', flexShrink: 0 }}>
                  <span className="material-symbols-outlined">attach_file</span>
                  <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                <input
                  type="text"
                  className="m3-text-field"
                  style={{ borderRadius: 'var(--m3-radius-full)' }}
                  value={inputText}
                  onChange={handleInputChange}
                  onPaste={handleInputPaste}
                  placeholder={replyingTo ? `Reply to ${replyingTo.nickname}...` : 'Type a message (or drag message to reply)...'}
                />

                <button type="submit" className="m3-btn m3-btn-filled m3-btn-icon" style={{ flexShrink: 0 }}>
                  <span className="material-symbols-outlined">send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Side-by-Side Video Call Panel / Floating Overlay */}
          {(showVideoPanel || callState !== 'idle') && (
            <div
              className="m3-video-panel"
              style={
                isPipMode
                  ? {
                      position: 'fixed',
                      bottom: '24px',
                      right: '24px',
                      width: '360px',
                      height: '270px',
                      zIndex: 1000,
                      borderRadius: 'var(--m3-radius-l)',
                      border: '1px solid var(--m3-primary)',
                      backgroundColor: 'var(--m3-surface-container-high)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
                    }
                  : {
                      width: '420px',
                      maxWidth: '45%',
                      minWidth: '300px',
                      borderLeft: '1px solid var(--m3-outline-variant)',
                      backgroundColor: 'var(--m3-surface-container-lowest)',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      height: '100%',
                    }
              }
            >
              {/* Video Panel Header */}
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--m3-outline-variant)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--m3-surface-container)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--m3-primary)', fontSize: '20px' }}>
                    videocam
                  </span>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--m3-on-surface)' }}>
                    Video Call Space
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className={`m3-btn m3-btn-icon ${isPipMode ? 'm3-btn-filled' : 'm3-btn-outlined'}`}
                    style={{ width: '28px', height: '28px' }}
                    onClick={togglePipMode}
                    title={isPipMode ? 'Dock to Side Panel' : 'Float over Chat'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      {isPipMode ? 'dock' : 'picture_in_picture_alt'}
                    </span>
                  </button>

                  <button
                    className="m3-btn m3-btn-icon m3-btn-outlined"
                    style={{ width: '28px', height: '28px' }}
                    onClick={() => setShowVideoPanel(false)}
                    title="Hide Video Panel"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      close
                    </span>
                  </button>
                </div>
              </div>

              {/* Video Panel Body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', backgroundColor: '#0c0a0f' }}>
                {callState === 'idle' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--m3-primary-container)',
                        color: 'var(--m3-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
                        videocam
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--m3-on-surface)' }}>
                      Ready to Connect
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--m3-on-surface-variant)', marginBottom: '24px', maxWidth: '240px', lineHeight: 1.4 }}>
                      Start an instant peer-to-peer video call with members in Space #{passcode}.
                    </p>
                    <button
                      className="m3-btn m3-btn-filled"
                      onClick={startCall}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: 'var(--m3-radius-full)' }}
                    >
                      <span className="material-symbols-outlined">call</span>
                      <span>Start Video Call</span>
                    </button>
                  </div>
                )}

                {callState === 'calling' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--m3-secondary-container)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        color: 'var(--m3-primary)',
                        marginBottom: '16px',
                        border: '3px solid var(--m3-primary)',
                        animation: 'storyPulse 2s infinite',
                      }}
                    >
                      {(remoteUserName || 'S').slice(0, 2).toUpperCase()}
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', color: 'var(--m3-on-surface)' }}>
                      Calling {remoteUserName || 'Space Members'}...
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--m3-on-surface-variant)', marginBottom: '24px' }}>
                      Ringing space members
                    </p>
                    <button className="m3-btn m3-btn-danger" onClick={endCall} style={{ padding: '8px 20px' }}>
                      <span className="material-symbols-outlined">call_end</span>
                      Cancel Call
                    </button>
                  </div>
                )}

                {callState === 'incoming' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--m3-tertiary-container)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        color: 'var(--m3-tertiary)',
                        marginBottom: '16px',
                        border: '3px solid var(--m3-tertiary)',
                        animation: 'pulseRinging 1.5s infinite',
                      }}
                    >
                      {(callerName || 'C').slice(0, 2).toUpperCase()}
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', color: 'var(--m3-on-surface)' }}>
                      {callerName} is calling...
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--m3-on-surface-variant)', marginBottom: '24px' }}>
                      Incoming Video Call
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="m3-btn m3-btn-filled pulse-accept-btn" style={{ backgroundColor: '#81c784', color: '#000', padding: '8px 20px' }} onClick={acceptCall}>
                        <span className="material-symbols-outlined">call</span>
                        Accept
                      </button>
                      <button className="m3-btn m3-btn-danger" onClick={declineCall} style={{ padding: '8px 20px' }}>
                        <span className="material-symbols-outlined">call_end</span>
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {callState === 'active' && (
                  <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', flex: 1, overflow: 'hidden' }}>
                    {/* Live Duration Timer Badge */}
                    <div className="m3-call-timer">
                      <div className="m3-call-timer-dot"></div>
                      <span>{formatTimer(callDuration)}</span>
                    </div>

                    {/* Remote Video Feed */}
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: remoteStream ? 'block' : 'none',
                      }}
                    />

                    {/* Fallback Remote User Avatar when camera off or stream connecting */}
                    {!remoteStream && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#17151c',
                        }}
                      >
                        <div
                          style={{
                            width: '88px',
                            height: '88px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--m3-primary-container)',
                            color: 'var(--m3-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 700,
                            marginBottom: '12px',
                            border: '3px solid var(--m3-primary)',
                          }}
                        >
                          {(remoteUserName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--m3-on-surface)' }}>
                          {remoteUserName || 'Remote User'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#81c784', marginTop: '4px' }}>Connected</span>
                      </div>
                    )}

                    {/* Self Local Video Overlay (PIP) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        width: isPipMode ? '80px' : '120px',
                        height: isPipMode ? '56px' : '85px',
                        borderRadius: 'var(--m3-radius-m)',
                        overflow: 'hidden',
                        border: '2px solid var(--m3-primary)',
                        backgroundColor: '#121116',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                        zIndex: 30,
                      }}
                    >
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: cameraOff ? 'none' : 'block',
                        }}
                      />
                      {cameraOff && (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#2b2833',
                            color: 'var(--m3-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          {nickname.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* M3 Glassmorphism Control Dock */}
                    <div className="m3-video-dock">
                      <button
                        className={`m3-btn m3-btn-icon ${micMuted ? 'm3-btn-danger' : 'm3-btn-tonal'}`}
                        onClick={toggleMic}
                        title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
                      >
                        <span className="material-symbols-outlined">{micMuted ? 'mic_off' : 'mic'}</span>
                      </button>
                      <button
                        className={`m3-btn m3-btn-icon ${cameraOff ? 'm3-btn-danger' : 'm3-btn-tonal'}`}
                        onClick={toggleCamera}
                        title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                      >
                        <span className="material-symbols-outlined">{cameraOff ? 'videocam_off' : 'videocam'}</span>
                      </button>
                      <button
                        className={`m3-btn m3-btn-icon ${isPipMode ? 'm3-btn-filled' : 'm3-btn-tonal'}`}
                        onClick={togglePipMode}
                        title={isPipMode ? 'Dock to Side' : 'Float Window'}
                      >
                        <span className="material-symbols-outlined">{isPipMode ? 'dock' : 'picture_in_picture_alt'}</span>
                      </button>
                      <button className="m3-btn m3-btn-icon m3-btn-danger" onClick={endCall} title="End Call">
                        <span className="material-symbols-outlined">call_end</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="m3-card"
            style={{
              maxWidth: '420px',
              width: '90%',
              backgroundColor: 'var(--m3-surface-container-high)',
              borderRadius: 'var(--m3-radius-l)',
              padding: '24px',
              boxShadow: 'var(--m3-elevation-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--m3-error)' }}>delete_sweep</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>Clear All Messages?</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--m3-on-surface-variant)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to clear all messages in Space #{passcode} for everyone? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="m3-btn m3-btn-tonal"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="m3-btn m3-btn-danger"
                onClick={handleClearHistory}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Creator Modal */}
      {showStatusCreator && (
        <StatusCreatorModal
          baseUrl={baseUrl}
          onClose={() => setShowStatusCreator(false)}
          onSubmitStatus={handleCreateStatus}
        />
      )}

      {/* Status Story Viewer Modal */}
      {activeStatusUser && (
        <StatusViewerModal
          statuses={activeStatusUser.statuses}
          initialIndex={0}
          currentNickname={nickname}
          onClose={() => setActiveStatusUser(null)}
          onViewStatus={handleViewStatus}
          onDeleteStatus={handleDeleteStatus}
        />
      )}

      {/* Copy Toast Feedback Popup */}
      {toastText && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(20, 20, 26, 0.95)',
            border: '1px solid #25d366',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#25d366', fontSize: '18px' }}>
            check_circle
          </span>
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}

