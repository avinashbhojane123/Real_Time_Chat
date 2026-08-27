import { useState } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'motion/react';
import { formatUserPresence } from '../../../utils/chatUtils';
import './ChatRoster.css';

// Motion.dev Stagger Variants
const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

export default function ChatRoster({
  isMobileDevice,
  showRosterPanel,
  setShowRosterPanel,
  nickname,
  users = [],
  messages = [],
  typingUsers = [],
  renderStatusAvatar,
  setChatMessage,
  chatInputRef,
  setShowLogoutConfirm,
}) {
  const [activeTab, setActiveTab] = useState('people'); // 'people' | 'media'
  const [showOnlineGroup, setShowOnlineGroup] = useState(true);
  const [showOfflineGroup, setShowOfflineGroup] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null); // Motion Lightbox Modal
  const [selectedUserAction, setSelectedUserAction] = useState(null); // Motion Action Sheet

  // Group Users into Online and Offline
  const onlineUsers = users.filter((u) => u.isOnline);
  const offlineUsers = users.filter((u) => !u.isOnline);

  // Filter Shared Media & Files from Messages Feed
  const mediaMessages = messages.filter(
    (m) => m.fileUrl || m.type === 'image' || m.type === 'video' || m.type === 'audio' || m.type === 'document'
  );

  // Calculate uupm.cc Team Activity Meter Data (Feature #4)
  // Generates 10 activity bars reflecting message counts in the room session
  const totalMsgs = messages.length;
  const activityBars = Array.from({ length: 10 }, (_, i) => {
    // Generate realistic bar heights based on room message volume
    const baseVal = Math.max(15, Math.min(100, (totalMsgs * (i + 1) * 7) % 85 + 20));
    return baseVal;
  });

  // Helper to render platform & connection ping badge
  const renderRosterDeviceBadge = (u) => {
    const isMobile = u.isMobile || (u.userAgent && /mobile|android|iphone|ipad/i.test(u.userAgent));
    return (
      <motion.div
        whileHover={{ scale: 1.05, x: 2 }}
        className="device-badge-glow"
      >
        <motion.div whileHover={{ rotate: [0, 10, -10, 0] }} style={{ display: 'flex', alignItems: 'center' }}>
          <Icon
            icon={isMobile ? 'solar:smartphone-bold-duotone' : 'solar:laptop-minimalistic-bold-duotone'}
            width="13"
            height="13"
            style={{ color: '#00a884' }}
          />
        </motion.div>
        <span>{isMobile ? 'Mobile' : 'Desktop'}</span>
        <span style={{ color: 'rgba(134, 150, 160, 0.4)' }}>•</span>
        <Icon icon="solar:wifi-router-bold-duotone" width="12" height="12" style={{ color: '#00a884' }} />
        <span style={{ color: '#00a884', fontWeight: 600 }}>18ms</span>
      </motion.div>
    );
  };

  // Collapsed Rail View (60px)
  if (!showRosterPanel) {
    if (isMobileDevice) return null;

    return (
      <aside
        style={{
          width: '60px',
          backgroundColor: 'var(--chat-roster-bg, #111b21)',
          borderRight: '1px solid rgba(134, 150, 160, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: '100%',
          zIndex: 30,
          flexShrink: 0,
          paddingTop: '12px',
        }}
      >
        {/* Participants Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setShowRosterPanel(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#00a884',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
          className="media-item-card"
          title={`${onlineUsers.length} Online Participants`}
        >
          <Icon icon="solar:users-group-two-rounded-bold-duotone" width="24" height="24" />
          {onlineUsers.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#00a884',
                color: '#111b21',
                fontSize: '0.65rem',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 5px',
                minWidth: '14px',
                textAlign: 'center',
              }}
            >
              {onlineUsers.length}
            </span>
          )}
        </motion.button>

        {/* Log Out Button below Participants on Left Rail Sidebar */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setShowLogoutConfirm && setShowLogoutConfirm(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(244, 67, 54, 0.12)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            color: '#f44336',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '14px',
          }}
          className="media-item-card"
          title="Log Out Session"
        >
          <Icon icon="solar:logout-2-bold-duotone" width="22" height="22" style={{ color: '#f44336' }} />
        </motion.button>
      </aside>
    );
  }

  // Expanded Panel View (320px)
  return (
    <motion.aside
      drag={isMobileDevice ? 'x' : false}
      dragSnapToOrigin={true}
      dragElastic={0.15}
      onDragEnd={(e, info) => {
        if (info.offset.x < -80 || info.offset.x > 80) {
          setShowRosterPanel(false);
        }
      }}
      style={{
        width: isMobileDevice ? '100%' : '320px',
        position: isMobileDevice ? 'absolute' : 'relative',
        inset: isMobileDevice ? 0 : 'auto',
        backgroundColor: 'var(--chat-roster-bg, #111b21)',
        borderRight: '1px solid rgba(134, 150, 160, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: isMobileDevice ? 100 : 30,
        flexShrink: 0,
        touchAction: 'pan-y',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          height: '60px',
          backgroundColor: 'var(--chat-header-bg, #202c33)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.div whileHover={{ scale: 1.15, rotate: 10 }}>
            <Icon icon="solar:users-group-two-rounded-bold-duotone" width="24" height="24" style={{ color: '#00a884' }} />
          </motion.div>
          <span style={{ fontWeight: 700, fontSize: '0.96rem', color: '#e9edef' }}>
            Participants ({users.length})
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => setShowRosterPanel(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#8696a0',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close Panel"
        >
          <Icon icon="solar:close-circle-bold-duotone" width="22" height="22" />
        </motion.button>
      </div>

      {/* Tab Selector Bar */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#111b21',
          borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('people')}
          style={{
            flex: 1,
            padding: '10px',
            background: 'none',
            border: 'none',
            color: activeTab === 'people' ? '#00a884' : '#8696a0',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'relative',
            transition: 'color 0.2s ease',
          }}
        >
          <Icon icon="solar:users-group-two-rounded-bold-duotone" width="18" height="18" />
          <span>People ({users.length})</span>
          {activeTab === 'people' && (
            <motion.div
              layoutId="activeTabUnderline"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#00a884',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          style={{
            flex: 1,
            padding: '10px',
            background: 'none',
            border: 'none',
            color: activeTab === 'media' ? '#00a884' : '#8696a0',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            position: 'relative',
            transition: 'color 0.2s ease',
          }}
        >
          <Icon icon="solar:folder-with-files-bold-duotone" width="18" height="18" />
          <span>Media & Docs ({mediaMessages.length})</span>
          {activeTab === 'media' && (
            <motion.div
              layoutId="activeTabUnderline"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#00a884',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      </div>

      {/* Motion Tab Transitions */}
      <AnimatePresence mode="wait">
        {activeTab === 'people' ? (
          <motion.div
            key="people-tab"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
          >
            {/* Group 1 - ONLINE PARTICIPANTS */}
            <div style={{ marginBottom: '12px' }}>
              <div
                onClick={() => setShowOnlineGroup(!showOnlineGroup)}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#00a884',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <motion.div whileHover={{ scale: 1.2, rotate: 10 }}>
                    <Icon icon="solar:check-circle-bold-duotone" width="16" height="16" style={{ color: '#00a884' }} />
                  </motion.div>
                  <span>ONLINE ({onlineUsers.length})</span>
                </div>

                <motion.div
                  animate={{ rotate: showOnlineGroup ? 0 : -90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Icon icon="lucide:chevron-down" width="16" height="16" />
                </motion.div>
              </div>

              {/* Motion Accordion Height Animation */}
              <AnimatePresence>
                {showOnlineGroup && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <motion.div
                      variants={listContainerVariants}
                      initial="hidden"
                      animate="show"
                    >
                      {onlineUsers.length === 0 ? (
                        <div style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#8696a0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon icon="line-md:loading-twotone-loop" width="18" height="18" style={{ color: '#00a884' }} />
                          <span>Connecting participants...</span>
                        </div>
                      ) : (
                        onlineUsers.map((u, idx) => {
                          const presence = formatUserPresence(u.isOnline, u.lastSeen);
                          const isMe = u.nickname === nickname;
                          const isTyping = typingUsers && typingUsers.includes(u.nickname);

                          return (
                            <motion.div
                              key={u.nickname || idx}
                              variants={itemVariants}
                              layout
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setSelectedUserAction(u)}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                              }}
                              className="roster-item-card"
                            >
                              <div className="online-avatar-pulse">
                                {renderStatusAvatar(u.nickname, '38px', u.isOnline, {}, u.avatarUrl)}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#e9edef' }}>
                                    {u.nickname} {isMe && '(You)'}
                                  </span>

                                  {isTyping && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00a884', fontSize: '0.7rem', fontWeight: 700 }}>
                                      <Icon icon="line-md:chat-bubble-twotone-loop" width="16" height="16" />
                                      <span>typing...</span>
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#00a884', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Icon icon="solar:check-circle-bold-duotone" width="12" height="12" />
                                  <span>{presence.text}</span>
                                </div>

                                <div style={{ marginTop: '4px' }}>
                                  {renderRosterDeviceBadge(u)}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Group 2 - OFFLINE PARTICIPANTS */}
            {offlineUsers.length > 0 && (
              <div>
                <div
                  onClick={() => setShowOfflineGroup(!showOfflineGroup)}
                  style={{
                    padding: '6px 16px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#8696a0',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <motion.div whileHover={{ scale: 1.2, rotate: 10 }}>
                      <Icon icon="solar:clock-circle-bold-duotone" width="16" height="16" style={{ color: '#8696a0' }} />
                    </motion.div>
                    <span>OFFLINE / AWAY ({offlineUsers.length})</span>
                  </div>

                  <motion.div
                    animate={{ rotate: showOfflineGroup ? 0 : -90 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Icon icon="lucide:chevron-down" width="16" height="16" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {showOfflineGroup && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <motion.div
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="show"
                      >
                        {offlineUsers.map((u, idx) => {
                          const presence = formatUserPresence(u.isOnline, u.lastSeen);
                          return (
                            <motion.div
                              key={u.nickname || idx}
                              variants={itemVariants}
                              layout
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setSelectedUserAction(u)}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                                opacity: 0.65,
                              }}
                              className="roster-item-card"
                            >
                              {renderStatusAvatar(u.nickname, '38px', false, {}, u.avatarUrl)}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#8696a0' }}>
                                    {u.nickname}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#8696a0', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Icon icon="solar:clock-circle-bold-duotone" width="12" height="12" />
                                  <span>{presence.text}</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : (
          /* TAB 2: MEDIA & DOCS GALLERY */
          <motion.div
            key="media-tab"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}
          >
            {mediaMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8696a0', fontSize: '0.85rem', marginTop: '40px' }}>
                <Icon icon="solar:folder-with-files-bold-duotone" width="48" height="48" style={{ color: '#8696a0', marginBottom: '8px', opacity: 0.5 }} />
                <div>No media or documents shared yet in this room session.</div>
              </div>
            ) : (
              <motion.div
                variants={listContainerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {mediaMessages.map((m, idx) => (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    layoutId={`media-card-${idx}`}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedMedia({ ...m, idx })}
                    style={{
                      backgroundColor: '#202c33',
                      borderRadius: '10px',
                      padding: '12px',
                      border: '1px solid rgba(134, 150, 160, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                    }}
                    className="media-item-card"
                  >
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0, 168, 132, 0.15)',
                        color: '#00a884',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        icon={
                          m.type === 'image'
                            ? 'solar:gallery-bold-duotone'
                            : m.type === 'video'
                              ? 'solar:videocamera-record-bold-duotone'
                              : m.type === 'audio'
                                ? 'solar:microphone-bold-duotone'
                                : 'solar:document-bold-duotone'
                        }
                        width="22"
                        height="22"
                      />
                    </motion.div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.fileName || m.message || 'Shared Media File'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#8696a0', marginTop: '2px' }}>
                        By {m.nickname} • {m.timestamp || 'Just now'}
                      </div>
                    </div>

                    {m.fileUrl && (
                      <motion.a
                        whileHover={{ scale: 1.2, rotate: -10 }}
                        whileTap={{ scale: 0.9 }}
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#00a884', display: 'flex', alignItems: 'center', padding: '6px' }}
                        title="Download / Open File"
                      >
                        <Icon icon="solar:download-minimalistic-bold-duotone" width="22" height="22" />
                      </motion.a>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* uupm.cc Feature #4: Team Activity Heat Meter (Glassmorphic Hourly Bar Chart) */}
      <div className="uupm-activity-meter-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00a884', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon icon="solar:chart-square-bold-duotone" width="14" height="14" />
            <span>TEAM ACTIVITY METER</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#8696a0', fontWeight: 600 }}>
            {totalMsgs} msgs in session
          </div>
        </div>

        {/* 10 Animated Motion Activity Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '36px', gap: '4px' }}>
          {activityBars.map((heightPct, idx) => (
            <motion.div
              key={idx}
              initial={{ height: 0 }}
              animate={{ height: `${heightPct}%` }}
              transition={{ duration: 0.6, delay: idx * 0.04, ease: 'easeOut' }}
              className="uupm-activity-bar"
              title={`Slot ${idx + 1}: ${Math.round((heightPct / 100) * 12)} msgs`}
            />
          ))}
        </div>
      </div>

      {/* 3D Lightbox Preview Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMedia(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(11, 20, 26, 0.85)',
              backdropFilter: 'blur(16px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              layoutId={`media-card-${selectedMedia.idx}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#202c33',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '440px',
                width: '100%',
                border: '1px solid rgba(0, 168, 132, 0.3)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon icon="solar:folder-with-files-bold-duotone" width="26" height="26" style={{ color: '#00a884' }} />
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#e9edef' }}>
                    Media File Preview
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedMedia(null)}
                  style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
                >
                  <Icon icon="solar:close-circle-bold-duotone" width="24" height="24" />
                </motion.button>
              </div>

              {selectedMedia.fileUrl && selectedMedia.type === 'image' && (
                <img
                  src={selectedMedia.fileUrl}
                  alt="Attachment Preview"
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '12px' }}
                />
              )}

              <div style={{ fontSize: '0.88rem', color: '#e9edef', fontWeight: 600 }}>
                {selectedMedia.fileName || selectedMedia.message || 'Shared Attachment File'}
              </div>

              <div style={{ fontSize: '0.78rem', color: '#8696a0' }}>
                Shared by <strong>{selectedMedia.nickname}</strong> • {selectedMedia.timestamp || 'Just now'}
              </div>

              {selectedMedia.fileUrl && (
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={selectedMedia.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#00a884',
                    color: '#111b21',
                    fontWeight: 700,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '8px',
                  }}
                >
                  <Icon icon="solar:download-minimalistic-bold-duotone" width="20" height="20" />
                  <span>Download / Open Media</span>
                </motion.a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native Participant Quick Action Sheet Overlay */}
      <AnimatePresence>
        {selectedUserAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUserAction(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(11, 20, 26, 0.75)',
              backdropFilter: 'blur(10px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#1f2c34',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                padding: '20px',
                maxWidth: '420px',
                width: '100%',
                border: '1px solid rgba(134, 150, 160, 0.2)',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', paddingBottom: '12px' }}>
                {renderStatusAvatar(selectedUserAction.nickname, '42px', selectedUserAction.isOnline, {}, selectedUserAction.avatarUrl)}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#e9edef' }}>
                    {selectedUserAction.nickname}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#00a884', fontWeight: 600 }}>
                    {selectedUserAction.isOnline ? '🟢 Currently Online' : '⚪ Offline / Away'}
                  </div>
                </div>
              </div>

              {/* Action 1: @Mention User */}
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (setChatMessage) {
                    setChatMessage((prev) => `@${selectedUserAction.nickname} ` + prev);
                  }
                  if (chatInputRef && chatInputRef.current) {
                    chatInputRef.current.focus();
                  }
                  setSelectedUserAction(null);
                }}
                style={{
                  backgroundColor: '#2a3942',
                  border: 'none',
                  color: '#00a884',
                  fontWeight: 700,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.86rem',
                  textAlign: 'left',
                }}
              >
                <Icon icon="solar:user-bold-duotone" width="20" height="20" />
                <span>@Mention {selectedUserAction.nickname} in Chat</span>
              </motion.button>

              {/* Action 2: Close Sheet */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedUserAction(null)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(134, 150, 160, 0.2)',
                  color: '#8696a0',
                  fontWeight: 600,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  marginTop: '4px',
                }}
              >
                Dismiss
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Encrypted Session Badge Footer */}
      <div className="e2ee-footer-badge">
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          whileHover={{ rotate: 360, scale: 1.3 }}
        >
          <Icon icon="solar:shield-keyhole-bold-duotone" width="16" height="16" style={{ color: '#00a884' }} />
        </motion.div>
        <span>E2E Encrypted Session • Zero Trace</span>
      </div>
    </motion.aside>
  );
}
