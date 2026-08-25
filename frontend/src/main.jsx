import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Catch and suppress browser extension injected error noise (e.g. logsListener.bundle.js, otel.surfe.com, background.js extension errors)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    const message = typeof reason === 'string' ? reason : (reason.message || JSON.stringify(reason));
    const stack = reason.stack || '';
    if (
      stack.includes('chrome-extension://') ||
      stack.includes('logsListener') ||
      message.includes('permission error') ||
      message.includes('UserAuthError') ||
      message.includes('otel.surfe.com')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      if (
        event.filename?.includes('chrome-extension://') ||
        event.filename?.includes('logsListener') ||
        event.message?.includes('permission error') ||
        event.message?.includes('UserAuthError')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
