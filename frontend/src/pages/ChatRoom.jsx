import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import './ChatRoom.css';

// Utilities & Config
import { getApiBaseUrl } from '../utils/apiConfig';
import { formatTimer } from '../utils/chatUtils';

// Hooks
import { useChatSocket } from '../hooks/useChatSocket';
import { useWebRTC } from '../hooks/useWebRTC';

// Feature Components
import ChatRoster from '../components/chat/ChatRoster/ChatRoster';
import ChatHeader from '../components/chat/ChatHeader/ChatHeader';
import ChatMessagesFeed from '../components/chat/ChatMessagesFeed/ChatMessagesFeed';
import ChatInputBar from '../components/chat/ChatInput/ChatInputBar';
import VideoCallPanel from '../components/video/VideoCallPanel/VideoCallPanel';

// Overlay Modals
import ClearConfirmModal from '../components/modals/ClearConfirmModal/ClearConfirmModal';
import LogoutConfirmModal from '../components/modals/LogoutConfirmModal/LogoutConfirmModal';
import ThemeModal from '../components/modals/ThemeModal/ThemeModal';
import PollModal from '../components/modals/PollModal/PollModal';
import DisappearingMessagesModal from '../components/modals/DisappearingMessagesModal/DisappearingMessagesModal';
import DocumentViewerModal from '../components/modals/DocumentViewerModal/DocumentViewerModal';
import ImageLightboxModal from '../components/modals/ImageLightboxModal/ImageLightboxModal';
import StatusViewerModal from '../components/StatusViewerModal';
import StatusCreatorModal from '../components/StatusCreatorModal';

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
  } = useChatSocket({ nickname, passcode, baseUrl });

  // Recipient User Calculation
  const otherUsers = users.filter((u) => u.nickname !== nickname);
  const recipientUser = otherUsers.length > 0 ? otherUsers[0] : null;
  const isRecipientOnline = otherUsers.some((u) => u.isOnline);

  // WebRTC Video/Voice Call Hook
  const webRTC = useWebRTC({ socketRef, passcode, nickname, recipientUser, showToast });

  // Responsive Roster Panel Toggle State
  const [showRosterPanel, setShowRosterPanel] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
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

  // Voice Notes Audio Recording
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);

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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !editingMsg) return;

    if (editingMsg) {
      socketRef.current?.emit('editMessage', {
        passcode,
        messageId: editingMsg.id,
        newMessage: inputText.trim(),
      });
      setEditingMsg(null);
      setInputText('');
      return;
    }

    const payload = {
      passcode,
      nickname,
      message: inputText.trim(),
      replyTo: replyingTo
        ? {
          id: replyingTo.id,
          nickname: replyingTo.nickname,
          message: replyingTo.message || 'Media / Attachment',
        }
        : null,
      expiresIn: disappearingTimer > 0 ? disappearingTimer : null,
    };

    socketRef.current?.emit('sendMessage', payload);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
  };

  const handleReactToMessage = (messageId, emoji, e) => {
    if (e && e.clientX && e.clientY) {
      triggerParticleBurst(emoji, e.clientX, e.clientY);
    }
    socketReactToMessage(messageId, emoji);
    setActiveReactionMsgId(null);
    setShowCustomReactionForMsgId(null);
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0 && recDuration > 0) {
          showToast('Uploading voice note...');
          try {
            const formData = new FormData();
            formData.append('file', audioBlob, `voicenote-${Date.now()}.webm`);
            const cleanApiUrl = baseUrl.trim().replace(/\/+$/, '');
            const res = await (await fetch(`${cleanApiUrl}/upload`, { method: 'POST', body: formData })).json();

            if (res && res.fileUrl) {
              const payload = {
                passcode,
                nickname,
                message: '🎤 Voice Note',
                fileUrl: res.fileUrl,
                fileName: 'Voice Note.webm',
                fileType: 'audio/webm',
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
    if (mediaRecorderRef.current && isRecordingAudio) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      showToast('Voice note cancelled');
    }
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
          background: hasStatus ? 'linear-[#00a884]' : 'transparent',
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
    <div className={`theme-${currentTheme}`} style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: 'var(--chat-wallpaper-bg, #111b21)', overflow: 'hidden' }}>
      {/* 1. Chats Roster Sidebar Panel */}
      <ChatRoster
        isMobileDevice={isMobileDevice}
        showRosterPanel={showRosterPanel}
        setShowRosterPanel={setShowRosterPanel}
        nickname={nickname}
        users={users}
        messages={messages}
        typingUsers={typingUsers}
        statusUserList={statusUserList}


        renderStatusAvatar={renderStatusAvatar}
        setActiveStatusUser={setActiveStatusUser}
        setShowStatusCreator={setShowStatusCreator}
        setShowLogoutConfirm={setShowLogoutConfirm}
      />

      {/* 2. Main Chat Panel */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--chat-wallpaper-bg, #0b141a)',
          backgroundImage: currentTheme === 'custom' && customWallpaper ? `url(${customWallpaper})` : 'var(--chat-wallpaper-img)',
          backgroundSize: currentTheme === 'custom' ? 'cover' : '24px 24px',
          backgroundPosition: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Main Header */}
        <ChatHeader
          headerBgOpacity={headerBgOpacity}
          headerBlur={headerBlur}
          showRosterPanel={showRosterPanel}
          setShowRosterPanel={setShowRosterPanel}
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
        />

        {/* Main Feed */}
        <ChatMessagesFeed
          filteredMessages={filteredMessages}
          nickname={nickname}
          users={users}
          chatFeedRef={chatFeedRef}
          chatBottomRef={chatBottomRef}
          showScrollToBottom={showScrollToBottom}
          unreadCount={unreadCount}
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
          formatTimer={formatTimer}
        />
      </main>

      {/* WebRTC Video Call Panel Overlay */}
      <VideoCallPanel
        showVideoPanel={webRTC.showVideoPanel}
        setShowVideoPanel={webRTC.setShowVideoPanel}
        callState={webRTC.callState}
        callerName={webRTC.callerName}
        remoteUserName={webRTC.remoteUserName}
        remoteVideoRef={webRTC.remoteVideoRef}
        localVideoRef={webRTC.localVideoRef}
        videoFit={webRTC.videoFit}
        setVideoFit={webRTC.setVideoFit}
        callDuration={webRTC.callDuration}
        formatTimer={formatTimer}
        isStreamSwapped={webRTC.isStreamSwapped}
        setIsStreamSwapped={webRTC.setIsStreamSwapped}
        micMuted={webRTC.micMuted}
        cameraOff={webRTC.cameraOff}
        isScreenSharing={webRTC.isScreenSharing}
        toggleMic={webRTC.toggleMic}
        toggleCamera={webRTC.toggleCamera}
        flipCamera={webRTC.flipCamera}
        toggleScreenShare={webRTC.toggleScreenShare}
        acceptCall={webRTC.acceptCall}
        declineCall={webRTC.declineCall}
        endCall={webRTC.endCall}
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
          onReplyStatus={(data) => handleReplyStatus(data, disappearingTimer)}
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
