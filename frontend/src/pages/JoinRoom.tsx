
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { animate } from 'animejs';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://backend-9i6w.onrender.com/api';

export default function JoinRoom() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(localStorage.getItem('avatarUrl') || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      animate(cardRef.current, {
        opacity: [0, 1],
        scale: [0.88, 1],
        translateY: [30, 0],
        duration: 900,
        ease: 'outElastic(1, 0.75)'
      });
    }

    if (orb1Ref.current) {
      animate(orb1Ref.current, {
        translateX: [-35, 35],
        translateY: [-25, 25],
        scale: [1, 1.15],
        duration: 7000,
        loop: true,
        alternate: true,
        ease: 'easeInOutSine'
      });
    }

    if (orb2Ref.current) {
      animate(orb2Ref.current, {
        translateX: [35, -35],
        translateY: [30, -30],
        scale: [1, 1.2],
        duration: 8500,
        loop: true,
        alternate: true,
        ease: 'easeInOutSine'
      });
    }

    animate('.field, .brand, .avatar-selection-container, .neu-btn.join', {
      opacity: [0, 1],
      translateY: [15, 0],
      delay: (_el: Element, i: number) => 120 + i * 70,
      duration: 600,
      ease: 'outQuad'
    });
  }, []);

  useEffect(() => {
    if (avatar) {
      animate('.avatar-preview-img', {
        scale: [0.5, 1],
        opacity: [0, 1],
        rotate: ['-10deg', '0deg'],
        duration: 500,
        ease: 'outBack'
      });
    }
  }, [avatar]);

  // Extreme AnimeJS Mouse Parallax & Sparkles
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const container = document.getElementById('sparkle-trail-container');
    
    // Parallax tilt on glass card
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const cardX = clientX - (rect.left + rect.width / 2);
      const cardY = clientY - (rect.top + rect.height / 2);
      animate(cardRef.current, {
        rotateY: cardX * 0.03,
        rotateX: -cardY * 0.03,
        duration: 400,
        ease: 'outQuad'
      });
    }

    // Sparkle trail
    if (container && Math.random() < 0.35) {
      const spark = document.createElement('div');
      spark.innerText = ['✨', '💫', '⚡', '💖'][Math.floor(Math.random() * 4)];
      spark.style.position = 'absolute';
      spark.style.left = `${clientX}px`;
      spark.style.top = `${clientY}px`;
      spark.style.fontSize = `${Math.floor(10 + Math.random() * 12)}px`;
      spark.style.pointerEvents = 'none';
      spark.style.zIndex = '999';
      container.appendChild(spark);

      animate(spark, {
        translateY: [0, (Math.random() - 0.5) * 40 - 20],
        translateX: [0, (Math.random() - 0.5) * 40],
        scale: [0.6, 1.2, 0],
        opacity: [1, 0],
        duration: 800 + Math.random() * 400,
        ease: 'outQuad',
        onComplete: () => spark.remove()
      });
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      animate(cardRef.current, {
        rotateY: 0,
        rotateX: 0,
        duration: 600,
        ease: 'outBack'
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Avatar upload failed');
      setAvatar(data.fileUrl);
      localStorage.setItem('avatarUrl', data.fileUrl);
    } catch (err) {
      alert('Avatar upload failed');
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const joinRoom = async () => {
    if (!nickname.trim() || !passcode.trim()) {
      alert('Please enter nickname and passcode');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/rooms/join`,
        {
          nickname: nickname.trim(),
          passcode: passcode.trim(),
        },
      );

      const data = response.data;

      localStorage.setItem(
        'nickname',
        nickname.trim(),
      );

      localStorage.setItem(
        'passcode',
        passcode.trim(),
      );

      if (data.roomId) {
        localStorage.setItem(
          'roomId',
          data.roomId.toString(),
        );
      }

      navigate('/chat');
    } catch (error: any) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to join room',
      );
    } finally {
      setLoading(false);
    }
  };

  const baseUrl = API_URL.replace('/api', '');

  return (
    <div className="join-wrap" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div id="sparkle-trail-container" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />
      <div ref={orb1Ref} className="orb o1" />
      <div ref={orb2Ref} className="orb o2" />

      <div ref={cardRef} className="glass-card">
        <div className="brand">
          <div className="logo neu">PC</div>
          <h1>Passcode Chat</h1>
          <p>Enter a nickname and room passcode to continue</p>
        </div>

        {/* Avatar Uploader */}
        <div className="avatar-selection-container">
          <div className="avatar-preview-wrap">
            {avatar ? (
              <img
                src={avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : `${baseUrl}${avatar.startsWith('/') ? '' : '/'}${avatar}`}
                alt="Avatar"
                className="avatar-preview-img"
              />
            ) : (
              <div className="avatar-placeholder-preview">👤</div>
            )}
            {uploadingAvatar && (
              <div className="avatar-spinner-overlay">
                <span className="spinner" />
              </div>
            )}
          </div>
          <label className="avatar-upload-label">
            <span>Upload Profile Picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
              disabled={uploadingAvatar}
            />
          </label>
        </div>

        <div className="field">
          <label>Nickname</label>
          <input
            className="neu-in"
            type="text"
            placeholder="Enter Nickname "
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Room Passcode</label>
          <input
            className="neu-in"
            type="text"
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
        </div>

        <button className="neu-btn join" onClick={joinRoom} disabled={loading || uploadingAvatar}>
          {loading ? (
            <span className="spinner" />
          ) : (
            'Join Room'
          )}
        </button>

        <div className="hint">Tip: share the same passcode with friends to join instantly</div>
      </div>

      <style>{`
        .join-wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: radial-gradient(1200px 800px at 15% 10%, #9b8cff 0%, transparent 60%),
                      radial-gradient(1000px 700px at 85% 20%, #5ee7df 0%, transparent 55%),
                      linear-gradient(135deg, #1a1440 0%, #0f0b2a 100%);
          color: #e9ecff;
          font-family: Inter, system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          filter: blur(60px);
          opacity: 0.6;
          border-radius: 50%;
          z-index: 0;
        }
        .o1 { width: 320px; height: 320px; background: #7c4dff; top: -60px; left: -60px; }
        .o2 { width: 280px; height: 280px; background: #00e5ff; bottom: -40px; right: -40px; }
 
        .glass-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 32px;
          border-radius: 28px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        }
        .brand { text-align: center; margin-bottom: 24px; }
        .logo {
          width: 56px; height: 56px; margin: 0 auto 12px;
          display: grid; place-items: center;
          border-radius: 16px;
          font-weight: 800; color: #0f0b2a;
          background: #e6e9f5;
        }
        .brand h1 { margin: 0; font-size: 24px; letter-spacing: 0.3px; }
        .brand p { margin: 6px 0 0; font-size: 13px; opacity: 0.75; }

        /* Avatar styling */
        .avatar-selection-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
          gap: 8px;
        }
        .avatar-preview-wrap {
          position: relative;
          width: 84px;
          height: 84px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(0,0,0,0.25);
          box-shadow: inset 8px 8px 16px rgba(0,0,0,0.35), inset -8px -8px 16px rgba(255,255,255,0.05);
          display: grid;
          place-items: center;
          border: 2px solid rgba(255,255,255,0.2);
        }
        .avatar-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-placeholder-preview {
          font-size: 36px;
          opacity: 0.75;
          margin-top: -4px;
        }
        .avatar-upload-label {
          font-size: 12px;
          color: #5ee7df;
          cursor: pointer;
          font-weight: 600;
          text-decoration: underline;
          transition: opacity 0.2s;
        }
        .avatar-upload-label:hover {
          opacity: 0.85;
        }
        .avatar-spinner-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: grid;
          place-items: center;
        }
 
        .field { margin-bottom: 18px; }
        .field label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 8px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .neu-in {
          width: 100%;
          padding: 14px 18px;
          border-radius: 16px;
          border: none;
          outline: none;
          color: #e9ecff;
          background: rgba(0,0,0,0.25);
          box-shadow: inset 8px 8px 16px rgba(0,0,0,0.35), inset -8px -8px 16px rgba(255,255,255,0.05);
          transition: box-shadow 0.2s ease;
        }
        .neu-in:focus {
          box-shadow: inset 6px 6px 12px rgba(0,0,0,0.4), inset -6px -6px 12px rgba(255,255,255,0.08), 0 0 0 2px rgba(124,255,178,0.25);
        }
        .neu-in::placeholder { color: rgba(233,236,255,0.5); }
 
        .neu, .neu-btn {
          background: #e6e9f5;
          box-shadow: 8px 8px 16px rgba(0,0,0,0.35), -8px -8px 16px rgba(255,255,255,0.08);
        }
        .neu-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-weight: 700;
          color: #0f0b2a;
          margin-top: 6px;
          transition: transform 0.08s ease, opacity 0.2s;
        }
        .neu-btn:active { transform: translateY(1px); box-shadow: inset 6px 6px 12px rgba(0,0,0,0.25), inset -6px -6px 12px rgba(255,255,255,0.7); }
        .neu-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .join { margin-top: 8px; }
 
        .hint {
          text-align: center;
          font-size: 11px;
          opacity: 0.6;
          margin-top: 16px;
        }
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(15,11,42,0.2);
          border-top-color: #0f0b2a;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
