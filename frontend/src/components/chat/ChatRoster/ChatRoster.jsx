import { useState } from 'react';
import { formatUserPresence } from '../../../utils/chatUtils';
import { renderDeviceBadge } from '../../../utils/deviceUtils';
import './ChatRoster.css';

export default function ChatRoster({
  isMobileDevice,
  showRosterPanel,
  setShowRosterPanel,
  nickname,
  users = [],
  messages = [],
  renderStatusAvatar,
}) {
  const [activeTab, setActiveTab] = useState('people'); // 'people' | 'media'
  const [showOnlineGroup, setShowOnlineGroup] = useState(true);
  const [showOfflineGroup, setShowOfflineGroup] = useState(true);

  // Group Users into Online and Offline
  const onlineUsers = users.filter((u) => u.isOnline);
  const offlineUsers = users.filter((u) => !u.isOnline);

  // Filter Shared Media & Files from Messages Feed
  const mediaMessages = messages.filter(
    (m) => m.fileUrl || m.type === 'image' || m.type === 'video' || m.type === 'audio' || m.type === 'document'
  );

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
        <button
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
            transition: 'all 0.2s ease',
          }}
          title={`${onlineUsers.length} Online Participants`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>group</span>
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
        </button>
      </aside>
    );
  }

  // Expanded Panel View (320px)
  return (
    <aside
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '22px' }}>group</span>
          <span style={{ fontWeight: 700, fontSize: '0.96rem', color: '#e9edef' }}>
            Participants ({users.length})
          </span>
        </div>

        <button
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
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>
      </div>

      {/* Tab Selector Bar (People vs Shared Media & Docs) */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#111b21',
          borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
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
            borderBottom: activeTab === 'people' ? '2px solid #00a884' : '2px solid transparent',
            color: activeTab === 'people' ? '#00a884' : '#8696a0',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
          People ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          style={{
            flex: 1,
            padding: '10px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'media' ? '2px solid #00a884' : '2px solid transparent',
            color: activeTab === 'media' ? '#00a884' : '#8696a0',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>folder_open</span>
          Media & Docs ({mediaMessages.length})
        </button>
      </div>

      {/* TAB 1: PEOPLE (Online & Offline Grouping) */}
      {activeTab === 'people' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          
          {/* Group 1 - ONLINE PARTICIPANTS */}
          <div style={{ marginBottom: '12px' }}>
            <div
              onClick={() => setShowOnlineGroup(!showOnlineGroup)}
              style={{
                padding: '6px 16px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#00a884',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>🟢 ONLINE ({onlineUsers.length})</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {showOnlineGroup ? 'expand_more' : 'chevron_right'}
              </span>
            </div>

            {showOnlineGroup &&
              (onlineUsers.length === 0 ? (
                <div style={{ padding: '8px 16px', fontSize: '0.78rem', color: '#8696a0' }}>
                  No participants online
                </div>
              ) : (
                onlineUsers.map((u, idx) => {
                  const presence = formatUserPresence(u.isOnline, u.lastSeen);
                  const isMe = u.nickname === nickname;
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
                            {u.nickname} {isMe && '(You)'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#00a884', fontWeight: 600, marginTop: '2px' }}>
                          {presence.text}
                        </div>
                        <div>{renderDeviceBadge(u)}</div>
                      </div>
                    </div>
                  );
                })
              ))}
          </div>

          {/* Group 2 - OFFLINE PARTICIPANTS */}
          {offlineUsers.length > 0 && (
            <div>
              <div
                onClick={() => setShowOfflineGroup(!showOfflineGroup)}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#8696a0',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span>⚪ OFFLINE / AWAY ({offlineUsers.length})</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {showOfflineGroup ? 'expand_more' : 'chevron_right'}
                </span>
              </div>

              {showOfflineGroup &&
                offlineUsers.map((u, idx) => {
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
                        opacity: 0.6,
                        transition: 'background-color 0.15s ease',
                      }}
                      className="hover:bg-[#202c33]"
                    >
                      {renderStatusAvatar(u.nickname, '38px', false, {}, u.avatarUrl)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.84rem', color: '#8696a0' }}>
                            {u.nickname}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#8696a0', marginTop: '2px' }}>
                          {presence.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEDIA & DOCS GALLERY */}
      {activeTab === 'media' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {mediaMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8696a0', fontSize: '0.85rem', marginTop: '40px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#8696a0', marginBottom: '8px' }}>
                folder_off
              </span>
              <div>No media or documents shared yet in this room session.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mediaMessages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#202c33',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: '1px solid rgba(134, 150, 160, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '24px' }}>
                    {m.type === 'image' ? 'image' : m.type === 'video' ? 'videocam' : m.type === 'audio' ? 'mic' : 'description'}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.fileName || m.message || 'Shared Media File'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>
                      By {m.nickname} • {m.timestamp || 'Just now'}
                    </div>
                  </div>

                  {m.fileUrl && (
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#00a884', display: 'flex', alignItems: 'center' }}
                      title="Open / Download File"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
