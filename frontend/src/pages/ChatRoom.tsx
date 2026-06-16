// // import { useEffect, useRef, useState } from 'react';
// // import { io, Socket } from 'socket.io-client';
// // import { useNavigate } from 'react-router-dom';

// // const SOCKET_URL = 'https://backend-9i6w.onrender.com';

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
// //   };
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

// // // Helper function to extract user device metadata without heavy libraries
// // const getDeviceMetadata = () => {
// //   const ua = navigator.userAgent;
// //   let browser = 'Unknown Browser';
// //   let os = 'Unknown OS';
// //   let deviceType = 'Desktop';

// //   // Simple Browser Detection
// //   if (ua.includes('Firefox')) browser = 'Firefox';
// //   else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
// //   else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
// //   else if (ua.includes('Trident')) browser = 'Internet Explorer';
// //   else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
// //   else if (ua.includes('Chrome')) browser = 'Chrome';
// //   else if (ua.includes('Safari')) browser = 'Safari';

// //   // Simple OS Detection
// //   if (ua.includes('Windows')) os = 'Windows';
// //   else if (ua.includes('Macintosh')) os = 'macOS';
// //   else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
// //   else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobileos'; }
// //   else if (ua.includes('Linux')) os = 'Linux';

// //   return {
// //     deviceType,
// //     deviceModel: deviceType === 'Mobileos' ? 'Mobile Device' : 'PC/Laptop',
// //     browser,
// //     os,
// //   };
// // };

// // function ChatRoom() {
// //   const navigate = useNavigate();

// //   const nickname = localStorage.getItem('nickname') || '';
// //   const passcode = localStorage.getItem('passcode') || '';

// //   const [message, setMessage] = useState('');
// //   const [messages, setMessages] = useState<Message[]>([]);
// //   const [users, setUsers] = useState<User[]>([]);
// //   const [replyTo, setReplyTo] = useState<Message | null>(null);
// //   const [typingUser, setTypingUser] = useState('');

// //   const socketRef = useRef<Socket | null>(null);
// //   const chatRef = useRef<HTMLDivElement>(null);
// //   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// //   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
// //           ? {
// //               id: replyTo.id,
// //               nickname: replyTo.nickname,
// //               message: replyTo.message,
// //             }
// //           : null,
// //       });
      
// //       setReplyTo(null);
// //       e.target.value = ''; // Reset input selection
// //     } catch (err) {
// //       console.error('File upload failed:', err);
// //     }
// //   };

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
// //       console.log('Connected:', socket.id);
      
// //       const deviceInfo = getDeviceMetadata();
// //       socket.emit('joinRoom', { 
// //         nickname, 
// //         passcode,
// //         ...deviceInfo
// //       });
      
// //       socket.emit('getUsers', { passcode });
// //     });

// //     socket.on('connect_error', (err) => {
// //       console.error('Socket Error:', err);
// //     });

// //     socket.on('disconnect', (reason) => {
// //       console.log('Disconnected:', reason);
// //     });

// //     // socket.on('chatHistory', (data: Message[]) => {
// //     //   setMessages(data || []);
// //     // });

// //   socket.on('chatHistory', (data: Message[]) => {
// //   console.log(
// //     'History received:',
// //     data.length,
// //   );

// //   setMessages(data || []);
// // });

// //     // socket.on('newMessage', (data: Message) => {
// //     //       // i have add this
// //     //        console.log('New message:', data.id);
// //     //   setMessages((prev) => {
// //     //     const exists = prev.some(
// //     //       (msg) =>
// //     //         msg.id === data.id ||
// //     //         (msg.nickname === data.nickname &&
// //     //           msg.message === data.message &&
// //     //           msg.createdAt === data.createdAt),
// //     //     );

// //     //     if (exists) return prev;
// //     //     return [...prev, data];
// //     //   });
// //     // });

// // socket.on('newMessage', (data: Message) => {
// //   console.log('New message:', data.id);

// //   setMessages((prev) => {
// //     const exists = prev.some(
// //       (msg) => msg.id === data.id,
// //     );

// //     if (exists) {
// //       return prev;
// //     }

// //     return [...prev, data];
// //   });
// // });
    
// //     socket.on('usersList', (data: User[]) => {
// //       console.log('Users List:', data);
// //       setUsers(data || []);
// //     });

// //     socket.on('userOnline', ({ nickname }) => {
// //       setUsers((prev) =>
// //         prev.map((user) =>
// //           user.nickname === nickname
// //             ? { ...user, isOnline: true, lastSeen: undefined }
// //             : user,
// //         ),
// //       );
// //     });

// //     socket.on('userOffline', ({ nickname, lastSeen }) => {
// //       setUsers((prev) =>
// //         prev.map((user) =>
// //           user.nickname === nickname
// //             ? { ...user, isOnline: false, lastSeen }
// //             : user,
// //         ),
// //       );
// //     });

// //     socket.on('userJoined', ({ nickname }) => {
// //       setMessages((prev) => [
// //         ...prev,
// //         {
// //           nickname: 'System',
// //           message: `${nickname} joined`,
// //           createdAt: new Date().toISOString(),
// //         },
// //       ]);
// //     });

// //     socket.on('userLeft', ({ nickname }) => {
// //       setMessages((prev) => [
// //         ...prev,
// //         {
// //           nickname: 'System',
// //           message: `${nickname} left`,
// //           createdAt: new Date().toISOString(),
// //         },
// //       ]);
// //     });

// //     socket.on('userTyping', (data: { nickname: string }) => {
// //       if (data.nickname === nickname) return;
// //       setTypingUser(data.nickname);
// //     });

// //     socket.on('userStoppedTyping', (data: { nickname: string }) => {
// //       if (data.nickname === nickname) return;
// //       setTypingUser('');
// //     });

// //     return () => {
// //       socket.removeAllListeners();
// //       socket.disconnect();
// //       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// //     };
// //   }, [nickname, passcode, navigate]);

// //   useEffect(() => {
// //     if (chatRef.current) {
// //       chatRef.current.scrollTop = chatRef.current.scrollHeight;
// //     }
// //   }, [messages]);

// //   const handleInputChange = (value: string) => {
// //     setMessage(value);

// //     socketRef.current?.emit('typing', {
// //       nickname,
// //       passcode,
// //     });

// //     if (typingTimeoutRef.current) {
// //       clearTimeout(typingTimeoutRef.current);
// //     }

// //     typingTimeoutRef.current = setTimeout(() => {
// //       socketRef.current?.emit('stopTyping', {
// //         nickname,
// //         passcode,
// //       });
// //     }, 1500);
// //   };

// //   const sendMessage = () => {
// //     const text = message.trim();
// //     if (!text || !socketRef.current?.connected) {
// //       return;
// //     }

// //     if (typingTimeoutRef.current) {
// //       clearTimeout(typingTimeoutRef.current);
// //     }
// //     socketRef.current?.emit('stopTyping', {
// //       nickname,
// //       passcode,
// //     });

// //     socketRef.current?.emit('sendMessage', {
// //       nickname,
// //       passcode,
// //       message: text,
// //       replyTo: replyTo
// //         ? {
// //             id: replyTo.id,
// //             nickname: replyTo.nickname,
// //             message: replyTo.message,
// //           }
// //         : null,
// //     });

// //     setMessage('');
// //     setReplyTo(null);
// //   };

// //   return (
// //     <div style={{ padding: 20 }}>
// //       {/* USERS */}
// //       <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
// //         <h3>Users</h3>
// //         {users.map((user) => (
// //           <div key={user.id}>
// //             <strong>{user.nickname}</strong> -{' '}
// //             {user.isOnline ? '🟢 Online' : '🔴 Offline'}
// //             <br />
// //             Device: {user.deviceModel || user.deviceType || 'Unknown'}
// //             <br />
// //             OS: {user.os || 'Unknown'}
// //             <br />
// //             Browser: {user.browser || 'Unknown'}
// //             <hr />
// //           </div>
// //         ))}
// //       </div>

// //       {/* CHAT */}
// //       <div
// //         ref={chatRef}
// //         style={{
// //           border: '1px solid #ccc',
// //           height: 400,
// //           overflowY: 'auto',
// //           padding: 10,
// //           marginBottom: 10,
// //         }}
// //       >
// //         {messages.map((msg, index) => (
// //           <div
// //             key={msg.id || `${msg.nickname}-${msg.createdAt}-${index}`}
// //             onClick={() => setReplyTo(msg)}
// //             style={{ cursor: 'pointer', marginBottom: 12 }}
// //           >
// //             {msg.replyTo && (
// //               <div
// //                 style={{
// //                   borderLeft: '3px solid gray',
// //                   paddingLeft: 8,
// //                   marginBottom: 4,
// //                   fontSize: 12,
// //                   opacity: 0.8,
// //                 }}
// //               >
// //                 <strong>{msg.replyTo.nickname}</strong>
// //                 <br />
// //                 {msg.replyTo.message}
// //               </div>
// //             )}
// //             <div>
// //               <strong>{msg.nickname}</strong>
// //               {msg.nickname === nickname && ' (You)'}
// //               <br />

// //               {msg.message && (
// //                 <div style={{ marginBottom: 5 }}>
// //                   {msg.message}
// //                 </div>
// //               )}

// //               {msg.fileUrl && (
// //                 <div style={{ marginTop: 5 }}>
// //                   {/* IMAGE */}
// //                   {msg.fileType?.startsWith('image/') && (
// //                     <img
// //                       src={`${SOCKET_URL}${msg.fileUrl}`}
// //                       alt={msg.fileName}
// //                       style={{
// //                         maxWidth: 300,
// //                         maxHeight: 300,
// //                         borderRadius: 8,
// //                         display: 'block',
// //                       }}
// //                     />
// //                   )}

// //                   {/* VIDEO */}
// //                   {msg.fileType?.startsWith('video/') && (
// //                     <video
// //                       controls
// //                       style={{
// //                         maxWidth: 350,
// //                         borderRadius: 8,
// //                       }}
// //                     >
// //                       <source
// //                         src={`${SOCKET_URL}${msg.fileUrl}`}
// //                         type={msg.fileType}
// //                       />
// //                     </video>
// //                   )}

// //                   {/* AUDIO */}
// //                   {msg.fileType?.startsWith('audio/') && (
// //                     <audio controls>
// //                       <source
// //                         src={`${SOCKET_URL}${msg.fileUrl}`}
// //                         type={msg.fileType}
// //                       />
// //                     </audio>
// //                   )}

// //                   {/* PDF */}
// //                   {msg.fileType === 'application/pdf' && (
// //                     <iframe
// //                       src={`${SOCKET_URL}${msg.fileUrl}`}
// //                       title={msg.fileName}
// //                       width="100%"
// //                       height="500"
// //                       style={{
// //                         border: '1px solid #ddd',
// //                         borderRadius: 8,
// //                       }}
// //                     />
// //                   )}

// //                   {/* TEXT FILES */}
// //                   {(msg.fileType === 'text/plain' ||
// //                     msg.fileType === 'application/json') && (
// //                     <a
// //                       href={`${SOCKET_URL}${msg.fileUrl}`}
// //                       target="_blank"
// //                       rel="noreferrer"
// //                     >
// //                       📄 View {msg.fileName}
// //                     </a>
// //                   )}

// //                   {/* WORD */}
// //                   {(msg.fileType ===
// //                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
// //                     msg.fileType === 'application/msword') && (
// //                     <a
// //                       href={`${SOCKET_URL}${msg.fileUrl}`}
// //                       target="_blank"
// //                       rel="noreferrer"
// //                     >
// //                       📝 Open Word File ({msg.fileName})
// //                     </a>
// //                   )}

// //                   {/* EXCEL */}
// //                   {(msg.fileType ===
// //                     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
// //                     msg.fileType ===
// //                       'application/vnd.ms-excel') && (
// //                     <a
// //                       href={`${SOCKET_URL}${msg.fileUrl}`}
// //                       target="_blank"
// //                       rel="noreferrer"
// //                     >
// //                       📊 Open Excel File ({msg.fileName})
// //                     </a>
// //                   )}

// //                   {/* POWERPOINT */}
// //                   {(msg.fileType ===
// //                     'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
// //                     msg.fileType ===
// //                       'application/vnd.ms-powerpoint') && (
// //                     <a
// //                       href={`${SOCKET_URL}${msg.fileUrl}`}
// //                       target="_blank"
// //                       rel="noreferrer"
// //                     >
// //                       📽 Open PowerPoint ({msg.fileName})
// //                     </a>
// //                   )}

// //                   {/* ZIP */}
// //                   {(msg.fileType === 'application/zip' ||
// //                     msg.fileType ===
// //                       'application/x-zip-compressed') && (
// //                     <a
// //                       href={`${SOCKET_URL}${msg.fileUrl}`}
// //                       download
// //                     >
// //                       📦 Download ZIP ({msg.fileName})
// //                     </a>
// //                   )}

// //                   {/* FALLBACK */}
// //                   {!msg.fileType?.startsWith('image/') &&
// //                     !msg.fileType?.startsWith('video/') &&
// //                     !msg.fileType?.startsWith('audio/') &&
// //                     msg.fileType !== 'application/pdf' &&
// //                     msg.fileType !== 'text/plain' &&
// //                     msg.fileType !== 'application/json' &&
// //                     msg.fileType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
// //                     msg.fileType !== 'application/msword' &&
// //                     msg.fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
// //                     msg.fileType !== 'application/vnd.ms-excel' &&
// //                     msg.fileType !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation' &&
// //                     msg.fileType !== 'application/vnd.ms-powerpoint' &&
// //                     msg.fileType !== 'application/zip' &&
// //                     msg.fileType !== 'application/x-zip-compressed' && (
// //                       <div>
// //                         <a
// //                           href={`${SOCKET_URL}${msg.fileUrl}`}
// //                           target="_blank"
// //                           rel="noreferrer"
// //                           download
// //                         >
// //                           📎 {msg.fileName}
// //                         </a>
// //                       </div>
// //                     )}
// //                 </div>
// //               )}
// //             </div>
// //           </div>
// //         ))}
// //       </div>

// //       <div style={{ marginBottom: 10 }}>
// //         <input type="file" onChange={handleFile} />
// //       </div>

// //       {replyTo && (
// //         <div
// //           style={{
// //             border: '1px solid #ccc',
// //             padding: 8,
// //             marginBottom: 10,
// //           }}
// //         >
// //           Replying to <strong>{replyTo.nickname}</strong>
// //           <br />
// //           {replyTo.message || (replyTo.fileUrl ? '📁 File attachment' : '')}
// //           <button onClick={() => setReplyTo(null)} style={{ marginLeft: 10 }}>
// //             X
// //           </button>
// //         </div>
// //       )}

// //       {typingUser && (
// //         <div
// //           style={{
// //             fontSize: 12,
// //             color: 'gray',
// //             marginBottom: 10,
// //           }}
// //         >
// //           {typingUser} is typing...
// //         </div>
// //       )}

// //       <div style={{ display: 'flex', gap: 10 }}>
// //         <input
// //           type="text"
// //           value={message}
// //           placeholder="Type message..."
// //           onChange={(e) => handleInputChange(e.target.value)}
// //           onKeyDown={(e) => {
// //             if (e.key === 'Enter') sendMessage();
// //           }}
// //           style={{ flex: 1, padding: 10 }}
// //         />
// //         <button onClick={sendMessage}>Send</button>
// //       </div>
// //     </div>
// //   );
// // }

// // export default ChatRoom;


// // // import React, { useEffect, useRef, useState, MouseEvent, ChangeEvent } from 'react';
// // // import { io, Socket } from 'socket.io-client';
// // // import { useNavigate } from 'react-router-dom';

// // // const SOCKET_URL = 'https://backend-9i6w.onrender.com';

// // // // ── Types ────────────────────────────────────────────────────────────────────

// // // interface Message {
// // //   id?: number;
// // //   nickname: string;
// // //   message: string;
// // //   createdAt?: string;
// // //   fileUrl?: string;
// // //   fileName?: string;
// // //   fileType?: string;
// // //   fileSize?: number;
// // //   replyTo?: {
// // //     id?: number;
// // //     nickname: string;
// // //     message: string;
// // //   } | null;
// // // }

// // // interface User {
// // //   id: number;
// // //   nickname: string;
// // //   isOnline: boolean;
// // //   lastSeen?: string;
// // //   deviceType?: string;
// // //   deviceModel?: string;
// // //   browser?: string;
// // //   os?: string;
// // // }

// // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // const getDeviceMetadata = () => {
// // //   const ua = navigator.userAgent;
// // //   let browser = 'Unknown Browser';
// // //   let os = 'Unknown OS';
// // //   let deviceType = 'Desktop';

// // //   if (ua.includes('Firefox')) browser = 'Firefox';
// // //   else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
// // //   else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
// // //   else if (ua.includes('Trident')) browser = 'Internet Explorer';
// // //   else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
// // //   else if (ua.includes('Chrome')) browser = 'Chrome';
// // //   else if (ua.includes('Safari')) browser = 'Safari';

// // //   if (ua.includes('Windows')) os = 'Windows';
// // //   else if (ua.includes('Macintosh')) os = 'macOS';
// // //   else if (ua.includes('Android')) { os = 'Android'; deviceType = 'Mobile'; }
// // //   else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
// // //   else if (ua.includes('Linux')) os = 'Linux';

// // //   return {
// // //     deviceType,
// // //     deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop',
// // //     browser,
// // //     os,
// // //   };
// // // };

// // // const fmt = (d?: string) =>
// // //   d
// // //     ? new Date(d).toLocaleString('en-IN', {
// // //         day: '2-digit',
// // //         month: 'short',
// // //         hour: '2-digit',
// // //         minute: '2-digit',
// // //         hour12: true,
// // //       })
// // //     : '';

// // // const avatarColor = (name: string): [string, string] => {
// // //   const palette: [string, string][] = [
// // //     ['#e8d5ff', '#6c3ac7'],
// // //     ['#cff3e9', '#1d7a5e'],
// // //     ['#ffd6cc', '#c44d22'],
// // //     ['#d0e8ff', '#1a5fa0'],
// // //     ['#ffeacc', '#a0650a'],
// // //     ['#ffd6ec', '#a02060'],
// // //   ];
// // //   const idx = (name.charCodeAt(0) || 0) % palette.length;
// // //   return palette[idx];
// // // };

// // // const formatFileSize = (bytes?: number) => {
// // //   if (!bytes) return '';
// // //   if (bytes < 1024) return `${bytes} B`;
// // //   if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
// // //   return `${(bytes / 1048576).toFixed(1)} MB`;
// // // };

// // // // ── Component ─────────────────────────────────────────────────────────────────

// // // export default function ChatRoom() {
// // //   const navigate = useNavigate();

// // //   const nickname = localStorage.getItem('nickname') || '';
// // //   const passcode = localStorage.getItem('passcode') || '';

// // //   const [message, setMessage] = useState('');
// // //   const [messages, setMessages] = useState<Message[]>([]);
// // //   const [users, setUsers] = useState<User[]>([]);
// // //   const [replyTo, setReplyTo] = useState<Message | null>(null);
// // //   const [typingUser, setTypingUser] = useState('');
// // //   const [showMembersDropdown, setShowMembersDropdown] = useState(false);

// // //   const socketRef = useRef<Socket | null>(null);
// // //   const chatRef = useRef<HTMLDivElement>(null);
// // //   const inputRef = useRef<HTMLInputElement>(null);
// // //   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// // //   const fileInputRef = useRef<HTMLInputElement>(null);

// // //   // ── Socket setup ────────────────────────────────────────────────────────────

// // //   useEffect(() => {
// // //     if (!nickname || !passcode) {
// // //       navigate('/');
// // //       return;
// // //     }

// // //     const socket = io(SOCKET_URL, {
// // //       transports: ['websocket'],
// // //       reconnection: true,
// // //       reconnectionAttempts: Infinity,
// // //       reconnectionDelay: 1000,
// // //     });
// // //     socketRef.current = socket;

// // //     socket.on('connect', () => {
// // //       const deviceInfo = getDeviceMetadata();
// // //       socket.emit('joinRoom', { nickname, passcode, ...deviceInfo });
// // //       socket.emit('getUsers', { passcode });
// // //     });

// // //     socket.on('chatHistory', (data: Message[]) => {
// // //       setMessages(data || []);
// // //     });

// // //     socket.on('newMessage', (data: Message) => {
// // //       setMessages((prev) => {
// // //         const exists = prev.some((msg) => msg.id === data.id);
// // //         return exists ? prev : [...prev, data];
// // //       });
// // //     });

// // //     socket.on('usersList', (data: User[]) => setUsers(data || []));

// // //     socket.on('userOnline', ({ nickname: n }: { nickname: string }) => {
// // //       setUsers((prev) =>
// // //         prev.map((u) => (u.nickname === n ? { ...u, isOnline: true, lastSeen: undefined } : u)),
// // //       );
// // //     });

// // //     socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) => {
// // //       setUsers((prev) =>
// // //         prev.map((u) => (u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)),
// // //       );
// // //     });

// // //     socket.on('userJoined', ({ nickname: n }: { nickname: string }) => {
// // //       setMessages((prev) => [
// // //         ...prev,
// // //         { nickname: 'System', message: `${n} joined`, createdAt: new Date().toISOString() },
// // //       ]);
// // //     });

// // //     socket.on('userLeft', ({ nickname: n }: { nickname: string }) => {
// // //       setMessages((prev) => [
// // //         ...prev,
// // //         { nickname: 'System', message: `${n} left`, createdAt: new Date().toISOString() },
// // //       ]);
// // //     });

// // //     socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
// // //       if (n !== nickname) setTypingUser(n);
// // //     });

// // //     socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
// // //       if (n !== nickname) setTypingUser('');
// // //     });

// // //     return () => {
// // //       socket.removeAllListeners();
// // //       socket.disconnect();
// // //       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// // //     };
// // //   }, [nickname, passcode, navigate]);

// // //   // Auto-scroll
// // //   useEffect(() => {
// // //     if (chatRef.current) {
// // //       chatRef.current.scrollTop = chatRef.current.scrollHeight;
// // //     }
// // //   }, [messages]);

// // //   // Close member list dropdown if clicked outside
// // //   useEffect(() => {
// // //     const handleOutsideClick = () => setShowMembersDropdown(false);
// // //     if (showMembersDropdown) {
// // //       window.addEventListener('click', handleOutsideClick);
// // //     }
// // //     return () => window.removeEventListener('click', handleOutsideClick);
// // //   }, [showMembersDropdown]);

// // //   // ── Handlers ─────────────────────────────────────────────────────────────────

// // //   const handleInputChange = (value: string) => {
// // //     setMessage(value);
// // //     socketRef.current?.emit('typing', { nickname, passcode });
// // //     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// // //     typingTimeoutRef.current = setTimeout(() => {
// // //       socketRef.current?.emit('stopTyping', { nickname, passcode });
// // //     }, 1500);
// // //   };

// // //   const sendMessage = () => {
// // //     const text = message.trim();
// // //     if (!text || !socketRef.current?.connected) return;
// // //     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
// // //     socketRef.current?.emit('stopTyping', { nickname, passcode });
// // //     socketRef.current?.emit('sendMessage', {
// // //       nickname,
// // //       passcode,
// // //       message: text,
// // //       replyTo: replyTo
// // //         ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
// // //         : null,
// // //     });
// // //     setMessage('');
// // //     setReplyTo(null);
// // //   };

// // //   const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
// // //     const file = e.target.files?.[0];
// // //     if (!file) return;
// // //     const formData = new FormData();
// // //     formData.append('file', file);
// // //     try {
// // //       const response = await fetch(`${SOCKET_URL}/api/upload`, {
// // //         method: 'POST',
// // //         body: formData,
// // //       });
// // //       const uploaded = await response.json();
// // //       socketRef.current?.emit('sendMessage', {
// // //         nickname,
// // //         passcode,
// // //         message: '',
// // //         fileUrl: uploaded.fileUrl,
// // //         fileName: uploaded.fileName,
// // //         fileType: uploaded.fileType,
// // //         fileSize: uploaded.fileSize,
// // //         replyTo: replyTo
// // //           ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message }
// // //           : null,
// // //       });
// // //       setReplyTo(null);
// // //       e.target.value = '';
// // //     } catch (err) {
// // //       console.error('File upload failed:', err);
// // //     }
// // //   };

// // //   const onlineCount = users.filter((u) => u.isOnline).length;
// // //   const [myBg, myFg] = avatarColor(nickname);

// // //   // ── File renderer ────────────────────────────────────────────────────────────

// // //   const renderFile = (msg: Message) => {
// // //     if (!msg.fileUrl) return null;
// // //     const src = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${SOCKET_URL}${msg.fileUrl}`;
// // //     const { fileType, fileName, fileSize } = msg;

// // //     if (fileType?.startsWith('image/')) {
// // //       return (
// // //         <a href={src} target="_blank" rel="noreferrer" className="d-block mt-1">
// // //           <img src={src} alt={fileName || 'Attachment'} className="img-fluid rounded-3 shadow-sm border border-secondary border-opacity-25" style={{ maxHeight: '260px' }} />
// // //         </a>
// // //       );
// // //     }
// // //     if (fileType?.startsWith('video/')) {
// // //       return (
// // //         <video controls className="w-100 rounded-3 mt-1 shadow-sm" style={{ maxWidth: '300px' }}>
// // //           <source src={src} type={fileType} />
// // //         </video>
// // //       );
// // //     }
// // //     if (fileType?.startsWith('audio/')) {
// // //       return <audio controls src={src} className="w-100 mt-1" style={{ minWidth: '240px' }} />;
// // //     }
// // //     if (fileType === 'application/pdf') {
// // //       return (
// // //         <iframe src={src} title={fileName || 'PDF Document'} className="w-100 rounded-3 mt-1 border-0 shadow-sm" style={{ height: '350px' }} />
// // //       );
// // //     }

// // //     const icon =
// // //       fileType?.includes('word') ? '📝' :
// // //       fileType?.includes('sheet') || fileType?.includes('excel') ? '📊' :
// // //       fileType?.includes('presentation') || fileType?.includes('powerpoint') ? '📽' :
// // //       fileType?.includes('zip') ? '📦' :
// // //       fileType === 'text/plain' || fileType === 'application/json' ? '📄' : '📎';

// // //     return (
// // //       <a href={src} target="_blank" rel="noreferrer" download className="btn btn-sm btn-secondary bg-opacity-20 d-inline-flex align-items-center gap-2 mt-1 text-start border border-light border-opacity-10 text-wrap text-break" style={{ maxWidth: '260px' }}>
// // //         <span style={{ fontSize: '1.3rem' }}>{icon}</span>
// // //         <div className="min-w-0">
// // //           <div className="text-white fw-medium text-truncate" style={{ fontSize: '0.85rem' }}>{fileName || 'Download File'}</div>
// // //           {fileSize && <small className="text-white-50 d-block" style={{ fontSize: '0.75rem' }}>{formatFileSize(fileSize)}</small>}
// // //         </div>
// // //       </a>
// // //     );
// // //   };

// // //   // ── Render ────────────────────────────────────────────────────────────────────

// // //   return (
// // //     <div className="d-flex flex-column vh-100 w-100 bg-dark text-light overflow-hidden position-relative">
      
// // //       {/* ── Navbar Header Layer (Proper flow validation setup) ── */}
// // //       <nav className="navbar navbar-dark bg-secondary bg-gradient bg-opacity-25 border-bottom border-secondary border-opacity-25 px-3 flex-shrink-0 style-navbar-container">
// // //         <div className="container-fluid p-0 d-flex align-items-center justify-content-between position-relative">
          
// // //           {/* Active Member Dropdown Trigger wrapper setup */}
// // //           <div className="position-relative">
// // //             <div 
// // //               className="d-flex align-items-center gap-2 style-clickable-header rounded-3 p-1 px-2"
// // //               style={{ cursor: 'pointer', transition: 'background 0.2s' }}
// // //               onClick={(e: MouseEvent<HTMLDivElement>) => {
// // //                 e.stopPropagation();
// // //                 setShowMembersDropdown(!showMembersDropdown);
// // //               }}
// // //             >
// // //               <span className="fs-4">💬</span>
// // //               <div>
// // //                 <h1 className="navbar-brand m-0 fs-6 fw-bold d-flex align-items-center gap-1">
// // //                   Chat Room <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>▼</span>
// // //                 </h1>
// // //                 <small className="text-info d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
// // //                   <span className="d-inline-block bg-success rounded-circle animate-pulse" style={{ width: '6px', height: '6px' }} />
// // //                   {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
// // //                 </small>
// // //               </div>
// // //             </div>

// // //             {/* Adjusted absolute layout to sit naturally BELOW the heading grid */}
// // //             {showMembersDropdown && (
// // //               <div 
// // //                 className="position-absolute bg-dark border border-secondary border-opacity-50 rounded-3 shadow-lg p-2 m-0 style-dropdown-box"
// // //                 onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
// // //               >
// // //                 <div className="text-white-50 fw-bold px-2 py-1 mb-1 border-bottom border-secondary border-opacity-25" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
// // //                   MEMBERS ({users.length})
// // //                 </div>
// // //                 <ul className="list-unstyled m-0 p-0" style={{ maxHeight: '280px', overflowY: 'auto' }}>
// // //                   {users.map((u) => {
// // //                     const [bg, fg] = avatarColor(u.nickname);
// // //                     return (
// // //                       <li key={u.id} className="d-flex align-items-center gap-2 p-2 rounded-2 style-user-dropdown-item">
// // //                         <div className="position-relative flex-shrink-0">
// // //                           <div 
// // //                             className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
// // //                             style={{ width: '32px', height: '32px', background: bg, color: fg, fontSize: '0.75rem' }}
// // //                           >
// // //                             {u.nickname.slice(0, 2).toUpperCase()}
// // //                           </div>
// // //                           <span 
// // //                             className="position-absolute bottom-0 end-0 rounded-circle border border-dark" 
// // //                             style={{ width: '9px', height: '9px', background: u.isOnline ? '#4ade80' : '#6b7280', borderWidth: '2px' }}
// // //                           />
// // //                         </div>
// // //                         <div className="min-w-0 d-flex flex-column">
// // //                           <span className="text-light text-truncate fw-medium" style={{ fontSize: '0.85rem' }}>
// // //                             {u.nickname} {u.nickname === nickname && <span className="text-white-50 fw-normal" style={{ fontSize: '0.75rem' }}>(You)</span>}
// // //                           </span>
// // //                           {!u.isOnline && u.lastSeen && (
// // //                             <small className="text-white-50" style={{ fontSize: '0.65rem' }}>Seen: {fmt(u.lastSeen)}</small>
// // //                           )}
// // //                           {u.browser && u.os && (
// // //                             <small className="text-white-50 opacity-50" style={{ fontSize: '0.6rem' }}>{u.browser} · {u.os}</small>
// // //                           )}
// // //                         </div>
// // //                       </li>
// // //                     );
// // //                   })}
// // //                 </ul>
// // //               </div>
// // //             )}
// // //           </div>

// // //           {/* Current User Profile Display Segment */}
// // //           <div className="d-flex align-items-center gap-2">
// // //             <div className="text-end d-none d-sm-block">
// // //               <div className="fw-semibold text-truncate text-light" style={{ fontSize: '0.9rem', maxWidth: '140px' }}>{nickname}</div>
// // //               <small className="text-white-50 opacity-50" style={{ fontSize: '0.7rem' }}>Authorized</small>
// // //             </div>
// // //             <div 
// // //               className="rounded-circle d-flex align-items-center justify-content-center fw-bold border border-light border-opacity-10 shadow-sm flex-shrink-0"
// // //               style={{ width: '40px', height: '40px', background: myBg, color: myFg, fontSize: '0.85rem', letterSpacing: '0.5px' }}
// // //             >
// // //               {nickname.slice(0, 2).toUpperCase()}
// // //             </div>
// // //           </div>
// // //         </div>
// // //       </nav>

// // //       {/* ── Messages Stream Output Box ── */}
// // //       <div ref={chatRef} className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2 bg-gradient" style={{ scrollbarWidth: 'thin' }}>
// // //         {messages.map((msg, i) => {
// // //           const me = msg.nickname === nickname;
// // //           const sys = msg.nickname === 'System';

// // //           if (sys) {
// // //             return (
// // //               <div key={msg.id ?? `sys-${i}`} className="align-self-center text-center px-3 py-1 rounded-pill bg-secondary bg-opacity-20 border border-light border-opacity-5 text-white-50 m-1" style={{ fontSize: '0.75rem', maxWidth: '85%' }}>
// // //                 <span>{msg.message}</span>
// // //               </div>
// // //             );
// // //           }

// // //           const [bg, fg] = avatarColor(msg.nickname);
// // //           return (
// // //             <div
// // //               key={msg.id ?? `${msg.nickname}-${msg.createdAt}-${i}`}
// // //               className={`d-flex align-items-end gap-2 style-msg-row ${me ? 'align-self-end flex-row-reverse' : 'align-self-start'}`}
// // //               style={{ maxWidth: '78%', cursor: 'pointer' }}
// // //               onClick={() => setReplyTo(msg)}
// // //               title="Click to point/reply"
// // //             >
// // //               {!me && (
// // //                 <div 
// // //                   className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 mb-1 border border-dark border-opacity-25" 
// // //                   style={{ width: '30px', height: '30px', background: bg, color: fg, fontSize: '0.7rem' }}
// // //                 >
// // //                   {msg.nickname.slice(0, 2).toUpperCase()}
// // //                 </div>
// // //               )}
// // //               <div className={`d-flex flex-column gap-1 min-w-0 ${me ? 'align-items-end' : 'align-items-start'}`}>
// // //                 {!me && <small className="text-white-50 fw-semibold px-1" style={{ fontSize: '0.75rem' }}>{msg.nickname}</small>}

// // //                 <div 
// // //                   className={`p-2 px-3 rounded-4 style-bubble shadow-sm ${me ? 'bg-primary text-white bg-gradient' : 'bg-secondary bg-opacity-25 text-light border border-light border-opacity-10'}`}
// // //                   style={{ 
// // //                     wordBreak: 'break-word', 
// // //                     fontSize: '0.92rem',
// // //                     borderRadius: me ? '1.1rem 1.1rem 0.25rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.25rem'
// // //                   }}
// // //                 >
// // //                   {/* Thread reply structural verification metadata wrapper */}
// // //                   {msg.replyTo && (
// // //                     <div className={`p-2 rounded-3 text-start border-start border-3 bg-dark bg-opacity-25 d-flex flex-column mb-2 ${me ? 'border-white border-opacity-50' : 'border-primary'}`} style={{ fontSize: '0.75rem' }}>
// // //                       <span className="fw-bold text-info" style={{ fontSize: '0.7rem' }}>@{msg.replyTo.nickname}</span>
// // //                       <span className="text-white-50 text-truncate" style={{ maxWidth: '240px' }}>
// // //                         {msg.replyTo.message || '📁 Attachment'}
// // //                       </span>
// // //                     </div>
// // //                   )}

// // //                   {msg.message && <div className="mb-0 leading-relaxed">{msg.message}</div>}
// // //                   {renderFile(msg)}
// // //                 </div>

// // //                 {msg.createdAt && (
// // //                   <small className="text-white-50 opacity-50 px-1 mt-auto" style={{ fontSize: '0.65rem' }}>
// // //                     {fmt(msg.createdAt)}
// // //                   </small>
// // //                 )}
// // //               </div>
// // //             </div>
// // //           );
// // //         })}

// // //         {/* Dynamic Typing Stream Container */}
// // //         {typingUser && (
// // //           <div className="align-self-start d-flex align-items-center gap-2 p-2 px-3 rounded-pill bg-secondary bg-opacity-20 border border-light border-opacity-5 mt-1" style={{ maxWidth: '220px' }}>
// // //             <div className="d-flex gap-1 align-items-center">
// // //               <span className="cr-typing-dot bg-info rounded-circle" style={{ width: '5px', height: '5px' }} />
// // //               <span className="cr-typing-dot bg-info rounded-circle" style={{ width: '5px', height: '5px' }} />
// // //               <span className="cr-typing-dot bg-info rounded-circle" style={{ width: '5px', height: '5px' }} />
// // //             </div>
// // //             <small className="text-white-50" style={{ fontSize: '0.75rem' }}>{typingUser} is typing…</small>
// // //           </div>
// // //         )}
// // //       </div>

// // //       {/* ── Reply Bar Reference Layer ── */}
// // //       {replyTo && (
// // //         <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-info bg-opacity-10 border-top border-info border-opacity-25 flex-shrink-0 slide-up-animation">
// // //           <div className="min-w-0 d-flex flex-column">
// // //             <small className="text-info fw-bold text-uppercase" style={{ fontSize: '0.62rem', letterSpacing: '0.3px' }}>Replying to</small>
// // //             <span className="fw-semibold text-light text-truncate" style={{ fontSize: '0.82rem', maxWidth: '180px' }}>{replyTo.nickname}</span>
// // //             <small className="text-white-50 text-truncate" style={{ fontSize: '0.75rem', maxWidth: '500px' }}>
// // //               {replyTo.message || (replyTo.fileUrl ? '📁 Attachment' : '')}
// // //             </small>
// // //           </div>
// // //           <button className="btn btn-sm btn-close btn-close-white bg-dark bg-opacity-20 rounded-circle p-1" onClick={() => setReplyTo(null)} aria-label="Cancel reply" style={{ width: '22px', height: '22px', fontSize: '0.5rem' }} />
// // //         </div>
// // //       )}

// // //       {/* ── Chat Control Input Composer Base ── */}
// // //       <footer className="p-3 bg-secondary bg-opacity-25 border-top border-secondary border-opacity-25 flex-shrink-0 style-z-index-med shadow-lg">
// // //         <div className="d-flex align-items-center gap-2 container-fluid p-0">
          
// // //           {/* File attachment selection triggers */}
// // //           <button
// // //             className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 text-light border-light border-opacity-10 bg-white bg-opacity-5 style-composer-btn"
// // //             onClick={() => fileInputRef.current?.click()}
// // //             aria-label="Attach file"
// // //             title="Attach file"
// // //             style={{ width: '42px', height: '42px', fontSize: '1.15rem', transition: 'background 0.2s, transform 0.1s' }}
// // //           >
// // //             📎
// // //           </button>
// // //           <input
// // //             ref={fileInputRef}
// // //             type="file"
// // //             onChange={handleFile}
// // //             className="d-none"
// // //           />

// // //           <input
// // //             ref={inputRef}
// // //             type="text"
// // //             className="form-control rounded-pill bg-dark bg-opacity-50 text-light border-secondary border-opacity-50 px-3 style-text-input"
// // //             value={message}
// // //             onChange={(e) => handleInputChange(e.target.value)}
// // //             onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
// // //             placeholder="Type a message…"
// // //             style={{ height: '42px', fontSize: '0.92rem' }}
// // //           />

// // //           <button 
// // //             className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 flex-shrink-0 shadow style-composer-btn" 
// // //             onClick={sendMessage} 
// // //             aria-label="Send message" 
// // //             style={{ width: '42px', height: '42px' }}
// // //           >
// // //             <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
// // //               <line x1="22" y1="2" x2="11" y2="13" />
// // //               <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // //             </svg>
// // //           </button>
// // //         </div>
// // //       </footer>

// // //       {/* Style layer override variables */}
// // //       <style>{`
// // //         .cr-typing-dot { animation: cr-bounce 1.2s infinite; }
// // //         .cr-typing-dot:nth-child(2) { animation-delay: 0.2s; }
// // //         .cr-typing-dot:nth-child(3) { animation-delay: 0.4s; }
// // //         @keyframes cr-bounce {
// // //           0%, 60%, 100% { transform: translateY(0); }
// // //           30% { transform: translateY(-4px); }
// // //         }
        
// // //         .animate-pulse { animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
// // //         @keyframes pulse-green {
// // //           0%, 100% { opacity: 1; transform: scale(1); }
// // //           50% { opacity: .4; transform: scale(1.2); }
// // //         }

// // //         .slide-up-animation { animation: slideUp 0.15s ease-out forwards; }
// // //         @keyframes slideUp {
// // //           from { transform: translateY(100%); opacity: 0; }
// // //           to { transform: translateY(0); opacity: 1; }
// // //         }

// // //         ::-webkit-scrollbar { width: 5px; height: 5px; }
// // //         ::-webkit-scrollbar-track { background: transparent; }
// // //         ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
// // //         ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

// // //         .style-navbar-container { z-index: 1060; position: relative; }
// // //         .style-z-index-med { z-index: 1040; }
        
// // //         /* Dropdown sits clean below header targets without hiding layouts */
// // //         .style-dropdown-box { 
// // //           top: calc(100% + 8px); 
// // //           left: 0; 
// // //           width: 280px; 
// // //           max-height: 340px; 
// // //           z-index: 1070; 
// // //         }

// // //         .style-msg-row:hover .style-bubble { filter: brightness(1.06); }
// // //         .style-text-input:focus { box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15); border-color: #0d6efd !important; }
// // //         .style-clickable-header:hover { background: rgba(255,255,255,0.06); }
// // //         .style-user-dropdown-item:hover { background: rgba(255,255,255,0.04); }
// // //         .style-composer-btn:active { transform: scale(0.93); }
// // //       `}</style>
// // //     </div>
// // //   );
// // // }

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
//   // Fix #6: was 'Mobileos', now 'Mobile'
//   else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; deviceType = 'Mobile'; }
//   else if (ua.includes('Linux')) os = 'Linux';

//   return {
//     deviceType,
//     deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop',
//     browser,
//     os,
//   };
// };

// // Fix #3: Helper to resolve file URLs that may be absolute or relative
// const resolveUrl = (fileUrl: string) =>
//   fileUrl.startsWith('http') ? fileUrl : `${SOCKET_URL}${fileUrl}`;

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

//   // Fix #5: updated to handle multiple files
//   const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files;
//     if (!files || files.length === 0) return;

//     for (const file of Array.from(files)) {
//       const formData = new FormData();
//       formData.append('file', file);

//       try {
//         const response = await fetch(`${SOCKET_URL}/api/upload`, {
//           method: 'POST',
//           body: formData,
//         });

//         // Fix #2: check response.ok before using the result
//         const uploaded = await response.json();
//         if (!response.ok) {
//           throw new Error(uploaded.message || 'Upload failed');
//         }

//         socketRef.current?.emit('sendMessage', {
//           nickname,
//           passcode,
//           message: '',
//           fileUrl: uploaded.fileUrl,
//           fileName: uploaded.fileName,
//           fileType: uploaded.fileType,
//           fileSize: uploaded.fileSize,
//           replyTo: replyTo
//             ? {
//                 id: replyTo.id,
//                 nickname: replyTo.nickname,
//                 message: replyTo.message,
//               }
//             : null,
//         });

//         setReplyTo(null);
//       } catch (err) {
//         console.error('File upload failed:', err);
//       }
//     }

//     e.target.value = '';
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
//       socket.emit('joinRoom', { nickname, passcode, ...deviceInfo });
//       socket.emit('getUsers', { passcode });
//     });

//     socket.on('connect_error', (err) => {
//       console.error('Socket Error:', err);
//     });

//     socket.on('disconnect', (reason) => {
//       console.log('Disconnected:', reason);
//     });

//     socket.on('chatHistory', (data: Message[]) => {
//       console.log('History received:', data.length);
//       setMessages(data || []);
//     });

//     // Fix #1: deduplicate by id only
//     socket.on('newMessage', (data: Message) => {
//       console.log('New message:', data.id);
//       setMessages((prev) => {
//         const exists = prev.some((msg) => msg.id === data.id);
//         if (exists) return prev;
//         return [...prev, data];
//       });
//     });

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
//         { nickname: 'System', message: `${nickname} joined`, createdAt: new Date().toISOString() },
//       ]);
//     });

//     socket.on('userLeft', ({ nickname }) => {
//       setMessages((prev) => [
//         ...prev,
//         { nickname: 'System', message: `${nickname} left`, createdAt: new Date().toISOString() },
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

//   // Fix #4: only auto-scroll when user is near the bottom
//   useEffect(() => {
//     if (!chatRef.current) return;
//     const { scrollHeight, scrollTop, clientHeight } = chatRef.current;
//     const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
//     if (isNearBottom) {
//       chatRef.current.scrollTop = scrollHeight;
//     }
//   }, [messages]);

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
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       {/* USERS */}
//       <div style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
//         <h3>Users</h3>
//         {users.map((user) => (
//           <div key={user.id}>
//             <strong>{user.nickname}</strong> —{' '}
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

//               {msg.message && <div style={{ marginBottom: 5 }}>{msg.message}</div>}

//               {msg.fileUrl && (
//                 <div style={{ marginTop: 5 }}>
//                   {/* Fix #3: use resolveUrl() throughout */}

//                   {msg.fileType?.startsWith('image/') && (
//                     <img
//                       src={resolveUrl(msg.fileUrl)}
//                       alt={msg.fileName}
//                       style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, display: 'block' }}
//                     />
//                   )}

//                   {msg.fileType?.startsWith('video/') && (
//                     <video controls style={{ maxWidth: 350, borderRadius: 8 }}>
//                       <source src={resolveUrl(msg.fileUrl)} type={msg.fileType} />
//                     </video>
//                   )}

//                   {msg.fileType?.startsWith('audio/') && (
//                     <audio controls>
//                       <source src={resolveUrl(msg.fileUrl)} type={msg.fileType} />
//                     </audio>
//                   )}

//                   {msg.fileType === 'application/pdf' && (
//                     <iframe
//                       src={resolveUrl(msg.fileUrl)}
//                       title={msg.fileName}
//                       width="100%"
//                       height="500"
//                       style={{ border: '1px solid #ddd', borderRadius: 8 }}
//                     />
//                   )}

//                   {(msg.fileType === 'text/plain' || msg.fileType === 'application/json') && (
//                     <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
//                       📄 View {msg.fileName}
//                     </a>
//                   )}

//                   {(msg.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
//                     msg.fileType === 'application/msword') && (
//                     <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
//                       📝 Open Word File ({msg.fileName})
//                     </a>
//                   )}

//                   {(msg.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
//                     msg.fileType === 'application/vnd.ms-excel') && (
//                     <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
//                       📊 Open Excel File ({msg.fileName})
//                     </a>
//                   )}

//                   {(msg.fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
//                     msg.fileType === 'application/vnd.ms-powerpoint') && (
//                     <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
//                       📽 Open PowerPoint ({msg.fileName})
//                     </a>
//                   )}

//                   {(msg.fileType === 'application/zip' || msg.fileType === 'application/x-zip-compressed') && (
//                     <a href={resolveUrl(msg.fileUrl)} download>
//                       📦 Download ZIP ({msg.fileName})
//                     </a>
//                   )}

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
//                       <a href={resolveUrl(msg.fileUrl)} target="_blank" rel="noreferrer" download>
//                         📎 {msg.fileName}
//                       </a>
//                     )}
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>

//       <div style={{ marginBottom: 10 }}>
//         {/* Fix #5: multiple files allowed */}
//         <input type="file" multiple onChange={handleFile} />
//       </div>

//       {replyTo && (
//         <div style={{ border: '1px solid #ccc', padding: 8, marginBottom: 10 }}>
//           Replying to <strong>{replyTo.nickname}</strong>
//           <br />
//           {replyTo.message || (replyTo.fileUrl ? '📁 File attachment' : '')}
//           <button onClick={() => setReplyTo(null)} style={{ marginLeft: 10 }}>
//             X
//           </button>
//         </div>
//       )}

//       {typingUser && (
//         <div style={{ fontSize: 12, color: 'gray', marginBottom: 10 }}>
//           {typingUser} is typing...
//         </div>
//       )}

//       <div style={{ display: 'flex', gap: 10 }}>
//         <input
//           type="text"
//           value={message}
//           placeholder="Type message..."
//           onChange={(e) => handleInputChange(e.target.value)}
//           onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
//           style={{ flex: 1, padding: 10 }}
//         />
//         <button onClick={sendMessage}>Send</button>
//       </div>
//     </div>
//   );
// }

// export default ChatRoom;

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const SOCKET_URL = 'https://backend-9i6w.onrender.com';

/* ─── Types ─────────────────────────────────────────────── */
interface ReplyRef {
  id?: number;
  nickname: string;
  message: string;
}

interface Message {
  id?: number;
  nickname: string;
  message: string;
  createdAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  replyTo?: ReplyRef;
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

/* ─── Helpers ────────────────────────────────────────────── */
const resolveUrl = (url: string) =>
  url.startsWith('http') ? url : `${SOCKET_URL}${url}`;

const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const fmtTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getDeviceMetadata = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown', os = 'Unknown', deviceType = 'Desktop';
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
  return { deviceType, deviceModel: deviceType === 'Mobile' ? 'Mobile Device' : 'PC/Laptop', browser, os };
};

const initials = (name: string) =>
  name.replace(/[^\w\s]/g, '').trim().slice(0, 2).toUpperCase() || '??';

/* ─── CSS (injected once) ────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Lato:wght@300;400;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --rose:        #D4537E;
  --rose-deep:   #993556;
  --rose-mid:    #ED93B1;
  --rose-light:  #FBEAF0;
  --rose-soft:   #F4C0D1;
  --plum:        #534AB7;
  --plum-light:  #EEEDFE;
  --plum-soft:   #CECBF6;
  --gold:        #BA7517;
  --gold-light:  #FAEEDA;
  --cream:       #FFF9FB;
  --text1:       #2C1A22;
  --text2:       #72243E;
  --text3:       #9E6B7E;
  --border:      rgba(212,83,126,.18);
  --shadow:      0 4px 24px rgba(212,83,126,.10);
}

@media (prefers-color-scheme: dark) {
  :root {
    --cream:   #1A0E14;
    --text1:   #F4C0D1;
    --text2:   #ED93B1;
    --text3:   #9E6B7E;
    --border:  rgba(212,83,126,.22);
  }
}

html, body, #root { height: 100%; }

.lr-app {
  display: flex;
  height: 100vh;
  background: var(--cream);
  font-family: 'Lato', sans-serif;
  color: var(--text1);
  overflow: hidden;
}

/* ── Sidebar ── */
.lr-sidebar {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--cream);
}

.lr-sidebar-head {
  padding: 22px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.lr-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 500;
  color: var(--rose);
  letter-spacing: .3px;
}

.lr-logo-heart {
  font-size: 20px;
  animation: heartbeat 1.4s ease-in-out infinite;
}

@keyframes heartbeat {
  0%,100% { transform: scale(1); }
  50%      { transform: scale(1.22); }
}

.lr-subtitle {
  font-size: 11px;
  color: var(--text3);
  margin-top: 2px;
  letter-spacing: .4px;
}

.lr-users {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.lr-user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 20px;
  cursor: pointer;
  transition: background .15s;
  border-left: 3px solid transparent;
}

.lr-user-item:hover  { background: var(--rose-light); }
.lr-user-item.active {
  background: var(--rose-light);
  border-left-color: var(--rose);
}

.lr-av {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  flex-shrink: 0;
  position: relative;
}

.lr-av-rose   { background: #F4C0D1; color: #72243E; }
.lr-av-plum   { background: #CECBF6; color: #3C3489; }
.lr-av-teal   { background: #9FE1CB; color: #085041; }
.lr-av-amber  { background: #FAC775; color: #633806; }
.lr-av-gray   { background: #D3D1C7; color: #444441; }

.lr-av-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  position: absolute;
  bottom: 1px; right: 1px;
  border: 2px solid var(--cream);
}
.lr-dot-on  { background: #1D9E75; }
.lr-dot-off { background: #B4B2A9; }

.lr-user-name  { font-size: 14px; font-weight: 700; color: var(--text1); }
.lr-user-meta  { font-size: 11px; color: var(--text3); margin-top: 1px; }
.lr-user-device{ font-size: 10px; color: var(--text3); }

.lr-sidebar-foot {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text3);
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ── Chat Main ── */
.lr-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.lr-chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--cream);
}

.lr-head-av    { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.lr-head-name  { font-size: 15px; font-weight: 700; color: var(--text1); }
.lr-head-status{ font-size: 11px; color: var(--text3); margin-top: 1px; }
.lr-head-status.online { color: #1D9E75; }

.lr-head-actions { margin-left: auto; display: flex; gap: 6px; }

.lr-icon-btn {
  width: 34px; height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--rose);
  font-size: 15px;
  transition: background .15s, transform .12s;
}
.lr-icon-btn:hover  { background: var(--rose-light); }
.lr-icon-btn:active { transform: scale(.92); }

/* ── Messages ── */
.lr-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scroll-behavior: smooth;
}

.lr-messages::-webkit-scrollbar { width: 4px; }
.lr-messages::-webkit-scrollbar-thumb { background: var(--rose-soft); border-radius: 4px; }

.lr-date-sep {
  text-align: center;
  font-size: 11px;
  color: var(--text3);
  margin: 8px 0;
  letter-spacing: .4px;
}

.lr-msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  animation: msgIn .22s ease;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.lr-msg-row.mine { flex-direction: row-reverse; }

.lr-msg-av {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700;
  flex-shrink: 0;
}

.lr-bubble {
  max-width: 65%;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
  cursor: pointer;
  transition: filter .12s;
}
.lr-bubble:hover { filter: brightness(.96); }

.lr-bubble.theirs {
  background: white;
  color: var(--text1);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}
.lr-bubble.mine {
  background: linear-gradient(135deg, #ED93B1 0%, #D4537E 100%);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.lr-bubble.system-msg {
  background: none;
  border: none;
  color: var(--text3);
  font-size: 11px;
  text-align: center;
  cursor: default;
  max-width: 100%;
  padding: 4px 0;
}
.lr-bubble:hover { filter: none; }
.lr-bubble.system-msg:hover { filter: none; }

.lr-bubble-time {
  display: block;
  font-size: 10px;
  margin-top: 5px;
  opacity: .6;
  text-align: right;
}
.lr-bubble.theirs .lr-bubble-time { text-align: left; }

.lr-reply-quote {
  border-left: 3px solid rgba(212,83,126,.5);
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 12px;
  background: rgba(212,83,126,.08);
}
.lr-reply-quote strong { display: block; color: var(--rose); margin-bottom: 2px; font-size: 11px; }
.lr-bubble.mine .lr-reply-quote {
  background: rgba(255,255,255,.18);
  border-left-color: rgba(255,255,255,.7);
}
.lr-bubble.mine .lr-reply-quote strong { color: rgba(255,255,255,.9); }
.lr-bubble.mine .lr-reply-quote span   { color: rgba(255,255,255,.8); }

/* ── File previews ── */
.lr-img-prev {
  max-width: 240px;
  border-radius: 10px;
  display: block;
  margin-top: 4px;
  cursor: zoom-in;
}

.lr-video-prev {
  max-width: 280px;
  border-radius: 10px;
  display: block;
  margin-top: 4px;
}

.lr-audio-prev {
  width: 240px;
  margin-top: 6px;
  display: block;
}

.lr-pdf-prev {
  width: 100%;
  height: 320px;
  border-radius: 10px;
  border: 1px solid var(--border);
  margin-top: 6px;
}

.lr-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  background: rgba(212,83,126,.1);
  text-decoration: none;
  color: var(--rose);
  font-size: 13px;
  font-weight: 700;
  transition: background .15s;
}
.lr-file-chip:hover { background: rgba(212,83,126,.18); }
.lr-bubble.mine .lr-file-chip { background: rgba(255,255,255,.22); color: #fff; }
.lr-bubble.mine .lr-file-chip:hover { background: rgba(255,255,255,.3); }

/* ── Typing ── */
.lr-typing {
  padding: 4px 20px 2px;
  font-size: 12px;
  color: var(--rose);
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
}

.lr-dots { display: flex; gap: 3px; }
.lr-dots span {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--rose);
  animation: dotBlink 1.2s infinite;
}
.lr-dots span:nth-child(2) { animation-delay: .2s; }
.lr-dots span:nth-child(3) { animation-delay: .4s; }

@keyframes dotBlink {
  0%,80%,100% { opacity: .2; }
  40%          { opacity: 1; }
}

/* ── Reply banner ── */
.lr-reply-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--rose-light);
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text2);
  animation: slideUp .15s ease;
}
@keyframes slideUp { from { transform: translateY(6px); opacity: 0; } }
.lr-reply-bar strong { color: var(--rose); }
.lr-reply-bar-close {
  margin-left: auto;
  background: none; border: none;
  cursor: pointer;
  color: var(--text3);
  font-size: 18px;
  line-height: 1;
  padding: 0 2px;
}

/* ── Lightbox ── */
.lr-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn .18s ease;
}
@keyframes fadeIn { from { opacity: 0; } }
.lr-lightbox img {
  max-width: 90vw;
  max-height: 88vh;
  border-radius: 12px;
}
.lr-lightbox-close {
  position: absolute;
  top: 18px; right: 22px;
  font-size: 32px;
  color: #fff;
  cursor: pointer;
  line-height: 1;
  background: none; border: none;
}

/* ── Input row ── */
.lr-input-row {
  padding: 10px 16px 14px;
  border-top: 1px solid var(--border);
  background: var(--cream);
  display: flex;
  align-items: center;
  gap: 8px;
}

.lr-input-row input[type="text"] {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 10px 18px;
  font-size: 14px;
  outline: none;
  background: white;
  color: var(--text1);
  font-family: 'Lato', sans-serif;
  transition: border .15s, box-shadow .15s;
}
.lr-input-row input[type="text"]:focus {
  border-color: var(--rose);
  box-shadow: 0 0 0 3px rgba(212,83,126,.12);
}
.lr-input-row input[type="text"]::placeholder { color: var(--text3); }

.lr-file-label {
  width: 38px; height: 38px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--rose);
  font-size: 18px;
  transition: background .15s;
  flex-shrink: 0;
}
.lr-file-label:hover { background: var(--rose-light); }

.lr-send-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 24px;
  border: none;
  background: linear-gradient(135deg, #ED93B1, #D4537E);
  color: #fff;
  font-size: 14px;
  font-family: 'Lato', sans-serif;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity .15s, transform .12s;
  flex-shrink: 0;
}
.lr-send-btn:hover  { opacity: .88; }
.lr-send-btn:active { transform: scale(.95); }

.lr-emoji-btn {
  width: 38px; height: 38px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: none;
  cursor: pointer;
  color: var(--rose);
  font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
  flex-shrink: 0;
}
.lr-emoji-btn:hover { background: var(--rose-light); }

/* ── Emoji picker ── */
.lr-emoji-picker {
  position: absolute;
  bottom: 74px;
  right: 80px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 240px;
  box-shadow: var(--shadow);
  z-index: 100;
  animation: fadeIn .15s ease;
}
.lr-emoji-picker button {
  width: 34px; height: 34px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  border-radius: 8px;
  transition: background .12s;
}
.lr-emoji-picker button:hover { background: var(--rose-light); }

/* ── Heart particles ── */
.lr-hearts-layer {
  position: fixed;
  pointer-events: none;
  inset: 0;
  z-index: 500;
  overflow: hidden;
}
.lr-heart-p {
  position: absolute;
  font-size: 16px;
  animation: floatUp 2s ease-out forwards;
  user-select: none;
}
@keyframes floatUp {
  0%   { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  100% { opacity: 0; transform: translateY(-120px) scale(.4) rotate(20deg); }
}

/* ── Toast ── */
.lr-toast {
  position: fixed;
  bottom: 28px; left: 50%;
  transform: translateX(-50%);
  background: rgba(44,26,34,.9);
  color: #F4C0D1;
  font-size: 13px;
  padding: 9px 20px;
  border-radius: 24px;
  z-index: 999;
  animation: toastIn .2s ease;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .lr-sidebar { display: none; }
}
`;

/* ─── Color map for avatars ──────────────────────────────── */
const AV_COLORS = ['lr-av-rose','lr-av-plum','lr-av-teal','lr-av-amber','lr-av-gray'];
const userColor = (nick: string) => AV_COLORS[nick.charCodeAt(0) % AV_COLORS.length];

const EMOJIS = ['♥','😍','🌹','💜','😊','🥰','💕','😘','✨','🌸','🦋','🌙','💫','🎀','🌷','😄','🤗','💌','🫶','🕯️'];

/* ═══════════════════════════════════════════════════════════
   ChatRoom Component
═══════════════════════════════════════════════════════════ */
function ChatRoom() {
  const navigate  = useNavigate();
  const nickname  = localStorage.getItem('nickname') || '';
  const passcode  = localStorage.getItem('passcode') || '';

  const [message,     setMessage]     = useState('');
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [users,       setUsers]       = useState<User[]>([]);
  const [replyTo,     setReplyTo]     = useState<Message | null>(null);
  const [typingUser,  setTypingUser]  = useState('');
  const [lightbox,    setLightbox]    = useState<string | null>(null);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [activeUser,  setActiveUser]  = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);

  const socketRef      = useRef<Socket | null>(null);
  const chatRef        = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const typingTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartsLayerRef = useRef<HTMLDivElement>(null);

  /* inject CSS once */
  useEffect(() => {
    if (document.getElementById('lr-styles')) return;
    const s = document.createElement('style');
    s.id = 'lr-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }, []);

  /* toast helper */
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  /* heart particles */
  const spawnHearts = useCallback((count = 3, x?: number, y?: number) => {
    if (!heartsLayerRef.current) return;
    const layer = heartsLayerRef.current;
    const cx = x ?? window.innerWidth * .65;
    const cy = y ?? window.innerHeight * .75;
    const shapes = ['♥','🌹','💜','💕','✨'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'lr-heart-p';
        el.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        el.style.left = (cx + (Math.random() - .5) * 80) + 'px';
        el.style.top  = cy + 'px';
        el.style.animationDuration = (1.4 + Math.random() * .8) + 's';
        layer.appendChild(el);
        setTimeout(() => el.remove(), 2200);
      }, i * 120);
    }
  }, []);

  /* auto-scroll */
  const scrollBottom = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = chatRef.current;
    if (scrollHeight - scrollTop - clientHeight < 220) {
      chatRef.current.scrollTop = scrollHeight;
    }
  }, []);

  /* ── Socket setup ────────────────────────────────────── */
  useEffect(() => {
    if (!nickname || !passcode) { navigate('/'); return; }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const meta = getDeviceMetadata();
      socket.emit('joinRoom', { nickname, passcode, ...meta });
      socket.emit('getUsers', { passcode });
    });

    socket.on('chatHistory', (data: Message[]) => setMessages(data || []));

    socket.on('newMessage', (data: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      if (data.nickname !== nickname) spawnHearts(1);
    });

    socket.on('usersList',   (data: User[]) => setUsers(data || []));

    socket.on('userOnline',  ({ nickname: n }: { nickname: string }) =>
      setUsers(prev => prev.map(u => u.nickname === n ? { ...u, isOnline: true } : u)));

    socket.on('userOffline', ({ nickname: n, lastSeen }: { nickname: string; lastSeen: string }) =>
      setUsers(prev => prev.map(u => u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)));

    socket.on('userJoined', ({ nickname: n }: { nickname: string }) =>
      setMessages(prev => [...prev, { nickname: 'System', message: `${n} joined ♥`, createdAt: new Date().toISOString() }]));

    socket.on('userLeft', ({ nickname: n }: { nickname: string }) =>
      setMessages(prev => [...prev, { nickname: 'System', message: `${n} left`, createdAt: new Date().toISOString() }]));

    socket.on('userTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser(n);
    });
    socket.on('userStoppedTyping', ({ nickname: n }: { nickname: string }) => {
      if (n !== nickname) setTypingUser('');
    });

    socket.on('connect_error', () => showToast('Reconnecting…'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [nickname, passcode, navigate, spawnHearts]);

  useEffect(() => { scrollBottom(); }, [messages, scrollBottom]);

  /* ── Send message ─────────────────────────────────── */
  const sendMessage = () => {
    const text = message.trim();
    if (!text || !socketRef.current?.connected) return;

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    socketRef.current.emit('stopTyping', { nickname, passcode });

    socketRef.current.emit('sendMessage', {
      nickname, passcode, message: text,
      replyTo: replyTo ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message } : null,
    });

    setMessage('');
    setReplyTo(null);
    setShowEmoji(false);
    spawnHearts(2);
    inputRef.current?.focus();
  };

  /* ── Typing indicator ─────────────────────────────── */
  const handleInputChange = (val: string) => {
    setMessage(val);
    socketRef.current?.emit('typing', { nickname, passcode });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { nickname, passcode });
    }, 1500);
  };

  /* ── File upload ──────────────────────────────────── */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res  = await fetch(`${SOCKET_URL}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload failed');

        socketRef.current?.emit('sendMessage', {
          nickname, passcode, message: '',
          fileUrl: data.fileUrl, fileName: data.fileName,
          fileType: data.fileType, fileSize: data.fileSize,
          replyTo: replyTo ? { id: replyTo.id, nickname: replyTo.nickname, message: replyTo.message } : null,
        });
        setReplyTo(null);
        spawnHearts(3);
      } catch (err) {
        showToast('Upload failed — please try again');
        console.error(err);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  /* ── Emoji insert ─────────────────────────────────── */
  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  /* ── Reply ────────────────────────────────────────── */
  const startReply = (msg: Message) => {
    if (msg.nickname === 'System') return;
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  /* ── Render file attachments ─────────────────────── */
  const renderFile = (msg: Message) => {
    if (!msg.fileUrl) return null;
    const url  = resolveUrl(msg.fileUrl);
    const type = msg.fileType || '';
    const name = msg.fileName || 'file';
    const isMine = msg.nickname === nickname;

    if (type.startsWith('image/'))
      return (
        <img
          className="lr-img-prev"
          src={url}
          alt={name}
          onClick={e => { e.stopPropagation(); setLightbox(url); }}
        />
      );

    if (type.startsWith('video/'))
      return (
        <video className="lr-video-prev" controls>
          <source src={url} type={type} />
        </video>
      );

    if (type.startsWith('audio/'))
      return <audio className="lr-audio-prev" controls src={url} />;

    if (type === 'application/pdf')
      return <iframe className="lr-pdf-prev" src={url} title={name} />;

    const icon =
      type.includes('word')        ? '📝' :
      type.includes('sheet') || type.includes('excel') ? '📊' :
      type.includes('presentation') || type.includes('powerpoint') ? '📽️' :
      type === 'application/zip' || type.includes('x-zip') ? '📦' :
      type === 'text/plain'        ? '📄' :
      type === 'application/json'  ? '{ }' : '📎';

    return (
      <a
        className="lr-file-chip"
        href={url}
        target="_blank"
        rel="noreferrer"
        download={type === 'application/zip' || type.includes('x-zip')}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{name}</span>
          <span style={{ display: 'block', fontSize: 10, opacity: .7, fontWeight: 400 }}>{formatBytes(msg.fileSize)}</span>
        </span>
      </a>
    );
  };

  /* ── Sidebar active user (first other user or first user) */
  const displayUser = users.find(u => u.nickname !== nickname) || users[0];

  return (
    <>
      {/* Heart particles layer */}
      <div ref={heartsLayerRef} className="lr-hearts-layer" aria-hidden="true" />

      {/* Lightbox */}
      {lightbox && (
        <div className="lr-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" onClick={e => e.stopPropagation()} />
          <button className="lr-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">×</button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="lr-toast">{toast}</div>}

      <div className="lr-app">
        {/* ── Sidebar ── */}
        <aside className="lr-sidebar">
          <div className="lr-sidebar-head">
            <div className="lr-logo">
              <span className="lr-logo-heart" aria-hidden="true">♥</span>
              Our Space
            </div>
            <p className="lr-subtitle">end-to-end encrypted</p>
          </div>

          <div className="lr-users">
            {users.map(user => (
              <div
                key={user.id}
                className={`lr-user-item${activeUser === user.nickname || (!activeUser && user.nickname !== nickname) ? ' active' : ''}`}
                onClick={() => setActiveUser(user.nickname)}
              >
                <div className={`lr-av ${userColor(user.nickname)}`}>
                  {initials(user.nickname)}
                  <span className={`lr-av-dot ${user.isOnline ? 'lr-dot-on' : 'lr-dot-off'}`} />
                </div>
                <div>
                  <p className="lr-user-name">{user.nickname}</p>
                  <p className="lr-user-meta">
                    {user.isOnline
                      ? '● Online'
                      : user.lastSeen
                      ? `Last seen ${new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Offline'}
                  </p>
                  {(user.os || user.browser) && (
                    <p className="lr-user-device">{user.os} · {user.browser}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lr-sidebar-foot">
            <span aria-hidden="true">🔒</span>
            {nickname}
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className="lr-chat">
          {/* Header */}
          <div className="lr-chat-head">
            {displayUser ? (
              <>
                <div className={`lr-head-av lr-av ${userColor(displayUser.nickname)}`}>
                  {initials(displayUser.nickname)}
                </div>
                <div>
                  <p className="lr-head-name">{displayUser.nickname}</p>
                  <p className={`lr-head-status${displayUser.isOnline ? ' online' : ''}`}>
                    {displayUser.isOnline ? '● Online' : 'Offline'}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="lr-head-name">Waiting for your love…</p>
              </div>
            )}

            <div className="lr-head-actions">
              <button
                className="lr-icon-btn"
                title="Send hearts"
                aria-label="Send hearts"
                onClick={() => {
                  spawnHearts(6);
                  socketRef.current?.emit('sendMessage', {
                    nickname, passcode, message: '♥♥♥', replyTo: null,
                  });
                }}
              >
                ♥
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="lr-messages" ref={chatRef} role="log" aria-live="polite">
            {messages.map((msg, idx) => {
              const isMe     = msg.nickname === nickname;
              const isSystem = msg.nickname === 'System';

              /* date separator */
              const msgDate  = msg.createdAt ? new Date(msg.createdAt).toDateString() : '';
              const prevDate = idx > 0 && messages[idx - 1].createdAt
                ? new Date(messages[idx - 1].createdAt!).toDateString() : '';
              const showDate = msgDate && msgDate !== prevDate;

              return (
                <div key={msg.id ?? `${msg.nickname}-${idx}`}>
                  {showDate && (
                    <div className="lr-date-sep">
                      {new Date(msg.createdAt!).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                  <div className={`lr-msg-row${isMe ? ' mine' : ''}`}>
                    {!isSystem && (
                      <div
                        className={`lr-msg-av lr-av ${userColor(msg.nickname)}`}
                        title={msg.nickname}
                      >
                        {initials(msg.nickname)}
                      </div>
                    )}
                    <div
                      className={`lr-bubble${isSystem ? ' system-msg' : isMe ? ' mine' : ' theirs'}`}
                      onClick={() => !isSystem && startReply(msg)}
                      title={isSystem ? '' : 'Click to reply'}
                    >
                      {msg.replyTo && (
                        <div className="lr-reply-quote">
                          <strong>{msg.replyTo.nickname}</strong>
                          <span>
                            {msg.replyTo.message
                              ? (msg.replyTo.message.length > 60 ? msg.replyTo.message.slice(0, 60) + '…' : msg.replyTo.message)
                              : '📎 Attachment'}
                          </span>
                        </div>
                      )}

                      {msg.message && <span>{msg.message}</span>}
                      {renderFile(msg)}

                      {!isSystem && (
                        <time className="lr-bubble-time">{fmtTime(msg.createdAt)}</time>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Typing indicator */}
          <div className="lr-typing" aria-live="polite" style={{ visibility: typingUser ? 'visible' : 'hidden' }}>
            {typingUser && (
              <>
                <span>{typingUser} is typing</span>
                <span className="lr-dots" aria-hidden="true">
                  <span /><span /><span />
                </span>
              </>
            )}
          </div>

          {/* Reply banner */}
          {replyTo && (
            <div className="lr-reply-bar">
              Replying to <strong>{replyTo.nickname}</strong>:{' '}
              <span style={{ color: 'var(--text3)' }}>
                {replyTo.message
                  ? (replyTo.message.length > 50 ? replyTo.message.slice(0, 50) + '…' : replyTo.message)
                  : '📎 Attachment'}
              </span>
              <button className="lr-reply-bar-close" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div className="lr-emoji-picker" role="dialog" aria-label="Emoji picker">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => insertEmoji(e)} aria-label={e}>{e}</button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="lr-input-row">
            <label className="lr-file-label" htmlFor="lr-file" title="Attach file" aria-label="Attach file">
              {uploading ? '⏳' : '📎'}
            </label>
            <input
              type="file"
              id="lr-file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFile}
            />

            <button
              className="lr-emoji-btn"
              onClick={() => setShowEmoji(v => !v)}
              aria-label="Emoji picker"
              title="Emoji"
            >
              🙂
            </button>

            <input
              ref={inputRef}
              type="text"
              value={message}
              placeholder="Write something sweet…"
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              aria-label="Message input"
            />

            <button
              className="lr-icon-btn"
              onClick={() => {
                spawnHearts(4);
                socketRef.current?.emit('sendMessage', { nickname, passcode, message: '♥', replyTo: null });
              }}
              title="Send heart"
              aria-label="Send heart"
            >
              ♥
            </button>

            <button className="lr-send-btn" onClick={sendMessage} aria-label="Send message">
              Send <span aria-hidden="true">→</span>
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

export default ChatRoom;
