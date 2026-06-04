// import { useEffect, useRef, useState } from 'react';
// import { io, Socket } from 'socket.io-client';

// const SOCKET_URL = 'http://localhost:3000';

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

// function ChatRoom() {
//   const nickname =
//     localStorage.getItem('nickname') || '';

//   const passcode =
//     localStorage.getItem('passcode') || '';

//   const [message, setMessage] = useState('');
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [users, setUsers] = useState<User[]>([]);

//   const socketRef = useRef<Socket | null>(null);
//   const chatBodyRef = useRef<HTMLDivElement>(null);

//   const formatDateTime = (date?: string) => {
//     if (!date) return '';

//     return new Date(date).toLocaleString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true,
//     });
//   };

//   const formatLastSeen = (date?: string) => {
//     if (!date) return 'Never';

//     return new Date(date).toLocaleString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true,
//     });
//   };

//   useEffect(() => {
//     const socket = io(SOCKET_URL, {
//       transports: ['websocket'],
//     });

//     socketRef.current = socket;

//     socket.emit('joinRoom', {
//       nickname,
//       passcode,
//     });

//     socket.emit('getUsers', {
//       passcode,
//     });

//     socket.on(
//       'chatHistory',
//       (data: Message[]) => {
//         setMessages(data);
//       },
//     );

//     socket.on(
//       'newMessage',
//       (data: Message) => {
//         setMessages((prev) => [...prev, data]);
//       },
//     );

//     socket.on(
//       'usersList',
//       (data: User[]) => {
//         setUsers(data);
//       },
//     );

//     socket.on(
//       'userOnline',
//       (data: {
//         nickname: string;
//       }) => {
//         setUsers((prev) => {
//           const exists = prev.find(
//             (user) =>
//               user.nickname === data.nickname,
//           );

//           if (exists) {
//             return prev.map((user) =>
//               user.nickname === data.nickname
//                 ? {
//                     ...user,
//                     isOnline: true,
//                     lastSeen: undefined,
//                   }
//                 : user,
//             );
//           }

//           return [
//             ...prev,
//             {
//               id: Date.now(),
//               nickname: data.nickname,
//               isOnline: true,
//             },
//           ];
//         });
//       },
//     );

//     socket.on(
//       'userOffline',
//       (data: {
//         nickname: string;
//         lastSeen: string;
//       }) => {
//         setUsers((prev) =>
//           prev.map((user) =>
//             user.nickname === data.nickname
//               ? {
//                   ...user,
//                   isOnline: false,
//                   lastSeen: data.lastSeen,
//                 }
//               : user,
//           ),
//         );
//       },
//     );

//     socket.on(
//       'userJoined',
//       (data: {
//         nickname: string;
//       }) => {
//         setMessages((prev) => [
//           ...prev,
//           {
//             nickname: 'System',
//             message: `${data.nickname} joined`,
//           },
//         ]);
//       },
//     );

//     socket.on(
//       'userLeft',
//       (data: {
//         nickname: string;
//       }) => {
//         setMessages((prev) => [
//           ...prev,
//           {
//             nickname: 'System',
//             message: `${data.nickname} left`,
//           },
//         ]);
//       },
//     );

//     return () => {
//       socket.removeAllListeners();
//       socket.disconnect();
//     };
//   }, [nickname, passcode]);

//   useEffect(() => {
//     if (chatBodyRef.current) {
//       chatBodyRef.current.scrollTo({
//         top: chatBodyRef.current.scrollHeight,
//         behavior: 'smooth',
//       });
//     }
//   }, [messages]);

//   const sendMessage = () => {
//     if (!message.trim()) return;

//     socketRef.current?.emit(
//       'sendMessage',
//       {
//         passcode,
//         nickname,
//         message: message.trim(),
//       },
//     );

//     setMessage('');
//   };

//   return (
//     <div className="container mt-4">
//       <div className="card shadow-lg">

//         {/* Header */}
//         <div className="card-header bg-success text-white">
//           <div className="d-flex justify-content-between align-items-center">
//             <div>
//               <h5 className="mb-0">
//                 Room: {passcode}
//               </h5>

//               <small>
//                 {
//                   users.filter(
//                     (user) => user.isOnline,
//                   ).length
//                 }{' '}
//                 online
//               </small>
//             </div>
//           </div>
//         </div>

//         {/* Users */}
//         <div className="card-body border-bottom">
//           <h6 className="mb-3">
//             Users
//           </h6>

//           {users.length === 0 ? (
//             <small className="text-muted">
//               No users found
//             </small>
//           ) : (
//             users.map((user) => (
//               <div
//                 key={user.id}
//                 className="d-flex justify-content-between align-items-center mb-2"
//               >
//                 <span>
//                   {user.nickname}
//                 </span>

//                 {user.isOnline ? (
//                   <span className="text-success fw-semibold">
//                     ● Online
//                   </span>
//                 ) : (
//                   <small className="text-muted">
//                     Last seen{' '}
//                     {formatLastSeen(
//                       user.lastSeen,
//                     )}
//                   </small>
//                 )}
//               </div>
//             ))
//           )}
//         </div>

//         {/* Messages */}
//         <div
//           ref={chatBodyRef}
//           className="card-body d-flex flex-column"
//           style={{
//             height: '500px',
//             overflowY: 'auto',
//           }}
//         >
//           {messages.map((msg, index) => {
//             const isSystem =
//               msg.nickname === 'System';

//             const isCurrentUser =
//               msg.nickname === nickname;

//             return (
//               <div
//                 key={index}
//                 className={`alert ${
//                   isSystem
//                     ? 'alert-secondary text-center'
//                     : isCurrentUser
//                     ? 'alert-success align-self-end'
//                     : 'alert-light align-self-start'
//                 } p-2 mb-2`}
//                 style={{
//                   maxWidth: '75%',
//                 }}
//               >
//                 {!isSystem && (
//                   <div className="fw-bold mb-1">
//                     {msg.nickname}
//                   </div>
//                 )}

//                 <div>{msg.message}</div>

//                 {!isSystem &&
//                   msg.createdAt && (
//                     <div className="text-end mt-1">
//                       <small className="text-muted">
//                         {formatDateTime(
//                           msg.createdAt,
//                         )}
//                       </small>
//                     </div>
//                   )}
//               </div>
//             );
//           })}
//         </div>

//         {/* Input */}
//         <div className="card-footer d-flex">
//           <input
//             type="text"
//             className="form-control me-2 rounded-pill"
//             placeholder="Type message..."
//             value={message}
//             onChange={(e) =>
//               setMessage(e.target.value)
//             }
//             onKeyDown={(e) => {
//               if (e.key === 'Enter') {
//                 sendMessage();
//               }
//             }}
//           />

//           <button
//             className="btn btn-success rounded-pill px-4"
//             onClick={sendMessage}
//           >
//             Send
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ChatRoom;

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta as any).env?.SOCKET_URL || 'https://backend-9i6w.onrender.com';

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

// FULL EMOJI DATA — from your list, split by category
const EMOJIS = {
  Smileys: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾'.split(' '),
  People: '👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 💪 🦾 👶 👧 🧒 👦 👩 🧑 👨 👩🦱 🧑🦱 👨🦱 👩🦰 🧑🦰 👨🦰 👱‍♀️ 👱 👱‍♂️ 👩🦳 🧑🦳 👨🦳 👩🦲 🧑🦲 👨🦲 🧔‍♀️ 🧔 🧔‍♂️ 👵 🧓 👴 👲 🧕 👮‍♀️ 👮 👮‍♂️ 👷‍♀️ 👷 👷‍♂️ 💂‍♀️ 💂 💂‍♂️ 🕵️‍♀️ 🕵️ 🕵️‍♂️ 👩‍⚕️ 🧑‍⚕️ 👨‍⚕️ 👩‍🌾 🧑‍🌾 👨‍🌾 👩‍🍳 🧑‍🍳 👨‍🍳 👩‍🎓 🧑‍🎓 👨‍🎓 👩‍🎤 🧑‍🎤 👨‍🎤 👩‍🏫 🧑‍🏫 👨‍🏫 👩‍💻 🧑‍💻 👨‍💻 👩‍💼 🧑‍💼 👨‍💼 👩‍🔧 🧑‍🔧 👨‍🔧 👩‍🔬 🧑‍🔬 👨‍🔬 👩‍🎨 🧑‍🎨 👨‍🎨 👩‍🚒 🧑‍🚒 👨‍🚒 👩‍✈️ 🧑‍✈️ 👨‍✈️ 👩‍🚀 🧑‍🚀 👨‍🚀 👩‍⚖️ 🧑‍⚖️ 👨‍⚖️ 👸 🤴 🥷 🦸‍♀️ 🦸 🦸‍♂️ 🦹‍♀️ 🦹 🦹‍♂️ 🤶 🎅 🧙‍♀️ 🧙 🧙‍♂️ 🧝‍♀️ 🧝 🧝‍♂️ 🤰 🫄 🫃 🤱'.split(' '),
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
  
  // Inactivity timer refs
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 minutes

  const fmt = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  // Logout user function
  const logoutUser = () => {
    // Emit leave room event
    socketRef.current?.emit('leaveRoom', {
      nickname,
      passcode,
    });

    // Clear localStorage
    localStorage.removeItem('nickname');
    localStorage.removeItem('passcode');
    localStorage.removeItem('lastActivity');

    // Disconnect socket
    socketRef.current?.disconnect();

    // Show alert and reload
    alert('You have been logged out due to inactivity.');
    window.location.reload();
  };

  // Update activity timer
  const updateActivity = () => {
    // Store last activity time in localStorage (persists across refreshes)
    localStorage.setItem('lastActivity', Date.now().toString());

    // Clear existing timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    // Set new timer
    inactivityTimer.current = setTimeout(() => {
      logoutUser();
    }, INACTIVITY_LIMIT);
  };

  // Socket connection effect
  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = s;
    
    s.emit('joinRoom', { nickname, passcode });
    s.emit('getUsers', { passcode });
    
    s.on('chatHistory', setMessages);
    s.on('newMessage', (m: Message) => setMessages(p => [...p, m]));
    s.on('usersList', setUsers);
    s.on('userOnline', ({ nickname: n }) => setUsers(p => p.find(u => u.nickname === n) ? p.map(u => u.nickname === n ? { ...u, isOnline: true } : u) : [...p, { id: Date.now(), nickname: n, isOnline: true }]));
    s.on('userOffline', ({ nickname: n, lastSeen }) => setUsers(p => p.map(u => u.nickname === n ? { ...u, isOnline: false, lastSeen } : u)));
    
    return () => { s.disconnect(); };
  }, [nickname, passcode]);

  // Inactivity tracking effect (with persistence across refresh)
  useEffect(() => {
    const lastActivity = Number(localStorage.getItem('lastActivity') || Date.now());
    const inactiveFor = Date.now() - lastActivity;

    // If already inactive for more than limit, logout immediately
    if (inactiveFor >= INACTIVITY_LIMIT) {
      logoutUser();
      return;
    }

    // Set timer for remaining time
    const remainingTime = INACTIVITY_LIMIT - inactiveFor;
    inactivityTimer.current = setTimeout(() => {
      logoutUser();
    }, remainingTime);

    // Activity events to listen for
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    // Initialize activity
    updateActivity();

    // Cleanup
    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Handle before unload (page refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      socketRef.current?.emit('leaveRoom', {
        nickname,
        passcode,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [nickname, passcode]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const send = () => {
    if (!message.trim()) return;
    socketRef.current?.emit('sendMessage', { passcode, nickname, message: message.trim() });
    
    // Reset activity timer on sending message
    updateActivity();
    
    setMessage('');
    setShowEmoji(false);
  };

  // Add emoji function
  const add = (e: string) => {
    setMessage(m => m + e);
    inputRef.current?.focus();
    // Reset activity timer on emoji selection
    updateActivity();
  };

  // Handle input change with activity update
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    updateActivity();
  };

  const filtered = search ? Object.values(EMOJIS).flat().filter(e => e.includes(search)) : EMOJIS[tab];

  return (
    <div className="wrap">
      <div className="glass">
        <header className="head">
          <div>
          
            <div className="sub">{users.filter(u => u.isOnline).length} online</div>
          </div>
          <div className="avatar">{nickname.slice(0, 2).toUpperCase()}</div>
        </header>

        <aside className="users">
          <h3>Users</h3>
          <ul>
            {users.map(u => (
              <li key={u.id} className="user">
                <span>{u.nickname}</span>
                {u.isOnline ? <span className="on">●</span> : <span className="last">{fmt(u.lastSeen)}</span>}
              </li>
            ))}
          </ul>
        </aside>

        <main ref={chatRef} className="chat">
          {messages.map((m, i) => {
            const me = m.nickname === nickname;
            const sys = m.nickname === 'System';
            return (
              <div key={i} className={`bubble ${sys ? 'sys' : me ? 'me' : 'ot'}`}>
                {!sys && <div className="nick">{m.nickname}</div>}
                <div>{m.message}</div>
                {!sys && m.createdAt && <div className="time">{fmt(m.createdAt)}</div>}
              </div>
            );
          })}
        </main>

        <footer className="composer">
          <button className="eBtn" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
          <input
            ref={inputRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type message..."
          />
          <button className="send" onClick={send}>Send</button>

          {showEmoji && (
            <div className="emoji">
              <div className="eHead">
                <input
                  placeholder="Search emoji"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button onClick={() => setShowEmoji(false)}>✕</button>
              </div>
              {!search && (
                <div className="tabs">
                  {Object.keys(EMOJIS).map(k => (
                    <button key={k} className={tab === k ? 'a' : ''} onClick={() => setTab(k as any)}>
                      {k}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid">
                {filtered.map(e => (
                  <button key={e} onClick={() => add(e)}>{e}</button>
                ))}
              </div>
            </div>
          )}
        </footer>
      </div>
      <style>{`
     .wrap{min-height:100vh;display:grid;place-items:center;padding:16px;background:linear-gradient(135deg,#1a1440,#0f0b2a);color:#e9ecff;font-family:Inter,system-ui}
     .glass{width:100%;max-width:1200px;height:88vh;display:grid;grid-template-columns:280px 1fr;grid-template-rows:auto 1fr auto;grid-template-areas:"h h""u c""u f";background:rgba(255,255,255,.08);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.18);border-radius:24px;overflow:hidden}
     .head{grid-area:h;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.12)}.room{font-weight:700}.sub{font-size:12px;opacity:.8}.avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#e6e9f5;color:#0f0b2a;font-weight:700}
     .users{grid-area:u;padding:16px;background:rgba(0,0,0,.12);overflow:auto;border-right:1px solid rgba(255,255,255,.08)}.users h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;opacity:.7}.user{display:flex;justify-content:space-between;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,.05);border-radius:10px}.on{color:#7CFFB2}.last{font-size:11px;opacity:.6}
     .chat{grid-area:c;padding:18px;overflow:auto;display:flex;flex-direction:column;gap:10px}.bubble{max-width:75%;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}.bubble.me{align-self:flex-end;background:rgba(124,255,178,.18);border-color:rgba(124,255,178,.35)}.bubble.ot{align-self:flex-start}.bubble.sys{align-self:center;opacity:.7;font-size:12px;border-style:dashed}.nick{font-size:11px;font-weight:700;margin-bottom:3px;opacity:.9}.time{font-size:10px;opacity:.6;text-align:right;margin-top:4px}
     .composer{grid-area:f;display:flex;gap:8px;padding:12px;background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.1);position:relative}.composer input{flex:1;padding:12px 16px;border-radius:999px;border:none;outline:none;background:rgba(0,0,0,.25);color:#fff;box-shadow:inset 6px 6px 12px rgba(0,0,0,.35),inset -6px -6px 12px rgba(255,255,255,.05)}.eBtn,.send{border:none;border-radius:999px;padding:0 16px;background:#e6e9f5;color:#0f0b2a;font-weight:700;cursor:pointer;box-shadow:6px 6px 12px rgba(0,0,0,.3),-6px -6px 12px rgba(255,255,255,.07)}.eBtn{width:44px;padding:0;font-size:20px}
     .emoji{position:absolute;bottom:60px;left:12px;right:12px;background:rgba(15,11,42,.9);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:10px;z-index:50;max-height:55vh;display:flex;flex-direction:column}
     .eHead{display:flex;gap:8px;margin-bottom:8px}.eHead input{flex:1;padding:8px 12px;border-radius:10px;border:none;background:rgba(255,255,255,.08);color:#fff;outline:none}.eHead button{background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
     .tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}.tabs button{white-space:nowrap;padding:6px 10px;border:none;background:transparent;color:#cfd3ff;opacity:.7;border-radius:8px;font-size:12px;cursor:pointer}.tabs button.a{background:rgba(255,255,255,.12);opacity:1}
     .grid{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;overflow:auto;flex:1}.grid button{background:transparent;border:none;font-size:24px;padding:6px;border-radius:8px;cursor:pointer}.grid button:active{background:rgba(255,255,255,.12)}
      /* LAPTOP */
      @media(min-width:900px){.emoji{width:380px;left:12px;right:auto;bottom:64px;max-height:420px}.grid{grid-template-columns:repeat(8,1fr)}}
      /* TABLET */
      @media(max-width:899px) and (min-width:600px){.glass{grid-template-columns:220px 1fr;height:90vh}.grid{grid-template-columns:repeat(7,1fr)}}
      /* MOBILE */
      @media(max-width:599px){.wrap{padding:0}.glass{height:100vh;border-radius:0;grid-template-columns:1fr;grid-template-areas:"h""c""f"}.users{display:none}.composer{padding:10px}.emoji{left:0;right:0;bottom:0;border-radius:16px 16px 0 0;max-height:60vh;width:100%}.grid{grid-template-columns:repeat(6,1fr)}.grid button{font-size:26px;padding:8px}}
      `}</style>
    </div>
  );
}
