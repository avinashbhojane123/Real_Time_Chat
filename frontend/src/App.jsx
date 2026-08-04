import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinRoom from './pages/JoinRoom.jsx';
import ChatRoom from './pages/ChatRoom.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/chat" element={<ChatRoom />} />
      </Routes>
    </BrowserRouter>
  );
}
