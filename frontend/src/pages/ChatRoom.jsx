import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

import { getApiBaseUrl, getSocketBaseUrl } from '../utils/apiConfig';
import YouTubePreview from '../components/YouTubePreview';
import InstagramPreview from '../components/InstagramPreview';
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

function formatLastSeen(lastSeenDate) {
  if (!lastSeenDate) return 'offline';
  const date = new Date(lastSeenDate);
  if (isNaN(date.getTime())) return 'offline';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) {
    return 'online';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `last seen ${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `last seen ${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return `last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export default function ChatRoom() {
  const navigate = useNavigate();

  const baseUrl = sessionStorage.getItem('baseUrl') || localStorage.getItem('baseUrl') || getApiBaseUrl();
  const nickname = (sessionStorage.getItem('nickname') || '').trim();
  const passcode = (sessionStorage.getItem('passcode') || '').trim();

  // Responsive Roster Panel Toggle
  const [showRosterPanel, setShowRosterPanel] = useState(true);

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

  // Toast State
  const [toastText, setToastText] = useState(null);

  // File Uploading & Lightbox State
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Typing Feature State
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Search & Pinned Messages Feature State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState(null);

  // Call States & Controls
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [callerName, setCallerName] = useState('');
  const [remoteUserName, setRemoteUserName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showVideoPanel, setShowVideoPanel] = useState(false);

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

  const handleTogglePinMessage = (msg) => {
    if (pinnedMessage && pinnedMessage.id === msg.id) {
      socketRef.current?.emit('pinMessage', { passcode, messageId: null });
    } else {
      socketRef.current?.emit('pinMessage', { passcode, messageId: msg.id });
    }
  };

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
    setShowVideoPanel(false);
  }, []);

  const triggerIceRestart = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') return;
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
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
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

  // Video element binding callbacks
  const localVideoCallback = useCallback(
    (node) => {
      localVideoRef.current = node;
      if (node && localStream) {
        node.srcObject = localStream;
        node.play().catch(() => {});
      }
    },
    [localStream]
  );

  const remoteVideoCallback = useCallback(
    (node) => {
      remoteVideoRef.current = node;
      if (node && remoteStream) {
        node.srcObject = remoteStream;
        node.play().catch(() => {});
      }
    },
    [remoteStream]
  );

  // Active call duration timer & watchdog
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
          let currentBytes = 0;
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.mediaType === 'video')) {
              currentBytes += report.bytesReceived || 0;
            }
          });

          if (currentBytes > 0 && currentBytes === lastInboundBytesRef.current) {
            stalledCountRef.current += 1;
            if (stalledCountRef.current >= 3) {
              stalledCountRef.current = 0;
              triggerIceRestart();
            }
          } else {
            stalledCountRef.current = 0;
          }
          lastInboundBytesRef.current = currentBytes;
        } catch (e) {}
      }, 4000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (watchDogTimerRef.current) clearInterval(watchDogTimerRef.current);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (watchDogTimerRef.current) clearInterval(watchDogTimerRef.current);
    };
  }, [callState, triggerIceRestart]);

  // Auth verification check on mount
  useEffect(() => {
    if (!nickname || !passcode) {
      navigate('/', { replace: true });
    }
  }, [nickname, passcode, navigate]);

  // Socket Connection setup
  useEffect(() => {
    if (!nickname || !passcode) return;

    const socketUrl = getSocketBaseUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { nickname, passcode });
    });

    socket.on('roomHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('roomUsers', (userList) => {
      setUsers(userList || []);
    });

    socket.on('statusesUpdate', (statusesList) => {
      setStatuses(statusesList || []);
    });

    socket.on('messageEdited', ({ messageId, newMessage, editedAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, message: newMessage, editedAt, isEdited: true } : m
        )
      );
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on('messageReacted', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    socket.on('messagePinned', ({ messageId }) => {
      if (!messageId) {
        setPinnedMessage(null);
      } else {
        setMessages((prev) => {
          const found = prev.find((m) => m.id === messageId);
          if (found) setPinnedMessage(found);
          return prev;
        });
      }
    });

    socket.on('historyCleared', () => {
      setMessages([]);
      setPinnedMessage(null);
    });

    socket.on('userTyping', ({ nickname: typingNick }) => {
      setTypingUsers((prev) => {
        if (!prev.includes(typingNick)) return [...prev, typingNick];
        return prev;
      });
    });

    socket.on('userStopTyping', ({ nickname: stopNick }) => {
      setTypingUsers((prev) => prev.filter((n) => n !== stopNick));
    });

    // WebRTC Signaling Handlers
    socket.on('webrtcOffer', async ({ from, offer }) => {
      setShowVideoPanel(true);
      if (callStateRef.current === 'active' || callStateRef.current === 'calling') {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        processPendingIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtcAnswer', { passcode, answer });
        return;
      }

      setCallerName(from);
      updateCallState('incoming');
      window.latestOffer = offer;
    });

    socket.on('webrtcAnswer', async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        processPendingIceCandidates();
        updateCallState('active');
      }
    });

    socket.on('webrtcCandidate', async ({ candidate }) => {
      if (candidate) {
        addIceCandidateSafely(candidate);
      }
    });

    socket.on('callEnded', () => {
      cleanUpCall();
    });

    return () => {
      socket.disconnect();
      cleanUpCall();
    };
  }, [nickname, passcode, createPeerConnection, cleanUpCall, addIceCandidateSafely, processPendingIceCandidates]);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Send Message Handler
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    socketRef.current?.emit('sendMessage', {
      passcode,
      message: inputText.trim(),
      replyTo: replyingTo
        ? { id: replyingTo.id, nickname: replyingTo.nickname, message: replyingTo.message }
        : null,
    });

    setInputText('');
    setReplyingTo(null);
  };

  // Upload Attachment Handler
  const handleUploadAttachment = async (file) => {
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);

      if (res.data && res.data.fileUrl) {
        const fullUrl = res.data.fileUrl.startsWith('http')
          ? res.data.fileUrl
          : `${cleanApiUrl.replace(/\/api\/?$/, '')}${res.data.fileUrl}`;

        socketRef.current?.emit('sendMessage', {
          passcode,
          message: file.type.startsWith('image/') ? '📷 Photo' : `📎 ${file.name}`,
          fileUrl: fullUrl,
          fileType: file.type,
          fileName: file.name,
          replyTo: replyingTo
            ? { id: replyingTo.id, nickname: replyingTo.nickname, message: replyingTo.message }
            : null,
        });
        setReplyingTo(null);
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploadingFile(false);
    }
  };

  // WebRTC Call Actions
  const startCall = async () => {
    setShowVideoPanel(true);
    updateCallState('calling');
    setRemoteUserName('Space Members');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('webrtcOffer', { passcode, offer });
    } catch (err) {
      alert('Could not access camera/microphone: ' + err.message);
      cleanUpCall();
    }
  };

  const acceptCall = async () => {
    updateCallState('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      if (window.latestOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(window.latestOffer));
        processPendingIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('webrtcAnswer', { passcode, answer });
      }
    } catch (err) {
      alert('Could not access media devices: ' + err.message);
      cleanUpCall();
    }
  };

  const declineCall = () => {
    socketRef.current?.emit('callEnded', { passcode });
    cleanUpCall();
  };

  const endCall = () => {
    socketRef.current?.emit('callEnded', { passcode });
    cleanUpCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Group status updates by user nickname
  const groupedStatuses = statuses.reduce((acc, st) => {
    if (!acc[st.nickname]) {
      acc[st.nickname] = [];
    }
    acc[st.nickname].push(st);
    return acc;
  }, {});

  const statusUserList = Object.keys(groupedStatuses).map((nick) => ({
    nickname: nick,
    statuses: groupedStatuses[nick],
    hasUnseen: groupedStatuses[nick].some((s) => !s.viewers?.includes(nickname)),
  }));

  // Touch Swipe for Reply Gesture
  const handleTouchStart = (e, msgId) => {
    touchStartXRef.current = e.touches[0].clientX;
    setActiveDragId(msgId);
  };

  const handleTouchMove = (e) => {
    if (!activeDragId) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartXRef.current;
    if (diffX > 0 && diffX < 100) {
      setDragTranslateX(diffX);
    }
  };

  const handleTouchEnd = (msg) => {
    if (dragTranslateX > 50 && msg) {
      setReplyingTo(msg);
    }
    setActiveDragId(null);
    setDragTranslateX(0);
  };

  // Filter messages by search query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nickname?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#111b21', overflow: 'hidden' }}>
      
      {/* 1. Chats Roster Panel (Left Column) */}
      <aside
        style={{
          width: '320px',
          backgroundColor: '#111b21',
          borderRight: '1px solid rgba(134, 150, 160, 0.15)',
          display: showRosterPanel ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          zIndex: 30,
          flexShrink: 0,
        }}
        className="wa-roster-desktop"
      >
        {/* Roster Header */}
        <div
          style={{
            height: '60px',
            backgroundColor: '#202c33',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {nickname.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e9edef', margin: 0 }}>
              Chats
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Status Story Trigger Button */}
            <button
              type="button"
              onClick={() => {
                if (statusUserList.length > 0) setActiveStatusUser(statusUserList[0]);
                else setShowStatusCreator(true);
              }}
              style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
              title="Status Story"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>donut_large</span>
            </button>
            
            <button
              type="button"
              onClick={() => setShowRosterPanel(false)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '6px' }}
              className="hidden-desktop"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Active Space Item Card */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#2a3942',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            borderLeft: '4px solid #00a884',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            #
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e9edef' }}>
                Nexus Space #{passcode}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#00a884', fontWeight: 600 }}>
                {messages.length > 0 ? formatMessageTime(messages[messages.length - 1].createdAt) : 'now'}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#8696a0', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typingUsers.length > 0
                ? `${typingUsers.join(', ')} is typing...`
                : messages.length > 0
                ? `${messages[messages.length - 1].nickname}: ${messages[messages.length - 1].message}`
                : 'Click to start real-time chat'}
            </div>
          </div>
        </div>

        {/* Online Participants Roster List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '6px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#8696a0', letterSpacing: '0.5px' }}>
            ONLINE PARTICIPANTS ({users.length})
          </div>
          {users.map((u, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              className="hover:bg-[#202c33]"
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#202c33',
                  color: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {u.nickname?.charAt(0).toUpperCase() || 'U'}
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#25d366',
                    position: 'absolute',
                    bottom: '1px',
                    right: '1px',
                    border: '2px solid #111b21',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#e9edef' }}>
                    {u.nickname} {u.nickname === nickname && '(You)'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8696a0', marginTop: '2px' }}>
                  {formatLastSeen(u.lastSeen)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* 2. Main Chat Panel (Right Workspace Column) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0b141a', position: 'relative', overflow: 'hidden' }}>
        {/* WhatsApp Top Header Bar */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#202c33',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
            zIndex: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {/* Header Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setShowRosterPanel(!showRosterPanel)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
              title="Toggle Participants Panel"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
            </button>

            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem',
                position: 'relative',
              }}
            >
              #
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#25d366',
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  border: '2px solid #202c33',
                }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#e9edef' }}>
                Nexus Space #{passcode}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#8696a0', marginTop: '1px' }}>
                {typingUsers.length > 0
                  ? `${typingUsers.join(', ')} is typing...`
                  : `online • ${users.length} participants`}
              </div>
            </div>
          </div>

          {/* Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* WhatsApp Video Call Button */}
            <button
              type="button"
              onClick={() => {
                if (callState === 'idle') startCall();
                else setShowVideoPanel(!showVideoPanel);
              }}
              style={{
                backgroundColor: callState === 'active' ? '#25d366' : 'transparent',
                color: callState === 'active' ? '#000000' : '#00a884',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Start Video Call"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {callState === 'active' ? 'videocam' : 'video_call'}
              </span>
            </button>

            {/* Voice Call Button */}
            <button
              type="button"
              onClick={startCall}
              style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              title="Start Voice Call"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>call</span>
            </button>

            {/* Search Icon Button */}
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              title="Search Messages"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
            </button>

            {/* Clear History Button */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              title="Clear Room History"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete_sweep</span>
            </button>
          </div>
        </header>

        {/* Optional Search Filter Banner */}
        {showSearch && (
          <div style={{ backgroundColor: '#202c33', padding: '8px 16px', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search in space..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  backgroundColor: '#2a3942',
                  border: 'none',
                  color: '#e9edef',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', color: '#8696a0', fontSize: '18px' }}>
                search
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Pinned Message Banner */}
        {pinnedMessage && (
          <div style={{ backgroundColor: '#182229', borderBottom: '1px solid #00a884', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '18px' }}>
                push_pin
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00a884' }}>{pinnedMessage.nickname}:</span>
              <span style={{ fontSize: '0.8rem', color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pinnedMessage.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePinMessage(pinnedMessage)}
              style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Unpin
            </button>
          </div>
        )}

        {/* Main Chat Feed Area */}
        <div
          className="wa-doodle-wallpaper"
          style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.nickname === nickname;
            const showDate =
              idx === 0 ||
              formatDateHeader(msg.createdAt) !== formatDateHeader(filteredMessages[idx - 1].createdAt);

            return (
              <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Date Header Pill */}
                {showDate && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px 0' }}>
                    <div
                      style={{
                        backgroundColor: '#182229',
                        color: '#8696a0',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      {formatDateHeader(msg.createdAt)}
                    </div>
                  </div>
                )}

                {/* Message Bubble Item */}
                <div
                  style={{ display: 'flex', width: '100%', justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                  onTouchStart={(e) => handleTouchStart(e, msg.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(msg)}
                >
                  <div
                    className={`wa-bubble-box ${isMe ? 'wa-bubble-out' : 'wa-bubble-in'} group`}
                    style={{
                      transform: activeDragId === msg.id ? `translateX(${dragTranslateX}px)` : 'none',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    {/* Sender Nickname Header for Incoming Messages */}
                    {!isMe && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00a884', marginBottom: '2px' }}>
                        {msg.nickname}
                      </div>
                    )}

                    {/* Reply Quote Inner Box */}
                    {msg.replyTo && (
                      <div className="wa-quote-box">
                        <span style={{ fontWeight: 700, color: '#00a884' }}>{msg.replyTo.nickname}: </span>
                        <span style={{ color: '#8696a0' }}>{msg.replyTo.message}</span>
                      </div>
                    )}

                    {/* Editing Form or Message Text */}
                    {editingMsgId === msg.id ? (
                      <form onSubmit={(e) => handleSaveEdit(msg.id, e)} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#111b21',
                            border: '1px solid #00a884',
                            color: '#fff',
                            fontSize: '0.85rem',
                          }}
                          autoFocus
                        />
                        <button type="submit" style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: 600, fontSize: '0.75rem' }}>
                          Save
                        </button>
                        <button type="button" onClick={cancelEditing} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '0.75rem' }}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div>
                        {msg.message && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>}

                        {/* Image Attachment Preview */}
                        {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                          <img
                            src={msg.fileUrl}
                            alt="Attachment"
                            style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '8px', marginTop: '6px', cursor: 'pointer', objectFit: 'cover' }}
                            onClick={() => setLightboxImage({ url: msg.fileUrl, name: msg.fileName })}
                          />
                        )}

                        {/* YouTube & Instagram Previews */}
                        {msg.message && <YouTubePreview messageText={msg.message} onCopySuccess={showToast} />}
                        {msg.message && <InstagramPreview messageText={msg.message} onCopySuccess={showToast} />}
                      </div>
                    )}

                    {/* Timestamp & Cyan Double Tick */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '2px',
                        float: 'right',
                        marginLeft: '12px',
                      }}
                    >
                      {msg.isEdited && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', italic: 'true' }}>edited</span>
                      )}
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#53bdeb' }}>
                          done_all
                        </span>
                      )}
                    </div>

                    {/* Quick Hover Options Toolbar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '6px',
                        display: 'none',
                        backgroundColor: '#111b21',
                        borderRadius: '12px',
                        padding: '2px 4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                      }}
                      className="group-hover:flex"
                    >
                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '2px 4px' }}
                        title="Reply"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>reply</span>
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => startEditing(msg)}
                          style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '2px 4px' }}
                          title="Edit"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTogglePinMessage(msg)}
                        style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '2px 4px' }}
                        title="Pin"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>push_pin</span>
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: '2px 4px' }}
                          title="Delete"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Replying Banner Bar */}
        {replyingTo && (
          <div
            style={{
              backgroundColor: '#182229',
              borderTop: '1px solid rgba(134, 150, 160, 0.15)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '20px' }}>
                reply
              </span>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00a884' }}>Replying to {replyingTo.nickname}</div>
                <div style={{ fontSize: '0.75rem', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {replyingTo.message}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Bottom WhatsApp Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            height: '62px',
            backgroundColor: '#202c33',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderTop: '1px solid rgba(134, 150, 160, 0.15)',
            zIndex: 20,
          }}
        >
          {/* Attach Paperclip Icon */}
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#8696a0' }} title="Attach file or photo">
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => handleUploadAttachment(e.target.files?.[0])}
              disabled={isUploadingFile}
            />
            {isUploadingFile ? (
              <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>attach_file</span>
            )}
          </label>

          {/* Input Text Field */}
          <input
            type="text"
            placeholder="Type a message"
            value={inputText}
            onChange={handleInputChange}
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#2a3942',
              border: 'none',
              color: '#e9edef',
              padding: '0 16px',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />

          {/* WhatsApp Green Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              color: '#ffffff',
              border: 'none',
              cursor: inputText.trim() ? 'pointer' : 'default',
              opacity: inputText.trim() ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', marginLeft: '2px' }}>
              send
            </span>
          </button>
        </form>
      </main>

      {/* WebRTC Video Call Overlay Canvas */}
      {showVideoPanel && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.95)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="animate-fade-in"
        >
          <div style={{ height: '56px', backgroundColor: '#202c33', padding: '0 20px', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', color: '#e9edef' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#00a884' }}>videocam</span>
              <span>WhatsApp Video Call</span>
            </div>
            <button type="button" onClick={() => setShowVideoPanel(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
            {callState === 'calling' && (
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#00a884', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, margin: '0 auto 16px auto' }}>
                  {(remoteUserName || 'S').slice(0, 2).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Calling {remoteUserName}...</h3>
                <button onClick={endCall} style={{ marginTop: '24px', backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 700, cursor: 'pointer' }}>
                  End Call
                </button>
              </div>
            )}

            {callState === 'incoming' && (
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <div className="wa-call-pulse" style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#00a884', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, margin: '0 auto 16px auto' }}>
                  {(callerName || 'C').slice(0, 2).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{callerName} is calling...</h3>
                <div style={{ display: 'flex', gap: '16px', justifyCenter: 'center', marginTop: '24px' }}>
                  <button onClick={acceptCall} style={{ backgroundColor: '#25d366', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 700, cursor: 'pointer' }}>
                    Accept
                  </button>
                  <button onClick={declineCall} style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 700, cursor: 'pointer' }}>
                    Decline
                  </button>
                </div>
              </div>
            )}

            {callState === 'active' && (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Timer Badge */}
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '12px', color: '#25d366', fontWeight: 700, fontSize: '0.8rem' }}>
                  {formatTimer(callDuration)}
                </div>

                {/* Remote Stream */}
                <video ref={remoteVideoCallback} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                {/* Floating PIP Local Stream */}
                <div style={{ position: 'absolute', top: '16px', right: '16px', width: '130px', height: '95px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #00a884', zIndex: 20, backgroundColor: '#111b21' }}>
                  <video ref={localVideoCallback} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraOff ? 'none' : 'block' }} />
                  {cameraOff && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884', fontWeight: 700 }}>
                      {nickname.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Controls Dock */}
                <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '16px', zIndex: 20 }}>
                  <button onClick={toggleMic} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: micMuted ? '#f44336' : '#202c33', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined">{micMuted ? 'mic_off' : 'mic'}</span>
                  </button>
                  <button onClick={toggleCamera} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: cameraOff ? '#f44336' : '#202c33', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined">{cameraOff ? 'videocam_off' : 'videocam'}</span>
                  </button>
                  <button onClick={endCall} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f44336', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined">call_end</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#111b21', borderRadius: '16px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '20px', boxShadow: '0 12px 30px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f44336', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>delete_sweep</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#e9edef' }}>Clear All Messages?</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#8696a0', marginBottom: '20px', lineHeight: 1.4 }}>
              Are you sure you want to clear all chat messages in Space #{passcode} for everyone?
            </p>
            <div style={{ display: 'flex', justifyEnd: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowClearConfirm(false)} style={{ background: 'none', border: 'none', color: '#8696a0', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleClearHistory} style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
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

      {/* Lightbox Viewer */}
      {lightboxImage && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.94)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setLightboxImage(null)}
        >
          <button type="button" onClick={() => setLightboxImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <img src={lightboxImage.url} alt={lightboxImage.name} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 12px 40px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()} />
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{lightboxImage.name}</span>
            <a href={lightboxImage.url} download target="_blank" rel="noreferrer" style={{ backgroundColor: '#00a884', color: '#fff', textDecoration: 'none', padding: '6px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              Download
            </a>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastText && (
        <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#182229', border: '1px solid #00a884', color: '#ffffff', padding: '8px 18px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, zIndex: 99999, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
          <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '18px' }}>check_circle</span>
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
