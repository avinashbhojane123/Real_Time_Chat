import React from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { formatUserPresence } from '../../../utils/chatUtils';
import './ChatHeader.css';

export default function ChatHeader({
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
}) {
  return (
    <>
      <motion.header
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header Info: Recipient Name, Avatar, Online/Offline Presence & Hamburger Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 3-Line Hamburger Menu Toggle Button (Toggles 60px Icon-Only Left Sidebar Rail) */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
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
              transition: 'all 0.2s ease',
            }}
            title="Toggle Left Action Sidebar (Participants, Theme, Clear, Logout)"
          >
            <Icon icon="solar:hamburger-menu-bold-duotone" width="22" height="22" />
          </motion.button>

          {/* Recipient User Info & Avatar */}
          {recipientUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setShowRosterPanel(true)}>
              {renderStatusAvatar && renderStatusAvatar(recipientUser.nickname, '38px', isRecipientOnline, {}, recipientUser.avatarUrl)}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#e9edef', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{recipientUser.nickname}</span>
                </div>

                {/* Live Typing Status or Online/Offline Presence Indicator */}
                {typingUsers && typingUsers.length > 0 ? (
                  <div style={{ fontSize: '0.74rem', color: '#00a884', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon icon="line-md:chat-bubble-twotone-loop" width="14" height="14" />
                    <span>{typingUsers.join(', ')} is typing...</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: isRecipientOnline ? '#00a884' : '#8696a0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon
                      icon={isRecipientOnline ? 'solar:check-circle-bold-duotone' : 'solar:clock-circle-bold-duotone'}
                      width="12"
                      height="12"
                      style={{ color: isRecipientOnline ? '#00a884' : '#8696a0' }}
                    />
                    <span>{formatUserPresence(isRecipientOnline, recipientUser?.lastSeen).text}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#e9edef' }}>Group Chat Space</span>
              {typingUsers && typingUsers.length > 0 ? (
                <div style={{ fontSize: '0.74rem', color: '#00a884', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon icon="line-md:chat-bubble-twotone-loop" width="14" height="14" />
                  <span>{typingUsers.join(', ')} is typing...</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.72rem', color: '#8696a0' }}>Click to view room participants</div>
              )}
            </div>
          )}
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
        </div>
      </motion.header>


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
    </>
  );
}
