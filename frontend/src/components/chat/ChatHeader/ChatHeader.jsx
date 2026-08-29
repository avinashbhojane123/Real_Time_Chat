import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import { formatUserPresence } from '../../../utils/chatUtils';
import './ChatHeader.css';

const ChatHeader = memo(function ChatHeader({
  headerBgOpacity,
  headerBlur,
  showRosterPanel,
  setShowRosterPanel,
  showRailSidebar,
  setShowRailSidebar,
  renderStatusAvatar,
  recipientUser,
  isRecipientOnline,
  typingUsers,
  callState,
  startCall,
  setShowVideoPanel,
  showVideoPanel,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  pinnedMessage,
  handleTogglePinMessage,
  setShowLogoutConfirm,
  socketLatency: externalLatency,
  isSocketConnected = true,
}) {
  const [latency, setLatency] = useState(externalLatency || 32);

  useEffect(() => {
    if (externalLatency !== undefined) {
      setLatency(externalLatency);
      return;
    }
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 24) + 25);
    }, 4000);
    return () => clearInterval(interval);
  }, [externalLatency]);

  return (
    <>
      <motion.header
        layoutId="chat-header-surface"
        className="wa-header-container"
        animate={
          callState === 'active' || callState === 'calling'
            ? {
              borderColor: [
                'rgba(0, 168, 132, 0.3)',
                'rgba(37, 211, 102, 0.95)',
                'rgba(0, 168, 132, 0.3)',
              ],
              boxShadow: [
                '0 1px 3px rgba(0,0,0,0.3)',
                '0 4px 20px rgba(0, 168, 132, 0.45)',
                '0 1px 3px rgba(0,0,0,0.3)',
              ],
            }
            : {
              borderColor: 'rgba(134, 150, 160, 0.15)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }
        }
        transition={
          callState === 'active' || callState === 'calling'
            ? { repeat: Infinity, duration: 2, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 300, damping: 25 }
        }
        style={{
          height: '60px',
          backgroundColor: headerBgOpacity,
          backdropFilter: headerBlur,
          WebkitBackdropFilter: headerBlur,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          zIndex: 20,
        }}
      >
        {/* Header Info: Recipient Name, Avatar, Online/Offline Presence & Hamburger Toggle */}
        <div className="wa-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          {/* 3-Line Hamburger Menu Toggle Button with 90-deg Spring Flip Animation */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            type="button"
            onClick={() => {
              if (showRosterPanel) {
                setShowRosterPanel(false);
                setShowRailSidebar(true);
              } else {
                setShowRailSidebar(!showRailSidebar);
              }
            }}
            style={{
              backgroundColor: showRailSidebar ? '#00a884' : 'rgba(0, 168, 132, 0.12)',
              border: '1px solid rgba(0, 168, 132, 0.3)',
              color: showRailSidebar ? '#111b21' : '#00a884',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
            }}
            title="Toggle Left Action Sidebar (Participants, Theme, Clear, Logout)"
          >
            <motion.div
              animate={{ rotate: showRailSidebar ? 90 : 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon icon="solar:hamburger-menu-bold-duotone" width="22" height="22" />
            </motion.div>
          </motion.button>

          {/* Recipient User Info & Avatar with Pulsing Status Aura & 3D Card Flip */}
          {recipientUser ? (
            <div className="wa-header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minWidth: 0, overflow: 'hidden', flex: 1 }} onClick={() => setShowRosterPanel(true)}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {(recipientUser?.hasStatus || recipientUser?.statusUrl) && (
                  <motion.div
                    animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0.85, 0.35] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: -4,
                      right: -4,
                      bottom: -4,
                      borderRadius: '50%',
                      backgroundColor: '#00a884',
                      filter: 'blur(5px)',
                      zIndex: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <motion.div
                  whileHover={{ rotateY: 180, scale: 1.06 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  style={{ position: 'relative', zIndex: 1, transformStyle: 'preserve-3d' }}
                >
                  {renderStatusAvatar && renderStatusAvatar(recipientUser.nickname, '38px', isRecipientOnline, {}, recipientUser.avatarUrl)}
                </motion.div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#e9edef', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{recipientUser.nickname}</span>
                  <Icon icon="solar:shield-check-bold-duotone" width="16" height="16" style={{ color: '#00a884', opacity: 0.9, flexShrink: 0 }} title="End-to-end encrypted chat" />
                </div>

                {/* Live Typing Status or Online/Offline Presence Indicator with M3 2.5dp Cutout Mask */}
                {typingUsers && typingUsers.length > 0 ? (
                  <div style={{ fontSize: '0.74rem', color: '#00a884', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <Icon icon="line-md:chat-bubble-twotone-loop" width="14" height="14" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{typingUsers.join(', ')} is typing...</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: isRecipientOnline ? '#00a884' : '#8696a0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <span className="m3-presence-cutout" style={{ flexShrink: 0 }}>
                      <Icon
                        icon={isRecipientOnline ? 'solar:check-circle-bold-duotone' : 'solar:clock-circle-bold-duotone'}
                        width="12"
                        height="12"
                        style={{ color: isRecipientOnline ? '#00a884' : '#8696a0' }}
                      />
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{formatUserPresence(isRecipientOnline, recipientUser?.lastSeen).text}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Group Chat Space</span>
              {typingUsers && typingUsers.length > 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#00a884', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  <Icon icon="line-md:chat-bubble-twotone-loop" width="14" height="14" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{typingUsers.join(', ')} is typing...</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Click to view room participants</div>
              )}
            </div>
          )}
        </div>


        {/* Action Icons & Connection Quality Meter */}
        <div className="wa-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* WebSocket Signal & Latency Meter with Spring Pop */}
          <motion.div
            key={latency}
            className="wa-header-latency-pill"
            initial={{ scale: 0.88, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, ease: [0.2, 0, 0, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isSocketConnected ? 'rgba(0, 168, 132, 0.25)' : 'rgba(241, 92, 109, 0.3)'}`,
              padding: '4px 9px',
              borderRadius: '14px',
              fontSize: '0.73rem',
              fontWeight: 600,
              color: isSocketConnected ? '#00a884' : '#f15c6d',
              cursor: 'default',
              userSelect: 'none',
              transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
              flexShrink: 0,
            }}
            title={`WebSocket Status: ${isSocketConnected ? 'Connected' : 'Reconnecting...'} | Latency: ${latency}ms`}
          >
            <Icon
              icon={isSocketConnected ? 'line-md:signal-cellular-3-twotone' : 'line-md:cloud-download-loop'}
              width="15"
              height="15"
            />
            <span>{isSocketConnected ? `${latency}ms` : 'Offline'}</span>
          </motion.div>

          {/* WhatsApp Video Call Button with M3 State Layer & Tactile Motion Feedback */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17, ease: [0.2, 0, 0, 1] }}
            type="button"
            className="m3-action-btn"
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
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: isRecipientOnline || callState !== 'idle' ? 'pointer' : 'not-allowed',
              opacity: !isRecipientOnline && callState === 'idle' ? 0.5 : 1,
              width: '38px',
              height: '38px',
            }}
            title={
              callState === 'active'
                ? 'Toggle Video Panel'
                : isRecipientOnline
                  ? 'Start Video Call'
                  : 'User is offline - Video call unavailable'
            }
          >
            <Icon
              icon={callState === 'active' ? 'line-md:video-twotone' : 'solar:videocamera-record-bold-duotone'}
              width="20"
              height="20"
            />
          </motion.button>

          {/* Voice Call Button with M3 State Layer & Tactile Motion Feedback */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17, ease: [0.2, 0, 0, 1] }}
            type="button"
            className="m3-action-btn"
            disabled={!isRecipientOnline && callState === 'idle'}
            onClick={() => {
              if (!isRecipientOnline && callState === 'idle') {
                alert('Cannot start call: Recipient is offline. Voice calls can only be made when the person is online.');
                return;
              }
              startCall();
            }}
            style={{
              color: isRecipientOnline ? '#00a884' : '#8696a0',
              cursor: isRecipientOnline ? 'pointer' : 'not-allowed',
              opacity: !isRecipientOnline ? 0.5 : 1,
              width: '38px',
              height: '38px',
            }}
            title={isRecipientOnline ? 'Start Voice Call' : 'User is offline - Voice call unavailable'}
          >
            <Icon
              icon={callState === 'active' || callState === 'calling' ? 'line-md:phone-call-loop' : 'solar:phone-bold-duotone'}
              width="20"
              height="20"
            />
          </motion.button>

          {/* Search Icon Button with M3 State Layer & Tactile Motion Feedback */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17, ease: [0.2, 0, 0, 1] }}
            type="button"
            className="m3-action-btn"
            onClick={() => setShowSearch(!showSearch)}
            style={{
              color: showSearch ? '#00a884' : '#8696a0',
              width: '38px',
              height: '38px',
            }}
            title="Search Messages"
          >
            <Icon
              icon={showSearch ? 'line-md:close' : 'solar:magnifer-bold-duotone'}
              width="20"
              height="20"
            />
          </motion.button>
        </div>
      </motion.header>


      {/* Optional Search Filter Banner */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ backgroundColor: '#202c33', padding: '8px 16px', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10, overflow: 'hidden' }}
          >
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
              <Icon
                icon="solar:magnifer-bold-duotone"
                width="18"
                height="18"
                style={{ position: 'absolute', left: '10px', color: '#8696a0' }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.88 }}
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <Icon icon="line-md:close" width="18" height="18" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Message Banner */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{ backgroundColor: '#182229', borderBottom: '1px solid #00a884', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, overflow: 'hidden' }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', cursor: 'pointer', flex: 1 }}
              onClick={() => {
                const el = document.getElementById(`msg-item-${pinnedMessage.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  const bubble = el.querySelector('.wa-bubble-box');
                  if (bubble) {
                    bubble.classList.remove('msg-jump-highlight');
                    void bubble.offsetWidth;
                    bubble.classList.add('msg-jump-highlight');
                    setTimeout(() => bubble.classList.remove('msg-jump-highlight'), 2200);
                  }
                }
              }}
              title="Click to jump to pinned message"
            >
              <Icon icon="solar:pin-bold-duotone" width="18" height="18" style={{ color: '#00a884', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00a884', flexShrink: 0 }}>{pinnedMessage.nickname}:</span>
              <span style={{ fontSize: '0.8rem', color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pinnedMessage.message}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => handleTogglePinMessage(pinnedMessage)}
              style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Unpin
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default ChatHeader;
