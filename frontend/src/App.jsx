import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const JoinRoom = lazy(() => import('./pages/JoinRoom'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));

function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(1200px 800px at 15% 10%, #1a1440 0%, transparent 60%), linear-gradient(135deg, #0f0b2a 0%, #070414 100%)',
        color: '#e9ecff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          padding: '32px 48px',
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#00e5ff',
            borderRightColor: '#7c4dff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <span style={{ fontSize: '14px', letterSpacing: '0.5px', fontWeight: 600, opacity: 0.9 }}>
          Loading Space…
        </span>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<JoinRoom />} />
          <Route path="/chat" element={<ChatRoom />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;