import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import JoinRoom from './pages/JoinRoom.jsx';
import ChatRoom from './pages/ChatRoom.jsx';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/chat" element={<ChatRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
