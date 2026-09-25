import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import './ChatRoom.css';

// Utilities & Config
import { getApiBaseUrl } from '../utils/apiConfig';
import { formatTimer } from '../utils/chatUtils';
import { saveWallpaperOffline, getWallpaperOffline, checkImageUrlValid } from '../utils/wallpaperStorage';

// Hooks
import { useChatSocket } from '../hooks/useChatSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useWatchParty } from '../hooks/useWatchParty';

// Feature Components
import ChatRoster from '../components/chat/ChatRoster/ChatRoster';
import ChatHeader from '../components/chat/ChatHeader/ChatHeader';
import ChatMessagesFeed from '../components/chat/ChatMessagesFeed/ChatMessagesFeed';
import ChatInputBar from '../components/chat/ChatInput/ChatInputBar';
import VideoCallPanel from '../components/video/VideoCallPanel/VideoCallPanel';
import WatchPartyModal from '../components/video/WatchParty/WatchPartyModal';
import IncomingWatchPartyModal from '../components/video/WatchParty/IncomingWatchPartyModal';

// Overlay Modals
import ClearConfirmModal from '../components/modals/ClearConfirmModal/ClearConfirmModal';
import LogoutConfirmModal from '../components/modals/LogoutConfirmModal/LogoutConfirmModal';
import ThemeModal from '../components/modals/ThemeModal/ThemeModal';
import PollModal from '../components/modals/PollModal/PollModal';
import DisappearingMessagesModal from '../components/modals/DisappearingMessagesModal/DisappearingMessagesModal';
import DocumentViewerModal from '../components/modals/DocumentViewerModal/DocumentViewerModal';
import ImageLightboxModal from '../components/modals/ImageLightboxModal/ImageLightboxModal';
import StatusModal from '../components/StatusModal';

export default function ChatRoom() {
  const navigate = useNavigate();

  // Session & Auth State
  const baseUrl = sessionStorage.getItem('baseUrl') || localStorage.getItem('baseUrl') || getApiBaseUrl();
  const nickname = (sessionStorage.getItem('nickname') || '').trim();
  const passcode = (sessionStorage.getItem('passcode') || '').trim();

  // Auth verification check on mount
  useEffect(() => {
    if (!nickname || !passcode) {
      navigate('/', { replace: true });
    }
  }, [nickname, passcode, navigate]);

  // Socket & Chat State Hook
  const {
    messages,
    setMessages,
    users,
    statuses,
    typingUsers,
    toasts,
    pinnedMessage,
    isUploadingFile,
    socketRef,
    showToast,
    handleInputChangeEmitter,
    handleCreateStatus,
    handleViewStatus,
    handleDeleteStatus,
    handleReplyStatus,
    handleDeleteMessage,
    handleClearHistory: socketClearHistory,
    handleTogglePinMessage,
    handleVotePoll,
    handleReactToMessage: socketReactToMessage,
    handleFileUpload: socketFileUpload,
    handleShareLocation: socketShareLocation,
    handleCreatePoll: socketCreatePoll,
    handleMarkAsRead,
    isSocketConnected,
    socketLatency,
    roomTheme,
    roomCustomWallpaper,
    sendUpdateRoomWallpaper,
  } = useChatSocket({ nickname, passcode, baseUrl });

  // Recipient User Calculation
  const otherUsers = users.filter((u) => u.nickname !== nickname);
  const recipientUser = otherUsers.length > 0 ? otherUsers[0] : null;
  const isRecipientOnline = otherUsers.some((u) => u.isOnline);

  // WebRTC Video/Voice Call Hook
  const webRTC = useWebRTC({ socketRef, passcode, nickname, recipientUser, showToast });

  // Watch Party (Watch Together) Zero-Lag Synchronized Movie Player Hook
  const watchParty = useWatchParty({ socketRef, passcode, nickname, showToast });


  // Responsive Roster & Rail Sidebar Toggle State
  const [showRosterPanel, setShowRosterPanel] = useState(false);
  const [showRailSidebar, setShowRailSidebar] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [isMobileDevice, setIsMobileDevice] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobileDevice(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // UI Interactive States
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [showCustomReactionForMsgId, setShowCustomReactionForMsgId] = useState(null);

  // Drag-to-Reply State
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragTranslateX, setDragTranslateX] = useState(0);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Modals & Overlay States
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [activeStatusUser, setActiveStatusUser] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [documentViewerFile, setDocumentViewerFile] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Themes & Wallpapers
  const DEFAULT_CUSTOM_WALLPAPER =
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop';

  const [currentTheme, setCurrentTheme] = useState(() => {
    return (
      (passcode && localStorage.getItem(`chat_theme_${passcode}`)) ||
      sessionStorage.getItem('chat_theme') ||
      localStorage.getItem('chat_theme') ||
      'wa-doodle'
    );
  });

  const [customWallpaper, setCustomWallpaper] = useState(() => {
    return (
      (passcode && localStorage.getItem(`chat_custom_wallpaper_${passcode}`)) ||
      sessionStorage.getItem('chat_custom_wallpaper') ||
      localStorage.getItem('chat_custom_wallpaper') ||
      DEFAULT_CUSTOM_WALLPAPER
    );
  });
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Restore offline custom wallpaper from IndexedDB on mount
  useEffect(() => {
    if (!passcode) return;
    let isCancelled = false;
    getWallpaperOffline(passcode).then((offline) => {
      if (isCancelled || !offline) return;
      if (offline.preferred) {
        setCustomWallpaper((curr) =>
          curr === DEFAULT_CUSTOM_WALLPAPER || curr.includes('/uploads/') ? offline.preferred : curr
        );
      }
      if (offline.theme && offline.theme === 'custom') {
        setCurrentTheme((curr) => (curr === 'wa-doodle' ? 'custom' : curr));
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [passcode]);

  // Image verification check: if remote wallpaper returns 404 (e.g. Render restart), fall back automatically
  useEffect(() => {
    if (!customWallpaper || customWallpaper.startsWith('data:')) return;
    let isCancelled = false;

    checkImageUrlValid(customWallpaper, 4000).then(async (isValid) => {
      if (isCancelled) return;
      if (!isValid) {
        console.warn(`[Wallpaper] Remote wallpaper failed to load (404/expired): ${customWallpaper}`);
        // Check if we have an offline dataUrl fallback stored in IndexedDB
        if (passcode) {
          const offline = await getWallpaperOffline(passcode);
          if (!isCancelled && offline?.dataUrl) {
            console.log('[Wallpaper] Seamlessly recovered wallpaper from offline IndexedDB cache');
            setCustomWallpaper(offline.dataUrl);
            return;
          }
        }
        // Fallback to default if no offline data is available
        if (!isCancelled) {
          setCustomWallpaper(DEFAULT_CUSTOM_WALLPAPER);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [customWallpaper, passcode]);

  // Keep local state in sync when room theme / custom wallpaper changes from server or partner
  useEffect(() => {
    if (roomTheme && roomTheme !== currentTheme) {
      setCurrentTheme(roomTheme);
    }
  }, [roomTheme]);

  useEffect(() => {
    if (roomCustomWallpaper && roomCustomWallpaper !== customWallpaper) {
      setCustomWallpaper(roomCustomWallpaper);
    }
  }, [roomCustomWallpaper]);

  const THEMES = [
    { key: 'wa-doodle', name: 'WhatsApp Dark', previewColor: '#00a884', icon: 'chat' },
    { key: 'cyber-neon', name: 'Cyber Neon', previewColor: '#ff007f', icon: 'auto_awesome' },
    { key: 'midnight', name: 'Midnight Blue', previewColor: '#3b82f6', icon: 'dark_mode' },
    { key: 'custom', name: 'Custom Wallpaper', previewColor: '#e9edef', icon: 'wallpaper' },
  ];

  const handleSelectTheme = (themeKey, customUrl = null) => {
    setCurrentTheme(themeKey);
    try {
      if (passcode) localStorage.setItem(`chat_theme_${passcode}`, themeKey);
      localStorage.setItem('chat_theme', themeKey);
    } catch {}

    let finalUrl = customWallpaper;
    if (customUrl !== null && customUrl !== undefined) {
      finalUrl = customUrl.trim() || DEFAULT_CUSTOM_WALLPAPER;
      setCustomWallpaper(finalUrl);
      try {
        if (passcode) localStorage.setItem(`chat_custom_wallpaper_${passcode}`, finalUrl);
        localStorage.setItem('chat_custom_wallpaper', finalUrl);
      } catch {}
      if (passcode) {
        saveWallpaperOffline(passcode, { url: finalUrl, theme: themeKey });
      }
    }

    sendUpdateRoomWallpaper({
      theme: themeKey,
      customWallpaper: themeKey === 'custom' ? finalUrl : customWallpaper,
    });

    showToast(`Applied & synced ${THEMES.find((t) => t.key === themeKey)?.name || themeKey} wallpaper`);
  };

  // Voice & Video Notes Recording State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const isVoiceCancelledRef = useRef(false);

  // Clean up recording tracks and timers on unmount
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
    };
  }, []);

  // Video Notes Recording State
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoWithoutSound, setVideoWithoutSound] = useState(false);

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      isVoiceCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        if (isVoiceCancelledRef.current) {
          audioChunksRef.current = [];
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((t) => t.stop());
            audioStreamRef.current = null;
          }
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0 && audioChunksRef.current.length > 0) {
          showToast('Uploading voice note...');
          try {
            const formData = new FormData();
            formData.append('file', audioBlob, `voicenote-${Date.now()}.webm`);
            const cleanApiUrl = baseUrl.trim().replace(/\/+$/, '');
            const res = await (await fetch(`${cleanApiUrl}/upload`, { method: 'POST', body: formData })).json();

            if (res && res.fileUrl) {
              const serverBaseUrl = cleanApiUrl.replace(/\/api\/?$/, '');
              const fullFileUrl = res.fileUrl.startsWith('http')
                ? res.fileUrl
                : `${serverBaseUrl}${res.fileUrl.startsWith('/') ? '' : '/'}${res.fileUrl}`;

              const payload = {
                passcode,
                nickname,
                message: '🎤 Voice Note',
                fileUrl: fullFileUrl,
                fileName: 'Voice Note.webm',
                fileType: 'audio/webm',
                isVoiceNote: true,
                expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
              };
              socketRef.current?.emit('sendMessage', payload);
              showToast('Voice note sent!');
            }
          } catch (err) {
            showToast('Failed to send voice note');
          }
        }
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      };

      mediaRecorderRef.current.start();
      setIsRecordingAudio(true);
      setRecDuration(0);
      recTimerRef.current = setInterval(() => setRecDuration((prev) => prev + 1), 1000);
    } catch (err) {
      alert('Could not access microphone for voice note: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    }
  };

  const cancelRecording = () => {
    isVoiceCancelledRef.current = true;
    if (mediaRecorderRef.current && isRecordingAudio) {
      audioChunksRef.current = [];
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
      setIsRecordingAudio(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      showToast('Voice note cancelled');
    }
  };

  // Video Note Recording Functions
  const startVideoRecording = ({ withoutSound = false } = {}) => {
    setVideoWithoutSound(withoutSound);
    setIsRecordingVideo(true);
  };

  const closeVideoRecording = () => {
    setIsRecordingVideo(false);
  };

  const handleSendVideoNote = async ({ blob, duration, withoutSound, mimeType }) => {
    if (!blob || blob.size === 0) return;
    showToast('Uploading video note...');
    try {
      const ext = mimeType && mimeType.includes('mp4') ? 'mp4' : 'webm';
      const formData = new FormData();
      formData.append('file', blob, `videonote-${Date.now()}.${ext}`);
      const cleanApiUrl = baseUrl.trim().replace(/\/+$/, '');
      const res = await (await fetch(`${cleanApiUrl}/upload`, { method: 'POST', body: formData })).json();

      if (res && res.fileUrl) {
        const serverBaseUrl = cleanApiUrl.replace(/\/api\/?$/, '');
        const fullFileUrl = res.fileUrl.startsWith('http')
          ? res.fileUrl
          : `${serverBaseUrl}${res.fileUrl.startsWith('/') ? '' : '/'}${res.fileUrl}`;

        const payload = {
          passcode,
          nickname,
          message: withoutSound ? '📹 Video Note (Without Sound)' : '📹 Video Note',
          fileUrl: fullFileUrl,
          fileName: withoutSound ? `Video Note (Without Sound).${ext}` : `Video Note.${ext}`,
          fileType: mimeType || 'video/webm',
          isVideoNote: true,
          isWithoutSound: Boolean(withoutSound),
          duration: duration || 0,
          expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
        };

        socketRef.current?.emit('sendMessage', payload);
        showToast('Video note sent!');
      }
    } catch (err) {
      console.error('Failed to send video note:', err);
      showToast('Failed to send video note');
    }
  };

  // Disappearing Messages & Polls
  const [disappearingTimer, setDisappearingTimer] = useState(0);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Emoji Particles & Scroll Pill
  const [particles, setParticles] = useState([]);
  const chatFeedRef = useRef(null);
  const chatBottomRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { scrollY } = useScroll({ container: chatFeedRef });
  const headerBlur = useTransform(scrollY, [0, 80], ['blur(4px)', 'blur(16px)']);
  const headerBgOpacity = useTransform(scrollY, [0, 80], ['rgba(32, 44, 51, 0.85)', 'rgba(32, 44, 51, 0.98)']);

  const EMOJI_LIST = [
    '😀', '😂', '😍', '😎', '🙏', '👍', '🔥', '❤️', '🎉', '✨',
    '🥳', '🙌', '😊', '🤔', '💩', '😭', '🤩', '👀', '💯', '👏',
    '💡', '🚀', '⭐', '👎', '👋', '💖', '💔', '🙈', '🎂', '🥰', '🤣'
  ];
  const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

  // Status Users Grouping
  const statusUserMap = {};
  statuses.forEach((st) => {
    if (!statusUserMap[st.nickname]) {
      statusUserMap[st.nickname] = { nickname: st.nickname, avatarUrl: st.avatarUrl, statuses: [] };
    }
    statusUserMap[st.nickname].statuses.push(st);
  });
  const statusUserList = Object.values(statusUserMap);

  const triggerParticleBurst = (emoji, originX = 200, originY = 300) => {
    const newParticles = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      emoji,
      x: (Math.random() - 0.5) * 120,
      y: -Math.random() * 140 - 40,
      scale: 0.6 + Math.random() * 0.8,
      rotate: (Math.random() - 0.5) * 60,
      originX,
      originY,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1200);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    handleInputChangeEmitter(e.target.value);
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

  const handleSendMessage = (e, customText) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const textToSend = typeof e === 'string' ? e.trim() : (customText || inputText).trim();
    if (!textToSend && !editingMsg) return;

    if (editingMsg && typeof e !== 'string') {
      const updatedText = textToSend;
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(editingMsg.id)
            ? { ...m, message: updatedText, isEdited: true }
            : m
        )
      );
      socketRef.current?.emit('editMessage', {
        passcode,
        messageId: editingMsg.id,
        newMessage: updatedText,
      });
      setEditingMsg(null);
      setInputText('');
      return;
    }

    const payload = {
      passcode,
      nickname,
      message: textToSend,
      replyTo: replyingTo
        ? {
          id: replyingTo.id,
          nickname: replyingTo.nickname,
          message: replyingTo.message || 'Media / Attachment',
        }
        : null,
      expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
    };

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      nickname,
      message: textToSend,
      createdAt: new Date().toISOString(),
      timestamp: 'Just now',
      replyTo: payload.replyTo,
      readBy: [nickname],
      reactions: {},
      expiresAt: disappearingTimer > 0 ? new Date(Date.now() + disappearingTimer * 1000).toISOString() : null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    socketRef.current?.emit('sendMessage', payload);
    socketRef.current?.emit('stopTyping', { passcode, nickname });
    if (typeof e !== 'string') {
      setInputText('');
      setReplyingTo(null);
      setShowEmojiPicker(false);
    }
  };

  const handleReactToMessage = (messageId, emoji, e) => {
    if (e && e.clientX && e.clientY) {
      triggerParticleBurst(emoji, e.clientX, e.clientY);
    }
    socketReactToMessage(messageId, emoji);
    setActiveReactionMsgId(null);
    setShowCustomReactionForMsgId(null);
  };



  const handleLogout = () => {
    webRTC.cleanUpCall();
    sessionStorage.clear();
    localStorage.removeItem('passcode');
    localStorage.removeItem('nickname');
    localStorage.removeItem('avatarUrl');
    navigate('/', { replace: true });
  };

  // Pointer Drag-to-Reply Handlers
  const handlePointerDown = (e, msgId) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragStartXRef.current = e.clientX;
    isDraggingRef.current = true;
    setActiveDragId(msgId);
  };

  const handlePointerMove = (e, msgId) => {
    if (!isDraggingRef.current || activeDragId !== msgId) return;
    const diffX = e.clientX - dragStartXRef.current;
    if (diffX > 0 && diffX <= 120) setDragTranslateX(diffX);
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

  const renderStatusAvatar = (userNick, size = '40px', isOnline = false, extraStyle = {}, avatarOverrideUrl = null) => {
    const userObj = users.find((u) => u.nickname === userNick);
    const avatarUrl = avatarOverrideUrl || userObj?.avatarUrl;
    const userStatuses = statusUserMap[userNick]?.statuses || [];
    const hasStatus = userStatuses.length > 0;

    return (
      <div
        onClick={() => {
          if (hasStatus) setActiveStatusUser(statusUserMap[userNick]);
        }}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          cursor: hasStatus ? 'pointer' : 'default',
          padding: hasStatus ? '2px' : '0px',
          border: hasStatus ? '2.5px solid #00a884' : 'none',
          boxSizing: 'border-box',
          ...extraStyle,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={userNick} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: '#005c4b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: parseInt(size) > 36 ? '1rem' : '0.85rem',
            }}
          >
            {(userNick || 'U').slice(0, 2).toUpperCase()}
          </div>
        )}
        {isOnline && (
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              border: '2px solid #111b21',
            }}
          />
        )}
      </div>
    );
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return (
      m.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div
      className={`theme-${currentTheme}`}
      style={{
        display: 'flex',
        width: '100vw',
        height: '100dvh',
        maxHeight: '100dvh',
        backgroundColor: 'var(--chat-wallpaper-bg, #111b21)',
        overflow: 'hidden',
        position: 'fixed',
        inset: 0,
      }}
    >
      {/* 1. Chats Roster Sidebar Panel */}
      <ChatRoster
        isMobileDevice={isMobileDevice}
        showRosterPanel={showRosterPanel}
        setShowRosterPanel={setShowRosterPanel}
        showRailSidebar={showRailSidebar}
        setShowRailSidebar={setShowRailSidebar}
        nickname={nickname}
        users={users}
        messages={messages}
        typingUsers={typingUsers}
        statusUserList={statusUserList}

        renderStatusAvatar={renderStatusAvatar}
        setActiveStatusUser={setActiveStatusUser}
        setShowStatusCreator={setShowStatusCreator}
        setShowLogoutConfirm={setShowLogoutConfirm}
        setShowThemeModal={setShowThemeModal}
        setShowClearConfirm={setShowClearConfirm}
        onOpenWatchParty={() => {
          watchParty.setIsOpen(true);
          watchParty.setIsMinimized(false);
        }}
        isWatchPartyActive={watchParty.isActive}
      />

      {/* 2. Main Chat Panel */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          backgroundColor: 'var(--chat-wallpaper-bg, #0b141a)',
          backgroundImage:
            currentTheme === 'custom' && customWallpaper
              ? `linear-gradient(rgba(11, 20, 26, 0.62), rgba(11, 20, 26, 0.62)), url("${customWallpaper}")`
              : 'var(--chat-wallpaper-img)',
          backgroundSize: currentTheme === 'custom' ? 'cover' : '24px 24px',
          backgroundPosition: 'center',
          backgroundRepeat: currentTheme === 'custom' ? 'no-repeat' : 'repeat',
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.3s ease',
        }}
      >
        {/* Main Header */}
        <ChatHeader
          headerBgOpacity={headerBgOpacity}
          headerBlur={headerBlur}
          showRosterPanel={showRosterPanel}
          setShowRosterPanel={setShowRosterPanel}
          showRailSidebar={showRailSidebar}
          setShowRailSidebar={setShowRailSidebar}
          socketLatency={socketLatency}
          isSocketConnected={isSocketConnected}
          renderStatusAvatar={renderStatusAvatar}
          recipientUser={recipientUser}
          isRecipientOnline={isRecipientOnline}
          typingUsers={typingUsers}
          callState={webRTC.callState}
          startCall={webRTC.startCall}
          setShowVideoPanel={webRTC.setShowVideoPanel}
          showVideoPanel={webRTC.showVideoPanel}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          pinnedMessage={pinnedMessage}
          handleTogglePinMessage={handleTogglePinMessage}
          setShowLogoutConfirm={setShowLogoutConfirm}
          onOpenWatchParty={() => {
            watchParty.setIsOpen(true);
            watchParty.setIsMinimized(false);
          }}
          isWatchPartyActive={watchParty.isActive}
        />

        {/* Main Feed */}
        <ChatMessagesFeed
          filteredMessages={filteredMessages}
          nickname={nickname}
          users={users}
          chatFeedRef={chatFeedRef}
          chatBottomRef={chatBottomRef}
          handleMarkAsRead={handleMarkAsRead}
          showScrollToBottom={showScrollToBottom}
          setShowScrollToBottom={setShowScrollToBottom}
          unreadCount={unreadCount}
          setUnreadCount={setUnreadCount}
          typingUsers={typingUsers}
          particles={particles}
          activeDragId={activeDragId}
          dragTranslateX={dragTranslateX}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          setReplyingTo={setReplyingTo}
          setLightboxImage={setLightboxImage}
          setDocumentViewerFile={setDocumentViewerFile}
          handleVotePoll={handleVotePoll}
          showToast={showToast}
          activeMenuMsgId={activeMenuMsgId}
          setActiveMenuMsgId={setActiveMenuMsgId}
          activeReactionMsgId={activeReactionMsgId}
          setActiveReactionMsgId={setActiveReactionMsgId}
          showCustomReactionForMsgId={showCustomReactionForMsgId}
          setShowCustomReactionForMsgId={setShowCustomReactionForMsgId}
          startEditing={startEditing}
          handleTogglePinMessage={handleTogglePinMessage}
          handleDeleteMessage={handleDeleteMessage}
          handleReactToMessage={handleReactToMessage}
          QUICK_REACTIONS={QUICK_REACTIONS}
          EMOJI_LIST={EMOJI_LIST}
          pinnedMessage={pinnedMessage}
        />

        {/* CinemaOS Movie Quick Launcher Banner */}
        <AnimatePresence>
          {inputText && /cinemaos\.live/i.test(inputText) && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                backgroundColor: '#111b21',
                borderTop: '2px solid #00a884',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 -4px 20px rgba(0, 168, 132, 0.25)',
                zIndex: 25,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{ fontSize: '1.4rem' }}>🍿</span>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
                    CinemaOS Movie Link Detected!
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#8696a0' }}>
                    Watch together with {recipientUser ? recipientUser.nickname : 'partner'} in perfect sync
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                style={{
                  background: 'linear-gradient(135deg, #00a884 0%, #25d366 100%)',
                  color: '#111b21',
                  border: 'none',
                  padding: '7px 15px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0, 168, 132, 0.4)',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => {
                  let rawUrl = inputText.trim();
                  if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;

                  const mediaTypeMatch = rawUrl.match(/(?:watch\/)?(movie|tv)\/([a-zA-Z0-9_\-]+)(?:\/(\d+)\/(\d+))?/i);
                  const isTv = rawUrl.includes('/tv/');
                  const id = mediaTypeMatch ? mediaTypeMatch[2] : (rawUrl.match(/(\d+)/)?.[1] || '');
                  const season = mediaTypeMatch && mediaTypeMatch[3] ? mediaTypeMatch[3] : '1';
                  const episode = mediaTypeMatch && mediaTypeMatch[4] ? mediaTypeMatch[4] : '1';

                  const title = rawUrl.includes('1365884')
                    ? 'Call My Agent! The Movie (2026)'
                    : `CinemaOS ${isTv ? `Series (S${season}E${episode})` : 'Movie'} #${id || 'Stream'}`;

                  watchParty.startWatchParty({
                    url: rawUrl,
                    title,
                    type: 'embed',
                    isCinemaOs: true,
                    mediaType: isTv ? 'tv' : 'movie',
                    tmdbId: id,
                    season,
                    episode,
                  });
                  setInputText('');
                }}
              >
                <span>Watch Together 🍿</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Input Control Bar */}
        <ChatInputBar
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          editingMsg={editingMsg}
          cancelEditing={cancelEditing}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          EMOJI_LIST={EMOJI_LIST}
          showActionMenu={showActionMenu}
          setShowActionMenu={setShowActionMenu}
          isUploadingFile={isUploadingFile}
          handleFileUpload={(e) => socketFileUpload(e, disappearingTimer)}
          setShowPollModal={setShowPollModal}
          handleShareLocation={() => socketShareLocation(disappearingTimer)}
          showDisappearingMenu={showDisappearingMenu}
          setShowDisappearingMenu={setShowDisappearingMenu}
          disappearingTimer={disappearingTimer}
          setShowThemeModal={setShowThemeModal}
          setShowClearConfirm={setShowClearConfirm}
          setShowLogoutConfirm={setShowLogoutConfirm}
          inputText={inputText}
          setInputText={setInputText}
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          isRecordingAudio={isRecordingAudio}
          recDuration={recDuration}
          startRecording={startRecording}
          stopRecording={stopRecording}
          cancelRecording={cancelRecording}
          isRecordingVideo={isRecordingVideo}
          videoWithoutSound={videoWithoutSound}
          startVideoRecording={startVideoRecording}
          closeVideoRecording={closeVideoRecording}
          handleSendVideoNote={handleSendVideoNote}
          formatTimer={formatTimer}
          showToast={showToast}
        />
      </main>

      {/* WebRTC Video Call Panel Overlay (hidden when WatchParty cinema has its own live face cams) */}
      {!watchParty.isOpen && (
        <VideoCallPanel
          showVideoPanel={webRTC.showVideoPanel}
          setShowVideoPanel={webRTC.setShowVideoPanel}
          callState={webRTC.callState}
          callerName={webRTC.callerName}
          remoteUserName={webRTC.remoteUserName}
          remoteVideoRef={webRTC.remoteVideoRef}
          localVideoRef={webRTC.localVideoRef}
          localStream={webRTC.localStream}
          remoteStream={webRTC.remoteStream}
          videoFit={webRTC.videoFit}
          setVideoFit={webRTC.setVideoFit}
          callDuration={webRTC.callDuration}
          formatTimer={formatTimer}
          isStreamSwapped={webRTC.isStreamSwapped}
          setIsStreamSwapped={webRTC.setIsStreamSwapped}
          micMuted={webRTC.micMuted}
          cameraOff={webRTC.cameraOff}
          isScreenSharing={webRTC.isScreenSharing}
          isScreenShareSupported={webRTC.isScreenShareSupported}
          toggleMic={webRTC.toggleMic}
          toggleCamera={webRTC.toggleCamera}
          flipCamera={webRTC.flipCamera}
          toggleScreenShare={webRTC.toggleScreenShare}
          pipMode={webRTC.pipMode}
          setPipMode={webRTC.setPipMode}
          pipWindow={webRTC.pipWindow}
          openDesktopPip={webRTC.openDesktopPip}
          openInAppPip={webRTC.openInAppPip}
          closePip={webRTC.closePip}
          togglePip={webRTC.togglePip}
          isPipSupported={webRTC.isPipSupported}
          isDocPipSupported={webRTC.isDocPipSupported}
          isPipMinimized={webRTC.isPipMinimized}
          setIsPipMinimized={webRTC.setIsPipMinimized}
          togglePipMinimized={webRTC.togglePipMinimized}
          toggleNativePip={webRTC.toggleNativePip}
          acceptCall={webRTC.acceptCall}
          declineCall={webRTC.declineCall}
          endCall={webRTC.endCall}
          isVoiceOnlyCall={webRTC.isVoiceOnlyCall}
          availableAudioDevices={webRTC.availableAudioDevices}
          currentAudioDeviceId={webRTC.currentAudioDeviceId}
          switchAudioOutput={webRTC.switchAudioOutput}
          cycleAudioOutput={webRTC.cycleAudioOutput}
        />
      )}

      {/* Zero-Lag Watch Party / Watch Together Cinema Modal with Live Face Cams */}
      <WatchPartyModal
        isOpen={watchParty.isOpen}
        onClose={() => watchParty.setIsOpen(false)}
        watchParty={watchParty}
        recipientUser={recipientUser}
        currentNickname={nickname}
        webRTC={webRTC}
        onSendChatMessage={handleSendMessage}
      />

      {/* Incoming Movie Night / Watch Party Invitation Popup */}
      <IncomingWatchPartyModal
        invite={watchParty.incomingInvite}
        onAccept={watchParty.acceptWatchPartyInvite}
        onDecline={watchParty.declineWatchPartyInvite}
      />

      {/* Clear History Confirmation Modal */}
      <ClearConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          socketClearHistory();
          setShowClearConfirm(false);
        }}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />

      {/* Theme & Wallpaper Selector Modal */}
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        themes={THEMES}
        currentTheme={currentTheme}
        customWallpaper={customWallpaper}
        onSelectTheme={handleSelectTheme}
        baseUrl={baseUrl}
        passcode={passcode}
      />

      {/* Create Live Poll Modal */}
      <PollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        pollQuestion={pollQuestion}
        setPollQuestion={setPollQuestion}
        pollOptions={pollOptions}
        setPollOptions={setPollOptions}
        onCreatePoll={() =>
          socketCreatePoll(pollQuestion, pollOptions, disappearingTimer, () => {
            setShowPollModal(false);
            setPollQuestion('');
            setPollOptions(['', '']);
          })
        }
      />

      {/* Disappearing Messages Timer Modal */}
      <DisappearingMessagesModal
        isOpen={showDisappearingMenu}
        onClose={() => setShowDisappearingMenu(false)}
        disappearingTimer={disappearingTimer}
        onSelectTimer={(val, label) => {
          setDisappearingTimer(val);
          setShowDisappearingMenu(false);
          showToast(`Self-destruct timer set to ${label}`);
        }}
      />

      {/* Unified Status Story & Creator Modal */}
      {(showStatusCreator || activeStatusUser) && (
        <StatusModal
          isOpen={true}
          onClose={() => {
            setShowStatusCreator(false);
            setActiveStatusUser(null);
          }}
          statuses={statuses}
          statusUserList={statusUserList}
          initialUserIndex={
            activeStatusUser
              ? Math.max(0, statusUserList.findIndex((u) => u.nickname === activeStatusUser.nickname))
              : 0
          }
          initialMode={showStatusCreator ? 'create' : 'view'}
          currentNickname={nickname}
          baseUrl={baseUrl}
          onViewStatus={handleViewStatus}
          onDeleteStatus={handleDeleteStatus}
          onReplyStatus={(data) => handleReplyStatus(data, disappearingTimer)}
          onSubmitStatus={handleCreateStatus}
        />
      )}

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        lightboxImage={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        documentFile={documentViewerFile}
        onClose={() => setDocumentViewerFile(null)}
      />

      {/* Stackable Spring Motion Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ y: -24, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              style={{
                backgroundColor: '#182229',
                border: '1px solid #00a884',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                pointerEvents: 'auto',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '18px' }}>
                check_circle
              </span>
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
