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
  setShowLogoutConfirm,
  setShowThemeModal,
  setShowClearConfirm,
  onOpenWatchParty,
  isWatchPartyActive,
}) {
  const [showOnlineGroup, setShowOnlineGroup] = useState(true);
  const [showOfflineGroup, setShowOfflineGroup] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [avatarErrors, setAvatarErrors] = useState({});

  const handleAvatarError = (nick) => {
    setAvatarErrors((prev) => ({ ...prev, [nick]: true }));
  };

  const handleUserClick = (u) => {
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

  const onlineUsers = useMemo(() => filteredUsers.filter((u) => u.isOnline), [filteredUsers]);
  const offlineUsers = useMemo(() => filteredUsers.filter((u) => !u.isOnline), [filteredUsers]);

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

  // Collapsed Rail View (60px)
  if (!showRosterPanel && !showRailSidebar) return null;

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

      {showRosterPanel && (
        <motion.aside
          initial={{ opacity: 0, x: isMobileDevice ? '100%' : -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isMobileDevice ? '100%' : -10 }}
          transition={{ duration: 0.2 }}
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
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleUserClick(u)}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                cursor: isMe ? 'default' : 'pointer',
                              }}
                              className="roster-item-card"
                              title={isMe ? 'This is you' : `Click to mention @${u.nickname} in chat`}
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
                                    {(u.nickname || 'U').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#e9edef' }}>
                                      {u.nickname} {isMe && '(You)'}
                                    </span>
                                    {!isMe && (
                                      <span
                                        style={{
                                          fontSize: '0.65rem',
                                          backgroundColor: 'rgba(0, 168, 132, 0.12)',
                                          border: '1px solid rgba(0, 168, 132, 0.28)',
                                          color: '#00a884',
                                          padding: '1px 5px',
                                          borderRadius: '6px',
                                          fontWeight: 600,
                                        }}
                                        title={`Mention @${u.nickname}`}
                                      >
                                        @
                                      </span>
                                    )}
                                  </div>

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
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleUserClick(u)}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                                opacity: 0.72,
                              }}
                              className="roster-item-card"
                              title={`Click to mention @${u.nickname} in chat`}
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
                                  {(u.nickname || 'U').slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#8696a0' }}>
                                      {u.nickname}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '0.65rem',
                                        backgroundColor: 'rgba(134, 150, 160, 0.1)',
                                        border: '1px solid rgba(134, 150, 160, 0.2)',
                                        color: '#8696a0',
                                        padding: '1px 5px',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      @
                                    </span>
                                  </div>
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
    </>
  );
});

export default ChatRoster;
