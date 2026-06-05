// // import { useEffect, useRef, useState } from 'react';
// // import { io, Socket } from 'socket.io-client';

// // const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL ||'https://backend-9i6w.onrender.com';

// // interface Message {
// //   nickname: string;
// //   message: string;
// //   createdAt?: string;
// // }

// // interface User {
// //   id: number;
// //   nickname: string;
// //   isOnline: boolean;
// //   lastSeen?: string;
// // }

// // function ChatRoom() {
// //   const nickname =
// //     localStorage.getItem('nickname') || '';

// //   const passcode =
// //     localStorage.getItem('passcode') || '';

// //   const [message, setMessage] = useState('');
// //   const [messages, setMessages] = useState<Message[]>([]);
// //   const [users, setUsers] = useState<User[]>([]);

// //   const socketRef = useRef<Socket | null>(null);
// //   const chatBodyRef = useRef<HTMLDivElement>(null);

// //   const formatDateTime = (date?: string) => {
// //     if (!date) return '';

// //     return new Date(date).toLocaleString('en-IN', {
// //       day: '2-digit',
// //       month: 'short',
// //       year: 'numeric',
// //       hour: '2-digit',
// //       minute: '2-digit',
// //       hour12: true,
// //     });
// //   };

// //   const formatLastSeen = (date?: string) => {
// //     if (!date) return 'Never';

// //     return new Date(date).toLocaleString('en-IN', {
// //       day: '2-digit',
// //       month: 'short',
// //       hour: '2-digit',
// //       minute: '2-digit',
// //       hour12: true,
// //     });
// //   };

// //   useEffect(() => {
// //     const socket = io(SOCKET_URL, {
// //       transports: ['websocket'],
// //     });

// //     socketRef.current = socket;

// //     socket.emit('joinRoom', {
// //       nickname,
// //       passcode,
// //     });

// //     socket.emit('getUsers', {
// //       passcode,
// //     });

// //     socket.on(
// //       'chatHistory',
// //       (data: Message[]) => {
// //         setMessages(data);
// //       },
// //     );

// //     socket.on(
// //       'newMessage',
// //       (data: Message) => {
// //         setMessages((prev) => [...prev, data]);
// //       },
// //     );

// //     socket.on(
// //       'usersList',
// //       (data: User[]) => {
// //         setUsers(data);
// //       },
// //     );

// //     socket.on(
// //       'userOnline',
// //       (data: {
// //         nickname: string;
// //       }) => {
// //         setUsers((prev) => {
// //           const exists = prev.find(
// //             (user) =>
// //               user.nickname === data.nickname,
// //           );

// //           if (exists) {
// //             return prev.map((user) =>
// //               user.nickname === data.nickname
// //                 ? {
// //                     ...user,
// //                     isOnline: true,
// //                     lastSeen: undefined,
// //                   }
// //                 : user,
// //             );
// //           }

// //           return [
// //             ...prev,
// //             {
// //               id: Date.now(),
// //               nickname: data.nickname,
// //               isOnline: true,
// //             },
// //           ];
// //         });
// //       },
// //     );

// //     socket.on(
// //       'userOffline',
// //       (data: {
// //         nickname: string;
// //         lastSeen: string;
// //       }) => {
// //         setUsers((prev) =>
// //           prev.map((user) =>
// //             user.nickname === data.nickname
// //               ? {
// //                   ...user,
// //                   isOnline: false,
// //                   lastSeen: data.lastSeen,
// //                 }
// //               : user,
// //           ),
// //         );
// //       },
// //     );

// //     socket.on(
// //       'userJoined',
// //       (data: {
// //         nickname: string;
// //       }) => {
// //         setMessages((prev) => [
// //           ...prev,
// //           {
// //             nickname: 'System',
// //             message: `${data.nickname} joined`,
// //           },
// //         ]);
// //       },
// //     );

// //     socket.on(
// //       'userLeft',
// //       (data: {
// //         nickname: string;
// //       }) => {
// //         setMessages((prev) => [
// //           ...prev,
// //           {
// //             nickname: 'System',
// //             message: `${data.nickname} left`,
// //           },
// //         ]);
// //       },
// //     );

// //     return () => {
// //       socket.removeAllListeners();
// //       socket.disconnect();
// //     };
// //   }, [nickname, passcode]);

// //   useEffect(() => {
// //     if (chatBodyRef.current) {
// //       chatBodyRef.current.scrollTo({
// //         top: chatBodyRef.current.scrollHeight,
// //         behavior: 'smooth',
// //       });
// //     }
// //   }, [messages]);

// //   const sendMessage = () => {
// //     if (!message.trim()) return;

// //     socketRef.current?.emit(
// //       'sendMessage',
// //       {
// //         passcode,
// //         nickname,
// //         message: message.trim(),
// //       },
// //     );

// //     setMessage('');
// //   };

// //   return (
// //     <div className="container mt-4">
// //       <div className="card shadow-lg">

// //         {/* Header */}
// //         <div className="card-header bg-success text-white">
// //           <div className="d-flex justify-content-between align-items-center">
// //             <div>
// //               <h5 className="mb-0">
// //                 Room: {passcode}
// //               </h5>

// //               <small>
// //                 {
// //                   users.filter(
// //                     (user) => user.isOnline,
// //                   ).length
// //                 }{' '}
// //                 online
// //               </small>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Users */}
// //         <div className="card-body border-bottom">
// //           <h6 className="mb-3">
// //             Users
// //           </h6>

// //           {users.length === 0 ? (
// //             <small className="text-muted">
// //               No users found
// //             </small>
// //           ) : (
// //             users.map((user) => (
// //               <div
// //                 key={user.id}
// //                 className="d-flex justify-content-between align-items-center mb-2"
// //               >
// //                 <span>
// //                   {user.nickname}
// //                 </span>

// //                 {user.isOnline ? (
// //                   <span className="text-success fw-semibold">
// //                     ● Online
// //                   </span>
// //                 ) : (
// //                   <small className="text-muted">
// //                     Last seen{' '}
// //                     {formatLastSeen(
// //                       user.lastSeen,
// //                     )}
// //                   </small>
// //                 )}
// //               </div>
// //             ))
// //           )}
// //         </div>

// //         {/* Messages */}
// //         <div
// //           ref={chatBodyRef}
// //           className="card-body d-flex flex-column"
// //           style={{
// //             height: '500px',
// //             overflowY: 'auto',
// //           }}
// //         >
// //           {messages.map((msg, index) => {
// //             const isSystem =
// //               msg.nickname === 'System';

// //             const isCurrentUser =
// //               msg.nickname === nickname;

// //             return (
// //               <div
// //                 key={index}
// //                 className={`alert ${
// //                   isSystem
// //                     ? 'alert-secondary text-center'
// //                     : isCurrentUser
// //                     ? 'alert-success align-self-end'
// //                     : 'alert-light align-self-start'
// //                 } p-2 mb-2`}
// //                 style={{
// //                   maxWidth: '75%',
// //                 }}
// //               >
// //                 {!isSystem && (
// //                   <div className="fw-bold mb-1">
// //                     {msg.nickname}
// //                   </div>
// //                 )}

// //                 <div>{msg.message}</div>

// //                 {!isSystem &&
// //                   msg.createdAt && (
// //                     <div className="text-end mt-1">
// //                       <small className="text-muted">
// //                         {formatDateTime(
// //                           msg.createdAt,
// //                         )}
// //                       </small>
// //                     </div>
// //                   )}
// //               </div>
// //             );
// //           })}
// //         </div>

// //         {/* Input */}
// //         <div className="card-footer d-flex">
// //           <input
// //             type="text"
// //             className="form-control me-2 rounded-pill"
// //             placeholder="Type message..."
// //             value={message}
// //             onChange={(e) =>
// //               setMessage(e.target.value)
// //             }
// //             onKeyDown={(e) => {
// //               if (e.key === 'Enter') {
// //                 sendMessage();
// //               }
// //             }}
// //           />

// //           <button
// //             className="btn btn-success rounded-pill px-4"
// //             onClick={sendMessage}
// //           >
// //             Send
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // export default ChatRoom;

// import React, {
//   useEffect,
//   useRef,
//   useState,
// } from 'react';
// import { io, Socket } from 'socket.io-client';

// const SOCKET_URL =
//   import.meta.env.VITE_SOCKET_URL ||
//   'https://backend-9i6w.onrender.com';

// interface Message {
//   nickname: string;
//   message: string;
//   createdAt?: string;
// }

// interface User {
//   id: number;
//   nickname: string;
//   isOnline: boolean;
//   lastSeen?: string;
// }

// // FULL EMOJI DATA — from your list, split by category
// const EMOJIS = {
//   Smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'.split(' '),
//   People: '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 💪 🦾 👶 👧 🧒 👦 👩 🧑 👨 👩🦱 🧑🦱 👨🦱 👩🦰 🧑🦰 👨🦰 👱‍♀️ 👱 👱‍♂️ 👩🦳 🧑🦳 👨🦳 👩🦲 🧑🦲 👨🦲 🧔‍♀️ 🧔 🧔‍♂️ 👵 🧓 👴 👲 🧕 👮‍♀️ 👮 👮‍♂️ 👷‍♀️ 👷 👷‍♂️ 💂‍♀️ 💂 💂‍♂️ 🕵️‍♀️ 🕵️ 🕵️‍♂️ 👩‍⚕️ 🧑‍⚕️ 👨‍⚕️ 👩‍🌾 🧑‍🌾 👨‍🌾 👩‍🍳 🧑‍🍳 👨‍🍳 👩‍🎓 🧑‍🎓 👨‍🎓 👩‍🎤 🧑‍🎤 👨‍🎤 👩‍🏫 🧑‍🏫 👨‍🏫 👩‍💻 🧑‍💻 👨‍💻 👩‍💼 🧑‍💼 👨‍💼 👩‍🔧 🧑‍🔧 👨‍🔧 👩‍🔬 🧑‍🔬 👨‍🔬 👩‍🎨 🧑‍🎨 👨‍🎨 👩‍🚒 🧑‍🚒 👨‍🚒 👩‍✈️ 🧑‍✈️ 👨‍✈️ 👩‍🚀 🧑‍🚀 👨‍🚀 👩‍⚖️ 🧑‍⚖️ 👨‍⚖️ 👸 🤴 🥷 🦸‍♀️ 🦸 🦸‍♂️ 🦹‍♀️ 🦹 🦹‍♂️ 🤶 🎅 🧙‍♀️ 🧙 🧙‍♂️ 🧝‍♀️ 🧝 🧝‍♂️ 🤰 🫄 🫃 🤱'.split(' '),
//   Animals: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷 🕸 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿 🦔'.split(' '),
//   Food: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾'.split(' '),
//   Activities: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸ 🥌 🎿 ⛷ 🏂 🪂 🏋️‍♀️ 🏋️ 🏋️‍♂️ 🤼‍♀️ 🤼 🤼‍♂️ 🤸‍♀️ 🤸 🤸‍♂️ ⛹️‍♀️ ⛹️ ⛹️‍♂️ 🤺 🤾‍♀️ 🤾 🤾‍♂️ 🏌️‍♀️ 🏌️ 🏌️‍♂️ 🏇 🧘‍♀️ 🧘 🧘‍♂️ 🏄‍♀️ 🏄 🏄‍♂️ 🏊‍♀️ 🏊 🏊‍♂️ 🤽‍♀️ 🤽 🤽‍♂️ 🚣‍♀️ 🚣 🚣‍♂️ 🧗‍♀️ 🧗 🧗‍♂️ 🚵‍♀️ 🚵 🚵‍♂️ 🚴‍♀️ 🚴 🚴‍♂️ 🏆 🥇 🥈 🥉 🏅 🎖 🏵 🎗 🎫 🎟 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟ 🎯 🎳 🎮 🎰 🧩'.split(' '),
//   Travel: '🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛴 🚲 🛵 🏍 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩 💺 🛰 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥 🛳 ⛴ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🚏 🗺 🗿 🗽 🗼 🏰 🏯 🏟 🎡 🎢 🎠 ⛲ ⛱ 🏖 🏝 🏜 🌋 ⛰ 🏔 🗻 🏕 ⛺ 🏠 🏡 🏘 🏗 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛 ⛪ 🕌 🕍 🛕 🕋 ⛩ 🛤 🛣'.split(' '),
//   Objects: '⌚ 📱 💻 ⌨️ 🖥 🖨 🖱 🖲 🕹 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽 📞 ☎️ 📟 📠 📺 📻 🎙 🎚 🎛 🧭 ⏱ ⏲ ⏰ 🕰 ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯 🧯 🛢 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒ 🛠 ⛏ 🪚 🔩 ⚙️ 🧱 ⛓ 🧲 🔫 💣 🧨 🪓 🔪 🗡 ⚔️ 🛡 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎 🔑 🗝 🚪 🪑 🛋 🛏 🛌 🧸 🪆 🖼 🪞 🪟 🛍 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🪩 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📦 🏷 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒 🗓 📆 📅 🗑 📇 🗃 🗳 🗄 📋 📁 📂 🗂 🗞 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇 📐 📏 🧮 📌 📍 ✂️ 🖊 🖋 ✒️ 🖌 🖍 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓'.split(' '),
//   Symbols: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉 ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸ ⏯ ⏹ ⏺ ⏭ ⏮ ⏩ ⏪ 🔀 🔁 🔂 ▶️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫'.split(' '),
//   Flags: '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇮🇳 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇩🇪 🇫🇷 🇯🇵 🇰🇷 🇨🇳 🇧🇷 🇲🇽 🇮🇹 🇪🇸 🇷🇺 🇺🇦 🇹🇷 🇸🇦 🇦🇪'.split(' ')
// };

// export default function ChatRoom() {
//   const nickname = localStorage.getItem('nickname') || '';
//   const passcode = localStorage.getItem('passcode') || '';
  
//   const [message, setMessage] = useState('');
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [users, setUsers] = useState<User[]>([]);
//   const [showEmoji, setShowEmoji] = useState(false);
//   const [tab, setTab] = useState<keyof typeof EMOJIS>('Smileys');
//   const [search, setSearch] = useState('');

//   const socketRef = useRef<Socket | null>(null);
//   const chatRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);
  
//   // Inactivity timer refs
// const inactivityTimer =
//   useRef<ReturnType<typeof setTimeout> | null>(
//     null,
//   );
//   const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 minutes

//   const fmt = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

//   // Logout user function
//   const logoutUser = () => {
//     // Emit leave room event
//     socketRef.current?.emit('leaveRoom', {
//       nickname,
//       passcode,
//     });

//     // Clear localStorage
//     localStorage.removeItem('nickname');
//     localStorage.removeItem('passcode');
//     localStorage.removeItem('lastActivity');

//     // Disconnect socket
//     socketRef.current?.disconnect();

//     // Show alert and reload
//     alert('You have been logged out due to inactivity.');
//     window.location.reload();
//   };

//   // Update activity timer
//   const updateActivity = () => {
//     // Store last activity time in localStorage (persists across refreshes)
//     localStorage.setItem('lastActivity', Date.now().toString());

//     // Clear existing timer
//     if (inactivityTimer.current) {
//       clearTimeout(inactivityTimer.current);
//     }

//     // Set new timer
//     inactivityTimer.current = setTimeout(() => {
//       logoutUser();
//     }, INACTIVITY_LIMIT);
//   };

//   // Socket connection effect
//   useEffect(() => {
//     const s = io(SOCKET_URL, { transports: ['websocket'] });
//     socketRef.current = s;
    
//     s.emit('joinRoom', { nickname, passcode });
//     s.emit('getUsers', { passcode });
    
//     s.on('chatHistory', setMessages);
//     s.on('newMessage', (m: Message) => setMessages(p => [...p, m]));
//     s.on('usersList', setUsers);
//     s.on('userOnline', ({ nickname: n }) => setUsers(p => p.find(u => u.nickname === n) ? p.map(u => u.nickname === n ? { ...u, isOnline: true } : u) : [...p, { id: Date.now(), nickname: n, isOnline: true }]));
//     s.on('userOffline', ({ nickname: n, lastSeen }) => setUsers(p => p.map(u => u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)));
    
//     return () => { s.disconnect(); };
//   }, [nickname, passcode]);

//   // Inactivity tracking effect (with persistence across refresh)
//   useEffect(() => {
//     const lastActivity = Number(localStorage.getItem('lastActivity') || Date.now());
//     const inactiveFor = Date.now() - lastActivity;

//     // If already inactive for more than limit, logout immediately
//     if (inactiveFor >= INACTIVITY_LIMIT) {
//       logoutUser();
//       return;
//     }

//     // Set timer for remaining time
//     const remainingTime = INACTIVITY_LIMIT - inactiveFor;
//     inactivityTimer.current = setTimeout(() => {
//       logoutUser();
//     }, remainingTime);

//     // Activity events to listen for
//     const activityEvents = [
//       'mousemove',
//       'mousedown',
//       'keypress',
//       'scroll',
//       'touchstart',
//       'click'
//     ];

//     // Add event listeners
//     activityEvents.forEach((event) => {
//       window.addEventListener(event, updateActivity);
//     });

//     // Initialize activity
//     updateActivity();

//     // Cleanup
//     return () => {
//       if (inactivityTimer.current) {
//         clearTimeout(inactivityTimer.current);
//       }
//       activityEvents.forEach((event) => {
//         window.removeEventListener(event, updateActivity);
//       });
//     };
//   }, []);

//   // Handle before unload (page refresh/close)
//   useEffect(() => {
//     const handleBeforeUnload = () => {
//       socketRef.current?.emit('leaveRoom', {
//         nickname,
//         passcode,
//       });
//     };

//     window.addEventListener('beforeunload', handleBeforeUnload);

//     return () => {
//       window.removeEventListener('beforeunload', handleBeforeUnload);
//     };
//   }, [nickname, passcode]);

//   // Auto-scroll to bottom
//   useEffect(() => {
//     chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
//   }, [messages]);

//   // Send message function
//   const send = () => {
//     if (!message.trim()) return;
//     socketRef.current?.emit('sendMessage', { passcode, nickname, message: message.trim() });
    
//     // Reset activity timer on sending message
//     updateActivity();
    
//     setMessage('');
//     setShowEmoji(false);
//   };

//   // Add emoji function
//   const add = (e: string) => {
//     setMessage(m => m + e);
//     inputRef.current?.focus();
//     // Reset activity timer on emoji selection
//     updateActivity();
//   };

//   // Handle input change with activity update
//   const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setMessage(e.target.value);
//     updateActivity();
//   };

//   const filtered = search ? Object.values(EMOJIS).flat().filter(e => e.includes(search)) : EMOJIS[tab];

//   return (
//     <div className="wrap">
//       <div className="glass">
//         <header className="head">
//           <div>
          
//             <div className="sub">{users.filter(u => u.isOnline).length} online</div>
//           </div>
//           <div className="avatar">{nickname.slice(0, 2).toUpperCase()}</div>
//         </header>

//         <aside className="users">
//           <h3>Users</h3>
//           <ul>
//             {users.map(u => (
//               <li key={u.id} className="user">
//                 <span>{u.nickname}</span>
//                 {u.isOnline ? <span className="on">●</span> : <span className="last">{fmt(u.lastSeen)}</span>}
//               </li>
//             ))}
//           </ul>
//         </aside>

//         <main ref={chatRef} className="chat">
//           {messages.map((m, i) => {
//             const me = m.nickname === nickname;
//             const sys = m.nickname === 'System';
//             return (
//               <div key={i} className={`bubble ${sys ? 'sys' : me ? 'me' : 'ot'}`}>
//                 {!sys && <div className="nick">{m.nickname}</div>}
//                 <div>{m.message}</div>
//                 {!sys && m.createdAt && <div className="time">{fmt(m.createdAt)}</div>}
//               </div>
//             );
//           })}
//         </main>

//         <footer className="composer">
//           <button className="eBtn" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
//           <input
//             ref={inputRef}
//             value={message}
//             onChange={handleMessageChange}
//             onKeyDown={e => e.key === 'Enter' && send()}
//             placeholder="Type message..."
//           />
//           <button className="send" onClick={send}>Send</button>

//           {showEmoji && (
//             <div className="emoji">
//               <div className="eHead">
//                 <input
//                   placeholder="Search emoji"
//                   value={search}
//                   onChange={e => setSearch(e.target.value)}
//                 />
//                 <button onClick={() => setShowEmoji(false)}>✕</button>
//               </div>
//               {!search && (
//                 <div className="tabs">
//                   {Object.keys(EMOJIS).map(k => (
//                     <button key={k} className={tab === k ? 'a' : ''} onClick={() => setTab(k as any)}>
//                       {k}
//                     </button>
//                   ))}
//                 </div>
//               )}
//               <div className="grid">
//                 {filtered.map(e => (
//                   <button key={e} onClick={() => add(e)}>{e}</button>
//                 ))}
//               </div>
//             </div>
//           )}
//         </footer>
//       </div>
//       <style>{`
//      .wrap{min-height:100vh;display:grid;place-items:center;padding:16px;background:linear-gradient(135deg,#1a1440,#0f0b2a);color:#e9ecff;font-family:Inter,system-ui}
//      .glass{width:100%;max-width:1200px;height:88vh;display:grid;grid-template-columns:280px 1fr;grid-template-rows:auto 1fr auto;grid-template-areas:"h h""u c""u f";background:rgba(255,255,255,.08);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.18);border-radius:24px;overflow:hidden}
//      .head{grid-area:h;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.12)}.room{font-weight:700}.sub{font-size:12px;opacity:.8}.avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#e6e9f5;color:#0f0b2a;font-weight:700}
//      .users{grid-area:u;padding:16px;background:rgba(0,0,0,.12);overflow:auto;border-right:1px solid rgba(255,255,255,.08)}.users h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;opacity:.7}.user{display:flex;justify-content:space-between;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,.05);border-radius:10px}.on{color:#7CFFB2}.last{font-size:11px;opacity:.6}
//      .chat{grid-area:c;padding:18px;overflow:auto;display:flex;flex-direction:column;gap:10px}.bubble{max-width:75%;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}.bubble.me{align-self:flex-end;background:rgba(124,255,178,.18);border-color:rgba(124,255,178,.35)}.bubble.ot{align-self:flex-start}.bubble.sys{align-self:center;opacity:.7;font-size:12px;border-style:dashed}.nick{font-size:11px;font-weight:700;margin-bottom:3px;opacity:.9}.time{font-size:10px;opacity:.6;text-align:right;margin-top:4px}
//      .composer{grid-area:f;display:flex;gap:8px;padding:12px;background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.1);position:relative}.composer input{flex:1;padding:12px 16px;border-radius:999px;border:none;outline:none;background:rgba(0,0,0,.25);color:#fff;box-shadow:inset 6px 6px 12px rgba(0,0,0,.35),inset -6px -6px 12px rgba(255,255,255,.05)}.eBtn,.send{border:none;border-radius:999px;padding:0 16px;background:#e6e9f5;color:#0f0b2a;font-weight:700;cursor:pointer;box-shadow:6px 6px 12px rgba(0,0,0,.3),-6px -6px 12px rgba(255,255,255,.07)}.eBtn{width:44px;padding:0;font-size:20px}
//      .emoji{position:absolute;bottom:60px;left:12px;right:12px;background:rgba(15,11,42,.9);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:10px;z-index:50;max-height:55vh;display:flex;flex-direction:column}
//      .eHead{display:flex;gap:8px;margin-bottom:8px}.eHead input{flex:1;padding:8px 12px;border-radius:10px;border:none;background:rgba(255,255,255,.08);color:#fff;outline:none}.eHead button{background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
//      .tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}.tabs button{white-space:nowrap;padding:6px 10px;border:none;background:transparent;color:#cfd3ff;opacity:.7;border-radius:8px;font-size:12px;cursor:pointer}.tabs button.a{background:rgba(255,255,255,.12);opacity:1}
//      .grid{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;overflow:auto;flex:1}.grid button{background:transparent;border:none;font-size:24px;padding:6px;border-radius:8px;cursor:pointer}.grid button:active{background:rgba(255,255,255,.12)}
//       /* LAPTOP */
//       @media(min-width:900px){.emoji{width:380px;left:12px;right:auto;bottom:64px;max-height:420px}.grid{grid-template-columns:repeat(8,1fr)}}
//       /* TABLET */
//       @media(max-width:899px) and (min-width:600px){.glass{grid-template-columns:220px 1fr;height:90vh}.grid{grid-template-columns:repeat(7,1fr)}}
//       /* MOBILE */
//       @media(max-width:599px){.wrap{padding:0}.glass{height:100vh;border-radius:0;grid-template-columns:1fr;grid-template-areas:"h""c""f"}.users{display:none}.composer{padding:10px}.emoji{left:0;right:0;bottom:0;border-radius:16px 16px 0 0;max-height:60vh;width:100%}.grid{grid-template-columns:repeat(6,1fr)}.grid button{font-size:26px;padding:8px}}
//       `}</style>
//     </div>
//   );
// }
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'https://backend-9i6w.onrender.com';

interface Message {
  nickname: string;
  message: string;
  createdAt?: string;
}

interface User {
  id: number;
  nickname: string;
  isOnline: boolean;
  lastSeen?: string;
}

const EMOJIS = {
  Smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'.split(' '),
  People: '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 💪 🦾 👶 👧 🧒 👦 👩 🧑 👨 👩‍🦱 🧑‍🦱 👨‍🦱 👩‍🦰 🧑‍🦰 👨‍🦰 👱‍♀️ 👱 👱‍♂️ 👩‍🦳 🧑‍🦳 👨‍🦳 👩‍🦲 🧑‍🦲 👨‍🦲 🧔‍♀️ 🧔 🧔‍♂️ 👵 🧓 👴 👲 🧕 👮‍♀️ 👮 👮‍♂️ 👷‍♀️ 👷 👷‍♂️ 💂‍♀️ 💂 💂‍♂️ 🕵️‍♀️ 🕵️ 🕵️‍♂️ 👩‍⚕️ 🧑‍⚕️ 👨‍⚕️ 👩‍🌾 🧑‍🌾 👨‍🌾 👩‍🍳 🧑‍🍳 👨‍🍳 👩‍🎓 🧑‍🎓 👨‍🎓 👩‍🎤 🧑‍🎤 👨‍🎤 👩‍🏫 🧑‍🏫 👨‍🏫 👩‍💻 🧑‍💻 👨‍💻 👩‍💼 🧑‍💼 👨‍💼 👩‍🔧 🧑‍🔧 👨‍🔧 👩‍🔬 🧑‍🔬 👨‍🔬 👩‍🎨 🧑‍🎨 👨‍🎨 👩‍🚒 🧑‍🚒 👨‍🚒 👩‍✈️ 🧑‍✈️ 👨‍✈️ 👩‍🚀 🧑‍🚀 👨‍🚀 👩‍⚖️ 🧑‍⚖️ 👨‍⚖️ 👸 🤴 🥷 🦸‍♀️ 🦸 🦸‍♂️ 🦹‍♀️ 🦹 🦹‍♂️ 🤶 🎅 🧙‍♀️ 🧙 🧙‍♂️ 🧝‍♀️ 🧝 🧝‍♂️ 🤰 🫄 🫃 🤱'.split(' '),
  Animals: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷 🕸 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿 🦔'.split(' '),
  Food: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🥙 🧆 🌮 🌯 🥗 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾'.split(' '),
  Activities: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 ⛳ 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸ 🥌 🎿 ⛷ 🏂 🪂 🏋️‍♀️ 🏋️ 🏋️‍♂️ 🤼‍♀️ 🤼 🤼‍♂️ 🤸‍♀️ 🤸 🤸‍♂️ ⛹️‍♀️ ⛹️ ⛹️‍♂️ 🤺 🤾‍♀️ 🤾 🤾‍♂️ 🏌️‍♀️ 🏌️ 🏌️‍♂️ 🏇 🧘‍♀️ 🧘 🧘‍♂️ 🏄‍♀️ 🏄 🏄‍♂️ 🏊‍♀️ 🏊 🏊‍♂️ 🤽‍♀️ 🤽 🤽‍♂️ 🚣‍♀️ 🚣 🚣‍♂️ 🧗‍♀️ 🧗 🧗‍♂️ 🚵‍♀️ 🚵 🚵‍♂️ 🚴‍♀️ 🚴 🚴‍♂️ 🏆 🥇 🥈 🥉 🏅 🎖 🏵 🎗 🎫 🎟 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟ 🎯 🎳 🎮 🎰 🧩'.split(' '),
  Travel: '🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛴 🚲 🛵 🏍 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩 💺 🛰 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥 🛳 ⛴ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🚏 🗺 🗿 🗽 🗼 🏰 🏯 🏟 🎡 🎢 🎠 ⛲ ⛱ 🏖 🏝 🏜 🌋 ⛰ 🏔 🗻 🏕 ⛺ 🏠 🏡 🏘 🏗 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛 ⛪ 🕌 🕍 🛕 🕋 ⛩ 🛤 🛣'.split(' '),
  Objects: '⌚ 📱 💻 ⌨️ 🖥 🖨 🖱 🖲 🕹 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽 📞 ☎️ 📟 📠 📺 📻 🎙 🎚 🎛 🧭 ⏱ ⏲ ⏰ 🕰 ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯 🧯 🛢 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒ 🛠 ⛏ 🪚 🔩 ⚙️ 🧱 ⛓ 🧲 🔫 💣 🧨 🪓 🔪 🗡 ⚔️ 🛡 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎 🔑 🗝 🚪 🪑 🛋 🛏 🛌 🧸 🪆 🖼 🪞 🪟 🛍 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🪩 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📦 🏷 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒 🗓 📆 📅 🗑 📇 🗃 🗳 🗄 📋 📁 📂 🗂 🗞 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇 📐 📏 🧮 📌 📍 ✂️ 🖊 🖋 ✒️ 🖌 🖍 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓'.split(' '),
  Symbols: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉 ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ▶️ ⏸ ⏯ ⏹ ⏺ ⏭ ⏮ ⏩ ⏪ 🔀 🔁 🔂 ▶️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫'.split(' '),
  Flags: '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇮🇳 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇩🇪 🇫🇷 🇯🇵 🇰🇷 🇨🇳 🇧🇷 🇲🇽 🇮🇹 🇪🇸 🇷🇺 🇺🇦 🇹🇷 🇸🇦 🇦🇪'.split(' ')
};

export default function ChatRoom() {
  const nickname = localStorage.getItem('nickname') || '';
  const passcode = localStorage.getItem('passcode') || '';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [tab, setTab] = useState<keyof typeof EMOJIS>('Smileys');
  const [search, setSearch] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_LIMIT = 2 * 60 * 1000;

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

  const logoutUser = () => {
    socketRef.current?.emit('leaveRoom', { nickname, passcode });
    localStorage.removeItem('nickname');
    localStorage.removeItem('passcode');
    localStorage.removeItem('lastActivity');
    socketRef.current?.disconnect();
    alert('You have been logged out due to inactivity.');
    window.location.reload();
  };

  const updateActivity = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(logoutUser, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = s;
    s.emit('joinRoom', { nickname, passcode });
    s.emit('getUsers', { passcode });
    s.on('chatHistory', setMessages);
    s.on('newMessage', (m: Message) => setMessages(p => [...p, m]));
    s.on('usersList', setUsers);
    s.on('userOnline', ({ nickname: n }) =>
      setUsers(p =>
        p.find(u => u.nickname === n)
          ? p.map(u => (u.nickname === n ? { ...u, isOnline: true } : u))
          : [...p, { id: Date.now(), nickname: n, isOnline: true }]
      )
    );
    s.on('userOffline', ({ nickname: n, lastSeen }) =>
      setUsers(p => p.map(u => (u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)))
    );
    return () => { s.disconnect(); };
  }, [nickname, passcode]);

  useEffect(() => {
    const lastActivity = Number(localStorage.getItem('lastActivity') || Date.now());
    const inactiveFor = Date.now() - lastActivity;
    if (inactiveFor >= INACTIVITY_LIMIT) { logoutUser(); return; }
    const remainingTime = INACTIVITY_LIMIT - inactiveFor;
    inactivityTimer.current = setTimeout(logoutUser, remainingTime);
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(e => window.addEventListener(e, updateActivity));
    updateActivity();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      activityEvents.forEach(e => window.removeEventListener(e, updateActivity));
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () =>
      socketRef.current?.emit('leaveRoom', { nickname, passcode });
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nickname, passcode]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!message.trim()) return;
    socketRef.current?.emit('sendMessage', { passcode, nickname, message: message.trim() });
    updateActivity();
    setMessage('');
    setShowEmoji(false);
  };

  const add = (e: string) => {
    setMessage(m => m + e);
    inputRef.current?.focus();
    updateActivity();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    updateActivity();
  };

  const filtered = search
    ? Object.values(EMOJIS).flat().filter(e => e.includes(search))
    : EMOJIS[tab];

  const onlineCount = users.filter(u => u.isOnline).length;

  /* avatar colour helper */
  const avatarColor = (name: string) => {
    const palette = [
      ['#e8d5ff','#6c3ac7'],
      ['#cff3e9','#1d7a5e'],
      ['#ffd6cc','#c44d22'],
      ['#d0e8ff','#1a5fa0'],
      ['#ffeacc','#a0650a'],
      ['#ffd6ec','#a02060'],
    ];
    const idx = name.charCodeAt(0) % palette.length;
    return palette[idx];
  };

  return (
    <div className="cr-wrap">
      {/* ── Sidebar ── */}
      <aside className="cr-sidebar">
        <div className="cr-sidebar-header">
          <div className="cr-my-avatar" style={{ background: avatarColor(nickname)[0], color: avatarColor(nickname)[1] }}>
            {nickname.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="cr-my-name">{nickname}</div>
            <div className="cr-online-badge">
              <span className="cr-dot-green" />
              {onlineCount} online
            </div>
          </div>
        </div>

        <div className="cr-sidebar-label">Members</div>
        <ul className="cr-user-list">
          {users.map(u => {
            const [bg, fg] = avatarColor(u.nickname);
            return (
              <li key={u.id} className="cr-user-item">
                <div className="cr-user-avatar" style={{ background: bg, color: fg }}>
                  {u.nickname.slice(0, 2).toUpperCase()}
                  <span className={`cr-status-dot ${u.isOnline ? 'cr-status-on' : 'cr-status-off'}`} />
                </div>
                <div className="cr-user-info">
                  <span className="cr-user-name">{u.nickname}</span>
                  {!u.isOnline && u.lastSeen && (
                    <span className="cr-user-lastseen">{fmt(u.lastSeen)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ── Main chat area ── */}
      <div className="cr-main">
        {/* Header */}
        <header className="cr-header">
          <div className="cr-header-icon">💬</div>
          <div>
            <div className="cr-header-title">Chat Room</div>
            <div className="cr-header-sub">{onlineCount} member{onlineCount !== 1 ? 's' : ''} online</div>
          </div>
        </header>

        {/* Messages */}
        <div ref={chatRef} className="cr-messages">
          {messages.map((m, i) => {
            const me = m.nickname === nickname;
            const sys = m.nickname === 'System';
            if (sys) {
              return (
                <div key={i} className="cr-sys-msg">
                  <span>{m.message}</span>
                </div>
              );
            }
            const [bg, fg] = avatarColor(m.nickname);
            return (
              <div key={i} className={`cr-msg-row ${me ? 'cr-msg-me' : 'cr-msg-other'}`}>
                {!me && (
                  <div className="cr-msg-avatar" style={{ background: bg, color: fg }}>
                    {m.nickname.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="cr-msg-body">
                  {!me && <div className="cr-msg-nick">{m.nickname}</div>}
                  <div className={`cr-bubble ${me ? 'cr-bubble-me' : 'cr-bubble-other'}`}>
                    {m.message}
                  </div>
                  {m.createdAt && <div className={`cr-msg-time ${me ? 'cr-time-me' : ''}`}>{fmt(m.createdAt)}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <footer className="cr-composer">
          <button
            className="cr-emoji-btn"
            onClick={() => setShowEmoji(!showEmoji)}
            aria-label="Open emoji picker"
          >
            😊
          </button>
          <input
            ref={inputRef}
            className="cr-input"
            value={message}
            onChange={handleMessageChange}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type a message…"
          />
          <button className="cr-send-btn" onClick={send}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

          {/* Emoji picker */}
          {showEmoji && (
            <div className="cr-emoji-picker">
              <div className="cr-emoji-header">
                <input
                  className="cr-emoji-search"
                  placeholder="Search emoji…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button className="cr-emoji-close" onClick={() => setShowEmoji(false)}>✕</button>
              </div>
              {!search && (
                <div className="cr-emoji-tabs">
                  {Object.keys(EMOJIS).map(k => (
                    <button
                      key={k}
                      className={`cr-emoji-tab ${tab === k ? 'cr-emoji-tab-active' : ''}`}
                      onClick={() => setTab(k as keyof typeof EMOJIS)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
              <div className="cr-emoji-grid">
                {filtered.map(e => (
                  <button key={e} className="cr-emoji-item" onClick={() => add(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
        </footer>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Root ── */
        .cr-wrap {
          display: flex;
          height: 100dvh;
          width: 100%;
          background: #0d0d1a;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          color: #e8eaf6;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .cr-sidebar {
          width: 260px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.04);
          border-right: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }

        .cr-sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .cr-my-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          flex-shrink: 0;
          letter-spacing: 0.5px;
        }

        .cr-my-name {
          font-size: 14px;
          font-weight: 600;
          color: #e8eaf6;
          line-height: 1.3;
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cr-online-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: rgba(232,234,246,0.55);
          margin-top: 2px;
        }

        .cr-dot-green {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          display: inline-block;
          flex-shrink: 0;
        }

        .cr-sidebar-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: rgba(232,234,246,0.35);
          padding: 16px 16px 8px;
        }

        .cr-user-list {
          list-style: none;
          flex: 1;
          overflow-y: auto;
          padding: 0 8px 12px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .cr-user-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          margin-bottom: 2px;
          transition: background 0.15s;
          cursor: default;
        }
        .cr-user-item:hover { background: rgba(255,255,255,0.05); }

        .cr-user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          position: relative;
          letter-spacing: 0.4px;
        }

        .cr-status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: 2px solid #0d0d1a;
        }
        .cr-status-on { background: #4ade80; }
        .cr-status-off { background: #6b7280; }

        .cr-user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .cr-user-name {
          font-size: 13px;
          font-weight: 500;
          color: #dde0f5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cr-user-lastseen {
          font-size: 10.5px;
          color: rgba(232,234,246,0.4);
          margin-top: 1px;
        }

        /* ── Main area ── */
        .cr-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        /* ── Header ── */
        .cr-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        .cr-header-icon {
          font-size: 22px;
          line-height: 1;
        }

        .cr-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #e8eaf6;
          letter-spacing: 0.2px;
        }

        .cr-header-sub {
          font-size: 12px;
          color: rgba(232,234,246,0.5);
          margin-top: 1px;
        }

        /* ── Messages ── */
        .cr-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .cr-sys-msg {
          align-self: center;
          text-align: center;
          padding: 5px 14px;
          border-radius: 20px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 11.5px;
          color: rgba(232,234,246,0.55);
          margin: 4px 0;
          max-width: 80%;
        }

        .cr-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          max-width: 75%;
        }
        .cr-msg-me {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .cr-msg-other {
          align-self: flex-start;
        }

        .cr-msg-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }

        .cr-msg-body {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .cr-msg-nick {
          font-size: 11.5px;
          font-weight: 600;
          color: rgba(232,234,246,0.6);
          padding: 0 4px;
        }

        .cr-bubble {
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.55;
          word-break: break-word;
          max-width: 100%;
        }

        .cr-bubble-me {
          background: linear-gradient(135deg, #6c4fd8, #4f3ab5);
          color: #fff;
          border-bottom-right-radius: 5px;
          box-shadow: 0 2px 12px rgba(108,79,216,0.35);
        }

        .cr-bubble-other {
          background: rgba(255,255,255,0.09);
          color: #e4e6f5;
          border: 1px solid rgba(255,255,255,0.1);
          border-bottom-left-radius: 5px;
        }

        .cr-msg-time {
          font-size: 10.5px;
          color: rgba(232,234,246,0.38);
          padding: 0 4px;
        }
        .cr-time-me { text-align: right; }

        /* ── Composer ── */
        .cr-composer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border-top: 1px solid rgba(255,255,255,0.07);
          position: relative;
          flex-shrink: 0;
        }

        .cr-emoji-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .cr-emoji-btn:hover { background: rgba(255,255,255,0.12); }

        .cr-input {
          flex: 1;
          height: 42px;
          padding: 0 16px;
          border-radius: 21px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #e8eaf6;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
        }
        .cr-input::placeholder { color: rgba(232,234,246,0.35); }
        .cr-input:focus {
          border-color: rgba(108,79,216,0.7);
          background: rgba(255,255,255,0.09);
        }

        .cr-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #6c4fd8, #4f3ab5);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.1s;
          box-shadow: 0 2px 12px rgba(108,79,216,0.4);
        }
        .cr-send-btn:hover { opacity: 0.88; }
        .cr-send-btn:active { transform: scale(0.94); }

        /* ── Emoji picker ── */
        .cr-emoji-picker {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 16px;
          right: 16px;
          background: #1a1830;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 12px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 52vh;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5);
        }

        .cr-emoji-header {
          display: flex;
          gap: 8px;
        }

        .cr-emoji-search {
          flex: 1;
          height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.07);
          color: #e8eaf6;
          font-size: 13px;
          outline: none;
          font-family: inherit;
        }
        .cr-emoji-search::placeholder { color: rgba(232,234,246,0.4); }
        .cr-emoji-search:focus { border-color: rgba(108,79,216,0.6); }

        .cr-emoji-close {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: rgba(232,234,246,0.7);
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .cr-emoji-close:hover { background: rgba(255,255,255,0.12); }

        .cr-emoji-tabs {
          display: flex;
          gap: 4px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }
        .cr-emoji-tabs::-webkit-scrollbar { display: none; }

        .cr-emoji-tab {
          white-space: nowrap;
          padding: 5px 10px;
          border: none;
          background: transparent;
          color: rgba(232,234,246,0.55);
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .cr-emoji-tab:hover { background: rgba(255,255,255,0.07); color: #e8eaf6; }
        .cr-emoji-tab-active { background: rgba(108,79,216,0.25); color: #c4b5fd; }

        .cr-emoji-grid {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 2px;
          overflow-y: auto;
          flex: 1;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }

        .cr-emoji-item {
          background: transparent;
          border: none;
          font-size: 22px;
          padding: 5px;
          border-radius: 8px;
          cursor: pointer;
          line-height: 1;
          transition: background 0.1s;
          text-align: center;
        }
        .cr-emoji-item:hover { background: rgba(255,255,255,0.1); }
        .cr-emoji-item:active { background: rgba(255,255,255,0.18); }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        /* ── Tablet (600–899px) ── */
        @media (max-width: 899px) and (min-width: 600px) {
          .cr-sidebar { width: 200px; }
          .cr-msg-row { max-width: 82%; }
          .cr-emoji-grid { grid-template-columns: repeat(8, 1fr); }
        }

        /* ── Mobile (<600px) ── */
        @media (max-width: 599px) {
          .cr-wrap { flex-direction: column; }

          .cr-sidebar { display: none; }

          .cr-header { padding: 12px 14px; }
          .cr-header-title { font-size: 14px; }

          .cr-messages { padding: 14px 12px 8px; gap: 5px; }

          .cr-msg-row { max-width: 88%; }

          .cr-bubble { font-size: 13.5px; padding: 9px 12px; }

          .cr-composer { padding: 10px 10px; gap: 7px; }

          .cr-emoji-btn { width: 38px; height: 38px; font-size: 18px; }

          .cr-input { height: 38px; font-size: 13px; }

          .cr-send-btn { width: 38px; height: 38px; }

          .cr-emoji-picker {
            left: 0;
            right: 0;
            bottom: calc(100% + 4px);
            border-radius: 16px 16px 0 0;
            max-height: 60vh;
            border-left: none;
            border-right: none;
            border-bottom: none;
          }

          .cr-emoji-grid { grid-template-columns: repeat(7, 1fr); }
          .cr-emoji-item { font-size: 24px; padding: 7px 4px; }
        }

        /* ── Large desktop (≥1200px) ── */
        @media (min-width: 1200px) {
          .cr-sidebar { width: 280px; }
          .cr-emoji-picker {
            left: 16px;
            right: auto;
            width: 400px;
            max-height: 420px;
          }
          .cr-emoji-grid { grid-template-columns: repeat(10, 1fr); }
        }
      `}</style>
    </div>
  );
}
