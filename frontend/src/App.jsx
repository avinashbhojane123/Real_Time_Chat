import { Component, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

const JoinRoom = lazy(() => import('./pages/JoinRoom.jsx'));
const ChatRoom = lazy(() => import('./pages/ChatRoom.jsx'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', backgroundColor: '#0b141a', color: '#e9edef', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#ff4e4e', marginBottom: '16px' }}>error_outline</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: '#8696a0', fontSize: '0.9rem', maxWidth: '420px', marginBottom: '20px' }}>
            An unexpected error occurred while loading this page. Please refresh or try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', backgroundColor: '#00a884', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--m3-background, #0b141a)', color: 'var(--m3-on-background, #e9edef)' }}>
    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading Nexus Space...</div>
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<JoinRoom />} />
            <Route path="/chat" element={<ChatRoom />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </HashRouter>
  );
}


