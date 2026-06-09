import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SOCKET_URL = 'https://backend-9i6w.onrender.com';

interface Message {
  id?: number;
  nickname: string;
  message: string;
  createdAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;

  replyTo?: {
    id?: number;
    nickname: string;
    message: string;
  };
}

interface User {
  id: number;
  nickname: string;
  isOnline: boolean;
  lastSeen?: string;

  deviceType?: string;
  deviceModel?: string;
  browser?: string;
  os?: string;
}

// Helper function to extract user device metadata without heavy libraries
const getDeviceMetadata = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceType = 'Desktop';

  // Simple Browser Detection
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Trident')) browser = 'Internet Explorer';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  // Simple OS Detection
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobileos'; }
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceType,
    deviceModel: deviceType === 'Mobileos' ? 'Mobile Device' : 'PC/Laptop',
    browser,
    os,
  };
};

function ChatRoom() {
  const navigate = useNavigate();

  const nickname = localStorage.getItem('nickname') || '';
  const passcode = localStorage.getItem('passcode') || '';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUser, setTypingUser] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${SOCKET_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploaded = await response.json();

      socketRef.current?.emit('sendMessage', {
        nickname,
        passcode,
        message: '',
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileType: uploaded.fileType,
        fileSize: uploaded.fileSize,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              nickname: replyTo.nickname,
              message: replyTo.message,
            }
          : null,
      });
      
      setReplyTo(null);
      e.target.value = ''; // Reset input selection
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  useEffect(() => {
    if (!nickname || !passcode) {
      navigate('/');
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected:', socket.id);
      
      const deviceInfo = getDeviceMetadata();
      socket.emit('joinRoom', { 
        nickname, 
        passcode,
        ...deviceInfo
      });
      
      socket.emit('getUsers', { passcode });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket Error:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });

    // socket.on('chatHistory', (data: Message[]) => {
    //   setMessages(data || []);
    // });

        socket.on('chatHistory', (data: Message[]) => {
  console.log(
    'History received:',
    data.length,
  );

  setMessages(data || []);
});

    socket.on('newMessage', (data: Message) => {
          // i have add this
           console.log('New message:', data.id);
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg.id === data.id ||
            (msg.nickname === data.nickname &&
              msg.message === data.message &&
              msg.createdAt === data.createdAt),
        );

        if (exists) return prev;
        return [...prev, data];
      });
    });

    socket.on('usersList', (data: User[]) => {
      console.log('Users List:', data);
      setUsers(data || []);
    });

    socket.on('userOnline', ({ nickname }) => {
      setUsers((prev) =>
        prev.map((user) =>
          user.nickname === nickname
            ? { ...user, isOnline: true, lastSeen: undefined }
            : user,
        ),
      );
    });

    socket.on('userOffline', ({ nickname, lastSeen }) => {
      setUsers((prev) =>
        prev.map((user) =>
          user.nickname === nickname
            ? { ...user, isOnline: false, lastSeen }
            : user,
        ),
      );
    });

    socket.on('userJoined', ({ nickname }) => {
      setMessages((prev) => [
        ...prev,
        {
          nickname: 'System',
          message: `${nickname} joined`,
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    socket.on('userLeft', ({ nickname }) => {
      setMessages((prev) => [
        ...prev,
        {
          nickname: 'System',
          message: `${nickname} left`,
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    socket.on('userTyping', (data: { nickname: string }) => {
      if (data.nickname === nickname) return;
      setTypingUser(data.nickname);
    });

    socket.on('userStoppedTyping', (data: { nickname: string }) => {
      if (data.nickname === nickname) return;
      setTypingUser('');
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [nickname, passcode, navigate]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (value: string) => {
    setMessage(value);

    socketRef.current?.emit('typing', {
      nickname,
      passcode,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', {
        nickname,
        passcode,
      });
    }, 1500);
  };

  const sendMessage = () => {
    const text = message.trim();
    if (!text || !socketRef.current?.connected) {
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current?.emit('stopTyping', {
      nickname,
      passcode,
    });

    socketRef.current?.emit('sendMessage', {
      nickname,
      passcode,
      message: text,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            nickname: replyTo.nickname,
            message: replyTo.message,
          }
        : null,
    });

    setMessage('');
    setReplyTo(null);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* USERS */}
      <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
        <h3>Users</h3>
        {users.map((user) => (
          <div key={user.id}>
            <strong>{user.nickname}</strong> -{' '}
            {user.isOnline ? '🟢 Online' : '🔴 Offline'}
            <br />
            Device: {user.deviceModel || user.deviceType || 'Unknown'}
            <br />
            OS: {user.os || 'Unknown'}
            <br />
            Browser: {user.browser || 'Unknown'}
            <hr />
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div
        ref={chatRef}
        style={{
          border: '1px solid #ccc',
          height: 400,
          overflowY: 'auto',
          padding: 10,
          marginBottom: 10,
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={msg.id || `${msg.nickname}-${msg.createdAt}-${index}`}
            onClick={() => setReplyTo(msg)}
            style={{ cursor: 'pointer', marginBottom: 12 }}
          >
            {msg.replyTo && (
              <div
                style={{
                  borderLeft: '3px solid gray',
                  paddingLeft: 8,
                  marginBottom: 4,
                  fontSize: 12,
                  opacity: 0.8,
                }}
              >
                <strong>{msg.replyTo.nickname}</strong>
                <br />
                {msg.replyTo.message}
              </div>
            )}
            <div>
              <strong>{msg.nickname}</strong>
              {msg.nickname === nickname && ' (You)'}
              <br />

              {msg.message && (
                <div style={{ marginBottom: 5 }}>
                  {msg.message}
                </div>
              )}

              {msg.fileUrl && (
                <div style={{ marginTop: 5 }}>
                  {/* IMAGE */}
                  {msg.fileType?.startsWith('image/') && (
                    <img
                      src={`${SOCKET_URL}${msg.fileUrl}`}
                      alt={msg.fileName}
                      style={{
                        maxWidth: 300,
                        maxHeight: 300,
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  )}

                  {/* VIDEO */}
                  {msg.fileType?.startsWith('video/') && (
                    <video
                      controls
                      style={{
                        maxWidth: 350,
                        borderRadius: 8,
                      }}
                    >
                      <source
                        src={`${SOCKET_URL}${msg.fileUrl}`}
                        type={msg.fileType}
                      />
                    </video>
                  )}

                  {/* AUDIO */}
                  {msg.fileType?.startsWith('audio/') && (
                    <audio controls>
                      <source
                        src={`${SOCKET_URL}${msg.fileUrl}`}
                        type={msg.fileType}
                      />
                    </audio>
                  )}

                  {/* PDF */}
                  {msg.fileType === 'application/pdf' && (
                    <iframe
                      src={`${SOCKET_URL}${msg.fileUrl}`}
                      title={msg.fileName}
                      width="100%"
                      height="500"
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: 8,
                      }}
                    />
                  )}

                  {/* TEXT FILES */}
                  {(msg.fileType === 'text/plain' ||
                    msg.fileType === 'application/json') && (
                    <a
                      href={`${SOCKET_URL}${msg.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📄 View {msg.fileName}
                    </a>
                  )}

                  {/* WORD */}
                  {(msg.fileType ===
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    msg.fileType === 'application/msword') && (
                    <a
                      href={`${SOCKET_URL}${msg.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📝 Open Word File ({msg.fileName})
                    </a>
                  )}

                  {/* EXCEL */}
                  {(msg.fileType ===
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    msg.fileType ===
                      'application/vnd.ms-excel') && (
                    <a
                      href={`${SOCKET_URL}${msg.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📊 Open Excel File ({msg.fileName})
                    </a>
                  )}

                  {/* POWERPOINT */}
                  {(msg.fileType ===
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                    msg.fileType ===
                      'application/vnd.ms-powerpoint') && (
                    <a
                      href={`${SOCKET_URL}${msg.fileUrl}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📽 Open PowerPoint ({msg.fileName})
                    </a>
                  )}

                  {/* ZIP */}
                  {(msg.fileType === 'application/zip' ||
                    msg.fileType ===
                      'application/x-zip-compressed') && (
                    <a
                      href={`${SOCKET_URL}${msg.fileUrl}`}
                      download
                    >
                      📦 Download ZIP ({msg.fileName})
                    </a>
                  )}

                  {/* FALLBACK */}
                  {!msg.fileType?.startsWith('image/') &&
                    !msg.fileType?.startsWith('video/') &&
                    !msg.fileType?.startsWith('audio/') &&
                    msg.fileType !== 'application/pdf' &&
                    msg.fileType !== 'text/plain' &&
                    msg.fileType !== 'application/json' &&
                    msg.fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
                    msg.fileType !== 'application/msword' &&
                    msg.fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
                    msg.fileType !== 'application/vnd.ms-excel' &&
                    msg.fileType !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation' &&
                    msg.fileType !== 'application/vnd.ms-powerpoint' &&
                    msg.fileType !== 'application/zip' &&
                    msg.fileType !== 'application/x-zip-compressed' && (
                      <div>
                        <a
                          href={`${SOCKET_URL}${msg.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          download
                        >
                          📎 {msg.fileName}
                        </a>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        <input type="file" onChange={handleFile} />
      </div>

      {replyTo && (
        <div
          style={{
            border: '1px solid #ccc',
            padding: 8,
            marginBottom: 10,
          }}
        >
          Replying to <strong>{replyTo.nickname}</strong>
          <br />
          {replyTo.message || (replyTo.fileUrl ? '📁 File attachment' : '')}
          <button onClick={() => setReplyTo(null)} style={{ marginLeft: 10 }}>
            X
          </button>
        </div>
      )}

      {typingUser && (
        <div
          style={{
            fontSize: 12,
            color: 'gray',
            marginBottom: 10,
          }}
        >
          {typingUser} is typing...
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={message}
          placeholder="Type message..."
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatRoom;

// import React, { useEffect, useRef, useState } from 'react';
// import { io, Socket } from 'socket.io-client';
// import { useNavigate } from 'react-router-dom';

// const SOCKET_URL = 'https://backend-9i6w.onrender.com';

// // ── Types ────────────────────────────────────────────────────────────────────

// interface Message {
//   id?: number;
//   nickname: string;
//   message: string;
//   createdAt?: string;
//   fileUrl?: string;
//   fileName?: string;
//   fileType?: string;
//   fileSize?: number;
//   replyTo?: {
//     id?: number;
//     nickname: string;
//     message: string;
//   };
// }

// interface User {
//   id: number;
//   nickname: string;
//   isOnline: boolean;
//   lastSeen?: string;
//   deviceType?: string;
//   deviceModel?: string;
//   browser?: string;
//   os?: string;
// }

// // ── Emoji data ────────────────────────────────────────────────────────────────

// const EMOJIS = {
//   Smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'.split(' '),
//   People: '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 💪 🦾 👶 👧 🧒 👦 👩 🧑 👨 👩‍🦱 🧑‍🦱 👨‍🦱 👩‍🦰 🧑‍🦰 👨‍🦰 👱‍♀️ 👱 👱‍♂️ 👩‍🦳 🧑‍🦳 👨‍🦳 👩‍🦲 🧑‍🦲 👨‍🦲 🧔‍♀️ 🧔 🧔‍♂️ 👵 🧓 👴 👲 🧕 👮‍♀️ 👮 👮‍♂️ 👷‍♀️ 👷 👷‍♂️ 💂‍♀️ 💂 💂‍♂️ 🕵️‍♀️ 🕵️ 🕵️‍♂️ 👩‍⚕️ 🧑‍⚕️ 👨‍⚕️ 👩‍🌾 🧑‍🌾 👨‍🌾 👩‍🍳 🧑‍🍳 👨‍🍳 👩‍🎓 🧑‍🎓 👨‍🎓 👩‍🎤 🧑‍🎤 👨‍🎤 👩‍🏫 🧑‍🏫 👨‍🏫 👩‍💻 🧑‍💻 👨‍💻 👩‍💼 🧑‍💼 👨‍💼 👩‍🔧 🧑‍🔧 👨‍🔧 👩‍🔬 🧑‍🔬 👨‍🔬 👩‍🎨 🧑‍🎨 👨‍🎨 👩‍🚒 🧑‍🚒 👨‍🚒 👩‍✈️ 🧑‍✈️ 👨‍✈️ 👩‍🚀 🧑‍🚀 👨‍🚀 👩‍⚖️ 🧑‍⚖️ 👨‍⚖️ 👸 🤴 🥷 🦸‍♀️ 🦸 🦸‍♂️ 🦹‍♀️ 🦹 🦹‍♂️ 🤶 🎅 🧙‍♀️ 🧙 🧙‍♂️ 🧝‍♀️ 🧝 🧝‍♂️ 🤰 🫄 🫃 🤱'.split(' '),
//   Animals: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷 🕸 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿 🦔'.split(' '),
//   Food: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾'.split(' '),
//   Activities: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸ 🥌 🎿 ⛷ 🏂 🪂 🏋️‍♀️ 🏋️ 🏋️‍♂️ 🤼‍♀️ 🤼 🤼‍♂️ 🤸‍♀️ 🤸 🤸‍♂️ ⛹️‍♀️ ⛹️ ⛹️‍♂️ 🤺 🤾‍♀️ 🤾 🤾‍♂️ 🏌️‍♀️ 🏌️ 🏌️‍♂️ 🏇 🧘‍♀️ 🧘 🧘‍♂️ 🏄‍♀️ 🏄 🏄‍♂️ 🏊‍♀️ 🏊 🏊‍♂️ 🤽‍♀️ 🤽 🤽‍♂️ 🚣‍♀️ 🚣 🚣‍♂️ 🧗‍♀️ 🧗 🧗‍♂️ 🚵‍♀️ 🚵 🚵‍♂️ 🚴‍♀️ 🚴 🚴‍♂️ 🏆 🥇 🥈 🥉 🏅 🎖 🏵 🎗 🎫 🎟 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟ 🎯 🎳 🎮 🎰 🧩'.split(' '),
//   Travel: '🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛴 🚲 🛵 🏍 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩 💺 🛰 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥 🛳 ⛴ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🚏 🗺 🗿 🗽 🗼 🏰 🏯 🏟 🎡 🎢 🎠 ⛲ ⛱ 🏖 🏝 🏜 🌋 ⛰ 🏔 🗻 🏕 ⛺ 🏠 🏡 🏘 🏗 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛 ⛪ 🕌 🕍 🛕 🕋 ⛩ 🛤 🛣'.split(' '),
//   Objects: '⌚ 📱 💻 ⌨️ 🖥 🖨 🖱 🖲 🕹 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽 📞 ☎️ 📟 📠 📺 📻 🎙 🎚 🎛 🧭 ⏱ ⏲ ⏰ 🕰 ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯 🧯 🛢 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒ 🛠 ⛏ 🪚 🔩 ⚙️ 🧱 ⛓ 🧲 🔫 💣 🧨 🪓 🔪 🗡 ⚔️ 🛡 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎 🔑 🗝 🚪 🪑 🛋 🛏 🛌 🧸 🪆 🖼 🪞 🪟 🛍 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🪩 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📦 🏷 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒 🗓 📆 📅 🗑 📇 🗃 🗳 🗄 📋 📁 📂 🗂 🗞 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇 📐 📏 🧮 📌 📍 ✂️ 🖊 🖋 ✒️ 🖌 🖍 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓'.split(' '),
//   Symbols: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉 ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸ ⏯ ⏹ ⏺ ⏭ ⏮ ⏩ ⏪ 🔀 🔁 🔂 ▶️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫'.split(' '),
//   Flags: '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇮🇳 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇩🇪 🇫🇷 🇯🇵 🇰🇷 🇨🇳 🇧🇷 🇲🇽 🇮🇹 🇪🇸 🇷🇺 🇺🇦 🇹🇷 🇸🇦 🇦🇪'.split(' '),
// };

// // ── Helpers ───────────────────────────────────────────────────────────────────

// const getDeviceMetadata = () => {
//   const ua = navigator.userAgent;
//   let browser = 'Unknown Browser';
//   let os = 'Unknown OS';
//   let deviceType = 'Desktop';

//   if (ua.includes('Firefox')) browser = 'Firefox';
//   else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
//   else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
//   else if (ua.includes('Trident')) browser = 'Internet Explorer';
//   else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
//   else if (ua.includes('Chrome')) browser = 'Chrome';
//   else if (ua.includes('Safari')) browser = 'Safari';

//   if (ua.includes('Windows')) os = 'Windows';
//   else if (ua.includes('Macintosh')) os = 'macOS';
//   else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
//   else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
//   else if (ua.includes('Linux')) os = 'Linux';

//   return {
//     deviceType,
//     deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop',
//     browser,
//     os,
//   };
// };

// const fmt = (d?: string) =>
//   d
//     ? new Date(d).toLocaleString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//       })
//     : '';

// const avatarColor = (name: string): [string, string] => {
//   const palette: [string, string][] = [
//     ['#e8d5ff', '#6c3ac7'],
//     ['#cff3e9', '#1d7a5e'],
//     ['#ffd6cc', '#c44d22'],
//     ['#d0e8ff', '#1a5fa0'],
//     ['#ffeacc', '#a0650a'],
//     ['#ffd6ec', '#a02060'],
//   ];
//   const idx = (name.charCodeAt(0) || 0) % palette.length;
//   return palette[idx];
// };

// const formatFileSize = (bytes?: number) => {
//   if (!bytes) return '';
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
//   return `${(bytes / 1048576).toFixed(1)} MB`;
// };

// // ── Component ─────────────────────────────────────────────────────────────────

// export default function ChatRoom() {
//   const navigate = useNavigate();

//   const nickname = localStorage.getItem('nickname') || '';
//   const passcode = localStorage.getItem('passcode') || '';

//   const [message, setMessage] = useState('');
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [users, setUsers] = useState<User[]>([]);
//   const [replyTo, setReplyTo] = useState<Message | null>(null);
//   const [typingUser, setTypingUser] = useState('');
//   const [showEmoji, setShowEmoji] = useState(false);
//   const [emojiTab, setEmojiTab] = useState<keyof typeof EMOJIS>('Smileys');
//   const [emojiSearch, setEmojiSearch] = useState('');

//   const socketRef = useRef<Socket | null>(null);
//   const chatRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
//   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // ── Socket setup ────────────────────────────────────────────────────────────

//   useEffect(() => {
//     if (!nickname || !passcode) {
//       navigate('/');
//       return;
//     }

//     const socket = io(SOCKET_URL, {
//       transports: ['websocket'],
//       reconnection: true,
//       reconnectionAttempts: Infinity,
//       reconnectionDelay: 1000,
//     });
//     socketRef.current = socket;

//     socket.on('connect', () => {
//       const deviceInfo = getDeviceMetadata();
//       socket.emit('joinRoom', { nickname, passcode, ...deviceInfo });
//       socket.emit('getUsers', { passcode });
//     });

//     socket.on('chatHistory', (data: Message[]) => setMessages(data || []));

//     socket.on('newMessage', (data: Message) => {
//       setMessages((prev) => {
//         const exists = prev.some(
//           (msg) =>
//             msg.id === data.id ||
//             (msg.nickname === data.nickname &&
//               msg.message === data.message &&
//               msg.createdAt === data.createdAt),
//         );
//         return exists ? prev : [...prev, data];
//       });
//     });

//     socket.on('usersList', (data: User[]) => setUsers(data || []));

//     socket.on('userOnline', ({ nickname: n }: { nickname: string }) => {
//       setUsers((prev) =>
//         prev.map((u) => (u.nickname === n ? { ...u, isOnline: true, lastSeen: undefined } : u)),
//       );
//     });

//     socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) => {
//       setUsers((prev) =>
//         prev.map((u) => (u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)),
//       );
//     });

//     socket.on('userJoined', ({ nickname: n }: { nickname: string }) => {
//       setMessages((prev) => [
//         ...prev,
//         { nickname: 'System', message: `${n} joined`, createdAt: new Date().toISOString() },
//       ]);
//     });

//     socket.on('userLeft', ({ nickname: n }: { nickname: string }) => {
//       setMessages((prev) => [
//         ...prev,
//         { nickname: 'System', message: `${n} left`, createdAt: new Date().toISOString() },
//       ]);
//     });

//     socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
//       if (n !== nickname) setTypingUser(n);
//     });

//     socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
//       if (n !== nickname) setTypingUser('');
//     });

//     return () => {
//       socket.removeAllListeners();
//       socket.disconnect();
//       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     };
//   }, [nickname, passcode, navigate]);

//   // Auto-scroll
//   useEffect(() => {
//     if (chatRef.current) {
//       chatRef.current.scrollTop = chatRef.current.scrollHeight;
//     }
//   }, [messages]);

//   // ── Handlers ─────────────────────────────────────────────────────────────────

//   const handleInputChange = (value: string) => {
//     setMessage(value);
//     socketRef.current?.emit('typing', { nickname, passcode });
//     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     typingTimeoutRef.current = setTimeout(() => {
//       socketRef.current?.emit('stopTyping', { nickname, passcode });
//     }, 1500);
//   };

//   const sendMessage = () => {
//     const text = message.trim();
//     if (!text || !socketRef.current?.connected) return;
//     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     socketRef.current?.emit('stopTyping', { nickname, passcode });
//     socketRef.current?.emit('sendMessage', {
//       nickname,
//       passcode,
//       message: text,
//       replyTo: replyTo
//         ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
//         : null,
//     });
//     setMessage('');
//     setReplyTo(null);
//     setShowEmoji(false);
//   };

//   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const formData = new FormData();
//     formData.append('file', file);
//     try {
//       const response = await fetch(`${SOCKET_URL}/api/upload`, {
//         method: 'POST',
//         body: formData,
//       });
//       const uploaded = await response.json();
//       socketRef.current?.emit('sendMessage', {
//         nickname,
//         passcode,
//         message: '',
//         fileUrl: uploaded.fileUrl,
//         fileName: uploaded.fileName,
//         fileType: uploaded.fileType,
//         fileSize: uploaded.fileSize,
//         replyTo: replyTo
//           ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
//           : null,
//       });
//       setReplyTo(null);
//       e.target.value = '';
//     } catch (err) {
//       console.error('File upload failed:', err);
//     }
//   };

//   const addEmoji = (e: string) => {
//     setMessage((m) => m + e);
//     inputRef.current?.focus();
//   };

//   const onlineCount = users.filter((u) => u.isOnline).length;

//   const filteredEmojis = emojiSearch
//     ? Object.values(EMOJIS).flat().filter((e) => e.includes(emojiSearch))
//     : EMOJIS[emojiTab];

//   // ── File renderer ────────────────────────────────────────────────────────────

//   const renderFile = (msg: Message) => {
//     if (!msg.fileUrl) return null;
//     const src = `${SOCKET_URL}${msg.fileUrl}`;
//     const { fileType, fileName, fileSize } = msg;

//     if (fileType?.startsWith('image/')) {
//       return (
//         <a href={src} target="_blank" rel="noreferrer">
//           <img src={src} alt={fileName} className="cr-file-img" />
//         </a>
//       );
//     }
//     if (fileType?.startsWith('video/')) {
//       return (
//         <video controls className="cr-file-video">
//           <source src={src} type={fileType} />
//         </video>
//       );
//     }
//     if (fileType?.startsWith('audio/')) {
//       return <audio controls src={src} className="cr-file-audio" />;
//     }
//     if (fileType === 'application/pdf') {
//       return (
//         <iframe src={src} title={fileName} className="cr-file-pdf" />
//       );
//     }

//     // Generic download link
//     const icon =
//       fileType?.includes('word') ? '📝' :
//       fileType?.includes('sheet') || fileType?.includes('excel') ? '📊' :
//       fileType?.includes('presentation') || fileType?.includes('powerpoint') ? '📽' :
//       fileType?.includes('zip') ? '📦' :
//       fileType === 'text/plain' || fileType === 'application/json' ? '📄' : '📎';

//     return (
//       <a href={src} target="_blank" rel="noreferrer" download className="cr-file-link">
//         <span className="cr-file-icon">{icon}</span>
//         <div className="cr-file-meta">
//           <span className="cr-file-name">{fileName}</span>
//           {fileSize && <span className="cr-file-size">{formatFileSize(fileSize)}</span>}
//         </div>
//       </a>
//     );
//   };

//   // ── Render ────────────────────────────────────────────────────────────────────

//   return (
//     <div className="cr-wrap">
//       {/* ── Sidebar ── */}
//       <aside className="cr-sidebar">
//         <div className="cr-sidebar-header">
//           <div
//             className="cr-my-avatar"
//             style={{ background: avatarColor(nickname)[0], color: avatarColor(nickname)[1] }}
//           >
//             {nickname.slice(0, 2).toUpperCase()}
//           </div>
//           <div>
//             <div className="cr-my-name">{nickname}</div>
//             <div className="cr-online-badge">
//               <span className="cr-dot-green" />
//               {onlineCount} online
//             </div>
//           </div>
//         </div>

//         <div className="cr-sidebar-label">Members</div>
//         <ul className="cr-user-list">
//           {users.map((u) => {
//             const [bg, fg] = avatarColor(u.nickname);
//             return (
//               <li key={u.id} className="cr-user-item">
//                 <div className="cr-user-avatar" style={{ background: bg, color: fg }}>
//                   {u.nickname.slice(0, 2).toUpperCase()}
//                   <span className={`cr-status-dot ${u.isOnline ? 'cr-status-on' : 'cr-status-off'}`} />
//                 </div>
//                 <div className="cr-user-info">
//                   <span className="cr-user-name">{u.nickname}</span>
//                   {!u.isOnline && u.lastSeen && (
//                     <span className="cr-user-lastseen">{fmt(u.lastSeen)}</span>
//                   )}
//                   {u.browser && u.os && (
//                     <span className="cr-user-device">{u.browser} · {u.os}</span>
//                   )}
//                 </div>
//               </li>
//             );
//           })}
//         </ul>
//       </aside>

//       {/* ── Main area ── */}
//       <div className="cr-main">
//         {/* Header */}
//         <header className="cr-header">
//           <div className="cr-header-icon">💬</div>
//           <div>
//             <div className="cr-header-title">Chat Room</div>
//             <div className="cr-header-sub">
//               {onlineCount} member{onlineCount !== 1 ? 's' : ''} online
//             </div>
//           </div>
//         </header>

//         {/* Messages */}
//         <div ref={chatRef} className="cr-messages">
//           {messages.map((msg, i) => {
//             const me = msg.nickname === nickname;
//             const sys = msg.nickname === 'System';

//             if (sys) {
//               return (
//                 <div key={msg.id ?? `sys-${i}`} className="cr-sys-msg">
//                   <span>{msg.message}</span>
//                 </div>
//               );
//             }

//             const [bg, fg] = avatarColor(msg.nickname);
//             return (
//               <div
//                 key={msg.id ?? `${msg.nickname}-${msg.createdAt}-${i}`}
//                 className={`cr-msg-row ${me ? 'cr-msg-me' : 'cr-msg-other'}`}
//                 onClick={() => setReplyTo(msg)}
//                 title="Click to reply"
//               >
//                 {!me && (
//                   <div className="cr-msg-avatar" style={{ background: bg, color: fg }}>
//                     {msg.nickname.slice(0, 2).toUpperCase()}
//                   </div>
//                 )}
//                 <div className="cr-msg-body">
//                   {!me && <div className="cr-msg-nick">{msg.nickname}</div>}

//                   {/* Reply preview */}
//                   {msg.replyTo && (
//                     <div className={`cr-reply-preview ${me ? 'cr-reply-me' : ''}`}>
//                       <span className="cr-reply-nick">{msg.replyTo.nickname}</span>
//                       <span className="cr-reply-text">
//                         {msg.replyTo.message || '📁 Attachment'}
//                       </span>
//                     </div>
//                   )}

//                   <div className={`cr-bubble ${me ? 'cr-bubble-me' : 'cr-bubble-other'}`}>
//                     {msg.message && <div className="cr-bubble-text">{msg.message}</div>}
//                     {renderFile(msg)}
//                   </div>

//                   {msg.createdAt && (
//                     <div className={`cr-msg-time ${me ? 'cr-time-me' : ''}`}>
//                       {fmt(msg.createdAt)}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })}

//           {typingUser && (
//             <div className="cr-typing-indicator">
//               <span className="cr-typing-dot" /><span className="cr-typing-dot" /><span className="cr-typing-dot" />
//               <span className="cr-typing-name">{typingUser} is typing…</span>
//             </div>
//           )}
//         </div>

//         {/* Reply bar */}
//         {replyTo && (
//           <div className="cr-reply-bar">
//             <div className="cr-reply-bar-content">
//               <span className="cr-reply-bar-label">Replying to</span>
//               <span className="cr-reply-bar-nick">{replyTo.nickname}</span>
//               <span className="cr-reply-bar-msg">
//                 {replyTo.message || (replyTo.fileUrl ? '📁 Attachment' : '')}
//               </span>
//             </div>
//             <button className="cr-reply-cancel" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
//               ✕
//             </button>
//           </div>
//         )}

//         {/* Composer */}
//         <footer className="cr-composer">
//           {/* Emoji button */}
//           <button
//             className="cr-icon-btn"
//             onClick={() => setShowEmoji((v) => !v)}
//             aria-label="Open emoji picker"
//             title="Emoji"
//           >
//             😊
//           </button>

//           {/* File attach button */}
//           <button
//             className="cr-icon-btn"
//             onClick={() => fileInputRef.current?.click()}
//             aria-label="Attach file"
//             title="Attach file"
//           >
//             📎
//           </button>
//           <input
//             ref={fileInputRef}
//             type="file"
//             onChange={handleFile}
//             style={{ display: 'none' }}
//           />

//           <input
//             ref={inputRef}
//             className="cr-input"
//             value={message}
//             onChange={(e) => handleInputChange(e.target.value)}
//             onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
//             placeholder="Type a message…"
//           />

//           <button className="cr-send-btn" onClick={sendMessage} aria-label="Send message">
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
//               <line x1="22" y1="2" x2="11" y2="13" />
//               <polygon points="22 2 15 22 11 13 2 9 22 2" />
//             </svg>
//           </button>

//           {/* Emoji picker */}
//           {showEmoji && (
//             <div className="cr-emoji-picker">
//               <div className="cr-emoji-header">
//                 <input
//                   className="cr-emoji-search"
//                   placeholder="Search emoji…"
//                   value={emojiSearch}
//                   onChange={(e) => setEmojiSearch(e.target.value)}
//                 />
//                 <button className="cr-emoji-close" onClick={() => setShowEmoji(false)}>✕</button>
//               </div>
//               {!emojiSearch && (
//                 <div className="cr-emoji-tabs">
//                   {(Object.keys(EMOJIS) as Array<keyof typeof EMOJIS>).map((k) => (
//                     <button
//                       key={k}
//                       className={`cr-emoji-tab ${emojiTab === k ? 'cr-emoji-tab-active' : ''}`}
//                       onClick={() => setEmojiTab(k)}
//                     >
//                       {k}
//                     </button>
//                   ))}
//                 </div>
//               )}
//               <div className="cr-emoji-grid">
//                 {filteredEmojis.map((e, idx) => (
//                   <button key={`${e}-${idx}`} className="cr-emoji-item" onClick={() => addEmoji(e)}>
//                     {e}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           )}
//         </footer>
//       </div>

//       {/* ── Styles ── */}
//       <style>{`
//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

//         .cr-wrap {
//           display: flex;
//           height: 100dvh;
//           width: 100%;
//           background: #0d0d1a;
//           font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
//           color: #e8eaf6;
//           overflow: hidden;
//         }

//         /* ── Sidebar ── */
//         .cr-sidebar {
//           width: 260px;
//           flex-shrink: 0;
//           display: flex;
//           flex-direction: column;
//           background: rgba(255,255,255,0.04);
//           border-right: 1px solid rgba(255,255,255,0.08);
//           overflow: hidden;
//         }
//         .cr-sidebar-header {
//           display: flex;
//           align-items: center;
//           gap: 12px;
//           padding: 20px 16px 18px;
//           border-bottom: 1px solid rgba(255,255,255,0.07);
//           background: rgba(255,255,255,0.03);
//         }
//         .cr-my-avatar {
//           width: 42px; height: 42px;
//           border-radius: 50%;
//           display: flex; align-items: center; justify-content: center;
//           font-size: 14px; font-weight: 700;
//           flex-shrink: 0; letter-spacing: 0.5px;
//         }
//         .cr-my-name {
//           font-size: 14px; font-weight: 600; color: #e8eaf6;
//           line-height: 1.3; max-width: 160px;
//           overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
//         }
//         .cr-online-badge {
//           display: flex; align-items: center; gap: 5px;
//           font-size: 12px; color: rgba(232,234,246,0.55); margin-top: 2px;
//         }
//         .cr-dot-green {
//           width: 7px; height: 7px; border-radius: 50%;
//           background: #4ade80; display: inline-block; flex-shrink: 0;
//         }
//         .cr-sidebar-label {
//           font-size: 11px; font-weight: 700; text-transform: uppercase;
//           letter-spacing: 1px; color: rgba(232,234,246,0.35);
//           padding: 16px 16px 8px;
//         }
//         .cr-user-list {
//           list-style: none; flex: 1; overflow-y: auto;
//           padding: 0 8px 12px;
//           scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
//         }
//         .cr-user-item {
//           display: flex; align-items: center; gap: 10px;
//           padding: 8px 10px; border-radius: 10px; margin-bottom: 2px;
//           transition: background 0.15s; cursor: default;
//         }
//         .cr-user-item:hover { background: rgba(255,255,255,0.05); }
//         .cr-user-avatar {
//           width: 34px; height: 34px; border-radius: 50%;
//           display: flex; align-items: center; justify-content: center;
//           font-size: 11px; font-weight: 700; flex-shrink: 0;
//           position: relative; letter-spacing: 0.4px;
//         }
//         .cr-status-dot {
//           position: absolute; bottom: 0; right: 0;
//           width: 9px; height: 9px; border-radius: 50%;
//           border: 2px solid #0d0d1a;
//         }
//         .cr-status-on { background: #4ade80; }
//         .cr-status-off { background: #6b7280; }
//         .cr-user-info { display: flex; flex-direction: column; min-width: 0; }
//         .cr-user-name {
//           font-size: 13px; font-weight: 500; color: #dde0f5;
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
//         }
//         .cr-user-lastseen { font-size: 10.5px; color: rgba(232,234,246,0.4); margin-top: 1px; }
//         .cr-user-device { font-size: 10px; color: rgba(232,234,246,0.28); margin-top: 1px; }

//         /* ── Main ── */
//         .cr-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

//         /* ── Header ── */
//         .cr-header {
//           display: flex; align-items: center; gap: 12px;
//           padding: 16px 20px;
//           background: rgba(255,255,255,0.03);
//           border-bottom: 1px solid rgba(255,255,255,0.07);
//           flex-shrink: 0;
//         }
//         .cr-header-icon { font-size: 22px; line-height: 1; }
//         .cr-header-title { font-size: 15px; font-weight: 700; color: #e8eaf6; letter-spacing: 0.2px; }
//         .cr-header-sub { font-size: 12px; color: rgba(232,234,246,0.5); margin-top: 1px; }

//         /* ── Messages ── */
//         .cr-messages {
//           flex: 1; overflow-y: auto;
//           padding: 20px 20px 12px;
//           display: flex; flex-direction: column; gap: 6px;
//           scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
//         }
//         .cr-sys-msg {
//           align-self: center; text-align: center;
//           padding: 5px 14px; border-radius: 20px;
//           background: rgba(255,255,255,0.06);
//           border: 1px solid rgba(255,255,255,0.1);
//           font-size: 11.5px; color: rgba(232,234,246,0.55);
//           margin: 4px 0; max-width: 80%;
//         }
//         .cr-msg-row {
//           display: flex; align-items: flex-end; gap: 8px;
//           max-width: 75%; cursor: pointer;
//         }
//         .cr-msg-row:hover .cr-bubble { opacity: 0.92; }
//         .cr-msg-me { align-self: flex-end; flex-direction: row-reverse; }
//         .cr-msg-other { align-self: flex-start; }
//         .cr-msg-avatar {
//           width: 30px; height: 30px; border-radius: 50%;
//           display: flex; align-items: center; justify-content: center;
//           font-size: 10px; font-weight: 700; flex-shrink: 0;
//           letter-spacing: 0.3px; margin-bottom: 2px;
//         }
//         .cr-msg-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
//         .cr-msg-nick { font-size: 11.5px; font-weight: 600; color: rgba(232,234,246,0.6); padding: 0 4px; }

//         /* Reply preview inside bubble */
//         .cr-reply-preview {
//           display: flex; flex-direction: column; gap: 1px;
//           padding: 5px 10px; border-radius: 10px;
//           background: rgba(255,255,255,0.07);
//           border-left: 3px solid rgba(108,79,216,0.6);
//           margin-bottom: 4px; max-width: 100%;
//         }
//         .cr-reply-me { border-left-color: rgba(255,255,255,0.4); }
//         .cr-reply-nick { font-size: 11px; font-weight: 700; color: #a78bfa; }
//         .cr-reply-text {
//           font-size: 11.5px; color: rgba(232,234,246,0.55);
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;
//         }

//         .cr-bubble {
//           padding: 10px 14px; border-radius: 18px;
//           font-size: 14px; line-height: 1.55;
//           word-break: break-word; max-width: 100%;
//           transition: opacity 0.15s;
//         }
//         .cr-bubble-me {
//           background: linear-gradient(135deg, #6c4fd8, #4f3ab5);
//           color: #fff; border-bottom-right-radius: 5px;
//           box-shadow: 0 2px 12px rgba(108,79,216,0.35);
//         }
//         .cr-bubble-other {
//           background: rgba(255,255,255,0.09); color: #e4e6f5;
//           border: 1px solid rgba(255,255,255,0.1); border-bottom-left-radius: 5px;
//         }
//         .cr-bubble-text { margin-bottom: 4px; }
//         .cr-bubble-text:last-child { margin-bottom: 0; }

//         .cr-msg-time { font-size: 10.5px; color: rgba(232,234,246,0.38); padding: 0 4px; }
//         .cr-time-me { text-align: right; }

//         /* File renderers */
//         .cr-file-img { max-width: 260px; max-height: 260px; border-radius: 10px; display: block; margin-top: 4px; }
//         .cr-file-video { max-width: 300px; border-radius: 10px; display: block; margin-top: 4px; }
//         .cr-file-audio { width: 100%; min-width: 220px; margin-top: 4px; }
//         .cr-file-pdf { width: 100%; height: 420px; border: none; border-radius: 8px; margin-top: 4px; }
//         .cr-file-link {
//           display: inline-flex; align-items: center; gap: 8px;
//           padding: 8px 12px; border-radius: 10px;
//           background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
//           color: #e8eaf6; text-decoration: none; margin-top: 4px;
//           transition: background 0.15s; max-width: 260px;
//         }
//         .cr-file-link:hover { background: rgba(255,255,255,0.16); }
//         .cr-file-icon { font-size: 20px; flex-shrink: 0; }
//         .cr-file-meta { display: flex; flex-direction: column; min-width: 0; }
//         .cr-file-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
//         .cr-file-size { font-size: 11px; color: rgba(232,234,246,0.5); margin-top: 1px; }

//         /* Typing indicator */
//         .cr-typing-indicator {
//           align-self: flex-start; display: flex; align-items: center; gap: 4px;
//           padding: 8px 14px; border-radius: 18px; border-bottom-left-radius: 5px;
//           background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.1);
//           max-width: 200px; margin-top: 4px;
//         }
//         .cr-typing-dot {
//           width: 6px; height: 6px; border-radius: 50%;
//           background: rgba(232,234,246,0.5);
//           animation: cr-bounce 1.2s infinite;
//         }
//         .cr-typing-dot:nth-child(2) { animation-delay: 0.2s; }
//         .cr-typing-dot:nth-child(3) { animation-delay: 0.4s; }
//         @keyframes cr-bounce {
//           0%, 60%, 100% { transform: translateY(0); }
//           30% { transform: translateY(-4px); }
//         }
//         .cr-typing-name { font-size: 11.5px; color: rgba(232,234,246,0.5); margin-left: 2px; }

//         /* ── Reply bar ── */
//         .cr-reply-bar {
//           display: flex; align-items: center; gap: 10px;
//           padding: 8px 16px;
//           background: rgba(108,79,216,0.12);
//           border-top: 1px solid rgba(108,79,216,0.25);
//           flex-shrink: 0;
//         }
//         .cr-reply-bar-content { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
//         .cr-reply-bar-label { font-size: 10.5px; color: #a78bfa; font-weight: 600; }
//         .cr-reply-bar-nick { font-size: 12px; font-weight: 600; color: #e8eaf6; }
//         .cr-reply-bar-msg {
//           font-size: 12px; color: rgba(232,234,246,0.5);
//           white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
//         }
//         .cr-reply-cancel {
//           width: 28px; height: 28px; border-radius: 50%; border: none;
//           background: rgba(255,255,255,0.1); color: rgba(232,234,246,0.7);
//           font-size: 13px; cursor: pointer; flex-shrink: 0;
//           display: flex; align-items: center; justify-content: center;
//           transition: background 0.15s;
//         }
//         .cr-reply-cancel:hover { background: rgba(255,255,255,0.18); }

//         /* ── Composer ── */
//         .cr-composer {
//           display: flex; align-items: center; gap: 8px;
//           padding: 12px 16px;
//           background: rgba(255,255,255,0.03);
//           border-top: 1px solid rgba(255,255,255,0.07);
//           position: relative; flex-shrink: 0;
//         }
//         .cr-icon-btn {
//           width: 42px; height: 42px; border-radius: 50%;
//           border: 1px solid rgba(255,255,255,0.12);
//           background: rgba(255,255,255,0.06);
//           font-size: 20px; cursor: pointer;
//           display: flex; align-items: center; justify-content: center;
//           flex-shrink: 0; transition: background 0.15s;
//         }
//         .cr-icon-btn:hover { background: rgba(255,255,255,0.12); }
//         .cr-input {
//           flex: 1; height: 42px; padding: 0 16px;
//           border-radius: 21px; border: 1px solid rgba(255,255,255,0.12);
//           background: rgba(255,255,255,0.06); color: #e8eaf6;
//           font-size: 14px; outline: none;
//           transition: border-color 0.2s, background 0.2s;
//           font-family: inherit;
//         }
//         .cr-input::placeholder { color: rgba(232,234,246,0.35); }
//         .cr-input:focus { border-color: rgba(108,79,216,0.7); background: rgba(255,255,255,0.09); }
//         .cr-send-btn {
//           width: 42px; height: 42px; border-radius: 50%; border: none;
//           background: linear-gradient(135deg, #6c4fd8, #4f3ab5);
//           color: #fff; cursor: pointer;
//           display: flex; align-items: center; justify-content: center;
//           flex-shrink: 0; transition: opacity 0.15s, transform 0.1s;
//           box-shadow: 0 2px 12px rgba(108,79,216,0.4);
//         }
//         .cr-send-btn:hover { opacity: 0.88; }
//         .cr-send-btn:active { transform: scale(0.94); }

//         /* ── Emoji picker ── */
//         .cr-emoji-picker {
//           position: absolute; bottom: calc(100% + 8px); left: 16px; right: 16px;
//           background: #1a1830; border: 1px solid rgba(255,255,255,0.12);
//           border-radius: 16px; padding: 12px; z-index: 100;
//           display: flex; flex-direction: column; gap: 8px;
//           max-height: 52vh; box-shadow: 0 8px 40px rgba(0,0,0,0.5);
//         }
//         .cr-emoji-header { display: flex; gap: 8px; }
//         .cr-emoji-search {
//           flex: 1; height: 34px; padding: 0 12px; border-radius: 8px;
//           border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.07);
//           color: #e8eaf6; font-size: 13px; outline: none; font-family: inherit;
//         }
//         .cr-emoji-search::placeholder { color: rgba(232,234,246,0.4); }
//         .cr-emoji-search:focus { border-color: rgba(108,79,216,0.6); }
//         .cr-emoji-close {
//           width: 34px; height: 34px; border-radius: 8px;
//           border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.06);
//           color: rgba(232,234,246,0.7); font-size: 15px; cursor: pointer;
//           display: flex; align-items: center; justify-content: center;
//           flex-shrink: 0; transition: background 0.15s;
//         }
//         .cr-emoji-close:hover { background: rgba(255,255,255,0.12); }
//         .cr-emoji-tabs {
//           display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px;
//           scrollbar-width: none;
//         }
//         .cr-emoji-tabs::-webkit-scrollbar { display: none; }
//         .cr-emoji-tab {
//           white-space: nowrap; padding: 5px 10px; border: none;
//           background: transparent; color: rgba(232,234,246,0.55);
//           border-radius: 8px; font-size: 12px; cursor: pointer;
//           transition: background 0.15s, color 0.15s; font-family: inherit;
//         }
//         .cr-emoji-tab:hover { background: rgba(255,255,255,0.07); color: #e8eaf6; }
//         .cr-emoji-tab-active { background: rgba(108,79,216,0.25); color: #c4b5fd; }
//         .cr-emoji-grid {
//           display: grid; grid-template-columns: repeat(9, 1fr);
//           gap: 2px; overflow-y: auto; flex: 1;
//           scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
//         }
//         .cr-emoji-item {
//           background: transparent; border: none; font-size: 22px; padding: 5px;
//           border-radius: 8px; cursor: pointer; line-height: 1;
//           transition: background 0.1s; text-align: center;
//         }
//         .cr-emoji-item:hover { background: rgba(255,255,255,0.1); }
//         .cr-emoji-item:active { background: rgba(255,255,255,0.18); }

//         /* ── Scrollbar ── */
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-track { background: transparent; }
//         ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

//         /* ── Tablet ── */
//         @media (max-width: 899px) and (min-width: 600px) {
//           .cr-sidebar { width: 200px; }
//           .cr-msg-row { max-width: 82%; }
//           .cr-emoji-grid { grid-template-columns: repeat(8, 1fr); }
//         }

//         /* ── Mobile ── */
//         @media (max-width: 599px) {
//           .cr-wrap { flex-direction: column; }
//           .cr-sidebar { display: none; }
//           .cr-header { padding: 12px 14px; }
//           .cr-header-title { font-size: 14px; }
//           .cr-messages { padding: 14px 12px 8px; gap: 5px; }
//           .cr-msg-row { max-width: 88%; }
//           .cr-bubble { font-size: 13.5px; padding: 9px 12px; }
//           .cr-composer { padding: 10px; gap: 7px; }
//           .cr-icon-btn { width: 38px; height: 38px; font-size: 18px; }
//           .cr-input { height: 38px; font-size: 13px; }
//           .cr-send-btn { width: 38px; height: 38px; }
//           .cr-emoji-picker {
//             left: 0; right: 0; bottom: calc(100% + 4px);
//             border-radius: 16px 16px 0 0; max-height: 60vh;
//             border-left: none; border-right: none; border-bottom: none;
//           }
//           .cr-emoji-grid { grid-template-columns: repeat(7, 1fr); }
//           .cr-emoji-item { font-size: 24px; padding: 7px 4px; }
//           .cr-file-img { max-width: 200px; max-height: 200px; }
//           .cr-file-video { max-width: 240px; }
//         }

//         /* ── Large desktop ── */
//         @media (min-width: 1200px) {
//           .cr-sidebar { width: 280px; }
//           .cr-emoji-picker {
//             left: 16px; right: auto; width: 400px; max-height: 420px;
//           }
//           .cr-emoji-grid { grid-template-columns: repeat(10, 1fr); }
//         }
//       `}</style>
//     </div>
//   );
// }
