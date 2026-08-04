import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function JoinRoom() {
  const navigate = useNavigate();

  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem('baseUrl') || 'https://backend-9i6w.onrender.com/api'
  );
  const [nickname, setNickname] = useState(localStorage.getItem('nickname') || '');
  const [passcode, setPasscode] = useState(localStorage.getItem('passcode') || '');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatarUrl') || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);
      if (res.data && res.data.fileUrl) {
        setAvatarUrl(res.data.fileUrl);
        localStorage.setItem('avatarUrl', res.data.fileUrl);
      }
    } catch (err) {
      setError('Avatar upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname.trim() || !passcode.trim()) {
      setError('Nickname and Passcode are required');
      return;
    }
    localStorage.setItem('baseUrl', baseUrl.trim());
    localStorage.setItem('nickname', nickname.trim());
    localStorage.setItem('passcode', passcode.trim());
    if (avatarUrl) localStorage.setItem('avatarUrl', avatarUrl);
    navigate('/chat');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 20%, #2b1f47 0%, var(--m3-background) 80%)',
      }}
    >
      <div
        className="m3-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '36px 32px',
          borderRadius: 'var(--m3-radius-xl)',
          backgroundColor: 'var(--m3-surface-container)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--m3-radius-xl)',
              backgroundColor: 'var(--m3-primary-container)',
              color: 'var(--m3-on-primary-container)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>forum</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>
            Real-Time Space
          </h1>
          <p style={{ color: 'var(--m3-on-surface-variant)', fontSize: '0.9rem', marginTop: '6px' }}>
            Material Design 3 Interactive Chat & Video Hub
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--m3-error-container)',
              color: 'var(--m3-on-error)',
              padding: '12px 16px',
              borderRadius: 'var(--m3-radius-m)',
              marginBottom: '20px',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-primary)', marginBottom: '6px' }}>
              Backend Server URL (Render / Local)
            </label>
            <input
              type="text"
              className="m3-text-field"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://backend-9i6w.onrender.com/api"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
              Your Nickname
            </label>
            <input
              type="text"
              className="m3-text-field"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Alex"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
              Room Passcode
            </label>
            <input
              type="text"
              className="m3-text-field"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="e.g. 1234"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--m3-on-surface)', marginBottom: '6px' }}>
              Profile Avatar (Optional)
            </label>
            <input
              type="file"
              onChange={handleAvatarUpload}
              accept="image/*"
              style={{ display: 'none' }}
              id="m3-avatar-input"
            />
            <label
              htmlFor="m3-avatar-input"
              className="m3-btn m3-btn-outlined"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span className="material-symbols-outlined">upload_file</span>
              {uploading ? 'Uploading Avatar...' : avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
            </label>
            {avatarUrl && (
              <p style={{ fontSize: '0.75rem', color: 'var(--m3-primary)', marginTop: '6px', textAlign: 'center' }}>
                ✓ Avatar Attached
              </p>
            )}
          </div>

          <button
            type="submit"
            className="m3-btn m3-btn-filled"
            style={{
              padding: '14px 24px',
              fontSize: '1rem',
              marginTop: '10px',
              boxShadow: 'var(--m3-elevation-2)',
            }}
          >
            <span className="material-symbols-outlined">login</span>
            Join Room Space
          </button>
        </form>
      </div>
    </div>
  );
}
