import { useState, memo, useMemo } from 'react';
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

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const ChatRoster = memo(function ChatRoster({
  isMobileDevice,
  showRosterPanel,
  setShowRosterPanel,
  showRailSidebar,
  setShowRailSidebar,
  nickname,
  users = [],
  messages = [],
  typingUsers = [],
  statusUserList = [],
  socketLatency = null,
  renderStatusAvatar,
  setActiveStatusUser,
  setShowStatusCreator,
  setInputText,
  onStartCall,
  setShowLogoutConfirm,
  setShowThemeModal,
  setShowClearConfirm,
  onOpenWatchParty,
  isWatchPartyActive,
  currentUserRole = 'member',
  isCurrentUserMuted = false,
  onKickUser,
  onBanUser,
  onUnbanUser,
  onPromoteUser,
  onTransferHost,
  onClearInactiveUsers,
  onMuteUser,
  onSendDirectMessage,
  onUpdateAvatar,
}) {
  const [showOnlineGroup, setShowOnlineGroup] = useState(true);
  const [showOfflineGroup, setShowOfflineGroup] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarErrors, setAvatarErrors] = useState({});
  const [inspectingUser, setInspectingUser] = useState(null);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [whisperMessage, setWhisperMessage] = useState('');

  const handleAvatarError = (nick) => {
    setAvatarErrors((prev) => ({ ...prev, [nick]: true }));
  };

  const handleMention = (u) => {
    if (u.nickname === nickname) return;
    if (setInputText) {
      setInputText((prev) => {
        const mention = `@${u.nickname} `;
        if (prev && prev.includes(mention)) return prev;
        return prev ? `${prev} ${mention}` : mention;
      });
      if (isMobileDevice && setShowRosterPanel) {
        setShowRosterPanel(false);
      }
    }
  };

  // Filter Users in Real-Time by Name, Device, or Browser
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      return (
        (u.nickname && u.nickname.toLowerCase().includes(q)) ||
        (u.deviceModel && u.deviceModel.toLowerCase().includes(q)) ||
        (u.browser && u.browser.toLowerCase().includes(q)) ||
        (u.os && u.os.toLowerCase().includes(q)) ||
        (u.networkLabel && u.networkLabel.toLowerCase().includes(q))
      );
    });
  }, [users, searchQuery]);

  // Online users with "You" pinned at top, followed by alphabetical order
  const onlineUsers = useMemo(() => {
    const list = filteredUsers.filter((u) => u.isOnline);
    return list.sort((a, b) => {
      if (a.nickname === nickname) return -1;
      if (b.nickname === nickname) return 1;
      return (a.nickname || '').localeCompare(b.nickname || '');
    });
  }, [filteredUsers, nickname]);

  // Offline users sorted by lastSeen DESC (most recently active first)
  const offlineUsers = useMemo(() => {
    const list = filteredUsers.filter((u) => !u.isOnline);
    return list.sort((a, b) => {
      const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
      const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (a.nickname || '').localeCompare(b.nickname || '');
    });
  }, [filteredUsers]);

  // Real Team Activity Meter: Measures temporal message distribution in session
  const totalMsgs = messages.length;
  const activityBars = useMemo(() => {
    if (!messages || messages.length === 0) {
      return Array(10).fill(12);
    }
    const now = Date.now();
    const windowMs = 30 * 60 * 1000;
    const buckets = Array(10).fill(0);
    for (const m of messages) {
      const t = m.createdAt ? new Date(m.createdAt).getTime() : now;
      const diff = now - t;
      if (diff >= 0 && diff < windowMs) {
        const bucketIdx = 9 - Math.min(9, Math.floor((diff / windowMs) * 10));
        buckets[bucketIdx]++;
      }
    }
    const maxVal = Math.max(1, ...buckets);
    return buckets.map((count) => Math.max(12, Math.round((count / maxVal) * 100)));
  }, [messages]);

  // Render Real Platform, Battery & Connection Metadata Badge
  const renderRosterDeviceBadge = (u) => {
    const isMe = u.nickname === nickname;
    const isMobile = u.isMobile || (u.userAgent && /mobile|android|iphone|ipad/i.test(u.userAgent)) || u.deviceType === 'mobile';
    const deviceName = u.deviceModel || (isMobile ? 'Mobile' : 'Desktop');
    const hasBattery = Boolean(u.batteryLabel);
    const isCharging = Boolean(u.batteryIsCharging);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexWrap: 'wrap',
          marginTop: '3px',
        }}
      >
        {/* Device Name Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(134, 150, 160, 0.15)',
            padding: '1px 6px',
            borderRadius: '8px',
            fontSize: '0.67rem',
            color: '#aebac1',
          }}
          title={`${u.browser || ''} on ${u.os || ''} (${deviceName})`}
        >
          <Icon
            icon={isMobile ? 'solar:smartphone-bold-duotone' : 'solar:laptop-minimalistic-bold-duotone'}
            width="11"
            height="11"
            style={{ color: '#00a884' }}
          />
          <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deviceName}
          </span>
        </div>

        {/* Real Battery Badge (If available from device) */}
        {hasBattery && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: isCharging ? 'rgba(0, 168, 132, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isCharging ? 'rgba(0, 168, 132, 0.3)' : 'rgba(134, 150, 160, 0.15)'}`,
              padding: '1px 5px',
              borderRadius: '8px',
              fontSize: '0.67rem',
              color: isCharging ? '#00a884' : '#8696a0',
            }}
            title={isCharging ? `Charging: ${u.batteryLabel}` : `Battery: ${u.batteryLabel}`}
          >
            <Icon
              icon={isCharging ? 'solar:bolt-bold-duotone' : 'solar:battery-charge-minimalistic-bold-duotone'}
              width="10"
              height="10"
              style={{ color: isCharging ? '#00a884' : '#8696a0' }}
            />
            <span>{u.batteryLabel}</span>
          </div>
        )}

        {/* Real Connection Latency / Network Type */}
        {isMe ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: 'rgba(0, 168, 132, 0.12)',
              border: '1px solid rgba(0, 168, 132, 0.3)',
              padding: '1px 5px',
              borderRadius: '8px',
              fontSize: '0.67rem',
              color: '#00a884',
            }}
            title={`Your Real-time Latency: ${socketLatency !== null ? `${socketLatency}ms` : 'Measuring...'}`}
          >
            <Icon icon="solar:wifi-router-bold-duotone" width="10" height="10" />
            <span>{socketLatency !== null ? `${socketLatency}ms` : 'Ping'}</span>
          </div>
        ) : (
          u.networkLabel && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(134, 150, 160, 0.15)',
                padding: '1px 5px',
                borderRadius: '8px',
                fontSize: '0.67rem',
                color: '#8696a0',
              }}
              title={`Network: ${u.networkLabel}`}
            >
              <Icon icon="solar:wifi-router-bold-duotone" width="10" height="10" />
              <span>{u.networkLabel}</span>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <>
      {showRailSidebar && (
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
          paddingBottom: '12px',
        }}
      >
        {/* 1. Participants Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowRosterPanel((prev) => !prev);
          }}
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

        {/* 2. Status Stories Rail Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (statusUserList && statusUserList.length > 0 && setActiveStatusUser) {
              setActiveStatusUser(statusUserList[0]);
            } else if (setShowStatusCreator) {
              setShowStatusCreator(true);
            }
          }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(37, 211, 102, 0.12)',
            border: '1px solid rgba(37, 211, 102, 0.35)',
            color: '#25d366',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '14px',
            position: 'relative',
          }}
          className="media-item-card"
          title={statusUserList.length > 0 ? `${statusUserList.length} Active Status Stories` : 'Add Status Update'}
        >
          <Icon icon="solar:play-circle-bold-duotone" width="24" height="24" style={{ color: '#25d366' }} />
          {statusUserList.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#25d366',
                boxShadow: '0 0 8px #25d366',
              }}
            />
          )}
        </motion.button>

        {/* Watch Together / Watch Party Rail Button */}
        {onOpenWatchParty && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onOpenWatchParty}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: isWatchPartyActive ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 0, 128, 0.12)',
              border: `1px solid ${isWatchPartyActive ? '#00a884' : 'rgba(255, 0, 128, 0.3)'}`,
              color: isWatchPartyActive ? '#00a884' : '#ff007f',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '14px',
              position: 'relative',
            }}
            className="media-item-card"
            title={isWatchPartyActive ? 'Watch Party Active — Click to Join' : 'Start Watch Party'}
          >
            <Icon icon="solar:clapperboard-play-bold-duotone" width="22" height="22" style={{ color: isWatchPartyActive ? '#00a884' : '#ff007f' }} />
            {isWatchPartyActive && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#25d366',
                  boxShadow: '0 0 8px #25d366',
                }}
              />
            )}
          </motion.button>
        )}

        {/* 2. Change Theme & Wallpaper Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setShowThemeModal && setShowThemeModal(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 112, 243, 0.12)',
            border: '1px solid rgba(0, 112, 243, 0.3)',
            color: '#0070f3',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '14px',
          }}
          className="media-item-card"
          title="Change Theme & Wallpaper"
        >
          <Icon icon="solar:palette-bold-duotone" width="22" height="22" style={{ color: '#0070f3' }} />
        </motion.button>

        {/* 3. Clear Room History Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setShowClearConfirm && setShowClearConfirm(true)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 152, 0, 0.12)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            color: '#ff9800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '14px',
          }}
          className="media-item-card"
          title="Clear Room History"
        >
          <Icon icon="solar:trash-bin-trash-bold-duotone" width="22" height="22" style={{ color: '#ff9800' }} />
        </motion.button>

        <div style={{ flex: 1 }} />

        {/* 4. Log Out Button at Bottom of Left Rail Sidebar */}
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
      )}

      <AnimatePresence>
        {showRosterPanel && (
          <motion.aside
            key="chat-roster-panel"
            initial={{ opacity: 0, x: isMobileDevice ? '100%' : -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isMobileDevice ? '100%' : -10 }}
          transition={{ duration: 0.2 }}
          drag={isMobileDevice ? 'x' : false}
          dragConstraints={{ left: 0, right: 300 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x > 80 || info.velocity.x > 250) {
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
            touchAction: isMobileDevice ? 'pan-y' : 'auto',
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#e9edef' }}>
              Participants ({users.length})
            </span>
            <span style={{ fontSize: '0.7rem', color: '#00a884', fontWeight: 600 }}>
              {onlineUsers.length} online
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(currentUserRole === 'host' || currentUserRole === 'admin') && onClearInactiveUsers && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => {
                if (window.confirm('🧹 Clean up inactive participants who have not been active for 7+ days? (Host and admins are preserved)')) {
                  onClearInactiveUsers(7);
                }
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '5px 8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
              title="Clean Inactive (7d+)"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" width="15" height="15" />
              <span>Clean</span>
            </motion.button>
          )}

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
      </div>

      {/* Real-time Search Filter Bar */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(134, 150, 160, 0.12)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#111b21',
            borderRadius: '8px',
            padding: '6px 10px',
            border: '1px solid rgba(134, 150, 160, 0.15)',
            gap: '8px',
          }}
        >
          <Icon icon="solar:magnifer-linear" width="15" height="15" style={{ color: '#8696a0', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participants..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#e9edef',
              fontSize: '0.78rem',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 0, display: 'flex' }}
              title="Clear search"
            >
              <Icon icon="solar:close-circle-bold" width="14" height="14" />
            </button>
          )}
        </div>
      </div>

      {/* Participants List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {filteredUsers.length === 0 && searchQuery.trim() ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: '#8696a0' }}>
            <Icon icon="solar:magnifer-linear" width="36" height="36" style={{ color: '#8696a0', opacity: 0.5, marginBottom: '8px' }} />
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#e9edef' }}>
              No participants found
            </div>
            <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
              No matches for "{searchQuery}"
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                marginTop: '12px',
                backgroundColor: 'rgba(0, 168, 132, 0.15)',
                color: '#00a884',
                border: '1px solid rgba(0, 168, 132, 0.3)',
                borderRadius: '8px',
                padding: '5px 14px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
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
                          <Icon icon="solar:users-group-two-rounded-bold-duotone" width="16" height="16" style={{ color: '#8696a0' }} />
                          <span>No participants online right now.</span>
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
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setInspectingUser(u)}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                              }}
                              className="roster-item-card"
                              title={`Click to view profile & actions for ${u.nickname}`}
                            >
                              <div className="online-avatar-pulse">
                                {u.avatarUrl && !avatarErrors[u.nickname] ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.nickname}
                                    onError={() => handleAvatarError(u.nickname)}
                                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '50%',
                                      backgroundColor: isMe ? '#005c4b' : '#1f2c34',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.85rem',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                  >
                                    {getInitials(u.nickname)}
                                  </div>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#e9edef' }}>
                                      {u.nickname} {isMe && '(You)'}
                                    </span>
                                    {u.role === 'host' && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.64rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(255, 193, 7, 0.16)',
                                          color: '#ffc107',
                                          border: '1px solid rgba(255, 193, 7, 0.35)',
                                          padding: '1px 5px',
                                          borderRadius: '6px',
                                        }}
                                        title="Room Host"
                                      >
                                        👑 Host
                                      </span>
                                    )}
                                    {u.role === 'admin' && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.64rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(0, 168, 132, 0.16)',
                                          color: '#00a884',
                                          border: '1px solid rgba(0, 168, 132, 0.35)',
                                          padding: '1px 5px',
                                          borderRadius: '6px',
                                        }}
                                        title="Room Admin"
                                      >
                                        🛡️ Admin
                                      </span>
                                    )}
                                    {u.isMuted && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.64rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(239, 68, 68, 0.16)',
                                          color: '#ef4444',
                                          border: '1px solid rgba(239, 68, 68, 0.35)',
                                          padding: '1px 5px',
                                          borderRadius: '6px',
                                        }}
                                        title="Muted by host"
                                      >
                                        🔇 Muted
                                      </span>
                                    )}
                                    {u.isBanned && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          fontSize: '0.64rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(239, 68, 68, 0.22)',
                                          color: '#ef4444',
                                          border: '1px solid rgba(239, 68, 68, 0.45)',
                                          padding: '1px 5px',
                                          borderRadius: '6px',
                                        }}
                                        title="Permanently banned"
                                      >
                                        ⛔ Banned
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isTyping && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00a884', fontSize: '0.7rem', fontWeight: 700 }}>
                                        <Icon icon="line-md:chat-bubble-twotone-loop" width="16" height="16" />
                                        <span>typing...</span>
                                      </div>
                                    )}

                                    {!isMe && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMention(u);
                                        }}
                                        style={{
                                          fontSize: '0.68rem',
                                          backgroundColor: 'rgba(0, 168, 132, 0.12)',
                                          border: '1px solid rgba(0, 168, 132, 0.28)',
                                          color: '#00a884',
                                          padding: '1px 6px',
                                          borderRadius: '6px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                        title={`Mention @${u.nickname} in chat`}
                                      >
                                        @
                                      </button>
                                    )}

                                    {!isMe && onStartCall && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onStartCall({ isVoiceOnly: true, targetNickname: u.nickname });
                                          }}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#00a884',
                                            cursor: 'pointer',
                                            padding: '3px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                          title={`Voice call ${u.nickname}`}
                                        >
                                          <Icon icon="solar:phone-bold-duotone" width="16" height="16" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onStartCall({ isVoiceOnly: false, targetNickname: u.nickname });
                                          }}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#00a884',
                                            cursor: 'pointer',
                                            padding: '3px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                          title={`Video call ${u.nickname}`}
                                        >
                                          <Icon icon="solar:videocamera-bold-duotone" width="16" height="16" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.72rem', color: '#00a884', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Icon icon="solar:check-circle-bold-duotone" width="12" height="12" />
                                  <span>{presence.text}</span>
                                </div>

                                <div>
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
                      {offlineUsers.length === 0 ? (
                        <div style={{ padding: '10px 16px', fontSize: '0.78rem', color: '#8696a0' }}>
                          No offline participants.
                        </div>
                      ) : (
                        offlineUsers.map((u, idx) => {
                          const presence = formatUserPresence(u.isOnline, u.lastSeen);
                          return (
                            <motion.div
                              key={u.nickname || idx}
                              variants={itemVariants}
                              layout
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setInspectingUser(u)}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                                opacity: 0.76,
                              }}
                              className="roster-item-card"
                              title={`Click to view profile & actions for ${u.nickname}`}
                            >
                              {u.avatarUrl && !avatarErrors[u.nickname] ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.nickname}
                                  onError={() => handleAvatarError(u.nickname)}
                                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#202c33', color: '#8696a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                                  {getInitials(u.nickname)}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#8696a0' }}>
                                      {u.nickname}
                                    </span>
                                    {u.role === 'host' && (
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                          color: '#ffc107',
                                          border: '1px solid rgba(255, 193, 7, 0.25)',
                                          padding: '0 4px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        👑 Host
                                      </span>
                                    )}
                                    {u.role === 'admin' && (
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(0, 168, 132, 0.1)',
                                          color: '#00a884',
                                          border: '1px solid rgba(0, 168, 132, 0.25)',
                                          padding: '0 4px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        🛡️ Admin
                                      </span>
                                    )}
                                    {u.isMuted && (
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                          color: '#ef4444',
                                          border: '1px solid rgba(239, 68, 68, 0.25)',
                                          padding: '0 4px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        🔇 Muted
                                      </span>
                                    )}
                                    {u.isBanned && (
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(239, 68, 68, 0.22)',
                                          color: '#ef4444',
                                          border: '1px solid rgba(239, 68, 68, 0.45)',
                                          padding: '0 4px',
                                          borderRadius: '4px',
                                        }}
                                        title="Permanently banned"
                                      >
                                        ⛔ Banned
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMention(u);
                                    }}
                                    style={{
                                      fontSize: '0.68rem',
                                      backgroundColor: 'rgba(134, 150, 160, 0.1)',
                                      border: '1px solid rgba(134, 150, 160, 0.2)',
                                      color: '#8696a0',
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                    title={`Mention @${u.nickname}`}
                                  >
                                    @
                                  </button>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#8696a0', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Icon icon="solar:clock-circle-bold-duotone" width="12" height="12" />
                                  <span>{presence.text}</span>
                                </div>
                                <div>
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
          </>
        )}
      </div>

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
        )}
      </AnimatePresence>

    {/* Participant Profile & Action Popover / Modal */}
    <AnimatePresence>
      {inspectingUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setInspectingUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 20, 26, 0.78)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1f2c34',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '380px',
              width: '100%',
              border: '1px solid rgba(0, 168, 132, 0.3)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00a884', letterSpacing: '0.5px' }}>
                PARTICIPANT PROFILE
              </div>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 0 }}
              >
                <Icon icon="solar:close-circle-bold-duotone" width="22" height="22" />
              </button>
            </div>

            {/* Profile Card Centerpiece */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
              <div style={{ position: 'relative' }}>
                {inspectingUser.avatarUrl && !avatarErrors[inspectingUser.nickname] ? (
                  <img
                    src={inspectingUser.avatarUrl}
                    alt={inspectingUser.nickname}
                    onError={() => handleAvatarError(inspectingUser.nickname)}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${inspectingUser.isOnline ? '#00a884' : '#8696a0'}` }}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: inspectingUser.nickname === nickname ? '#005c4b' : '#202c33',
                      color: inspectingUser.isOnline ? '#00a884' : '#8696a0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.4rem',
                      border: `2px solid ${inspectingUser.isOnline ? '#00a884' : '#8696a0'}`,
                    }}
                  >
                    {getInitials(inspectingUser.nickname)}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: inspectingUser.isOnline ? '#00a884' : '#8696a0',
                    border: '2px solid #1f2c34',
                  }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e9edef' }}>
                  {inspectingUser.nickname} {inspectingUser.nickname === nickname && '(You)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: inspectingUser.isOnline ? '#00a884' : '#8696a0', fontWeight: 600, marginTop: '2px' }}>
                  {formatUserPresence(inspectingUser.isOnline, inspectingUser.lastSeen).text}
                </div>
                {inspectingUser.nickname === nickname && onUpdateAvatar && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentUrl = inspectingUser.avatarUrl || '';
                      const newUrl = window.prompt(
                        'Enter new Avatar Image URL (or leave empty to reset to initials):',
                        currentUrl
                      );
                      if (newUrl !== null) {
                        onUpdateAvatar(newUrl.trim());
                        setInspectingUser((prev) =>
                          prev ? { ...prev, avatarUrl: newUrl.trim() } : null
                        );
                      }
                    }}
                    style={{
                      marginTop: '6px',
                      backgroundColor: 'rgba(0, 168, 132, 0.15)',
                      color: '#00a884',
                      border: '1px solid rgba(0, 168, 132, 0.3)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Icon icon="solar:camera-bold-duotone" width="13" height="13" />
                    <span>Change Avatar</span>
                  </button>
                )}
              </div>
            </div>

              {/* Action Buttons Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  handleMention(inspectingUser);
                  setInspectingUser(null);
                }}
                style={{
                  backgroundColor: 'rgba(0, 168, 132, 0.15)',
                  color: '#00a884',
                  border: '1px solid rgba(0, 168, 132, 0.3)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Icon icon="solar:chat-round-dots-bold-duotone" width="16" height="16" />
                <span>Mention</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`@${inspectingUser.nickname}`);
                  setCopiedHandle(true);
                  setTimeout(() => setCopiedHandle(false), 2000);
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#e9edef',
                  border: '1px solid rgba(134, 150, 160, 0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Icon icon={copiedHandle ? "solar:check-circle-bold" : "solar:copy-bold-duotone"} width="16" height="16" style={{ color: copiedHandle ? '#00a884' : '#8696a0' }} />
                <span>{copiedHandle ? 'Copied!' : 'Copy @'}</span>
              </button>

              {inspectingUser.nickname !== nickname && inspectingUser.isOnline && onStartCall && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onStartCall({ isVoiceOnly: true, targetNickname: inspectingUser.nickname });
                      setInspectingUser(null);
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 168, 132, 0.2)',
                      color: '#00a884',
                      border: '1px solid rgba(0, 168, 132, 0.4)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Icon icon="solar:phone-calling-rounded-bold-duotone" width="16" height="16" />
                    <span>Voice Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStartCall({ isVoiceOnly: false, targetNickname: inspectingUser.nickname });
                      setInspectingUser(null);
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 112, 243, 0.2)',
                      color: '#0070f3',
                      border: '1px solid rgba(0, 112, 243, 0.4)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Icon icon="solar:videocamera-record-bold-duotone" width="16" height="16" />
                    <span>Video Call</span>
                  </button>
                </>
              )}
            </div>

            {/* Direct Whisper / Message Input */}
            {inspectingUser.nickname !== nickname && onSendDirectMessage && (
              inspectingUser.isOnline ? (
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <input
                    type="text"
                    placeholder={`Whisper to @${inspectingUser.nickname}...`}
                    value={whisperMessage}
                    onChange={(e) => setWhisperMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && whisperMessage.trim()) {
                        onSendDirectMessage(inspectingUser.nickname, whisperMessage.trim());
                        setWhisperMessage('');
                        setInspectingUser(null);
                      }
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#111b21',
                      border: '1px solid rgba(134, 150, 160, 0.25)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#e9edef',
                      fontSize: '0.78rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    disabled={!whisperMessage.trim()}
                    onClick={() => {
                      if (whisperMessage.trim()) {
                        onSendDirectMessage(inspectingUser.nickname, whisperMessage.trim());
                        setWhisperMessage('');
                        setInspectingUser(null);
                      }
                    }}
                    style={{
                      backgroundColor: whisperMessage.trim() ? '#00a884' : 'rgba(255,255,255,0.06)',
                      color: whisperMessage.trim() ? '#111b21' : '#8696a0',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: whisperMessage.trim() ? 'pointer' : 'default',
                    }}
                  >
                    Whisper
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    border: '1px solid rgba(134, 150, 160, 0.15)',
                    fontSize: '0.74rem',
                    color: '#8696a0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '2px',
                  }}
                >
                  <Icon icon="solar:clock-circle-bold-duotone" width="14" height="14" style={{ flexShrink: 0, color: '#8696a0' }} />
                  <span>Participant is currently offline. Direct whispers require an active connection.</span>
                </div>
              )
            )}

            {/* Host Administration Controls */}
            {(currentUserRole === 'host' || currentUserRole === 'admin') && inspectingUser.nickname !== nickname && (
              <div
                style={{
                  marginTop: '4px',
                  padding: '12px',
                  backgroundColor: 'rgba(255, 193, 7, 0.07)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 193, 7, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ffc107', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>👑 HOST CONTROLS</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onMuteUser) {
                        onMuteUser(inspectingUser.nickname, !inspectingUser.isMuted);
                        setInspectingUser((prev) => prev ? ({ ...prev, isMuted: !prev.isMuted }) : null);
                      }
                    }}
                    style={{
                      backgroundColor: inspectingUser.isMuted ? 'rgba(0, 168, 132, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                      color: inspectingUser.isMuted ? '#00a884' : '#ef4444',
                      border: `1px solid ${inspectingUser.isMuted ? 'rgba(0, 168, 132, 0.4)' : 'rgba(239, 68, 68, 0.35)'}`,
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Icon icon={inspectingUser.isMuted ? "solar:volume-loud-bold-duotone" : "solar:muted-bold-duotone"} width="15" height="15" />
                    <span>{inspectingUser.isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to kick ${inspectingUser.nickname} from this room?`)) {
                        if (onKickUser) onKickUser(inspectingUser.nickname);
                        setInspectingUser(null);
                      }
                    }}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Icon icon="solar:user-cross-bold-duotone" width="15" height="15" />
                    <span>Kick User</span>
                  </button>

                  {/* Permanent Ban / Unban */}
                  {inspectingUser.isBanned ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onUnbanUser) onUnbanUser(inspectingUser.nickname);
                        setInspectingUser((prev) => prev ? ({ ...prev, isBanned: false }) : null);
                      }}
                      style={{
                        backgroundColor: 'rgba(0, 168, 132, 0.2)',
                        color: '#00a884',
                        border: '1px solid rgba(0, 168, 132, 0.4)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon icon="solar:shield-check-bold-duotone" width="15" height="15" />
                      <span>Unban User</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt(`Enter ban reason for ${inspectingUser.nickname}:`, 'Violating room rules');
                        if (reason !== null) {
                          if (onBanUser) onBanUser(inspectingUser.nickname, reason || 'Violating room rules');
                          setInspectingUser(null);
                        }
                      }}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.25)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon icon="solar:shield-cross-bold-duotone" width="15" height="15" />
                      <span>Ban User</span>
                    </button>
                  )}

                  {/* Promote / Demote (Host Only) */}
                  {currentUserRole === 'host' && (
                    inspectingUser.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Demote ${inspectingUser.nickname} to standard Member?`)) {
                            if (onPromoteUser) onPromoteUser(inspectingUser.nickname, 'member');
                            setInspectingUser((prev) => prev ? ({ ...prev, role: 'member' }) : null);
                          }
                        }}
                        style={{
                          backgroundColor: 'rgba(255, 193, 7, 0.15)',
                          color: '#ffc107',
                          border: '1px solid rgba(255, 193, 7, 0.35)',
                          borderRadius: '8px',
                          padding: '7px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Icon icon="solar:user-down-bold-duotone" width="15" height="15" />
                        <span>Demote Member</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Promote ${inspectingUser.nickname} to Room Admin?`)) {
                            if (onPromoteUser) onPromoteUser(inspectingUser.nickname, 'admin');
                            setInspectingUser((prev) => prev ? ({ ...prev, role: 'admin' }) : null);
                          }
                        }}
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          borderRadius: '8px',
                          padding: '7px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Icon icon="solar:star-bold-duotone" width="15" height="15" />
                        <span>Promote Admin</span>
                      </button>
                    )
                  )}

                  {/* Transfer Host (Host Only) */}
                  {currentUserRole === 'host' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`⚠️ Are you sure you want to transfer HOST status to ${inspectingUser.nickname}? You will become an admin.`)) {
                          if (onTransferHost) onTransferHost(inspectingUser.nickname);
                          setInspectingUser(null);
                        }
                      }}
                      style={{
                        gridColumn: 'span 2',
                        backgroundColor: 'rgba(234, 179, 8, 0.2)',
                        color: '#facc15',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon icon="solar:crown-bold-duotone" width="15" height="15" />
                      <span>Transfer Room Host</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Specs Diagnostics Grid */}
            <div style={{ backgroundColor: '#111b21', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(134, 150, 160, 0.12)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8696a0', letterSpacing: '0.5px' }}>
                CONNECTION & DEVICE SPECS
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aebac1' }}>
                  <Icon icon="solar:laptop-minimalistic-bold-duotone" width="14" height="14" style={{ color: '#00a884' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inspectingUser.deviceModel || inspectingUser.deviceType || 'Standard Device'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aebac1' }}>
                  <Icon icon="solar:monitor-bold-duotone" width="14" height="14" style={{ color: '#00a884' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inspectingUser.os || 'OS Unknown'} • {inspectingUser.browser || 'Browser'}
                  </span>
                </div>

                {inspectingUser.batteryLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aebac1' }}>
                    <Icon icon={inspectingUser.batteryIsCharging ? "solar:bolt-bold-duotone" : "solar:battery-charge-minimalistic-bold-duotone"} width="14" height="14" style={{ color: inspectingUser.batteryIsCharging ? '#00a884' : '#8696a0' }} />
                    <span>{inspectingUser.batteryLabel} {inspectingUser.batteryIsCharging ? '(Charging)' : ''}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aebac1' }}>
                  <Icon icon="solar:wifi-router-bold-duotone" width="14" height="14" style={{ color: '#00a884' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inspectingUser.nickname === nickname
                      ? (socketLatency !== null ? `${socketLatency}ms RTT` : 'Measuring ping...')
                      : (inspectingUser.networkLabel || 'Encrypted Tunnel')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
});

export default ChatRoster;
