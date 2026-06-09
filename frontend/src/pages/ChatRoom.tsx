// import { useEffect, useRef, useState } from 'react';
// import { io, Socket } from 'socket.io-client';
// import { useNavigate } from 'react-router-dom';

// const SOCKET_URL = 'https://backend-9i6w.onrender.com';

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

// // Helper function to extract user device metadata without heavy libraries
// const getDeviceMetadata = () => {
//   const ua = navigator.userAgent;
//   let browser = 'Unknown Browser';
//   let os = 'Unknown OS';
//   let deviceType = 'Desktop';

//   // Simple Browser Detection
//   if (ua.includes('Firefox')) browser = 'Firefox';
//   else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
//   else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
//   else if (ua.includes('Trident')) browser = 'Internet Explorer';
//   else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
//   else if (ua.includes('Chrome')) browser = 'Chrome';
//   else if (ua.includes('Safari')) browser = 'Safari';

//   // Simple OS Detection
//   if (ua.includes('Windows')) os = 'Windows';
//   else if (ua.includes('Macintosh')) os = 'macOS';
//   else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
//   else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobileos'; }
//   else if (ua.includes('Linux')) os = 'Linux';

//   return {
//     deviceType,
//     deviceModel: deviceType === 'Mobileos' ? 'Mobile Device' : 'PC/Laptop',
//     browser,
//     os,
//   };
// };

// function ChatRoom() {
//   const navigate = useNavigate();

//   const nickname = localStorage.getItem('nickname') || '';
//   const passcode = localStorage.getItem('passcode') || '';

//   const [message, setMessage] = useState('');
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [users, setUsers] = useState<User[]>([]);
//   const [replyTo, setReplyTo] = useState<Message | null>(null);
//   const [typingUser, setTypingUser] = useState('');

//   const socketRef = useRef<Socket | null>(null);
//   const chatRef = useRef<HTMLDivElement>(null);
//   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
//           ? {
//               id: replyTo.id,
//               nickname: replyTo.nickname,
//               message: replyTo.message,
//             }
//           : null,
//       });
      
//       setReplyTo(null);
//       e.target.value = ''; // Reset input selection
//     } catch (err) {
//       console.error('File upload failed:', err);
//     }
//   };

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
//       console.log('Connected:', socket.id);
      
//       const deviceInfo = getDeviceMetadata();
//       socket.emit('joinRoom', { 
//         nickname, 
//         passcode,
//         ...deviceInfo
//       });
      
//       socket.emit('getUsers', { passcode });
//     });

//     socket.on('connect_error', (err) => {
//       console.error('Socket Error:', err);
//     });

//     socket.on('disconnect', (reason) => {
//       console.log('Disconnected:', reason);
//     });

//     // socket.on('chatHistory', (data: Message[]) => {
//     //   setMessages(data || []);
//     // });

//   socket.on('chatHistory', (data: Message[]) => {
//   console.log(
//     'History received:',
//     data.length,
//   );

//   setMessages(data || []);
// });

//     // socket.on('newMessage', (data: Message) => {
//     //       // i have add this
//     //        console.log('New message:', data.id);
//     //   setMessages((prev) => {
//     //     const exists = prev.some(
//     //       (msg) =>
//     //         msg.id === data.id ||
//     //         (msg.nickname === data.nickname &&
//     //           msg.message === data.message &&
//     //           msg.createdAt === data.createdAt),
//     //     );

//     //     if (exists) return prev;
//     //     return [...prev, data];
//     //   });
//     // });

// socket.on('newMessage', (data: Message) => {
//   console.log('New message:', data.id);

//   setMessages((prev) => {
//     const exists = prev.some(
//       (msg) => msg.id === data.id,
//     );

//     if (exists) {
//       return prev;
//     }

//     return [...prev, data];
//   });
// });
    
//     socket.on('usersList', (data: User[]) => {
//       console.log('Users List:', data);
//       setUsers(data || []);
//     });

//     socket.on('userOnline', ({ nickname }) => {
//       setUsers((prev) =>
//         prev.map((user) =>
//           user.nickname === nickname
//             ? { ...user, isOnline: true, lastSeen: undefined }
//             : user,
//         ),
//       );
//     });

//     socket.on('userOffline', ({ nickname, lastSeen }) => {
//       setUsers((prev) =>
//         prev.map((user) =>
//           user.nickname === nickname
//             ? { ...user, isOnline: false, lastSeen }
//             : user,
//         ),
//       );
//     });

//     socket.on('userJoined', ({ nickname }) => {
//       setMessages((prev) => [
//         ...prev,
//         {
//           nickname: 'System',
//           message: `${nickname} joined`,
//           createdAt: new Date().toISOString(),
//         },
//       ]);
//     });

//     socket.on('userLeft', ({ nickname }) => {
//       setMessages((prev) => [
//         ...prev,
//         {
//           nickname: 'System',
//           message: `${nickname} left`,
//           createdAt: new Date().toISOString(),
//         },
//       ]);
//     });

//     socket.on('userTyping', (data: { nickname: string }) => {
//       if (data.nickname === nickname) return;
//       setTypingUser(data.nickname);
//     });

//     socket.on('userStoppedTyping', (data: { nickname: string }) => {
//       if (data.nickname === nickname) return;
//       setTypingUser('');
//     });

//     return () => {
//       socket.removeAllListeners();
//       socket.disconnect();
//       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     };
//   }, [nickname, passcode, navigate]);

//   useEffect(() => {
//     if (chatRef.current) {
//       chatRef.current.scrollTop = chatRef.current.scrollHeight;
//     }
//   }, [messages]);

//   const handleInputChange = (value: string) => {
//     setMessage(value);

//     socketRef.current?.emit('typing', {
//       nickname,
//       passcode,
//     });

//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//     }

//     typingTimeoutRef.current = setTimeout(() => {
//       socketRef.current?.emit('stopTyping', {
//         nickname,
//         passcode,
//       });
//     }, 1500);
//   };

//   const sendMessage = () => {
//     const text = message.trim();
//     if (!text || !socketRef.current?.connected) {
//       return;
//     }

//     if (typingTimeoutRef.current) {
//       clearTimeout(typingTimeoutRef.current);
//     }
//     socketRef.current?.emit('stopTyping', {
//       nickname,
//       passcode,
//     });

//     socketRef.current?.emit('sendMessage', {
//       nickname,
//       passcode,
//       message: text,
//       replyTo: replyTo
//         ? {
//             id: replyTo.id,
//             nickname: replyTo.nickname,
//             message: replyTo.message,
//           }
//         : null,
//     });

//     setMessage('');
//     setReplyTo(null);
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       {/* USERS */}
//       <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
//         <h3>Users</h3>
//         {users.map((user) => (
//           <div key={user.id}>
//             <strong>{user.nickname}</strong> -{' '}
//             {user.isOnline ? '🟢 Online' : '🔴 Offline'}
//             <br />
//             Device: {user.deviceModel || user.deviceType || 'Unknown'}
//             <br />
//             OS: {user.os || 'Unknown'}
//             <br />
//             Browser: {user.browser || 'Unknown'}
//             <hr />
//           </div>
//         ))}
//       </div>

//       {/* CHAT */}
//       <div
//         ref={chatRef}
//         style={{
//           border: '1px solid #ccc',
//           height: 400,
//           overflowY: 'auto',
//           padding: 10,
//           marginBottom: 10,
//         }}
//       >
//         {messages.map((msg, index) => (
//           <div
//             key={msg.id || `${msg.nickname}-${msg.createdAt}-${index}`}
//             onClick={() => setReplyTo(msg)}
//             style={{ cursor: 'pointer', marginBottom: 12 }}
//           >
//             {msg.replyTo && (
//               <div
//                 style={{
//                   borderLeft: '3px solid gray',
//                   paddingLeft: 8,
//                   marginBottom: 4,
//                   fontSize: 12,
//                   opacity: 0.8,
//                 }}
//               >
//                 <strong>{msg.replyTo.nickname}</strong>
//                 <br />
//                 {msg.replyTo.message}
//               </div>
//             )}
//             <div>
//               <strong>{msg.nickname}</strong>
//               {msg.nickname === nickname && ' (You)'}
//               <br />

//               {msg.message && (
//                 <div style={{ marginBottom: 5 }}>
//                   {msg.message}
//                 </div>
//               )}

//               {msg.fileUrl && (
//                 <div style={{ marginTop: 5 }}>
//                   {/* IMAGE */}
//                   {msg.fileType?.startsWith('image/') && (
//                     <img
//                       src={`${SOCKET_URL}${msg.fileUrl}`}
//                       alt={msg.fileName}
//                       style={{
//                         maxWidth: 300,
//                         maxHeight: 300,
//                         borderRadius: 8,
//                         display: 'block',
//                       }}
//                     />
//                   )}

//                   {/* VIDEO */}
//                   {msg.fileType?.startsWith('video/') && (
//                     <video
//                       controls
//                       style={{
//                         maxWidth: 350,
//                         borderRadius: 8,
//                       }}
//                     >
//                       <source
//                         src={`${SOCKET_URL}${msg.fileUrl}`}
//                         type={msg.fileType}
//                       />
//                     </video>
//                   )}

//                   {/* AUDIO */}
//                   {msg.fileType?.startsWith('audio/') && (
//                     <audio controls>
//                       <source
//                         src={`${SOCKET_URL}${msg.fileUrl}`}
//                         type={msg.fileType}
//                       />
//                     </audio>
//                   )}

//                   {/* PDF */}
//                   {msg.fileType === 'application/pdf' && (
//                     <iframe
//                       src={`${SOCKET_URL}${msg.fileUrl}`}
//                       title={msg.fileName}
//                       width="100%"
//                       height="500"
//                       style={{
//                         border: '1px solid #ddd',
//                         borderRadius: 8,
//                       }}
//                     />
//                   )}

//                   {/* TEXT FILES */}
//                   {(msg.fileType === 'text/plain' ||
//                     msg.fileType === 'application/json') && (
//                     <a
//                       href={`${SOCKET_URL}${msg.fileUrl}`}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       📄 View {msg.fileName}
//                     </a>
//                   )}

//                   {/* WORD */}
//                   {(msg.fileType ===
//                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
//                     msg.fileType === 'application/msword') && (
//                     <a
//                       href={`${SOCKET_URL}${msg.fileUrl}`}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       📝 Open Word File ({msg.fileName})
//                     </a>
//                   )}

//                   {/* EXCEL */}
//                   {(msg.fileType ===
//                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
//                     msg.fileType ===
//                       'application/vnd.ms-excel') && (
//                     <a
//                       href={`${SOCKET_URL}${msg.fileUrl}`}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       📊 Open Excel File ({msg.fileName})
//                     </a>
//                   )}

//                   {/* POWERPOINT */}
//                   {(msg.fileType ===
//                     'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
//                     msg.fileType ===
//                       'application/vnd.ms-powerpoint') && (
//                     <a
//                       href={`${SOCKET_URL}${msg.fileUrl}`}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       📽 Open PowerPoint ({msg.fileName})
//                     </a>
//                   )}

//                   {/* ZIP */}
//                   {(msg.fileType === 'application/zip' ||
//                     msg.fileType ===
//                       'application/x-zip-compressed') && (
//                     <a
//                       href={`${SOCKET_URL}${msg.fileUrl}`}
//                       download
//                     >
//                       📦 Download ZIP ({msg.fileName})
//                     </a>
//                   )}

//                   {/* FALLBACK */}
//                   {!msg.fileType?.startsWith('image/') &&
//                     !msg.fileType?.startsWith('video/') &&
//                     !msg.fileType?.startsWith('audio/') &&
//                     msg.fileType !== 'application/pdf' &&
//                     msg.fileType !== 'text/plain' &&
//                     msg.fileType !== 'application/json' &&
//                     msg.fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
//                     msg.fileType !== 'application/msword' &&
//                     msg.fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
//                     msg.fileType !== 'application/vnd.ms-excel' &&
//                     msg.fileType !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation' &&
//                     msg.fileType !== 'application/vnd.ms-powerpoint' &&
//                     msg.fileType !== 'application/zip' &&
//                     msg.fileType !== 'application/x-zip-compressed' && (
//                       <div>
//                         <a
//                           href={`${SOCKET_URL}${msg.fileUrl}`}
//                           target="_blank"
//                           rel="noreferrer"
//                           download
//                         >
//                           📎 {msg.fileName}
//                         </a>
//                       </div>
//                     )}
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>

//       <div style={{ marginBottom: 10 }}>
//         <input type="file" onChange={handleFile} />
//       </div>

//       {replyTo && (
//         <div
//           style={{
//             border: '1px solid #ccc',
//             padding: 8,
//             marginBottom: 10,
//           }}
//         >
//           Replying to <strong>{replyTo.nickname}</strong>
//           <br />
//           {replyTo.message || (replyTo.fileUrl ? '📁 File attachment' : '')}
//           <button onClick={() => setReplyTo(null)} style={{ marginLeft: 10 }}>
//             X
//           </button>
//         </div>
//       )}

//       {typingUser && (
//         <div
//           style={{
//             fontSize: 12,
//             color: 'gray',
//             marginBottom: 10,
//           }}
//         >
//           {typingUser} is typing...
//         </div>
//       )}

//       <div style={{ display: 'flex', gap: 10 }}>
//         <input
//           type="text"
//           value={message}
//           placeholder="Type message..."
//           onChange={(e) => handleInputChange(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === 'Enter') sendMessage();
//           }}
//           style={{ flex: 1, padding: 10 }}
//         />
//         <button onClick={sendMessage}>Send</button>
//       </div>
//     </div>
//   );
// }

// export default ChatRoom;


import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SOCKET_URL = 'https://backend-9i6w.onrender.com';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const getDeviceMetadata = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceType = 'Desktop';

  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Trident')) browser = 'Internet Explorer';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceType,
    deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop',
    browser,
    os,
  };
};

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

const avatarColor = (name: string): [string, string] => {
  const palette: [string, string][] = [
    ['#e8d5ff', '#6c3ac7'],
    ['#cff3e9', '#1d7a5e'],
    ['#ffd6cc', '#c44d22'],
    ['#d0e8ff', '#1a5fa0'],
    ['#ffeacc', '#a0650a'],
    ['#ffd6ec', '#a02060'],
  ];
  const idx = (name.charCodeAt(0) || 0) % palette.length;
  return palette[idx];
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatRoom() {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Socket setup ────────────────────────────────────────────────────────────

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
      const deviceInfo = getDeviceMetadata();
      socket.emit('joinRoom', { nickname, passcode, ...deviceInfo });
      socket.emit('getUsers', { passcode });
    });

    socket.on('chatHistory', (data: Message[]) => {
      setMessages(data || []);
    });

    socket.on('newMessage', (data: Message) => {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === data.id);
        return exists ? prev : [...prev, data];
      });
    });

    socket.on('usersList', (data: User[]) => setUsers(data || []));

    socket.on('userOnline', ({ nickname: n }: { nickname: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.nickname === n ? { ...u, isOnline: true, lastSeen: undefined } : u)),
      );
    });

    socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)),
      );
    });

    socket.on('userJoined', ({ nickname: n }: { nickname: string }) => {
      setMessages((prev) => [
        ...prev,
        { nickname: 'System', message: `${n} joined`, createdAt: new Date().toISOString() },
      ]);
    });

    socket.on('userLeft', ({ nickname: n }: { nickname: string }) => {
      setMessages((prev) => [
        ...prev,
        { nickname: 'System', message: `${n} left`, createdAt: new Date().toISOString() },
      ]);
    });

    socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser(n);
    });

    socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser('');
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [nickname, passcode, navigate]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleInputChange = (value: string) => {
    setMessage(value);
    socketRef.current?.emit('typing', { nickname, passcode });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { nickname, passcode });
    }, 1500);
  };

  const sendMessage = () => {
    const text = message.trim();
    if (!text || !socketRef.current?.connected) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit('stopTyping', { nickname, passcode });
    socketRef.current?.emit('sendMessage', {
      nickname,
      passcode,
      message: text,
      replyTo: replyTo
        ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
        : null,
    });
    setMessage('');
    setReplyTo(null);
  };

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
          ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
          : null,
      });
      setReplyTo(null);
      e.target.value = '';
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const onlineCount = users.filter((u) => u.isOnline).length;
  const [myBg, myFg] = avatarColor(nickname);

  // ── File renderer ────────────────────────────────────────────────────────────

  const renderFile = (msg: Message) => {
    if (!msg.fileUrl) return null;
    const src = `${SOCKET_URL}${msg.fileUrl}`;
    const { fileType, fileName, fileSize } = msg;

    if (fileType?.startsWith('image/')) {
      return (
        <a href={src} target="_blank" rel="noreferrer" className="d-block mt-1">
          <img src={src} alt={fileName} className="img-fluid rounded" style={{ maxHeight: '250px' }} />
        </a>
      );
    }
    if (fileType?.startsWith('video/')) {
      return (
        <video controls className="w-100 rounded mt-1" style={{ maxWidth: '300px' }}>
          <source src={src} type={fileType} />
        </video>
      );
    }
    if (fileType?.startsWith('audio/')) {
      return <audio controls src={src} className="w-100 mt-1" style={{ minWidth: '220px' }} />;
    }
    if (fileType === 'application/pdf') {
      return (
        <iframe src={src} title={fileName} className="w-100 rounded mt-1" style={{ height: '300px', border: 'none' }} />
      );
    }

    const icon =
      fileType?.includes('word') ? '📝' :
      fileType?.includes('sheet') || fileType?.includes('excel') ? '📊' :
      fileType?.includes('presentation') || fileType?.includes('powerpoint') ? '📽' :
      fileType?.includes('zip') ? '📦' :
      fileType === 'text/plain' || fileType === 'application/json' ? '📄' : '📎';

    return (
      <a href={src} target="_blank" rel="noreferrer" download className="btn btn-sm btn-outline-light d-inline-flex align-items-center gap-2 mt-1 text-start text-wrap text-break" style={{ maxWidth: '260px' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <div className="min-w-0">
          <div className="text-truncate" style={{ fontSize: '0.85rem' }}>{fileName}</div>
          {fileSize && <small className="text-white-50" style={{ fontSize: '0.75rem' }}>{formatFileSize(fileSize)}</small>}
        </div>
      </a>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="d-flex flex-column vh-100 w-100 bg-dark text-light overflow-hidden">
      
      {/* ── Navbar Header (With Profile Info Built-in) ── */}
      <nav className="navbar navbar-dark bg-secondary bg-gradient bg-opacity-25 border-bottom border-secondary border-opacity-25 px-3 flex-shrink-0">
        <div className="container-fluid p-0 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">💬</span>
            <div>
              <h1 className="navbar-brand m-0 fs-6 fw-bold">Chat Room</h1>
              <small className="text-white-50 d-block" style={{ fontSize: '0.75rem' }}>
                {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
              </small>
            </div>
          </div>

          {/* Current User details on the right */}
          <div className="d-flex align-items-center gap-2">
            <div className="text-end d-none d-sm-block">
              <div className="fw-semibold text-truncate" style={{ fontSize: '0.9rem', maxWidth: '150px' }}>{nickname}</div>
              <small className="text-success d-flex align-items-center justify-content-end gap-1" style={{ fontSize: '0.75rem' }}>
                <span className="d-inline-block bg-success rounded-circle" style={{ width: '6px', height: '6px' }} />
                Active
              </small>
            </div>
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '40px', height: '40px', background: myBg, color: my開g || myFg, fontSize: '0.85rem', letterSpacing: '0.5px' }}
            >
              {nickname.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Messages Display Container ── */}
      <div ref={chatRef} className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2" style={{ scrollbarWidth: 'thin' }}>
        {messages.map((msg, i) => {
          const me = msg.nickname === nickname;
          const sys = msg.nickname === 'System';

          if (sys) {
            return (
              <div key={msg.id ?? `sys-${i}`} className="align-self-center text-center px-3 py-1 rounded-pill bg-light bg-opacity-10 border border-light border-opacity-10 text-white-50 m-1" style={{ fontSize: '0.75rem', maxWidth: '80%' }}>
                <span>{msg.message}</span>
              </div>
            );
          }

          const [bg, fg] = avatarColor(msg.nickname);
          return (
            <div
              key={msg.id ?? `${msg.nickname}-${msg.createdAt}-${i}`}
              className={`d-flex align-items-end gap-2 style-msg-row ${me ? 'align-self-end flex-row-reverse' : 'align-self-start'}`}
              style={{ maxWidth: '80%', cursor: 'pointer' }}
              onClick={() => setReplyTo(msg)}
              title="Click to reply"
            >
              {!me && (
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 mb-1" 
                  style={{ width: '30px', height: '30px', background: bg, color: fg, fontSize: '0.65rem' }}
                >
                  {msg.nickname.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className={`d-flex flex-column gap-1 min-w-0 ${me ? 'align-items-end' : 'align-items-start'}`}>
                {!me && <small className="text-white-50 fw-semibold px-1" style={{ fontSize: '0.75rem' }}>{msg.nickname}</small>}

                {/* Reply preview logic wrapper inside bubble cluster */}
                {msg.replyTo && (
                  <div className={`p-2 rounded-3 text-start border-start border-3 bg-light bg-opacity-10 d-flex flex-column mb-1 ${me ? 'border-light border-opacity-50' : 'border-primary'}`} style={{ maxWidth: '100%', fontSize: '0.75rem' }}>
                    <span className="fw-bold text-info">{msg.replyTo.nickname}</span>
                    <span className="text-white-50 text-truncate" style={{ maxWidth: '200px' }}>
                      {msg.replyTo.message || '📁 Attachment'}
                    </span>
                  </div>
                )}

                <div 
                  className={`p-2 px-3 rounded-4 style-bubble ${me ? 'bg-primary text-white bg-gradient' : 'bg-white bg-opacity-10 text-light border border-light border-opacity-10'}`}
                  style={{ 
                    wordBreak: 'break-word', 
                    fontSize: '0.9rem',
                    borderRadius: me ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem'
                  }}
                >
                  {msg.message && <div className="mb-0">{msg.message}</div>}
                  {renderFile(msg)}
                </div>

                {msg.createdAt && (
                  <small className="text-white-50 px-1 mt-auto" style={{ fontSize: '0.65rem' }}>
                    {fmt(msg.createdAt)}
                  </small>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Notification Banner Component */}
        {typingUser && (
          <div className="align-self-start d-flex align-items-center gap-2 p-2 px-3 rounded-4 bg-white bg-opacity-10 border border-light border-opacity-10 mt-1" style={{ maxWidth: '200px' }}>
            <div className="d-flex gap-1 align-items-center">
              <span className="cr-typing-dot bg-white bg-opacity-50 rounded-circle" style={{ width: '5px', height: '5px' }} />
              <span className="cr-typing-dot bg-white bg-opacity-50 rounded-circle" style={{ width: '5px', height: '5px' }} />
              <span className="cr-typing-dot bg-white bg-opacity-50 rounded-circle" style={{ width: '5px', height: '5px' }} />
            </div>
            <small className="text-white-50" style={{ fontSize: '0.75rem' }}>{typingUser} is typing…</small>
          </div>
        )}
      </div>

      {/* ── Active Reply Reference Bar Container ── */}
      {replyTo && (
        <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-primary bg-opacity-10 border-top border-primary border-opacity-25 flex-shrink-0">
          <div className="min-w-0 d-flex flex-column">
            <small className="text-info fw-bold" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Replying to</small>
            <span className="fw-semibold text-light" style={{ fontSize: '0.8rem' }}>{replyTo.nickname}</span>
            <small className="text-white-50 text-truncate" style={{ fontSize: '0.75rem', maxWidth: '400px' }}>
              {replyTo.message || (replyTo.fileUrl ? '📁 Attachment' : '')}
            </small>
          </div>
          <button className="btn btn-sm btn-close btn-close-white bg-secondary bg-opacity-20 rounded-circle p-1" onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ width: '22px', height: '22px', fontSize: '0.5rem' }} />
        </div>
      )}

      {/* ── Input Composer Section Container ── */}
      <footer className="p-3 bg-secondary bg-opacity-10 border-top border-secondary border-opacity-25 flex-shrink-0">
        <div className="d-flex align-items-center gap-2 container-fluid p-0">
          
          {/* File input attachment control hooks */}
          <button
            className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 text-light border-light border-opacity-25 bg-white bg-opacity-5"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            title="Attach file"
            style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFile}
            className="d-none"
          />

          <input
            ref={inputRef}
            type="text"
            className="form-control rounded-pill bg-white bg-opacity-5 text-light border-light border-opacity-25 px-3"
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message…"
            style={{ height: '40px', fontSize: '0.9rem' }}
          />

          <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 shadow-sm" onClick={sendMessage} aria-label="Send message" style={{ width: '40px', height: '40px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </footer>

      {/* Mini System Rules Layer Injection */}
      <style>{`
        .cr-typing-dot {
          animation: cr-bounce 1.2s infinite;
        }
        .cr-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .cr-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes cr-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        .style-msg-row:hover .style-bubble { opacity: 0.9; }
      `}</style>
    </div>
  );
}
