import React from 'react';
import AnimatedModal from '../../animated/AnimatedModal';

export default function SecretRoomModal({
  isOpen,
  onClose,
  error,
  roomVerified,
  setRoomVerified,
  passcode,
  nickname,
  setNickname,
  setPasscode,
  handleAvatarUpload,
  uploading,
  avatarUrl,
  joining,
  handleSecretJoin,
  onNavigateChat,
}) {
  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="460px"
      enableDragDismiss={true}
    >
      <div
        className="m3-card"
        style={{
          backgroundColor: 'var(--m3-surface-container-highest)',
          borderRadius: 'var(--m3-radius-xl)',
          boxShadow: 'var(--m3-elevation-3)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--m3-primary)' }}>vpn_key</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>Secret Space Portal</h3>
          </div>
          <button
            className="m3-btn m3-btn-icon m3-btn-outlined"
            onClick={onClose}
            style={{ width: '36px', height: '36px' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--m3-error-container)',
              color: 'var(--m3-on-error)',
              padding: '10px 14px',
              borderRadius: 'var(--m3-radius-m)',
              marginBottom: '16px',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {roomVerified ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#81c784' }}>
                check_circle
              </span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m3-on-surface)', margin: 0 }}>
                Room Passcode Verified
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--m3-on-surface-variant)', margin: 0 }}>
                Successfully authenticated for Room: <strong>{passcode}</strong> as <strong>{nickname}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="m3-btn m3-btn-outlined"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setRoomVerified(false)}
              >
                Edit Details
              </button>
              <button
                type="button"
                className="m3-btn m3-btn-filled"
                style={{ flex: 1, padding: '10px', backgroundColor: 'var(--m3-primary)', color: '#fff' }}
                onClick={onNavigateChat}
              >
                <span className="material-symbols-outlined">meeting_room</span>
                Enter Chatroom Now
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSecretJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '4px' }}>
                User Nickname
              </label>
              <input
                type="text"
                className="m3-text-field"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '4px' }}>
                Room Passcode
              </label>
              <input
                type="password"
                className="m3-text-field"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '4px' }}>
                Avatar Image (Optional)
              </label>
              <input type="file" onChange={handleAvatarUpload} accept="image/*" id="secret-avatar-upload" style={{ display: 'none' }} />
              <label htmlFor="secret-avatar-upload" className="m3-btn m3-btn-outlined" style={{ width: '100%', justifyContent: 'center' }}>
                <span className="material-symbols-outlined">upload_file</span>
                {uploading ? 'Uploading...' : avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
              </label>
            </div>

            <button type="submit" disabled={joining} className="m3-btn m3-btn-filled" style={{ marginTop: '8px', padding: '12px' }}>
              <span className="material-symbols-outlined">meeting_room</span>
              {joining ? 'Authenticating Passcode...' : 'Verify & Connect Room Space'}
            </button>
          </form>
        )}
      </div>
    </AnimatedModal>
  );
}
