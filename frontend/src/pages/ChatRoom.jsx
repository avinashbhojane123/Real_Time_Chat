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

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState('');

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
        if (document.pictureInPictureEnabled && remoteVideoRef.current && document.pictureInPictureElement !== remoteVideoRef.current) {
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
    socketRef.current?.emit('sendMessage', { passcode, message: inputText });
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
          message: `[File Upload] ${res.data.fileName || file.name}`,
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
    <div style={{ padding: '15px' }}>
      <h2>Room Passcode: {passcode} | User: {nickname}</h2>
      <button onClick={() => { localStorage.clear(); navigate('/'); }}>Leave Room</button>

      <hr />

      {/* Video Call Controls & Window */}
      <div>
        <h3>Video Call Feature</h3>
        {callState === 'idle' && (
          <button onClick={startCall}>Start Video Call</button>
        )}
        {callState === 'calling' && (
          <div>
            <p>Calling {remoteUserName}...</p>
            <button onClick={endCall}>Cancel Call</button>
          </div>
        )}
        {callState === 'incoming' && (
          <div>
            <p>Incoming Call from {callerName}...</p>
            <button onClick={acceptCall}>Accept</button>
            <button onClick={declineCall}>Decline</button>
          </div>
        )}
        {callState === 'active' && (
          <div style={{ border: '2px solid black', padding: '10px', marginTop: '10px' }}>
            <h4>Active Call with {remoteUserName} {remoteIsPip ? '(Partner in PiP)' : ''}</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <h5>Remote Stream</h5>
                <video ref={remoteVideoCallback} autoPlay playsInline style={{ width: '300px', height: '200px', backgroundColor: 'black' }} />
              </div>
              <div>
                <h5>Local Stream</h5>
                <video ref={localVideoCallback} autoPlay playsInline muted style={{ width: '150px', height: '100px', backgroundColor: 'black' }} />
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button onClick={toggleMic}>{micMuted ? 'Unmute Mic' : 'Mute Mic'}</button>
              <button onClick={toggleCamera}>{cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}</button>
              <button onClick={togglePipMode}>{isPipMode ? 'Exit PiP Mode' : 'Enter PiP Mode'}</button>
              <button onClick={endCall} style={{ color: 'red' }}>End Call</button>
            </div>
          </div>
        )}
      </div>

      <hr />

      {/* Backend Instagram Viewer API Tester */}
      <div>
        <h3>Backend Instagram Media Viewer</h3>
        <form onSubmit={handleViewInstagram}>
          <input
            type="text"
            value={instaInputUrl}
            onChange={(e) => setInstaInputUrl(e.target.value)}
            placeholder="Paste Instagram Reel / Post / IGTV URL"
            style={{ width: '350px' }}
          />
          <button type="submit">View Instagram Media</button>
        </form>
        {instaLoading && <p>Loading Instagram stream URL from backend...</p>}
        {instaError && <p style={{ color: 'red' }}>Error: {instaError}</p>}
        {instaResult && (
          <div style={{ border: '1px solid gray', padding: '10px', marginTop: '10px' }}>
            <p><strong>Type:</strong> {instaResult.type} ({instaResult.mediaType})</p>
            {instaResult.shortcode && <p><strong>Shortcode:</strong> {instaResult.shortcode}</p>}
            {instaResult.embedUrl && (
              <div>
                <p><strong>Embed View Stream URL:</strong> {instaResult.embedUrl}</p>
                <iframe src={instaResult.embedUrl} width="320" height="440" title="Instagram Embed View" />
              </div>
            )}
          </div>
        )}
      </div>

      <hr />

      {/* Active Users */}
      <div>
        <h3>Active Room Members ({users.length})</h3>
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              {u.nickname} {u.nickname === nickname ? '(You)' : ''} - {u.isOnline ? 'Online' : 'Offline'}
            </li>
          ))}
        </ul>
      </div>

      <hr />

      {/* Chat Messages */}
      <div>
        <h3>Chat Messages</h3>
        <div style={{ height: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {messages.map((m, idx) => (
            <div key={m.id || idx}>
              <strong>{m.nickname}: </strong>
              <span>{m.message}</span>
              {m.fileUrl && (
                <div>
                  <a href={`${baseUrl.replace(/\/api\/?$/, '')}${m.fileUrl}`} target="_blank" rel="noreferrer">
                    View Attached File
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message..."
          />
          <button type="submit">Send</button>
        </form>

        <br />
        <div>
          <label>Attach File: </label>
          <input type="file" onChange={handleFileUpload} />
        </div>
      </div>
    </div>
  );
}
