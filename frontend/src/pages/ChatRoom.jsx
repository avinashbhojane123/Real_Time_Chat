import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

export default function ChatRoom() {
  const navigate = useNavigate();

  const baseUrl = localStorage.getItem('baseUrl') || 'https://backend-9i6w.onrender.com/api';
  const nickname = localStorage.getItem('nickname') || '';
  const passcode = localStorage.getItem('passcode') || '';
  const avatarUrl = localStorage.getItem('avatarUrl') || '';

  // Tab State for Mobile/Responsive Views: 'chat' | 'members' | 'instagram'
  const [activeTab, setActiveTab] = useState('chat');
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState([]);

  // Instagram Viewer State
  const [instaInputUrl, setInstaInputUrl] = useState('');
  const [instaResult, setInstaResult] = useState(null);
  const [instaLoading, setInstaLoading] = useState(false);
  const [instaError, setInstaError] = useState('');

  // Call States
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [callerName, setCallerName] = useState('');
  const [remoteUserName, setRemoteUserName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isPipMode, setIsPipMode] = useState(false);
  const [remoteIsPip, setRemoteIsPip] = useState(false);

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatBottomRef = useRef(null);
  const callStateRef = useRef('idle');

  const updateCallState = (state) => {
    setCallState(state);
    callStateRef.current = state;
  };

  const cleanUpCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    updateCallState('idle');
    setMicMuted(false);
    setCameraOff(false);
    setIsPipMode(false);
    setRemoteIsPip(false);
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) peerConnectionRef.current.close();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtcCandidate', { passcode, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams[0]) setRemoteStream(e.streams[0]);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [passcode]);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket setup
  useEffect(() => {
    if (!nickname || !passcode) {
      navigate('/');
      return;
    }

    const socketUrl = baseUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { passcode, nickname, avatarUrl });
    });

    socket.on('usersList', (userList) => {
      setUsers(userList || []);
    });

    socket.on('chatHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('messageHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('newMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('userCalling', ({ callerName: cName }) => {
      setCallerName(cName);
      setRemoteUserName(cName);
      updateCallState('incoming');
    });

    socket.on('callAccepted', ({ receiverName: rName }) => {
      if (callStateRef.current === 'calling') {
        setRemoteUserName(rName);
        updateCallState('active');
        const pc = createPeerConnection();
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => socket.emit('webrtcOffer', { passcode, offer: pc.localDescription }))
          .catch(console.error);
      }
    });

    socket.on('callDeclined', () => {
      alert('Call was declined');
      cleanUpCall();
    });

    socket.on('webrtcOfferRelay', ({ offer }) => {
      if (callStateRef.current === 'active') {
        const pc = createPeerConnection();
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => socket.emit('webrtcAnswer', { passcode, answer: pc.localDescription }))
          .catch(console.error);
      }
    });

    socket.on('webrtcAnswerRelay', ({ answer }) => {
      if (callStateRef.current === 'active' && peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.error);
      }
    });

    socket.on('webrtcCandidateRelay', ({ candidate }) => {
      if (callStateRef.current === 'active' && peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    });

    socket.on('callEnded', () => {
      alert('Call ended');
      cleanUpCall();
    });

    socket.on('pipStateChanged', ({ nickname: n, isPip }) => {
      if (n !== nickname) {
        setRemoteIsPip(isPip);
      }
    });

    socket.on('exception', (err) => {
      console.error('Socket validation error:', err);
      if (err?.message) alert('Socket error: ' + err.message);
    });

    return () => {
      socket.disconnect();
      cleanUpCall();
    };
  }, [baseUrl, nickname, passcode, avatarUrl, navigate, cleanUpCall, createPeerConnection]);

  // Video refs
  const localVideoCallback = useCallback((el) => {
    if (el && localStream) el.srcObject = localStream;
  }, [localStream]);

  const remoteVideoCallback = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStream) el.srcObject = remoteStream;
  }, [remoteStream]);

  // Call Handlers
  const startCall = async () => {
    const target = users.find((u) => u.nickname !== nickname) || users[0];
    if (!target) {
      alert('No other users in room');
      return;
    }
    setRemoteUserName(target.nickname);
    updateCallState('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current?.emit('callUser', { passcode, callerName: nickname });
    } catch {
      alert('Camera & microphone permissions required');
      cleanUpCall();
    }
  };

  const acceptCall = async () => {
    updateCallState('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      socketRef.current?.emit('acceptCall', { passcode, receiverName: nickname });
    } catch {
      alert('Camera & microphone permissions required');
      socketRef.current?.emit('declineCall', { passcode, receiverName: nickname });
      cleanUpCall();
    }
  };

  const declineCall = () => {
    socketRef.current?.emit('declineCall', { passcode, receiverName: nickname });
    cleanUpCall();
  };

  const endCall = () => {
    socketRef.current?.emit('endCall', { passcode });
    cleanUpCall();
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicMuted(!track.enabled);
    }
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOff(!track.enabled);
    }
  };

  const togglePipMode = async () => {
    const nextPip = !isPipMode;
    setIsPipMode(nextPip);
    socketRef.current?.emit('togglePip', { passcode, isPip: nextPip });

    try {
      if (nextPip) {
        if (
          document.pictureInPictureEnabled &&
          remoteVideoRef.current &&
          remoteVideoRef.current.readyState >= 1 &&
          document.pictureInPictureElement !== remoteVideoRef.current
        ) {
          await remoteVideoRef.current.requestPictureInPicture();
        }
      } else {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      }
    } catch (err) {
      console.log('Native PiP fallback to floating layout', err);
    }
  };

  // Messaging & File Upload
  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socketRef.current?.emit('sendMessage', { passcode, nickname, message: inputText });
    setInputText('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.post(`${cleanApiUrl}/upload`, formData);
      if (res.data && res.data.fileUrl) {
        socketRef.current?.emit('sendMessage', {
          passcode,
          nickname,
          message: `[File Attachment] ${res.data.fileName || file.name}`,
          fileUrl: res.data.fileUrl,
        });
      }
    } catch (err) {
      alert('File upload failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Instagram Viewer API Call
  const handleViewInstagram = async (e) => {
    e.preventDefault();
    if (!instaInputUrl.trim()) return;
    setInstaLoading(true);
    setInstaError('');
    setInstaResult(null);

    try {
      const cleanApiUrl = baseUrl.replace(/\/+$/, '');
      const res = await axios.get(`${cleanApiUrl}/upload/instagram/view`, {
        params: { url: instaInputUrl.trim() },
      });
      setInstaResult(res.data);
    } catch (err) {
      setInstaError(err.response?.data?.message || err.message || 'Failed to view Instagram media');
    } finally {
      setInstaLoading(false);
    }
  };

  return (
    <div className="m3-app-container">
      {/* M3 Top App Bar */}
      <header className="m3-top-app-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="m3-btn m3-btn-icon m3-btn-outlined"
            onClick={() => setSideDrawerOpen(!sideDrawerOpen)}
            title="Toggle Members Side Sheet"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--m3-on-surface)' }}>
              Space #{passcode}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)' }}>
              Signed in as <strong>{nickname}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {callState === 'idle' && (
            <button className="m3-btn m3-btn-filled" onClick={startCall}>
              <span className="material-symbols-outlined">videocam</span>
              <span className="m3-btn-label">Call</span>
            </button>
          )}
          <button
            className="m3-btn m3-btn-tonal"
            onClick={() => {
              localStorage.clear();
              navigate('/');
            }}
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="m3-content-layout">
        {/* M3 Side Sheet Drawer (Members List) */}
        <aside className={`m3-side-sheet ${sideDrawerOpen ? 'open' : ''}`}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--m3-outline-variant)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--m3-primary)' }}>
              Active Space Members ({users.length})
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--m3-radius-m)',
                  backgroundColor: u.nickname === nickname ? 'var(--m3-primary-container)' : 'var(--m3-surface-container-high)',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--m3-radius-full)',
                    backgroundColor: 'var(--m3-secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {u.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.nickname} {u.nickname === nickname ? '(You)' : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: u.isOnline ? '#81c784' : 'var(--m3-outline)' }}>
                    {u.isOnline ? 'Active Now' : 'Offline'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Dynamic View Sections based on Active Tab */}
        <main className="m3-main-chat">
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, idx) => {
                  const isSelf = m.nickname === nickname;
                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--m3-on-surface-variant)', marginBottom: '2px', paddingLeft: '4px' }}>
                        {m.nickname}
                      </div>
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: isSelf ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          backgroundColor: isSelf ? 'var(--m3-primary-container)' : 'var(--m3-surface-container-high)',
                          color: isSelf ? 'var(--m3-on-primary-container)' : 'var(--m3-on-surface)',
                          boxShadow: 'var(--m3-elevation-1)',
                        }}
                      >
                        <p style={{ margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
                        {m.fileUrl && (
                          <div style={{ marginTop: '8px' }}>
                            <a
                              href={`${baseUrl.replace(/\/api\/?$/, '')}${m.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="m3-btn m3-btn-outlined"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              <span className="material-symbols-outlined">attachment</span>
                              Attachment
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div style={{ padding: '16px 20px', backgroundColor: 'var(--m3-surface-container)', borderTop: '1px solid var(--m3-outline-variant)' }}>
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label className="m3-btn m3-btn-icon m3-btn-tonal" style={{ cursor: 'pointer', flexShrink: 0 }}>
                    <span className="material-symbols-outlined">attach_file</span>
                    <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>

                  <input
                    type="text"
                    className="m3-text-field"
                    style={{ borderRadius: 'var(--m3-radius-full)' }}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                  />

                  <button type="submit" className="m3-btn m3-btn-filled m3-btn-icon" style={{ flexShrink: 0 }}>
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'instagram' && (
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div className="m3-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--m3-primary)', marginBottom: '12px' }}>
                  📸 Instagram Stream Viewer (Backend API)
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--m3-on-surface-variant)', marginBottom: '20px' }}>
                  Enter any public Instagram Reel, Post, IGTV, or Profile link to view live stream without downloading files.
                </p>

                <form onSubmit={handleViewInstagram} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input
                    type="text"
                    className="m3-text-field"
                    value={instaInputUrl}
                    onChange={(e) => setInstaInputUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                  />
                  <button type="submit" className="m3-btn m3-btn-filled">
                    View
                  </button>
                </form>

                {instaLoading && <p style={{ color: 'var(--m3-primary)' }}>Resolving stream from NestJS backend API...</p>}
                {instaError && <p style={{ color: 'var(--m3-error)' }}>Error: {instaError}</p>}

                {instaResult && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--m3-outline-variant)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span><strong>Type:</strong> {instaResult.type}</span>
                      <span><strong>Shortcode:</strong> {instaResult.shortcode || 'N/A'}</span>
                    </div>

                    {instaResult.embedUrl && (
                      <div style={{ borderRadius: 'var(--m3-radius-m)', overflow: 'hidden', border: '1px solid var(--m3-outline)' }}>
                        <iframe
                          src={instaResult.embedUrl}
                          width="100%"
                          height="480"
                          title="Instagram Stream Embed"
                          style={{ border: 'none' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div className="m3-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--m3-primary)', marginBottom: '16px' }}>
                  Space Members ({users.length})
                </h3>
                {users.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: 'var(--m3-radius-m)',
                      backgroundColor: 'var(--m3-surface-container-high)',
                      marginBottom: '8px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: u.isOnline ? '#81c784' : 'var(--m3-outline)' }}>
                      account_circle
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong>{u.nickname}</strong> {u.nickname === nickname ? '(You)' : ''}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: u.isOnline ? '#81c784' : 'var(--m3-outline)' }}>
                      {u.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Video Call Overlay Dialog / Floating PiP Window */}
      {callState !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            zIndex: isPipMode ? 2500 : 1500,
            ...(isPipMode
              ? { bottom: '80px', right: '20px', width: '320px', height: '240px' }
              : { top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
          }}
        >
          <div
            className="m3-card"
            style={{
              width: isPipMode ? '100%' : 'min(90vw, 720px)',
              height: isPipMode ? '100%' : 'min(80vh, 520px)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--m3-surface-container-lowest)',
              borderRadius: 'var(--m3-radius-xl)',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            {callState === 'calling' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--m3-primary)', marginBottom: '16px' }}>call</span>
                <h4>Calling {remoteUserName}...</h4>
                <p style={{ color: 'var(--m3-on-surface-variant)', marginBottom: '24px' }}>Waiting for response</p>
                <button className="m3-btn m3-btn-danger" onClick={endCall}>
                  Cancel Call
                </button>
              </div>
            )}

            {callState === 'incoming' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--m3-tertiary)', marginBottom: '16px' }}>ring_volume</span>
                <h4>{callerName} is calling you</h4>
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                  <button className="m3-btn m3-btn-filled" style={{ backgroundColor: '#81c784', color: '#000' }} onClick={acceptCall}>
                    Accept
                  </button>
                  <button className="m3-btn m3-btn-danger" onClick={declineCall}>
                    Decline
                  </button>
                </div>
              </div>
            )}

            {callState === 'active' && (
              <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
                {/* Remote Stream Video */}
                <video
                  ref={remoteVideoCallback}
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Local Stream PIP Preview */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: isPipMode ? '80px' : '130px',
                    height: isPipMode ? '60px' : '95px',
                    borderRadius: 'var(--m3-radius-m)',
                    overflow: 'hidden',
                    border: '2px solid var(--m3-primary)',
                    backgroundColor: '#111',
                  }}
                >
                  <video
                    ref={localVideoCallback}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Call Action Controls Bar */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '12px',
                    backgroundColor: 'rgba(33, 31, 38, 0.85)',
                    padding: '8px 16px',
                    borderRadius: 'var(--m3-radius-full)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <button className={`m3-btn m3-btn-icon ${micMuted ? 'm3-btn-danger' : 'm3-btn-tonal'}`} onClick={toggleMic}>
                    <span className="material-symbols-outlined">{micMuted ? 'mic_off' : 'mic'}</span>
                  </button>
                  <button className={`m3-btn m3-btn-icon ${cameraOff ? 'm3-btn-danger' : 'm3-btn-tonal'}`} onClick={toggleCamera}>
                    <span className="material-symbols-outlined">{cameraOff ? 'videocam_off' : 'videocam'}</span>
                  </button>
                  <button className={`m3-btn m3-btn-icon ${isPipMode ? 'm3-btn-filled' : 'm3-btn-tonal'}`} onClick={togglePipMode}>
                    <span className="material-symbols-outlined">{isPipMode ? 'fullscreen' : 'picture_in_picture_alt'}</span>
                  </button>
                  <button className="m3-btn m3-btn-icon m3-btn-danger" onClick={endCall}>
                    <span className="material-symbols-outlined">call_end</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* M3 Mobile Bottom Navigation Bar */}
      <nav className="m3-bottom-nav">
        <button
          className={`m3-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="material-symbols-outlined">chat</span>
          <span>Chat</span>
        </button>
        <button
          className={`m3-nav-item ${activeTab === 'instagram' ? 'active' : ''}`}
          onClick={() => setActiveTab('instagram')}
        >
          <span className="material-symbols-outlined">photo_camera</span>
          <span>Instagram</span>
        </button>
        <button
          className={`m3-nav-item ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <span className="material-symbols-outlined">groups</span>
          <span>Members</span>
        </button>
      </nav>
    </div>
  );
}
