import React, { memo, useState, useRef, useEffect, useMemo } from 'react';
import MagneticButton from '../../animated/MagneticButton';
import VideoNoteRecorder from './VideoNoteRecorder';
import './ChatInputBar.css';

const ChatInputBar = memo(function ChatInputBar({
  replyingTo,
  setReplyingTo,
  editingMsg,
  cancelEditing,
  users = [],
  showEmojiPicker,
  setShowEmojiPicker,
  EMOJI_LIST,
  showActionMenu,
  setShowActionMenu,
  isUploadingFile,
  handleFileUpload,
  setShowPollModal,
  handleShareLocation,
  showDisappearingMenu,
  setShowDisappearingMenu,
  disappearingTimer,
  setShowThemeModal,
  setShowClearConfirm,
  setShowLogoutConfirm,
  inputText,
  setInputText,
  handleInputChange,
  handleSendMessage,
  // Voice Recording Props
  isRecordingAudio,
  recDuration,
  isAudioMuted = false,
  toggleAudioMute,
  startRecording,
  stopRecording,
  cancelRecording,
  // Video Recording Props
  isRecordingVideo,
  videoWithoutSound,
  startVideoRecording,
  closeVideoRecording,
  handleSendVideoNote,
  formatTimer,
  showToast,
}) {
  // Active Record Mode: 'voice' | 'video' | 'video_muted'
  const [recordMode, setRecordMode] = useState('voice');
  const [showRecordMenu, setShowRecordMenu] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const recordMenuRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const isLongPressActiveRef = useRef(false);

  // Mention Autocomplete
  const inputRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const checkMentionTrigger = (text, cursorPos) => {
    const pos = typeof cursorPos === 'number' ? cursorPos : text.length;
    const textUpToCursor = text.slice(0, pos);
    const lastWord = textUpToCursor.split(/\s/).pop();
    if (lastWord && lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setSelectedMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const handleTextChange = (e) => {
    handleInputChange(e);
    checkMentionTrigger(e.target.value, e.target.selectionStart);
  };

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return (users || [])
      .filter((u) => u.nickname && u.nickname.toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [users, mentionQuery]);

  const insertMention = (targetNick) => {
    const pos = inputRef.current ? inputRef.current.selectionStart : inputText.length;
    const textBefore = inputText.slice(0, pos);
    const textAfter = inputText.slice(pos);
    const lastAtIdx = textBefore.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const newText = textBefore.slice(0, lastAtIdx) + `@${targetNick} ` + textAfter;
      setInputText(newText);
      setMentionQuery(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = lastAtIdx + targetNick.length + 2;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    }
  };

  const handleInputKeyDown = (e) => {
    if (mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[selectedMentionIndex].nickname);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
  };

  // Close record mode menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (recordMenuRef.current && !recordMenuRef.current.contains(e.target)) {
        setShowRecordMenu(false);
      }
    };
    if (showRecordMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [showRecordMenu]);

  // Trigger recording based on selected mode (Only on long press or explicit start)
  const handleStartActiveRecord = (mode = recordMode) => {
    setShowRecordMenu(false);
    if (mode === 'voice') {
      startRecording();
    } else if (mode === 'video') {
      startVideoRecording({ withoutSound: false });
    } else if (mode === 'video_muted') {
      startVideoRecording({ withoutSound: true });
    }
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'video':
        return 'Video Note';
      case 'video_muted':
        return 'Video Note (Without Sound)';
      case 'voice':
      default:
        return 'Voice Note';
    }
  };

  // Cycle to next mode on short tap
  const handleCycleMode = () => {
    const modes = ['voice', 'video', 'video_muted'];
    const nextIdx = (modes.indexOf(recordMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setRecordMode(nextMode);
    if (showToast) {
      showToast(`Switched to ${getModeLabel(nextMode)}. Press and hold to record.`);
    }
  };

  // Select mode from menu
  const handleSelectMode = (mode) => {
    setRecordMode(mode);
    setShowRecordMenu(false);
    if (showToast) {
      showToast(`Selected ${getModeLabel(mode)}. Press and hold button to record.`);
    }
  };

  // Pointer Down (Start long-press timer with pointer capture for mouse & touch)
  const handleRecordPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) {}

    isLongPressActiveRef.current = false;
    setIsPressing(true);

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setIsPressing(false);
      handleStartActiveRecord(recordMode);
    }, 300); // 300ms threshold for responsive desktop & mobile long-press
  };

  // Pointer Up (If released before 300ms -> short click cycles mode)
  const handleRecordPointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    setIsPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isLongPressActiveRef.current) {
      handleCycleMode();
    }
    isLongPressActiveRef.current = false;
  };

  const handleRecordPointerCancel = (e) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    setIsPressing(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressActiveRef.current = false;
  };

  // Get current record button icon and title
  const getRecordButtonMeta = () => {
    switch (recordMode) {
      case 'video':
        return { icon: 'videocam', title: 'Hold to Record Video Note', color: '#00a884' };
      case 'video_muted':
        return { icon: 'videocam_off', title: 'Hold to Record Video Note (Without Sound)', color: '#ff9800' };
      case 'voice':
      default:
        return { icon: 'mic', title: 'Hold to Record Voice Note', color: '#00a884' };
    }
  };

  const currentMeta = getRecordButtonMeta();

  return (
    <>
      {/* Video Note Circular Recorder Modal Overlay */}
      {isRecordingVideo && (
        <VideoNoteRecorder
          isOpen={isRecordingVideo}
          initialWithoutSound={videoWithoutSound}
          onClose={closeVideoRecording}
          onSend={handleSendVideoNote}
          showToast={showToast}
        />
      )}

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

      {/* Bottom Message Input Bar */}
      <footer
        style={{
          minHeight: '62px',
          backgroundColor: '#202c33',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        {isRecordingAudio ? (
          /* Live Voice Recording UI Bar */
          <div className="audio-rec-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff2e74' }}>
              <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '20px' }}>
                mic
              </span>
              <span style={{ fontSize: '0.86rem', fontWeight: 700 }}>
                Recording... {formatTimer(recDuration)}
              </span>
            </div>

            <div style={{ flex: 1 }} />

            {/* Discard Audio Button */}
            <button
              type="button"
              onClick={cancelRecording}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
              title="Cancel recording"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>

            {/* Send Voice Note Button */}
            <button
              type="button"
              onClick={stopRecording}
              style={{
                backgroundColor: '#00a884',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Send Voice Note"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
            </button>
          </div>
        ) : (
          /* Standard Input Controls Form */
          <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            {/* Emoji Picker Toggle Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Emojis"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>sentiment_satisfied</span>
            </button>

            {/* Action Group Popup Menu Button (+ Icon) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowActionMenu(!showActionMenu)}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Attachments & Actions"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px', transform: showActionMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  add
                </span>
              </button>

              {/* Action Dropdown Popup Menu */}
              {showActionMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '48px',
                    left: 0,
                    backgroundColor: '#233138',
                    borderRadius: '16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                    border: '1px solid rgba(134, 150, 160, 0.2)',
                    padding: '8px 0',
                    zIndex: 100,
                    width: '260px',
                  }}
                  className="animate-fade-in"
                >
                  {/* 1. File & Image Upload */}
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#00a884' }}>attach_file</span>
                    <span>{isUploadingFile ? 'Uploading File...' : 'Attach File or Image'}</span>
                    <input
                      type="file"
                      onChange={(e) => {
                        handleFileUpload(e);
                        setShowActionMenu(false);
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <div style={{ height: '1px', backgroundColor: 'rgba(134, 150, 160, 0.15)', margin: '4px 0' }} />

                  {/* 5. Create Live Poll */}
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

                  {/* 6. Share Location */}
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

                  {/* 7. Disappearing Messages */}
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
                </div>
              )}
            </div>

            {/* Mention Autocomplete Floating Popup */}
            {mentionMatches.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '62px',
                  left: '60px',
                  maxWidth: '300px',
                  width: 'calc(100% - 120px)',
                  backgroundColor: 'rgba(32, 44, 51, 0.98)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 168, 132, 0.35)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.65)',
                  padding: '6px',
                  zIndex: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#8696a0', padding: '4px 8px', letterSpacing: '0.5px' }}>
                  MENTION PARTICIPANT
                </div>
                {mentionMatches.map((u, i) => (
                  <div
                    key={u.nickname}
                    onClick={() => insertMention(u.nickname)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: i === selectedMentionIndex ? 'rgba(0, 168, 132, 0.22)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={() => setSelectedMentionIndex(i)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#00a884', fontSize: '0.86rem' }}>
                        @{u.nickname}
                      </span>
                      {u.isOnline ? (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00a884' }} />
                      ) : (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8696a0' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {u.role === 'host' && (
                        <span style={{ fontSize: '0.64rem', color: '#ffc107', fontWeight: 700 }}>👑 Host</span>
                      )}
                      {u.role === 'admin' && (
                        <span style={{ fontSize: '0.64rem', color: '#60a5fa', fontWeight: 700 }}>🛡️ Admin</span>
                      )}
                      {u.isMuted && (
                        <span style={{ fontSize: '0.64rem', color: '#ef4444', fontWeight: 700 }}>🔇 Muted</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input Text Field */}
            <input
              ref={inputRef}
              type="text"
              placeholder={editingMsg ? 'Edit message...' : 'Type a message'}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleInputKeyDown}
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

            {/* Send / Save or Voice/Video Record Button with Mode Selection */}
            {inputText.trim() || editingMsg ? (
              <MagneticButton
                type="submit"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                  flexShrink: 0,
                }}
                title={editingMsg ? 'Save edit' : 'Send message'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {editingMsg ? 'check' : 'send'}
                </span>
              </MagneticButton>
            ) : (
              <div className="rec-btn-wrapper" ref={recordMenuRef}>
                {/* Record Button (Hold to Record, Tap to switch mode) */}
                <button
                  type="button"
                  onPointerDown={handleRecordPointerDown}
                  onPointerUp={handleRecordPointerUp}
                  onPointerCancel={handleRecordPointerCancel}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowRecordMenu((prev) => !prev);
                  }}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: currentMeta.color,
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: `0 2px 8px ${currentMeta.color === '#ff9800' ? 'rgba(255, 152, 0, 0.4)' : 'rgba(0, 168, 132, 0.4)'}`,
                    flexShrink: 0,
                    transform: isPressing ? 'scale(0.9)' : 'scale(1)',
                    transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                  title={`${currentMeta.title} (Tap to change mode, hold to record)`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {currentMeta.icon}
                  </span>
                </button>

                {/* Quick Selection Dropdown Button Indicator */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRecordMenu((prev) => !prev);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#111b21',
                    border: '1px solid rgba(134, 150, 160, 0.3)',
                    color: '#8696a0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Choose Voice or Video Note mode"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                    {showRecordMenu ? 'close' : 'expand_less'}
                  </span>
                </button>

                {/* Record Mode Selection Popover Menu */}
                {showRecordMenu && (
                  <div className="rec-mode-menu animate-fade-in">
                    <div className="rec-mode-menu-header">Recording Options</div>

                    {/* 1. Voice Note */}
                    <button
                      type="button"
                      className={`rec-mode-option ${recordMode === 'voice' ? 'active' : ''}`}
                      onClick={() => handleSelectMode('voice')}
                    >
                      <div className="rec-mode-option-icon-box" style={{ color: '#00a884' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mic</span>
                      </div>
                      <div className="rec-mode-option-text">
                        <span className="rec-mode-option-title">Voice Note</span>
                        <span className="rec-mode-option-desc">Tap to select • Hold to record</span>
                      </div>
                    </button>

                    {/* 2. Video Note (With Sound) */}
                    <button
                      type="button"
                      className={`rec-mode-option ${recordMode === 'video' ? 'active' : ''}`}
                      onClick={() => handleSelectMode('video')}
                    >
                      <div className="rec-mode-option-icon-box" style={{ color: '#00a884' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>videocam</span>
                      </div>
                      <div className="rec-mode-option-text">
                        <span className="rec-mode-option-title">Video Note</span>
                        <span className="rec-mode-option-desc">Round camera + audio</span>
                      </div>
                    </button>

                    {/* 3. Video Note (Without Sound) */}
                    <button
                      type="button"
                      className={`rec-mode-option ${recordMode === 'video_muted' ? 'active' : ''}`}
                      onClick={() => handleSelectMode('video_muted')}
                    >
                      <div className="rec-mode-option-icon-box" style={{ color: '#ff9800' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>videocam_off</span>
                      </div>
                      <div className="rec-mode-option-text">
                        <span className="rec-mode-option-title">Video Note (Without Sound)</span>
                        <span className="rec-mode-option-desc">Camera only (Muted)</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </footer>
    </>
  );
});

export default ChatInputBar;
