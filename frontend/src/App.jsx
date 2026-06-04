import { BrowserRouter, Routes, Route } from 'react-router-dom';

import JoinRoom from './pages/JoinRoom';
import ChatRoom from './pages/ChatRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/chat" element={<ChatRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;