import React from 'react';
import { formatUserPresence } from '../../../utils/chatUtils';
import { renderDeviceBadge } from '../../../utils/deviceUtils';
import './ChatRoster.css';

export default function ChatRoster({
  isMobileDevice,
  showRosterPanel,
  setShowRosterPanel,
  nickname,
  users,
  renderStatusAvatar,
}) {
  // Collapsed State: Render thin 60px vertical sidebar rail with Online Participants Button (Group Icon)
  if (!showRosterPanel) {
    if (isMobileDevice) return null; // On mobile, collapsed state hides completely so chat gets 100% width

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
        {/* Online Count Badge Icon Button (Group Icon) */}
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
          title={`${users ? users.length : 0} Online Participants`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>group</span>
          {users && users.length > 0 && (
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
              {users.length}
            </span>
          )}
        </button>
      </aside>
    );
  }

  // Expanded State: Render full Online Participants Panel
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
          <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '22px' }}>group</span>
          <span style={{ fontWeight: 700, fontSize: '0.96rem', color: '#e9edef' }}>
            Participants ({users ? users.length : 0})
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
          title="Close Participants Panel"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>
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
  );
}
