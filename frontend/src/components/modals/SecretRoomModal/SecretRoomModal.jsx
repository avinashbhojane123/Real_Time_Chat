import { useState } from 'react';
import { Icon } from '@iconify/react';
import AnimatedModal from '../../animated/AnimatedModal';

// Quick Preset Avatars
const PRESET_AVATARS = [
  { id: 'cyber', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber', label: 'Bot' },
  { id: 'agent', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Agent', label: 'Avatar' },
  { id: 'stealth', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Stealth', label: 'Matrix' },
  { id: 'hero', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hero', label: 'Hero' },
];

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
  setAvatarUrl,
  joining,
  handleSecretJoin,
  onNavigateChat,
}) {
  const [showPasscodeText, setShowPasscodeText] = useState(false);

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="480px"
      enableDragDismiss={true}
    >
      <div
        className="m3-card"
        style={{
          backgroundColor: 'rgba(29, 27, 32, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(208, 188, 255, 0.2)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(208, 188, 255, 0.1)',
          padding: '28px 24px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(208, 188, 255, 0.15)',
                color: 'var(--m3-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 10px rgba(208, 188, 255, 0.2)',
              }}
            >
              <Icon icon="solar:key-minimalistic-square-bold-duotone" width="26" height="26" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--m3-on-surface)', margin: 0, letterSpacing: '0.3px' }}>
                Secret Room Portal
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)', margin: 0 }}>
                End-to-End Encrypted Session Authentication
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--m3-outline-variant)',
              color: 'var(--m3-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon icon="lucide:x" width="20" height="20" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(140, 29, 24, 0.3)',
              border: '1px solid var(--m3-error)',
              color: 'var(--m3-error)',
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '18px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Icon icon="solar:danger-triangle-bold-duotone" width="20" height="20" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Verified State Screen */}
        {roomVerified ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                backgroundColor: 'rgba(37, 211, 102, 0.1)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                padding: '20px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(37, 211, 102, 0.2)',
                  color: '#25d366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon="solar:check-circle-bold-duotone" width="36" height="36" />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--m3-on-surface)', margin: 0 }}>
                Room Authentication Verified
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--m3-on-surface-variant)', margin: 0, lineHeight: 1.4 }}>
                Session credentials validated for Room: <strong style={{ color: 'var(--m3-primary)' }}>{passcode}</strong> as <strong style={{ color: 'var(--m3-primary)' }}>{nickname}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="m3-btn m3-btn-outlined"
                style={{ flex: 1, padding: '12px', justifyContent: 'center', fontSize: '0.88rem' }}
                onClick={() => setRoomVerified(false)}
              >
                <Icon icon="lucide:edit-3" width="18" height="18" />
                <span>Edit Credentials</span>
              </button>
              <button
                type="button"
                className="m3-btn m3-btn-filled"
                style={{
                  flex: 1,
                  padding: '12px',
                  justifyContent: 'center',
                  backgroundColor: 'var(--m3-primary)',
                  color: 'var(--m3-on-primary)',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                }}
                onClick={onNavigateChat}
              >
                <Icon icon="solar:login-2-bold-duotone" width="20" height="20" />
                <span>Enter Chatroom</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authentication Form */
          <form onSubmit={handleSecretJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* User Nickname Input */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                <Icon icon="solar:user-bold-duotone" width="16" height="16" style={{ color: 'var(--m3-primary)' }} />
                <span>User Nickname *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="m3-text-field"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. SecretAgent"
                  required
                  style={{ paddingLeft: '40px' }}
                />
                <Icon
                  icon="lucide:user"
                  width="18"
                  height="18"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--m3-on-surface-variant)' }}
                />
              </div>
            </div>

            {/* Room Passcode Input */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
                <Icon icon="solar:lock-keyhole-minimalistic-bold-duotone" width="16" height="16" style={{ color: 'var(--m3-primary)' }} />
                <span>Room Passcode *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasscodeText ? 'text' : 'password'}
                  className="m3-text-field"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (e.g. 1234)"
                  required
                  style={{ paddingLeft: '40px', paddingRight: '42px' }}
                />
                <Icon
                  icon="lucide:lock"
                  width="18"
                  height="18"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--m3-on-surface-variant)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasscodeText(!showPasscodeText)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--m3-on-surface-variant)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon icon={showPasscodeText ? 'lucide:eye-off' : 'lucide:eye'} width="18" height="18" />
                </button>
              </div>
            </div>

            {/* Preset Avatar Selection & File Upload */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '8px' }}>
                <Icon icon="solar:camera-minimalistic-bold-duotone" width="16" height="16" style={{ color: 'var(--m3-primary)' }} />
                <span>Select Avatar or Upload Image</span>
              </label>
              
              {/* Preset Avatars Row */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatarUrl && setAvatarUrl(preset.url)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '12px',
                      border: avatarUrl === preset.url ? '2px solid var(--m3-primary)' : '1px solid var(--m3-outline-variant)',
                      backgroundColor: avatarUrl === preset.url ? 'rgba(208, 188, 255, 0.12)' : 'var(--m3-surface-container-low)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--m3-on-surface-variant)' }}>{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom File Upload Button */}
              <input type="file" onChange={handleAvatarUpload} accept="image/*" id="secret-avatar-upload" style={{ display: 'none' }} />
              <label htmlFor="secret-avatar-upload" className="job-app-file-dropzone" style={{ minHeight: '42px', padding: '10px 14px' }}>
                <Icon icon="solar:cloud-upload-bold-duotone" width="20" height="20" />
                <span>{uploading ? 'Uploading Image...' : avatarUrl ? 'Change Custom Image' : 'Upload Custom Image'}</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={joining}
              className="m3-btn m3-btn-filled job-app-submit-btn"
              style={{ marginTop: '6px' }}
            >
              <Icon icon={joining ? "solar:restart-bold-duotone" : "solar:shield-check-bold-duotone"} width="22" height="22" className={joining ? "animate-spin" : ""} />
              <span>{joining ? 'Authenticating Passcode...' : 'Verify & Connect Room Space'}</span>
            </button>

            {/* Encrypted Session Tag */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.74rem',
                color: 'var(--m3-on-surface-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              <Icon icon="solar:shield-keyhole-bold-duotone" width="16" height="16" style={{ color: '#81c784' }} />
              <span>E2E Encrypted Passcode Session • Zero Trace Storage</span>
            </div>
          </form>
        )}
      </div>
    </AnimatedModal>
  );
}
