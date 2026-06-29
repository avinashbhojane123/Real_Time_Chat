# 💬 Real Time Chat

A full-stack real-time chat application with passcode-protected rooms, file sharing, typing indicators, and a polished romantic UI theme — built with **NestJS**, **Socket.IO**, **PostgreSQL**, and **React + Vite**.

---

## ✨ Features

- **Passcode-protected rooms** — create or join any room instantly with a shared passcode; no account registration required
- **Real-time messaging** — bidirectional communication over WebSockets via Socket.IO
- **Persistent chat history** — messages are stored in PostgreSQL and loaded when you join a room
- **Typing indicators** — live "is typing…" feedback for other participants
- **Reply to messages** — tap any bubble to quote and reply inline
- **File sharing** — send images, videos, audio, PDFs, documents, and archives; images open in a full-screen lightbox
- **Online/offline presence** — see who's active with last-seen timestamps
- **Device metadata** — each user's OS, browser, and device type are detected and displayed
- **Animated UI** — floating hearts, love particles, and emoji picker for a delightful experience
- **Fully responsive** — optimised for desktop, tablet, and mobile (including landscape and very small screens)
- **Dark mode support** — respects the OS-level `prefers-color-scheme` setting

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript, Socket.IO 4, TypeORM, Multer |
| Database | PostgreSQL |
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Custom CSS with CSS variables, Bootstrap 5 |
| Routing | React Router DOM v7 |
| HTTP client | Axios |
| Real-time | socket.io-client |

---

## 📂 Project Structure

```
Real_Time_Chat/
├── backend/                  # NestJS API + WebSocket server
│   └── src/
│       ├── chat/             # WebSocket gateway (join, send, typing, users)
│       ├── messages/         # Message entity (text, files, replies)
│       ├── rooms/            # Room entity + controller + service
│       ├── users/            # User entity (nickname, presence, device info)
│       ├── upload/           # File upload controller (Multer)
│       ├── database/         # TypeORM data source config
│       └── main.ts           # Bootstrap + CORS + static assets
│
└── frontend/                 # React + Vite SPA
    └── src/
        ├── pages/
        │   ├── JoinRoom.tsx  # Glassmorphism join screen
        │   └── ChatRoom.tsx  # Full chat UI with sidebar + messages
        ├── App.jsx           # Router setup
        └── main.jsx          # Entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL database

### 1. Clone the repository

```bash
git clone https://github.com/avinashbhojane123/Real_Time_Chat.git
cd Real_Time_Chat
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env   # or create .env manually
```

Add the following variables to `backend/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=real_time_chat
PORT=10000
```

Install dependencies and start:

```bash
npm install
npm run start:dev
```

The API will be available at `http://localhost:10000/api`.

### 3. Configure the frontend

```bash
cd ../frontend
```

Create a `frontend/.env` file:

```env
VITE_API_URL=http://localhost:10000/api
VITE_SOCKET_URL=http://localhost:10000
```

Install dependencies and start:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🌐 Deployment

The project is deployed with the backend hosted on **Render** and the frontend pointing to it via:

```
SOCKET_URL = https://backend-9i6w.onrender.com
```

To deploy your own instance, update `VITE_API_URL` / `VITE_SOCKET_URL` in the frontend and set your `DATABASE_*` env vars on your hosting provider.

---

## 📡 WebSocket Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `joinRoom` | `{ nickname, passcode, deviceType?, browser?, os? }` | Join or create a room |
| `sendMessage` | `{ nickname, passcode, message, replyTo?, fileUrl?, fileName?, fileType?, fileSize? }` | Send a message or file |
| `typing` | `{ nickname, passcode }` | Notify others you're typing |
| `stopTyping` | `{ nickname, passcode }` | Notify others you stopped typing |
| `getUsers` | `{ passcode }` | Request current user list |
| `getMessages` | `{ passcode }` | Request message history |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `chatHistory` | `Message[]` | Full message history on join |
| `newMessage` | `Message` | Broadcast a new message |
| `usersList` | `User[]` | Updated list of room participants |
| `userJoined` | `{ nickname }` | A user joined the room |
| `userLeft` | `{ nickname }` | A user disconnected |
| `userOnline` | `{ nickname }` | Presence update — online |
| `userOffline` | `{ nickname, lastSeen }` | Presence update — offline |
| `userTyping` | `{ nickname }` | Someone is typing |
| `userStoppedTyping` | `{ nickname }` | Someone stopped typing |

---

## 🗄️ Database Schema

```
rooms      — id, passcode (unique), roomName, isActive, createdAt, updatedAt
users      — id, nickname, roomId, isOnline, lastSeen, deviceType, deviceModel, browser, os, createdAt, updatedAt
messages   — id, nickname, roomId, message, replyTo (jsonb), fileUrl, fileName, fileType, fileSize, createdAt
```

---

## 📁 File Uploads

Files are uploaded via `POST /api/upload` (multipart/form-data) and served as static assets from the `uploads/` folder at `/api/uploads/<filename>`. Supported types include images, video, audio, PDF, Word, Excel, PowerPoint, ZIP, plain text, and JSON.

---

## 🧪 Running Tests

```bash
cd backend
npm run test          # unit tests
npm run test:e2e      # end-to-end tests
npm run test:cov      # coverage report
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a pull request

---

## 📄 License

This project is unlicensed (private). See `backend/package.json` for details.

---

## 👤 Author

**Avinash Bhojane** — [@avinashbhojane123](https://github.com/avinashbhojane123)
