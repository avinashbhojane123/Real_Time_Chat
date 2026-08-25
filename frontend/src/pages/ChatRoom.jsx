import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

import { getApiBaseUrl, getSocketBaseUrl } from '../utils/apiConfig';
import YouTubePreview from '../components/YouTubePreview';
import InstagramPreview from '../components/InstagramPreview';
import StatusViewerModal from '../components/StatusViewerModal';
import StatusCreatorModal from '../components/StatusCreatorModal';
import AnimatedMessageBubble from '../components/animated/AnimatedMessageBubble';
import AnimatedTypingIndicator from '../components/animated/AnimatedTypingIndicator';
import AnimatedReactionPicker from '../components/animated/AnimatedReactionPicker';
import ScrollToBottomPill from '../components/animated/ScrollToBottomPill';
import { animate, random } from 'animejs';


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

function detectClientDevice() {
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

function formatUserPresence(isOnline, lastSeenDate) {
  if (isOnline) return { text: 'online', isOnline: true };
  if (!lastSeenDate) return { text: 'offline', isOnline: false };

  const date = new Date(lastSeenDate);
  if (isNaN(date.getTime())) return { text: 'offline', isOnline: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (targetDate.getTime() === today.getTime()) {
    return { text: `last seen today at ${timeStr}`, isOnline: false };
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return { text: `last seen yesterday at ${timeStr}`, isOnline: false };
  } else {
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) {
      return { text: `last seen ${diffHours}h ago`, isOnline: false };
    }
    return {
      text: `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`,
      isOnline: false,
    };
  }
}

function renderDeviceBadge(user) {
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

export default function ChatRoom() {
  const navigate = useNavigate();

  const baseUrl = sessionStorage.getItem('baseUrl') || localStorage.getItem('baseUrl') || getApiBaseUrl();
  const nickname = (sessionStorage.getItem('nickname') || '').trim();
  const passcode = (sessionStorage.getItem('passcode') || '').trim();

  // Responsive Roster Panel Toggle State
  const [showRosterPanel, setShowRosterPanel] = useState(true);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState([]);

  // Drag to Reply State (Touch & Mouse Pointer support)
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragTranslateX, setDragTranslateX] = useState(0);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Message Edit State
  const [editingMsg, setEditingMsg] = useState(null);

  // Emoji & Reaction & Context Menu State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [showCustomReactionForMsgId, setShowCustomReactionForMsgId] = useState(null);

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

  // Typing & Scroll Pill Feature State
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);


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
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) | 'environment' (back)
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const screenStreamRef = useRef(null);

  // Themes & Wallpapers Feature State
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('chat_theme') || 'wa-doodle');
  const [customWallpaper, setCustomWallpaper] = useState(() => localStorage.getItem('chat_custom_wallpaper') || '');
  const [showThemeModal, setShowThemeModal] = useState(false);

  const THEMES = [
    { key: 'wa-doodle', name: 'WhatsApp Dark', previewColor: '#00a884', icon: 'chat' },
    { key: 'cyber-neon', name: 'Cyber Neon', previewColor: '#ff007f', icon: 'auto_awesome' },
    { key: 'midnight', name: 'Midnight Blue', previewColor: '#3b82f6', icon: 'dark_mode' },
    { key: 'custom', name: 'Custom Wallpaper', previewColor: '#e9edef', icon: 'wallpaper' },
  ];

  const handleSelectTheme = (themeKey, customUrl = '') => {
    setCurrentTheme(themeKey);
    localStorage.setItem('chat_theme', themeKey);
    if (customUrl) {
      setCustomWallpaper(customUrl);
      localStorage.setItem('chat_custom_wallpaper', customUrl);
    }
    showToast(`Applied ${THEMES.find((t) => t.key === themeKey)?.name || themeKey} theme`);
  };

  // 1. Voice Notes State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);

  // 2. Disappearing Messages State
  const [disappearingTimer, setDisappearingTimer] = useState(0); // 0 (Off), 10, 30, 60 seconds
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);

  // 3. Live Polls Feature State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // 4. Document Viewer Lightbox State
  const [documentViewerFile, setDocumentViewerFile] = useState(null);

  // 5. Bottom Action Group Menu State (+ Button beside Emoji Picker)
  const [showActionMenu, setShowActionMenu] = useState(false);

  const EMOJI_LIST = [
    '😀', '😂', '😍', '😎', '🙏', '👍', '🔥', '❤️', '🎉', '✨', 
    '🥳', '🙌', '😊', '🤔', '💩', '😭', '🤩', '👀', '💯', '👏', 
    '💡', '🚀', '⭐', '👎', '👋', '💖', '💔', '🙈', '🎂', '🥰', '🤣', '🎉'
  ];

  const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

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

  // Derived Recipient & Online Call Check State
  const otherUsers = users.filter((u) => u.nickname !== nickname);
  const recipientUser = otherUsers.length > 0 ? otherUsers[0] : null;
  const isRecipientOnline = otherUsers.some((u) => u.isOnline);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    if (socketRef.current) {
      socketRef.current.emit('typing', { passcode, nickname });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stopTyping', { passcode, nickname });
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
      nickname,
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
    setEditingMsg(msg);
    setInputText(msg.message || '');
    setReplyingTo(null);
    setActiveMenuMsgId(null);
  };

  const cancelEditing = () => {
    setEditingMsg(null);
    setInputText('');
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

  // Socket Connection setup & Complete Event Listeners
  useEffect(() => {
    if (!nickname || !passcode) return;

    const socketUrl = getSocketBaseUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const clientDevice = detectClientDevice();
      socket.emit('joinRoom', {
        nickname,
        passcode,
        deviceType: clientDevice.deviceType,
        deviceModel: clientDevice.deviceModel,
        browser: clientDevice.browser,
        os: clientDevice.os,
      });
      socket.emit('getStatuses', { passcode });
    });

    // Chat History Event Listeners
    socket.on('chatHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('roomHistory', (history) => {
      setMessages(history || []);
    });

    // New Message Event Listeners
    socket.on('newMessage', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('message', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('messageUpdated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
      );
    });

    // Users List Event Listeners
    socket.on('usersList', (userList) => {
      setUsers(userList || []);
    });

    socket.on('roomUsers', (userList) => {
      setUsers(userList || []);
    });

    // Status Story Event Listeners
    socket.on('statusesList', (statusesList) => {
      setStatuses(statusesList || []);
    });

    socket.on('statusesUpdate', (statusesList) => {
      setStatuses(statusesList || []);
    });

    socket.on('statusCreated', (statusPayload) => {
      setStatuses((prev) => [...prev, statusPayload]);
    });

    socket.on('statusViewed', ({ statusId, viewers }) => {
      setStatuses((prev) =>
        prev.map((st) => (st.id === statusId ? { ...st, viewers } : st))
      );
    });

    socket.on('statusDeleted', ({ statusId }) => {
      setStatuses((prev) => prev.filter((st) => st.id !== statusId));
    });

    // Message Modification Event Listeners
    socket.on('messageEdited', ({ messageId, newMessage, editedAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, message: newMessage, editedAt, isEdited: true } : m
        )
      );
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, message: 'This message was deleted', isDeleted: true, fileUrl: null }
            : m
        )
      );
    });

    socket.on('messageReactionsUpdated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
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

    // Typing Event Listeners
    socket.on('userTyping', ({ nickname: typingNick }) => {
      if (typingNick && typingNick !== nickname) {
        setTypingUsers((prev) => (prev.includes(typingNick) ? prev : [...prev, typingNick]));
      }
    });

    socket.on('userStoppedTyping', ({ nickname: stopNick }) => {
      setTypingUsers((prev) => prev.filter((n) => n !== stopNick));
    });

    socket.on('userStopTyping', ({ nickname: stopNick }) => {
      setTypingUsers((prev) => prev.filter((n) => n !== stopNick));
    });

    // WebRTC Signaling Event Handlers
    const handleIncomingCall = ({ callerName: caller }) => {
      setCallerName(caller || 'Space Member');
      updateCallState('incoming');
      setShowVideoPanel(true);
    };

    const handleOffer = async ({ from, offer }) => {
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

      setCallerName(from || 'Space Member');
      updateCallState('incoming');
      window.latestOffer = offer;
    };

    const handleAnswer = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        processPendingIceCandidates();
        updateCallState('active');
      }
    };

    const handleCandidate = async ({ candidate }) => {
      if (candidate) {
        addIceCandidateSafely(candidate);
      }
    };

    socket.on('userCalling', handleIncomingCall);
    socket.on('webrtcOffer', handleOffer);
    socket.on('webrtcOfferRelay', handleOffer);
    socket.on('webrtcAnswer', handleAnswer);
    socket.on('webrtcAnswerRelay', handleAnswer);
    socket.on('webrtcCandidate', handleCandidate);
    socket.on('webrtcCandidateRelay', handleCandidate);
    socket.on('callEnded', () => cleanUpCall());

    return () => {
      socket.disconnect();
      cleanUpCall();
    };
  }, [nickname, passcode, createPeerConnection, cleanUpCall, addIceCandidateSafely, processPendingIceCandidates]);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Send / Save Message Handler
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMsg) {
      socketRef.current?.emit('editMessage', {
        passcode,
        messageId: editingMsg.id,
        newMessage: inputText.trim(),
      });
      showToast('Message edited');
      setEditingMsg(null);
      setInputText('');
    } else {
      socketRef.current?.emit('sendMessage', {
        passcode,
        nickname,
        message: inputText.trim(),
        replyTo: replyingTo
          ? { id: replyingTo.id, nickname: replyingTo.nickname, message: replyingTo.message }
          : null,
      });

      setInputText('');
      setReplyingTo(null);
    }
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
          nickname,
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
    const otherOnlineUsers = users.filter((u) => u.nickname !== nickname && u.isOnline);
    if (otherOnlineUsers.length === 0) {
      alert('Cannot start call: Recipient is offline. Video calls can only be made when the person is online.');
      return;
    }
    setShowVideoPanel(true);
    updateCallState('calling');
    setRemoteUserName(otherOnlineUsers[0]?.nickname || 'User');
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

  const flipCamera = async () => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacingMode },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
      }

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      setFacingMode(nextFacingMode);
      setLocalStream(new MediaStream(localStreamRef.current ? localStreamRef.current.getTracks() : [newVideoTrack]));
      showToast(`Switched camera to ${nextFacingMode === 'user' ? 'Front' : 'Back'}`);
    } catch (err) {
      console.warn('Could not switch camera:', err);
      showToast('Camera switch not supported on this device');
    }
  };

  const handleReactToMessage = (messageId, emoji, event) => {
    if (event) {
      triggerEmojiBurst(emoji, event);
    }
    socketRef.current?.emit('reactToMessage', {
      passcode,
      messageId,
      emoji,
    });
    setActiveReactionMsgId(null);
    setShowCustomReactionForMsgId(null);
  };

  const triggerEmojiBurst = (emoji, event) => {
    if (!event) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const particleCount = 14;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const el = document.createElement('div');
      el.className = 'anime-particle';
      el.innerText = emoji;
      el.style.left = `${startX}px`;
      el.style.top = `${startY}px`;
      document.body.appendChild(el);
      particles.push(el);
    }

    animate(particles, {
      translateX: () => random(-100, 100),
      translateY: () => random(-140, -40),
      scale: () => [random(0.6, 1), random(1.2, 1.8)],
      rotate: () => random(-45, 45),
      opacity: [1, 0],
      duration: () => random(800, 1400),
      easing: 'easeOutExpo',
      onComplete: () => {
        particles.forEach((p) => p.remove());
      },
    });
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        const newTrack = cameraStream.getVideoTracks()[0];
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStreamRef.current.addTrack(newTrack);
        }
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(newTrack);
        }
        setLocalStream(new MediaStream(localStreamRef.current ? localStreamRef.current.getTracks() : [newTrack]));
        showToast('Restored camera stream');
      } catch (err) {
        console.warn('Error restoring camera:', err);
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = displayStream;
        const screenTrack = displayStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStreamRef.current.addTrack(screenTrack);
        }

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(screenTrack);
        }

        setIsScreenSharing(true);
        setLocalStream(new MediaStream(localStreamRef.current ? localStreamRef.current.getTracks() : [screenTrack]));
        showToast('Screen sharing started');

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.warn('Could not start screen share:', err);
        showToast('Screen share cancelled');
      }
    }
  };

  // 1. Voice Notes Helper Functions
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecDuration(0);

      recTimerRef.current = setInterval(() => {
        setRecDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Could not access microphone:', err);
      showToast('Microphone access denied or unavailable');
    }
  };

  const stopAudioRecording = async (shouldSend = true) => {
    if (!mediaRecorderRef.current) return;
    clearInterval(recTimerRef.current);
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecordingAudio(false);

      if (shouldSend && audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `Voice_Message_${Date.now()}.webm`, { type: 'audio/webm' });

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
              nickname,
              message: '🎤 Voice message',
              fileUrl: fullUrl,
              fileName: file.name,
              fileType: 'audio/webm',
              fileSize: file.size,
              expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
            });
            showToast('Voice message sent');
          }
        } catch (err) {
          console.error('Audio upload failed:', err);
          showToast('Could not send voice message');
        } finally {
          setIsUploadingFile(false);
        }
      }
      audioChunksRef.current = [];
    };

    recorder.stop();
  };

  // 2. Poll Functions
  const handleCreatePoll = () => {
    const validOpts = pollOptions.filter((opt) => opt.trim().length > 0);
    if (!pollQuestion.trim() || validOpts.length < 2) {
      showToast('Please enter a question and at least 2 options');
      return;
    }

    const pollData = {
      question: pollQuestion.trim(),
      options: validOpts.map((opt, idx) => ({ id: idx + 1, text: opt.trim(), votes: [] })),
    };

    socketRef.current?.emit('sendMessage', {
      passcode,
      nickname,
      message: `📊 Poll: ${pollQuestion.trim()}`,
      pollData,
      expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
    });

    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    showToast('Poll created');
  };

  const handleVotePoll = (messageId, optionId) => {
    socketRef.current?.emit('votePoll', {
      passcode,
      messageId,
      optionId,
      nickname,
    });
  };

  // 3. Location Sharing Function
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser');
      return;
    }
    showToast('Fetching location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socketRef.current?.emit('sendMessage', {
          passcode,
          nickname,
          message: '📍 Shared Location',
          locationData: { lat: latitude, lng: longitude },
          expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
        });
        showToast('Location shared');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        showToast('Could not fetch your location');
      },
    );
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

  const renderStatusAvatar = (nick, size = '38px', isOnline = false, extraStyle = {}, avatarUrl = null) => {
    const userStatusObj = statusUserList.find((s) => s.nickname === nick);
    const hasStatus = Boolean(userStatusObj && userStatusObj.statuses?.length > 0);
    const hasUnseen = userStatusObj?.hasUnseen;

    let ringClass = 'status-highlight-none';
    if (hasStatus) {
      ringClass = hasUnseen ? 'status-highlight-gradient-unseen' : 'status-highlight-gradient-seen';
    }

    return (
      <div
        className={`status-avatar-container ${ringClass}`}
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          ...extraStyle,
        }}
        onClick={(e) => {
          if (hasStatus) {
            e.stopPropagation();
            setActiveStatusUser(userStatusObj);
          } else if (nick === nickname) {
            e.stopPropagation();
            setShowStatusCreator(true);
          }
        }}
        title={hasStatus ? `View ${nick}'s Status Story` : nick === nickname ? 'Create Status Update' : nick}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: '#202c33',
            color: isOnline ? '#00a884' : '#8696a0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: `calc(${size} * 0.45)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={nick} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            nick?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
      </div>
    );
  };

  // Drag-to-Reply Gesture Handler (Mouse Drag & Touch Swipe)
  const handlePointerDown = (e, msgId) => {
    // Only primary mouse button (0) or touch/pen inputs
    if (e.button !== undefined && e.button !== 0) return;
    dragStartXRef.current = e.clientX;
    isDraggingRef.current = true;
    setActiveDragId(msgId);
  };

  const handlePointerMove = (e, msgId) => {
    if (!isDraggingRef.current || activeDragId !== msgId) return;
    const currentX = e.clientX;
    const diffX = currentX - dragStartXRef.current;
    if (diffX > 0 && diffX <= 120) {
      setDragTranslateX(diffX);
    }
  };

  const handlePointerUp = (msg) => {
    if (!isDraggingRef.current) return;
    if (dragTranslateX > 40 && msg) {
      setReplyingTo(msg);
      showToast(`Replying to ${msg.nickname}`);
    }
    isDraggingRef.current = false;
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
    <div className={`theme-${currentTheme}`} style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: 'var(--chat-wallpaper-bg, #111b21)', overflow: 'hidden' }}>
      
      {/* 1. Chats Roster Panel (Left Column) */}
      <aside
        style={{
          width: '320px',
          backgroundColor: 'var(--chat-roster-bg, #111b21)',
          borderRight: '1px solid rgba(134, 150, 160, 0.15)',
          display: showRosterPanel ? 'flex' : 'none',
          flexDirection: 'column',
          height: '100%',
          zIndex: 30,
          flexShrink: 0,
        }}
      >
        {/* Roster Header */}
        <div
          style={{
            height: '60px',
            backgroundColor: 'var(--chat-header-bg, #202c33)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {renderStatusAvatar(nickname, '36px', true)}
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#e9edef', margin: 0 }}>
                {nickname}
              </h2>
            </div>
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
              title="Status Stories"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>donut_large</span>
            </button>
          </div>
        </div>

        {/* Online Participants Roster List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '6px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#8696a0', letterSpacing: '0.5px' }}>
            ONLINE PARTICIPANTS ({users.length})
          </div>
          {users.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#8696a0' }}>
              Connecting to participants...
            </div>
          ) : (
            users.map((u, idx) => {
              const presence = formatUserPresence(u.isOnline, u.lastSeen);
              return (
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
                  {renderStatusAvatar(u.nickname, '38px', u.isOnline, {}, u.avatarUrl)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#e9edef' }}>
                        {u.nickname} {u.nickname === nickname && '(You)'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: u.isOnline ? '#00a884' : '#8696a0',
                        fontWeight: u.isOnline ? 600 : 400,
                        marginTop: '2px',
                      }}
                    >
                      {presence.text}
                    </div>
                    <div>{renderDeviceBadge(u)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. Main Chat Panel (Right Workspace Column) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--chat-wallpaper-bg, #0b141a)', backgroundImage: currentTheme === 'custom' && customWallpaper ? `url(${customWallpaper})` : 'var(--chat-wallpaper-img)', backgroundSize: currentTheme === 'custom' ? 'cover' : '24px 24px', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }}>
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

            {renderStatusAvatar(recipientUser ? recipientUser.nickname : 'Participant', '40px', isRecipientOnline, {}, recipientUser?.avatarUrl)}

            <div>
              <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#e9edef' }}>
                {recipientUser ? recipientUser.nickname : 'Waiting for participant...'}
              </div>
              {typingUsers.length > 0 && (
                <div style={{ fontSize: '0.74rem', color: '#00a884', marginTop: '1px' }}>
                  {typingUsers.join(', ')} is typing...
                </div>
              )}
            </div>
          </div>

          {/* Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* WhatsApp Video Call Button */}
            <button
              type="button"
              disabled={!isRecipientOnline && callState === 'idle'}
              onClick={() => {
                if (!isRecipientOnline && callState === 'idle') {
                  alert('Cannot start video call: Recipient is offline. Video calls can only be made when the person is online.');
                  return;
                }
                if (callState === 'idle') startCall();
                else setShowVideoPanel(!showVideoPanel);
              }}
              style={{
                backgroundColor: callState === 'active' ? '#25d366' : 'transparent',
                color: callState === 'active' ? '#000000' : isRecipientOnline ? '#00a884' : '#8696a0',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: isRecipientOnline || callState !== 'idle' ? 'pointer' : 'not-allowed',
                opacity: !isRecipientOnline && callState === 'idle' ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
              title={
                callState === 'active'
                  ? 'Toggle Video Panel'
                  : isRecipientOnline
                  ? 'Start Video Call'
                  : 'User is offline - Video call unavailable'
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {callState === 'active' ? 'videocam' : 'video_call'}
              </span>
            </button>

            {/* Voice Call Button */}
            <button
              type="button"
              disabled={!isRecipientOnline && callState === 'idle'}
              onClick={() => {
                if (!isRecipientOnline && callState === 'idle') {
                  alert('Cannot start call: Recipient is offline. Voice calls can only be made when the person is online.');
                  return;
                }
                startCall();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: isRecipientOnline ? '#00a884' : '#8696a0',
                cursor: isRecipientOnline ? 'pointer' : 'not-allowed',
                opacity: !isRecipientOnline ? 0.5 : 1,
                padding: '6px',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
              }}
              title={isRecipientOnline ? 'Start Voice Call' : 'User is offline - Voice call unavailable'}
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
          {filteredMessages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#8696a0', padding: '32px 16px', maxWidth: '380px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 168, 132, 0.15)',
                  color: '#00a884',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>forum</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e9edef', marginBottom: '4px' }}>
                Welcome to the Chat
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8696a0', lineHeight: 1.4 }}>
                No messages here yet. Type a message below to start real-time chatting with everyone online!
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredMessages.map((msg, idx) => {
                const isMe = msg.nickname === nickname;
                const showDate =
                  idx === 0 ||
                  formatDateHeader(msg.createdAt) !== formatDateHeader(filteredMessages[idx - 1].createdAt);

                return (
                  <AnimatedMessageBubble
                    key={msg.id || idx}
                    isOwn={isMe}
                    onSwipeReply={() => setReplyingTo(msg)}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
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
                    style={{
                      display: 'flex',
                      width: '100%',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      position: 'relative',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                    onPointerDown={(e) => handlePointerDown(e, msg.id)}
                    onPointerMove={(e) => handlePointerMove(e, msg.id)}
                    onPointerUp={() => handlePointerUp(msg)}
                    onPointerCancel={() => handlePointerUp(msg)}
                  >
                    {/* Animated Drag-to-Reply Visual Indicator */}
                    {activeDragId === msg.id && dragTranslateX > 5 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: isMe ? 'auto' : '4px',
                          right: isMe ? `${dragTranslateX + 16}px` : 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#202c33',
                          border: '2px solid #00a884',
                          color: '#00a884',
                          opacity: Math.min(dragTranslateX / 40, 1),
                          transform: `scale(${Math.min(dragTranslateX / 40, 1.2)})`,
                          transition: 'transform 0.1s ease',
                          zIndex: 10,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          reply
                        </span>
                      </div>
                    )}

                    <div
                      className={`wa-bubble-box ${isMe ? 'wa-bubble-out' : 'wa-bubble-in'} group`}
                      style={{
                        transform: activeDragId === msg.id ? `translateX(${dragTranslateX}px)` : 'none',
                        transition: activeDragId === msg.id ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)',
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

                      {/* Message Content */}
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

                        {/* Audio Voice Note Player */}
                        {msg.fileUrl && msg.fileType?.startsWith('audio/') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '12px', minWidth: '220px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '22px' }}>graphic_eq</span>
                            <audio controls src={msg.fileUrl} style={{ height: '30px', flex: 1, outline: 'none' }} />
                          </div>
                        )}

                        {/* Document & File Attachment Card */}
                        {msg.fileUrl && !msg.fileType?.startsWith('image/') && !msg.fileType?.startsWith('audio/') && (
                          <div
                            onClick={() => setDocumentViewerFile({ url: msg.fileUrl, name: msg.fileName, type: msg.fileType })}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(134,150,160,0.15)' }}
                          >
                            <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '24px' }}>description</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fileName || 'Attachment Document'}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Click to preview document</div>
                            </div>
                          </div>
                        )}

                        {/* Live Interactive Poll Card */}
                        {msg.pollData && (
                          <div className="poll-card" style={{ marginTop: '6px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e9edef', marginBottom: '8px' }}>
                              {msg.pollData.question}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(() => {
                                const totalVotes = msg.pollData.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
                                return msg.pollData.options.map((opt) => {
                                  const voteCount = opt.votes?.length || 0;
                                  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                  const hasVoted = opt.votes?.includes(nickname);
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      className="poll-option-btn"
                                      onClick={() => handleVotePoll(msg.id, opt.id)}
                                    >
                                      <div className="poll-option-fill" style={{ width: `${pct}%` }} />
                                      <div className="poll-option-content">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {hasVoted && <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '16px' }}>check_circle</span>}
                                          <span>{opt.text}</span>
                                        </div>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.85 }}>{pct}% ({voteCount})</span>
                                      </div>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Shared Location Card */}
                        {msg.locationData && (
                          <div style={{ marginTop: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(134,150,160,0.2)', backgroundColor: 'rgba(0,0,0,0.25)', maxWidth: '280px' }}>
                            <a
                              href={`https://www.google.com/maps?q=${msg.locationData.lat},${msg.locationData.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <img
                                src={`https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${msg.locationData.lng},${msg.locationData.lat}&z=14&l=map&pt=${msg.locationData.lng},${msg.locationData.lat},pm2rdm`}
                                alt="Map Location"
                                style={{ width: '100%', height: '130px', objectFit: 'cover' }}
                              />
                              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#182229' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#00a884', fontWeight: 700 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                                  <span>View on Google Maps</span>
                                </div>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8696a0' }}>open_in_new</span>
                              </div>
                            </a>
                          </div>
                        )}

                        {/* YouTube & Instagram Previews */}
                        {msg.message && <YouTubePreview messageText={msg.message} onCopySuccess={showToast} />}
                        {msg.message && <InstagramPreview messageText={msg.message} onCopySuccess={showToast} />}
                      </div>

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
                        {msg.expiresAt && (
                          <span style={{ fontSize: '0.65rem', color: '#ff9800', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Disappearing secret message">
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>timer</span>
                          </span>
                        )}
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

                      {/* Message 3 Dots Button Trigger (Sender Only) */}
                      {isMe && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'none',
                              border: 'none',
                              color: '#8696a0',
                              cursor: 'pointer',
                              padding: '2px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 15,
                            }}
                            className="group-hover:opacity-100 opacity-60 hover:opacity-100"
                            title="Message options"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_vert</span>
                          </button>

                          {/* 3 Dots Context Dropdown Menu */}
                          {activeMenuMsgId === msg.id && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '26px',
                                right: '6px',
                                backgroundColor: '#233138',
                                borderRadius: '10px',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
                                border: '1px solid rgba(134, 150, 160, 0.2)',
                                padding: '4px 0',
                                zIndex: 60,
                                minWidth: '150px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReactionMsgId(msg.id);
                                  setActiveMenuMsgId(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                                className="hover:bg-[#182229]"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#00a884' }}>add_reaction</span>
                                <span>React</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(msg);
                                  setActiveMenuMsgId(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                                className="hover:bg-[#182229]"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8696a0' }}>reply</span>
                                <span>Reply</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  startEditing(msg);
                                  setActiveMenuMsgId(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                                className="hover:bg-[#182229]"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8696a0' }}>edit</span>
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleTogglePinMessage(msg);
                                  setActiveMenuMsgId(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                                className="hover:bg-[#182229]"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8696a0' }}>push_pin</span>
                                <span>{pinnedMessage?.id === msg.id ? 'Unpin' : 'Pin'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteMessage(msg.id);
                                  setActiveMenuMsgId(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#f44336', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                                className="hover:bg-[#182229]"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f44336' }}>delete</span>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Emoji Reactions Popover */}
                      {activeReactionMsgId === msg.id && (
                        <div
                          className="reactions-popover"
                          style={{
                            right: isMe ? '0px' : 'auto',
                            left: !isMe ? '0px' : 'auto',
                          }}
                        >
                          {QUICK_REACTIONS.map((emoji, i) => (
                            <button
                              key={i}
                              type="button"
                              className="reaction-item-btn"
                              onClick={(e) => handleReactToMessage(msg.id, emoji, e)}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="reaction-item-btn"
                            onClick={() => {
                              setShowCustomReactionForMsgId(showCustomReactionForMsgId === msg.id ? null : msg.id);
                              setActiveReactionMsgId(null);
                            }}
                            title="More Emojis"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696a0', padding: '4px' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                          </button>
                        </div>
                      )}

                      {/* Custom Reaction Emoji Picker Grid */}
                      {showCustomReactionForMsgId === msg.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-200px',
                            right: isMe ? '0px' : 'auto',
                            left: !isMe ? '0px' : 'auto',
                            width: '260px',
                            maxHeight: '190px',
                            backgroundColor: '#202c33',
                            border: '1px solid rgba(134, 150, 160, 0.25)',
                            borderRadius: '16px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                            zIndex: 80,
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', padding: '0 4px' }}>
                            <span>Select Reaction</span>
                            <button
                              type="button"
                              onClick={() => setShowCustomReactionForMsgId(null)}
                              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
                            {EMOJI_LIST.map((emoji, i) => (
                              <button
                                key={i}
                                type="button"
                                className="emoji-btn"
                                style={{ fontSize: '1.2rem', padding: '4px' }}
                                onClick={(e) => handleReactToMessage(msg.id, emoji, e)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Displayed Emoji Reaction Badges */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', clear: 'both' }}>
                          {Object.entries(msg.reactions).map(([emoji, usersArr]) => (
                            <span
                              key={emoji}
                              className="reaction-badge"
                              onClick={(e) => handleReactToMessage(msg.id, emoji, e)}
                              title={`Reacted by: ${usersArr.join(', ')}`}
                            >
                              <span>{emoji}</span>
                              <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>{usersArr.length}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AnimatedMessageBubble>
              );
            })}
            </AnimatePresence>
          )}

          <AnimatePresence>
            <AnimatedTypingIndicator typingUsers={typingUsers} />
          </AnimatePresence>
          <div ref={chatBottomRef} />
          <ScrollToBottomPill
            visible={showScrollToBottom}
            unreadCount={unreadCount}
            onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          />
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

        {/* Editing Message Banner Bar */}
        {editingMsg && (
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
                edit
              </span>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00a884' }}>Editing Message</div>
                <div style={{ fontSize: '0.75rem', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editingMsg.message}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelEditing}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
              title="Cancel editing"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Emoji Picker Container */}
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <div className="emoji-picker-header">
              <span>Choose Emoji</span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
            <div className="emoji-grid">
              {EMOJI_LIST.map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  className="emoji-btn"
                  onClick={() => {
                    setInputText((prev) => prev + emoji);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom WhatsApp Input Bar */}
        {isRecordingAudio ? (
          <div
            style={{
              height: '62px',
              backgroundColor: '#202c33',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              borderTop: '1px solid rgba(134, 150, 160, 0.15)',
              zIndex: 20,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="rec-pulse-dot" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f44336' }}>
                Recording Voice Note... ({Math.floor(recDuration / 60)}:{String(recDuration % 60).padStart(2, '0')})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => stopAudioRecording(false)}
                style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: '6px' }}
                title="Cancel Voice Recording"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
              <button
                type="button"
                onClick={() => stopAudioRecording(true)}
                style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#00a884', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Send Voice Note"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            style={{
              height: '62px',
              backgroundColor: '#202c33',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderTop: '1px solid rgba(134, 150, 160, 0.15)',
              zIndex: 20,
              position: 'relative',
            }}
          >
            {/* Emoji Toggle Icon */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowActionMenu(false);
              }}
              style={{ background: 'none', border: 'none', color: showEmojiPicker ? '#00a884' : '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              title="Emoji Picker"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>mood</span>
            </button>

            {/* WhatsApp Plus (+) Attachment & Action Group Menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowActionMenu(!showActionMenu);
                  setShowEmojiPicker(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showActionMenu ? '#00a884' : '#8696a0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '50%',
                  transform: showActionMenu ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                }}
                title="Attachments & Actions Menu"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>add</span>
              </button>

              {/* Action Popover Menu */}
              {showActionMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '52px',
                    left: '0px',
                    backgroundColor: '#233138',
                    borderRadius: '16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                    border: '1px solid rgba(134, 150, 160, 0.2)',
                    padding: '8px 0',
                    zIndex: 60,
                    minWidth: '230px',
                  }}
                  className="animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 1. Attach File or Photo */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      color: '#e9edef',
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-[#182229]"
                  >
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        handleUploadAttachment(e.target.files?.[0]);
                        setShowActionMenu(false);
                      }}
                      disabled={isUploadingFile}
                    />
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#bf59cf' }}>attach_file</span>
                    <span>Attach File or Photo</span>
                  </label>

                  {/* 2. Create Poll */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPollModal(true);
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#00a884' }}>poll</span>
                    <span>Create Poll</span>
                  </button>

                  {/* 3. Share Location */}
                  <button
                    type="button"
                    onClick={() => {
                      handleShareLocation();
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ff2e74' }}>location_on</span>
                    <span>Share Location</span>
                  </button>

                  {/* 4. Disappearing Messages */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisappearingMenu(!showDisappearingMenu);
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ff9800' }}>timer</span>
                    <span>Disappearing Messages {disappearingTimer > 0 ? `(${disappearingTimer}s)` : ''}</span>
                  </button>

                  {/* 5. Change Theme & Wallpaper */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowThemeModal(true);
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0070f3' }}>palette</span>
                    <span>Change Theme & Wallpaper</span>
                  </button>

                  {/* 6. Clear Room History */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearConfirm(true);
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#f44336', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#f44336' }}>delete_sweep</span>
                    <span>Clear Room History</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Text Field */}
            <input
              type="text"
              placeholder={editingMsg ? 'Edit message...' : 'Type a message'}
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

            {/* Send / Save or Voice Record Button */}
            {inputText.trim() || editingMsg ? (
              <button
                type="submit"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                  flexShrink: 0,
                }}
                title={editingMsg ? 'Save edit' : 'Send message'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', marginLeft: editingMsg ? '0' : '2px' }}>
                  {editingMsg ? 'check' : 'send'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startAudioRecording}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                  flexShrink: 0,
                }}
                title="Record Voice Note"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>mic</span>
              </button>
            )}
          </form>
        )}
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
          <div style={{ height: '56px', backgroundColor: '#202c33', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#e9edef' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#00a884' }}>videocam</span>
              <span>WhatsApp Video Call</span>
            </div>
            <button type="button" onClick={() => setShowVideoPanel(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
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
                  <button onClick={toggleMic} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: micMuted ? '#f44336' : '#202c33', color: '#fff', border: 'none', cursor: 'pointer' }} title={micMuted ? 'Unmute Mic' : 'Mute Mic'}>
                    <span className="material-symbols-outlined">{micMuted ? 'mic_off' : 'mic'}</span>
                  </button>
                  <button onClick={toggleCamera} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: cameraOff ? '#f44336' : '#202c33', color: '#fff', border: 'none', cursor: 'pointer' }} title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}>
                    <span className="material-symbols-outlined">{cameraOff ? 'videocam_off' : 'videocam'}</span>
                  </button>
                  <button onClick={flipCamera} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#202c33', color: '#fff', border: 'none', cursor: 'pointer' }} title={`Reverse Camera (Front/Back) - Current: ${facingMode === 'user' ? 'Front' : 'Back'}`}>
                    <span className="material-symbols-outlined">cameraswitch</span>
                  </button>
                  <button onClick={toggleScreenShare} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isScreenSharing ? '#00a884' : '#202c33', color: '#fff', border: 'none', cursor: 'pointer' }} title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}>
                    <span className="material-symbols-outlined">{isScreenSharing ? 'stop_screen_share' : 'screen_share'}</span>
                  </button>
                  <button onClick={endCall} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f44336', color: '#fff', border: 'none', cursor: 'pointer' }} title="End Call">
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
              Are you sure you want to clear all chat messages for everyone?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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

      {/* Theme Selector Modal */}
      {showThemeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111b21', borderRadius: '18px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: '#e9edef' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#00a884' }}>palette</span>
                <span>Chat Themes & Wallpapers</span>
              </div>
              <button onClick={() => setShowThemeModal(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {THEMES.map((theme) => (
                <div
                  key={theme.key}
                  onClick={() => handleSelectTheme(theme.key)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    backgroundColor: currentTheme === theme.key ? '#202c33' : '#182229',
                    border: `2px solid ${currentTheme === theme.key ? '#00a884' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: theme.previewColor, fontSize: '28px' }}>{theme.icon}</span>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e9edef' }}>{theme.name}</span>
                </div>
              ))}
            </div>

            {currentTheme === 'custom' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                  Custom Image Wallpaper URL:
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/photo-1518709268805-4e9042af9f23"
                  value={customWallpaper}
                  onChange={(e) => handleSelectTheme('custom', e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#2a3942', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowThemeModal(false)} style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Poll Modal */}
      {showPollModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111b21', borderRadius: '18px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: '#e9edef' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#00a884' }}>poll</span>
                <span>Create Live Poll</span>
              </div>
              <button onClick={() => setShowPollModal(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                Poll Question:
              </label>
              <input
                type="text"
                placeholder="Ask a question..."
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#2a3942', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
                Options:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#2a3942', border: 'none', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
                  />
                ))}
              </div>
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  style={{ marginTop: '8px', background: 'none', border: 'none', color: '#00a884', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                  Add Option
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowPollModal(false)} style={{ background: 'none', border: 'none', color: '#8696a0', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreatePoll} style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
                Send Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disappearing Messages Modal */}
      {showDisappearingMenu && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#111b21', borderRadius: '18px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#e9edef' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#ff9800' }}>timer</span>
                <span>Disappearing Messages</span>
              </div>
              <button onClick={() => setShowDisappearingMenu(false)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#8696a0', marginBottom: '16px', lineHeight: 1.4 }}>
              Set a self-destruct countdown timer for new messages. Messages automatically disappear after the selected duration.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {[
                { label: 'Off', val: 0 },
                { label: '10 Seconds', val: 10 },
                { label: '30 Seconds', val: 30 },
                { label: '60 Seconds', val: 60 },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => {
                    setDisappearingTimer(item.val);
                    setShowDisappearingMenu(false);
                    showToast(`Self-destruct timer set to ${item.label}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: disappearingTimer === item.val ? '#202c33' : '#182229',
                    border: `1px solid ${disappearingTimer === item.val ? '#00a884' : 'rgba(134,150,160,0.15)'}`,
                    color: '#e9edef',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: disappearingTimer === item.val ? 700 : 400 }}>{item.label}</span>
                  {disappearingTimer === item.val && <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '18px' }}>check_circle</span>}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDisappearingMenu(false)} style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Lightbox Modal */}
      {documentViewerFile && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.94)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '56px', backgroundColor: '#202c33', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#e9edef' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.95rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#00a884' }}>description</span>
              <span>{documentViewerFile.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a href={documentViewerFile.url} download target="_blank" rel="noreferrer" style={{ backgroundColor: '#00a884', color: '#fff', textDecoration: 'none', padding: '6px 16px', borderRadius: '18px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                Download
              </a>
              <button onClick={() => setDocumentViewerFile(null)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#525659' }}>
            <iframe src={documentViewerFile.url} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
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
