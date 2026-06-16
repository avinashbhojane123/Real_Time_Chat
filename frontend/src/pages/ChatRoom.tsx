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


// // import React, { useEffect, useRef, useState, MouseEvent, ChangeEvent } from 'react';
// // import { io, Socket } from 'socket.io-client';
// // import { useNavigate } from 'react-router-dom';

// // const SOCKET_URL = 'https://backend-9i6w.onrender.com';

// // // ── Types ────────────────────────────────────────────────────────────────────

// // interface Message {
// //   id?: number;
// //   nickname: string;
// //   message: string;
// //   createdAt?: string;
// //   fileUrl?: string;
// //   fileName?: string;
// //   fileType?: string;
// //   fileSize?: number;
// //   replyTo?: {
// //     id?: number;
// //     nickname: string;
// //     message: string;
// //   } | null;
// // }

// // interface User {
// //   id: number;
// //   nickname: string;
// //   isOnline: boolean;
// //   lastSeen?: string;
// //   deviceType?: string;
// //   deviceModel?: string;
// //   browser?: string;
// //   os?: string;
// // }

// // // ── Helpers ───────────────────────────────────────────────────────────────────

// // const getDeviceMetadata = () => {
// //   const ua = navigator.userAgent;
// //   let browser = 'Unknown Browser';
// //   let os = 'Unknown OS';
// //   let deviceType = 'Desktop';

// //   if (ua.includes('Firefox')) browser = 'Firefox';
// //   else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
// //   else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
// //   else if (ua.includes('Trident')) browser = 'Internet Explorer';
// //   else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
// //   else if (ua.includes('Chrome')) browser = 'Chrome';
// //   else if (ua.includes('Safari')) browser = 'Safari';

// //   if (ua.includes('Windows')) os = 'Windows';
// //   else if (ua.includes('Macintosh')) os = 'macOS';
// //   else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
// //   else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
// //   else if (ua.includes('Linux')) os = 'Linux';

// //   return {
// //     deviceType,
// //     deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop',
// //     browser,
// //     os,
// //   };
// // };

// // const fmt = (d?: string) =>
// //   d
// //     ? new Date(d).toLocaleString('en-IN', {
// //         day: '2-digit',
// //         month: 'short',
// //         hour: '2-digit',
// //         minute: '2-digit',
// //         hour12: true,
// //       })
// //     : '';

// // const avatarColor = (name: string): [string, string] => {
// //   const palette: [string, string][] = [
// //     ['#e8d5ff', '#6c3ac7'],
// //     ['#cff3e9', '#1d7a5e'],
// //     ['#ffd6cc', '#c44d22'],
// //     ['#d0e8ff', '#1a5fa0'],
// //     ['#ffeacc', '#a0650a'],
// //     ['#ffd6ec', '#a02060'],
// //   ];
// //   const idx = (name.charCodeAt(0) || 0) % palette.length;
// //   return palette[idx];
// // };

// // const formatFileSize = (bytes?: number) => {
// //   if (!bytes) return '';
// //   if (bytes < 1024) return `${bytes} B`;
// //   if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
// //   return `${(bytes / 1048576).toFixed(1)} MB`;
// // };

// // // ── Component ─────────────────────────────────────────────────────────────────

// // export default function ChatRoom() {
// //   const navigate = useNavigate();

// //   const nickname = localStorage.getItem('nickname') || '';
// //   const passcode = localStorage.getItem('passcode') || '';

// //   const [message, setMessage] = useState('');
// //   const [messages, setMessages] = useState<Message[]>([]);
// //   const [users, setUsers] = useState<User[]>([]);
// //   const [replyTo, setReplyTo] = useState<Message | null>(null);
// //   const [typingUser, setTypingUser] = useState('');
// //   const [showMembersDropdown, setShowMembersDropdown] = useState(false);

// //   const socketRef = useRef<Socket | null>(null);
// //   const chatRef = useRef<HTMLDivElement>(null);
// //   const inputRef = useRef<HTMLInputElement>(null);
// //   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// //   const fileInputRef = useRef<HTMLInputElement>(null);

// //   // ── Socket setup ────────────────────────────────────────────────────────────

// //   useEffect(() => {
// //     if (!nickname || !passcode) {
// //       navigate('/');
// //       return;
// //     }

// //     const socket = io(SOCKET_URL, {
// //       transports: ['websocket'],
// //       reconnection: true,
// //       reconnectionAttempts: Infinity,
// //       reconnectionDelay: 1000,
// //     });
// //     socketRef.current = socket;

// //     socket.on('connect', () => {
// //       const deviceInfo = getDeviceMetadata();
// //       socket.emit('joinRoom', { nickname, passcode, ...deviceInfo });
// //       socket.emit('getUsers', { passcode });
// //     });

// //     socket.on('chatHistory', (data: Message[]) => {
// //       setMessages(data || []);
// //     });

// //     socket.on('newMessage', (data: Message) => {
// //       setMessages((prev) => {
// //         const exists = prev.some((msg) => msg.id === data.id);
// //         return exists ? prev : [...prev, data];
// //       });
// //     });

// //     socket.on('usersList', (data: User[]) => setUsers(data || []));

// //     socket.on('userOnline', ({ nickname: n }: { nickname: string }) => {
// //       setUsers((prev) =>
// //         prev.map((u) => (u.nickname === n ? { ...u, isOnline: true, lastSeen: undefined } : u)),
// //       );
// //     });

// //     socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) => {
// //       setUsers((prev) =>
// //         prev.map((u) => (u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)),
// //       );
// //     });

// //     socket.on('userJoined', ({ nickname: n }: { nickname: string }) => {
// //       setMessages((prev) => [
// //         ...prev,
// //         { nickname: 'System', message: `${n} joined`, createdAt: new Date().toISOString() },
// //       ]);
// //     });

// //     socket.on('userLeft', ({ nickname: n }: { nickname: string }) => {
// //       setMessages((prev) => [
// //         ...prev,
// //         { nickname: 'System', message: `${n} left`, createdAt: new Date().toISOString() },
// //       ]);
// //     });

// //     socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
// //       if (n !== nickname) setTypingUser(n);
// //     });

// //     socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
// //       if (n !== nickname) setTypingUser('');
// //     });

// //     return () => {
// //       socket.removeAllListeners();
// //       socket.disconnect();
// //       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// //     };
// //   }, [nickname, passcode, navigate]);

// //   // Auto-scroll
// //   useEffect(() => {
// //     if (chatRef.current) {
// //       chatRef.current.scrollTop = chatRef.current.scrollHeight;
// //     }
// //   }, [messages]);

// //   // Close member list dropdown if clicked outside
// //   useEffect(() => {
// //     const handleOutsideClick = () => setShowMembersDropdown(false);
// //     if (showMembersDropdown) {
// //       window.addEventListener('click', handleOutsideClick);
// //     }
// //     return () => window.removeEventListener('click', handleOutsideClick);
// //   }, [showMembersDropdown]);

// //   // ── Handlers ─────────────────────────────────────────────────────────────────

// //   const handleInputChange = (value: string) => {
// //     setMessage(value);
// //     socketRef.current?.emit('typing', { nickname, passcode });
// //     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// //     typingTimeoutRef.current = setTimeout(() => {
// //       socketRef.current?.emit('stopTyping', { nickname, passcode });
// //     }, 1500);
// //   };

// //   const sendMessage = () => {
// //     const text = message.trim();
// //     if (!text || !socketRef.current?.connected) return;
// //     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// //     socketRef.current?.emit('stopTyping', { nickname, passcode });
// //     socketRef.current?.emit('sendMessage', {
// //       nickname,
// //       passcode,
// //       message: text,
// //       replyTo: replyTo
// //         ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
// //         : null,
// //     });
// //     setMessage('');
// //     setReplyTo(null);
// //   };

// //   const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
// //     const file = e.target.files?.[0];
// //     if (!file) return;
// //     const formData = new FormData();
// //     formData.append('file', file);
// //     try {
// //       const response = await fetch(`${SOCKET_URL}/api/upload`, {
// //         method: 'POST',
// //         body: formData,
// //       });
// //       const uploaded = await response.json();
// //       socketRef.current?.emit('sendMessage', {
// //         nickname,
// //         passcode,
// //         message: '',
// //         fileUrl: uploaded.fileUrl,
// //         fileName: uploaded.fileName,
// //         fileType: uploaded.fileType,
// //         fileSize: uploaded.fileSize,
// //         replyTo: replyTo
// //           ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
// //           : null,
// //       });
// //       setReplyTo(null);
// //       e.target.value = '';
// //     } catch (err) {
// //       console.error('File upload failed:', err);
// //     }
// //   };

// //   const onlineCount = users.filter((u) => u.isOnline).length;
// //   const [myBg, myFg] = avatarColor(nickname);

// //   // ── File renderer ────────────────────────────────────────────────────────────

// //   const renderFile = (msg: Message) => {
// //     if (!msg.fileUrl) return null;
// //     const src = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${SOCKET_URL}${msg.fileUrl}`;
// //     const { fileType, fileName, fileSize } = msg;

// //     if (fileType?.startsWith('image/')) {
// //       return (
// //         <a href={src} target="_blank" rel="noreferrer" className="d-block mt-1">
// //           <img src={src} alt={fileName || 'Attachment'} className="img-fluid rounded-3 shadow-sm border border-secondary border-opacity-25" style={{ maxHeight: '260px' }} />
// //         </a>
// //       );
// //     }
// //     if (fileType?.startsWith('video/')) {
// //       return (
// //         <video controls className="w-100 rounded-3 mt-1 shadow-sm" style={{ maxWidth: '300px' }}>
// //           <source src={src} type={fileType} />
// //         </video>
// //       );
// //     }
// //     if (fileType?.startsWith('audio/')) {
// //       return <audio controls src={src} className="w-100 mt-1" style={{ minWidth: '240px' }} />;
// //     }
// //     if (fileType === 'application/pdf') {
// //       return (
// //         <iframe src={src} title={fileName || 'PDF Document'} className="w-100 rounded-3 mt-1 border-0 shadow-sm" style={{ height: '350px' }} />
// //       );
// //     }

// //     const icon =
// //       fileType?.includes('word') ? '📝' :
// //       fileType?.includes('sheet') || fileType?.includes('excel') ? '📊' :
// //       fileType?.includes('presentation') || fileType?.includes('powerpoint') ? '📽' :
// //       fileType?.includes('zip') ? '📦' :
// //       fileType === 'text/plain' || fileType === 'application/json' ? '📄' : '📎';

// //     return (
// //       <a href={src} target="_blank" rel="noreferrer" download className="btn btn-sm btn-secondary bg-opacity-20 d-inline-flex align-items-center gap-2 mt-1 text-start border border-light border-opacity-10 text-wrap text-break" style={{ maxWidth: '260px' }}>
// //         <span style={{ fontSize: '1.3rem' }}>{icon}</span>
// //         <div className="min-w-0">
// //           <div className="text-white fw-medium text-truncate" style={{ fontSize: '0.85rem' }}>{fileName || 'Download File'}</div>
// //           {fileSize && <small className="text-white-50 d-block" style={{ fontSize: '0.75rem' }}>{formatFileSize(fileSize)}</small>}
// //         </div>
// //       </a>
// //     );
// //   };

// //   // ── Render ────────────────────────────────────────────────────────────────────

// //   return (
// //     <div className="d-flex flex-column vh-100 w-100 bg-dark text-light overflow-hidden position-relative">
      
// //       {/* ── Navbar Header Layer (Proper flow validation setup) ── */}
// //       <nav className="navbar navbar-dark bg-secondary bg-gradient bg-opacity-25 border-bottom border-secondary border-opacity-25 px-3 flex-shrink-0 style-navbar-container">
// //         <div className="container-fluid p-0 d-flex align-items-center justify-content-between position-relative">
          
// //           {/* Active Member Dropdown Trigger wrapper setup */}
// //           <div className="position-relative">
// //             <div 
// //               className="d-flex align-items-center gap-2 style-clickable-header rounded-3 p-1 px-2"
// //               style={{ cursor: 'pointer', transition: 'background 0.2s' }}
// //               onClick={(e: MouseEvent<HTMLDivElement>) => {
// //                 e.stopPropagation();
// //                 setShowMembersDropdown(!showMembersDropdown);
// //               }}
// //             >
// //               <span className="fs-4">💬</span>
// //               <div>
// //                 <h1 className="navbar-brand m-0 fs-6 fw-bold d-flex align-items-center gap-1">
// //                   Chat Room <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>▼</span>
// //                 </h1>
// //                 <small className="text-info d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
// //                   <span className="d-inline-block bg-success rounded-circle animate-pulse" style={{ width: '6px', height: '6px' }} />
// //                   {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
// //                 </small>
// //               </div>
// //             </div>

// //             {/* Adjusted absolute layout to sit naturally BELOW the heading grid */}
// //             {showMembersDropdown && (
// //               <div 
// //                 className="position-absolute bg-dark border border-secondary border-opacity-50 rounded-3 shadow-lg p-2 m-0 style-dropdown-box"
// //                 onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
// //               >
// //                 <div className="text-white-50 fw-bold px-2 py-1 mb-1 border-bottom border-secondary border-opacity-25" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
// //                   MEMBERS ({users.length})
// //                 </div>
// //                 <ul className="list-unstyled m-0 p-0" style={{ maxHeight: '280px', overflowY: 'auto' }}>
// //                   {users.map((u) => {
// //                     const [bg, fg] = avatarColor(u.nickname);
// //                     return (
// //                       <li key={u.id} className="d-flex align-items-center gap-2 p-2 rounded-2 style-user-dropdown-item">
// //                         <div className="position-relative flex-shrink-0">
// //                           <div 
// //                             className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
// //                             style={{ width: '32px', height: '32px', background: bg, color: fg, fontSize: '0.75rem' }}
// //                           >
// //                             {u.nickname.slice(0, 2).toUpperCase()}
// //                           </div>
// //                           <span 
// //                             className="position-absolute bottom-0 end-0 rounded-circle border border-dark" 
// //                             style={{ width: '9px', height: '9px', background: u.isOnline ? '#4ade80' : '#6b7280', borderWidth: '2px' }}
// //                           />
// //                         </div>
// //                         <div className="min-w-0 d-flex flex-column">
// //                           <span className="text-light text-truncate fw-medium" style={{ fontSize: '0.85rem' }}>
// //                             {u.nickname} {u.nickname === nickname && <span className="text-white-50 fw-normal" style={{ fontSize: '0.75rem' }}>(You)</span>}
// //                           </span>
// //                           {!u.isOnline && u.lastSeen && (
// //                             <small className="text-white-50" style={{ fontSize: '0.65rem' }}>Seen: {fmt(u.lastSeen)}</small>
// //                           )}
// //                           {u.browser && u.os && (
// //                             <small className="text-white-50 opacity-50" style={{ fontSize: '0.6rem' }}>{u.browser} · {u.os}</small>
// //                           )}
// //                         </div>
// //                       </li>
// //                     );
// //                   })}
// //                 </ul>
// //               </div>
// //             )}
// //           </div>

// //           {/* Current User Profile Display Segment */}
// //           <div className="d-flex align-items-center gap-2">
// //             <div className="text-end d-none d-sm-block">
// //               <div className="fw-semibold text-truncate text-light" style={{ fontSize: '0.9rem', maxWidth: '140px' }}>{nickname}</div>
// //               <small className="text-white-50 opacity-50" style={{ fontSize: '0.7rem' }}>Authorized</small>
// //             </div>
// //             <div 
// //               className="rounded-circle d-flex align-items-center justify-content-center fw-bold border border-light border-opacity-10 shadow-sm flex-shrink-0"
// //               style={{ width: '40px', height: '40px', background: myBg, color: myFg, fontSize: '0.85rem', letterSpacing: '0.5px' }}
// //             >
// //               {nickname.slice(0, 2).toUpperCase()}
// //             </div>
// //           </div>
// //         </div>
// //       </nav>

// //       {/* ── Messages Stream Output Box ── */}
// //       <div ref={chatRef} className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2 bg-gradient" style={{ scrollbarWidth: 'thin' }}>
// //         {messages.map((msg, i) => {
// //           const me = msg.nickname === nickname;
// //           const sys = msg.nickname === 'System';

// //           if (sys) {
// //             return (
// //               <div key={msg.id ?? `sys-${i}`} className="align-self-center text-center px-3 py-1 rounded-pill bg-secondary bg-opacity-20 border border-light border-opacity-5 text-white-50 m-1" style={{ fontSize: '0.75rem', maxWidth: '85%' }}>
// //                 <span>{msg.message}</span>
// //               </div>
// //             );
// //           }

// //           const [bg, fg] = avatarColor(msg.nickname);
// //           return (
// //             <div
// //               key={msg.id ?? `${msg.nickname}-${msg.createdAt}-${i}`}
// //               className={`d-flex align-items-end gap-2 style-msg-row ${me ? 'align-self-end flex-row-reverse' : 'align-self-start'}`}
// //               style={{ maxWidth: '78%', cursor: 'pointer' }}
// //               onClick={() => setReplyTo(msg)}
// //               title="Click to point/reply"
// //             >
// //               {!me && (
// //                 <div 
// //                   className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 mb-1 border border-dark border-opacity-25" 
// //                   style={{ width: '30px', height: '30px', background: bg, color: fg, fontSize: '0.7rem' }}
// //                 >
// //                   {msg.nickname.slice(0, 2).toUpperCase()}
// //                 </div>
// //               )}
// //               <div className={`d-flex flex-column gap-1 min-w-0 ${me ? 'align-items-end' : 'align-items-start'}`}>
// //                 {!me && <small className="text-white-50 fw-semibold px-1" style={{ fontSize: '0.75rem' }}>{msg.nickname}</small>}

// //                 <div 
// //                   className={`p-2 px-3 rounded-4 style-bubble shadow-sm ${me ? 'bg-primary text-white bg-gradient' : 'bg-secondary bg-opacity-25 text-light border border-light border-opacity-10'}`}
// //                   style={{ 
// //                     wordBreak: 'break-word', 
// //                     fontSize: '0.92rem',
// //                     borderRadius: me ? '1.1rem 1.1rem 0.25rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.25rem'
// //                   }}
// //                 >
// //                   {/* Thread reply structural verification metadata wrapper */}
// //                   {msg.replyTo && (
// //                     <div className={`p-2 rounded-3 text-start border-start border-3 bg-dark bg-opacity-25 d-flex flex-column mb-2 ${me ? 'border-white border-opacity-50' : 'border-primary'}`} style={{ fontSize: '0.75rem' }}>
// //                       <span className="fw-bold text-info" style={{ fontSize: '0.7rem' }}>@{msg.replyTo.nickname}</span>
// //                       <span className="text-white-50 text-truncate" style={{ maxWidth: '240px' }}>
// //                         {msg.replyTo.message || '📁 Attachment'}
// //                       </span>
// //                     </div>
// //                   )}

// //                   {msg.message && <div className="mb-0 leading-relaxed">{msg.message}</div>}
// //                   {renderFile(msg)}
// //                 </div>

// //                 {msg.createdAt && (
// //                   <small className="text-white-50 opacity-50 px-1 mt-auto" style={{ fontSize: '0.65rem' }}>
// //                     {fmt(msg.createdAt)}
// //                   </small>
// //                 )}
// //               </div>
// //             </div>
// //           );
// //         })}

// //         {/* Dynamic Typing Stream Container */}
// //         {typingUser && (
// //           <div className="align-self-start d-flex align-items-center gap-2 p-2 px-3 rounded-pill bg-secondary bg-opacity-20 border border-light border-opacity-5 mt-1" style={{ maxWidth: '220px' }}>
// //             <div className="d-flex gap-1 align-items-center">
// //               <span className="cr-typing-dot bg-info rounded-circle" style={{ width: '5px', height: '5px' }} />
// //               <span className="cr-typing-dot bg-info rounded-circle" style={{ width: '5px', height: '5px' }} />
// //               <span className="cr-typing-dot bg-info rounded-circle" style={{ width: '5px', height: '5px' }} />
// //             </div>
// //             <small className="text-white-50" style={{ fontSize: '0.75rem' }}>{typingUser} is typing…</small>
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Reply Bar Reference Layer ── */}
// //       {replyTo && (
// //         <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-info bg-opacity-10 border-top border-info border-opacity-25 flex-shrink-0 slide-up-animation">
// //           <div className="min-w-0 d-flex flex-column">
// //             <small className="text-info fw-bold text-uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.3px' }}>Replying to</small>
// //             <span className="fw-semibold text-light text-truncate" style={{ fontSize: '0.82rem', maxWidth: '180px' }}>{replyTo.nickname}</span>
// //             <small className="text-white-50 text-truncate" style={{ fontSize: '0.75rem', maxWidth: '500px' }}>
// //               {replyTo.message || (replyTo.fileUrl ? '📁 Attachment' : '')}
// //             </small>
// //           </div>
// //           <button className="btn btn-sm btn-close btn-close-white bg-dark bg-opacity-20 rounded-circle p-1" onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ width: '22px', height: '22px', fontSize: '0.5rem' }} />
// //         </div>
// //       )}

// //       {/* ── Chat Control Input Composer Base ── */}
// //       <footer className="p-3 bg-secondary bg-opacity-25 border-top border-secondary border-opacity-25 flex-shrink-0 style-z-index-med shadow-lg">
// //         <div className="d-flex align-items-center gap-2 container-fluid p-0">
          
// //           {/* File attachment selection triggers */}
// //           <button
// //             className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 text-light border-light border-opacity-10 bg-white bg-opacity-5 style-composer-btn"
// //             onClick={() => fileInputRef.current?.click()}
// //             aria-label="Attach file"
// //             title="Attach file"
// //             style={{ width: '42px', height: '42px', fontSize: '1.15rem', transition: 'background 0.2s, transform 0.1s' }}
// //           >
// //             📎
// //           </button>
// //           <input
// //             ref={fileInputRef}
// //             type="file"
// //             onChange={handleFile}
// //             className="d-none"
// //           />

// //           <input
// //             ref={inputRef}
// //             type="text"
// //             className="form-control rounded-pill bg-dark bg-opacity-50 text-light border-secondary border-opacity-50 px-3 style-text-input"
// //             value={message}
// //             onChange={(e) => handleInputChange(e.target.value)}
// //             onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
// //             placeholder="Type a message…"
// //             style={{ height: '42px', fontSize: '0.92rem' }}
// //           />

// //           <button 
// //             className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 shadow style-composer-btn" 
// //             onClick={sendMessage} 
// //             aria-label="Send message" 
// //             style={{ width: '42px', height: '42px' }}
// //           >
// //             <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
// //               <line x1="22" y1="2" x2="11" y2="13" />
// //               <polygon points="22 2 15 22 11 13 2 9 22 2" />
// //             </svg>
// //           </button>
// //         </div>
// //       </footer>

// //       {/* Style layer override variables */}
// //       <style>{`
// //         .cr-typing-dot { animation: cr-bounce 1.2s infinite; }
// //         .cr-typing-dot:nth-child(2) { animation-delay: 0.2s; }
// //         .cr-typing-dot:nth-child(3) { animation-delay: 0.4s; }
// //         @keyframes cr-bounce {
// //           0%, 60%, 100% { transform: translateY(0); }
// //           30% { transform: translateY(-4px); }
// //         }
        
// //         .animate-pulse { animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
// //         @keyframes pulse-green {
// //           0%, 100% { opacity: 1; transform: scale(1); }
// //           50% { opacity: .4; transform: scale(1.2); }
// //         }

// //         .slide-up-animation { animation: slideUp 0.15s ease-out forwards; }
// //         @keyframes slideUp {
// //           from { transform: translateY(100%); opacity: 0; }
// //           to { transform: translateY(0); opacity: 1; }
// //         }

// //         ::-webkit-scrollbar { width: 5px; height: 5px; }
// //         ::-webkit-scrollbar-track { background: transparent; }
// //         ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
// //         ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

// //         .style-navbar-container { z-index: 1060; position: relative; }
// //         .style-z-index-med { z-index: 1040; }
        
// //         /* Dropdown sits clean below header targets without hiding layouts */
// //         .style-dropdown-box { 
// //           top: calc(100% + 8px); 
// //           left: 0; 
// //           width: 280px; 
// //           max-height: 340px; 
// //           z-index: 1070; 
// //         }

// //         .style-msg-row:hover .style-bubble { filter: brightness(1.06); }
// //         .style-text-input:focus { box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15); border-color: #0d6efd !important; }
// //         .style-clickable-header:hover { background: rgba(255,255,255,0.06); }
// //         .style-user-dropdown-item:hover { background: rgba(255,255,255,0.04); }
// //         .style-composer-btn:active { transform: scale(0.93); }
// //       `}</style>
// //     </div>
// //   );
// // }

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
  // Fix #6: was 'Mobileos', now 'Mobile'
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceType,
    deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop',
    browser,
    os,
  };
};

// Fix #3: Helper to resolve file URLs that may be absolute or relative
const resolveUrl = (fileUrl: string) =>
  fileUrl.startsWith('http') ? fileUrl : `${SOCKET_URL}${fileUrl}`;

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

  // Fix #5: updated to handle multiple files
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${SOCKET_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        // Fix #2: check response.ok before using the result
        const uploaded = await response.json();
        if (!response.ok) {
          throw new Error(uploaded.message || 'Upload failed');
        }

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
      } catch (err) {
        console.error('File upload failed:', err);
      }
    }

    e.target.value = '';
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
      socket.emit('joinRoom', { nickname, passcode, ...deviceInfo });
      socket.emit('getUsers', { passcode });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket Error:', err);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });

    socket.on('chatHistory', (data: Message[]) => {
      console.log('History received:', data.length);
      setMessages(data || []);
    });

    // Fix #1: deduplicate by id only
    socket.on('newMessage', (data: Message) => {
      console.log('New message:', data.id);
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === data.id);
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
        { nickname: 'System', message: `${nickname} joined`, createdAt: new Date().toISOString() },
      ]);
    });

    socket.on('userLeft', ({ nickname }) => {
      setMessages((prev) => [
        ...prev,
        { nickname: 'System', message: `${nickname} left`, createdAt: new Date().toISOString() },
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

  // Fix #4: only auto-scroll when user is near the bottom
  useEffect(() => {
    if (!chatRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = chatRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    if (isNearBottom) {
      chatRef.current.scrollTop = scrollHeight;
    }
  }, [messages]);

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

  return (
    <div style={{ padding: 20 }}>
      {/* USERS */}
      <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
        <h3>Users</h3>
        {users.map((user) => (
          <div key={user.id}>
            <strong>{user.nickname}</strong> —{' '}
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

              {msg.message && <div style={{ marginBottom: 5 }}>{msg.message}</div>}

              {msg.fileUrl && (
                <div style={{ marginTop: 5 }}>
                  {/* Fix #3: use resolveUrl() throughout */}

                  {msg.fileType?.startsWith('image/') && (
                    <img
                      src={resolveUrl(msg.fileUrl)}
                      alt={msg.fileName}
                      style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, display: 'block' }}
                    />
                  )}

                  {msg.fileType?.startsWith('video/') && (
                    <video controls style={{ maxWidth: 350, borderRadius: 8 }}>
                      <source src={resolveUrl(msg.fileUrl)} type={msg.fileType} />
                    </video>
                  )}

                  {msg.fileType?.startsWith('audio/') && (
                    <audio controls>
                      <source src={resolveUrl(msg.fileUrl)} type={msg.fileType} />
                    </audio>
                  )}

                  {msg.fileType === 'application/pdf' && (
                    <iframe
                      src={resolveUrl(msg.fileUrl)}
                      title={msg.fileName}
                      width="100%"
                      height="500"
                      style={{ border: '1px solid #ddd', borderRadius: 8 }}
                    />
                  )}

                  {(msg.fileType === 'text/plain' || msg.fileType === 'application/json') && (
                    <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                      📄 View {msg.fileName}
                    </a>
                  )}

                  {(msg.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    msg.fileType === 'application/msword') && (
                    <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                      📝 Open Word File ({msg.fileName})
                    </a>
                  )}

                  {(msg.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    msg.fileType === 'application/vnd.ms-excel') && (
                    <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                      📊 Open Excel File ({msg.fileName})
                    </a>
                  )}

                  {(msg.fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                    msg.fileType === 'application/vnd.ms-powerpoint') && (
                    <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                      📽 Open PowerPoint ({msg.fileName})
                    </a>
                  )}

                  {(msg.fileType === 'application/zip' || msg.fileType === 'application/x-zip-compressed') && (
                    <a href={resolveUrl(msg.fileUrl)} download>
                      📦 Download ZIP ({msg.fileName})
                    </a>
                  )}

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
                      <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer" download>
                        📎 {msg.fileName}
                      </a>
                    )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 10 }}>
        {/* Fix #5: multiple files allowed */}
        <input type="file" multiple onChange={handleFile} />
      </div>

      {replyTo && (
        <div style={{ border: '1px solid #ccc', padding: 8, marginBottom: 10 }}>
          Replying to <strong>{replyTo.nickname}</strong>
          <br />
          {replyTo.message || (replyTo.fileUrl ? '📁 File attachment' : '')}
          <button onClick={() => setReplyTo(null)} style={{ marginLeft: 10 }}>
            X
          </button>
        </div>
      )}

      {typingUser && (
        <div style={{ fontSize: 12, color: 'gray', marginBottom: 10 }}>
          {typingUser} is typing...
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={message}
          placeholder="Type message..."
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatRoom;
