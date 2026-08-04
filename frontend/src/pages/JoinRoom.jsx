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
    <div style={{ padding: '20px' }}>
      <h1>Join Chat Space</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleJoin}>
        <div>
          <label>Backend API Render / Local Server URL:</label><br />
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            style={{ width: '100%', maxWidth: '400px' }}
            required
          />
        </div>
        <br />
        <div>
          <label>Nickname:</label><br />
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname"
            required
          />
        </div>
        <br />
        <div>
          <label>Room Passcode:</label><br />
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter room passcode"
            required
          />
        </div>
        <br />
        <div>
          <label>Avatar Upload (Optional):</label><br />
          <input type="file" onChange={handleAvatarUpload} accept="image/*" />
          {uploading && <span> Uploading...</span>}
          {avatarUrl && (
            <div>
              <p>Uploaded Avatar: {avatarUrl}</p>
            </div>
          )}
        </div>
        <br />
        <button type="submit">Join Room</button>
      </form>
    </div>
  );
}
