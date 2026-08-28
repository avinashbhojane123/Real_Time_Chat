import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

/**
 * DesktopPipPortal
 * Renders an interactive React interface directly into the Chromium Document Picture-in-Picture window.
 */
export default function DesktopPipPortal({
  pipWindow,
  callerName,
  remoteUserName,
  localStream,
  remoteStream,
  micMuted,
  cameraOff,
  videoFit,
  setVideoFit,
  isStreamSwapped,
  setIsStreamSwapped,
  callDuration,
  formatTimer,
  toggleMic,
  toggleCamera,
  endCall,
  onSwitchToInAppPip,
  onReturnToFullscreen,
}) {
  const pipRemoteVideoRef = useRef(null);
  const pipLocalVideoRef = useRef(null);

  // Sync streams to video elements inside the PiP window
  useEffect(() => {
    if (!pipWindow) return;

    const mainNode = isStreamSwapped ? pipLocalVideoRef.current : pipRemoteVideoRef.current;
    const miniNode = isStreamSwapped ? pipRemoteVideoRef.current : pipLocalVideoRef.current;

    const mainStream = isStreamSwapped ? localStream : remoteStream;
    const miniStream = isStreamSwapped ? remoteStream : localStream;

    if (mainNode && mainStream) {
      mainNode.srcObject = mainStream;
      mainNode.play().catch((err) => console.warn('[DesktopPiP] Main video play warning:', err));
    }
    if (miniNode && miniStream) {
      miniNode.srcObject = miniStream;
      miniNode.play().catch((err) => console.warn('[DesktopPiP] Mini video play warning:', err));
    }
  }, [pipWindow, localStream, remoteStream, isStreamSwapped]);

  if (!pipWindow || !pipWindow.document || !pipWindow.document.body) {
    return null;
  }

  const displayName = remoteUserName || callerName || 'WhatsApp Call';
  const displayTimer = formatTimer ? formatTimer(callDuration) : `${callDuration}s`;

  return ReactDOM.createPortal(
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0b141a',
        color: '#e9edef',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top Header in OS Window */}
      <div
        style={{
          height: '38px',
          padding: '0 12px',
          backgroundColor: 'rgba(17, 27, 33, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#25d366',
              boxShadow: '0 0 8px #25d366',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '130px',
            }}
          >
            {displayName}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#25d366',
              backgroundColor: 'rgba(37, 211, 102, 0.12)',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: 600,
            }}
          >
            {displayTimer}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Switch to In-App Floating PiP */}
          <button
            type="button"
            onClick={onSwitchToInAppPip}
            title="Dock to In-App PiP"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '6px',
              color: '#00a884',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              dock_to_right
            </span>
            <span>Dock App</span>
          </button>

          {/* Return / Maximize to Full App View */}
          <button
            type="button"
            onClick={onReturnToFullscreen}
            title="Expand to Full View in App"
            style={{
              background: 'rgba(0, 168, 132, 0.2)',
              border: '1px solid rgba(0, 168, 132, 0.4)',
              borderRadius: '6px',
              color: '#25d366',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
              open_in_full
            </span>
            <span>Maximize</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Remote / Main Video Stream */}
        <video
          ref={pipRemoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: videoFit || 'cover',
            backgroundColor: '#0b141a',
          }}
        />

        {/* Floating Mini PIP Stream (Local / Swapped) */}
        <div
          onClick={() => setIsStreamSwapped((prev) => !prev)}
          title="Click to swap main and mini video"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '85px',
            height: '115px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid rgba(0, 168, 132, 0.7)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.8)',
            backgroundColor: '#111b21',
            zIndex: 20,
            cursor: 'pointer',
          }}
        >
          <video
            ref={pipLocalVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              fontSize: '0.6rem',
              color: '#fff',
              backgroundColor: 'rgba(0,0,0,0.65)',
              padding: '1px 5px',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {isStreamSwapped ? 'Remote' : 'You'}
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(11, 20, 26, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '6px 14px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            zIndex: 25,
          }}
        >
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMic}
            title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: micMuted ? '#ea0038' : 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {micMuted ? 'mic_off' : 'mic'}
            </span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={toggleCamera}
            title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: cameraOff ? '#ea0038' : 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {cameraOff ? 'videocam_off' : 'videocam'}
            </span>
          </button>

          {/* Swap Stream Button */}
          <button
            type="button"
            onClick={() => setIsStreamSwapped((prev) => !prev)}
            title="Swap Camera Streams"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              swap_horizontal_circle
            </span>
          </button>

          {/* Video Fit Button */}
          <button
            type="button"
            onClick={() => setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
            title={videoFit === 'contain' ? 'Fill Frame' : 'Fit Frame'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#00a884',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {videoFit === 'contain' ? 'crop_free' : 'aspect_ratio'}
            </span>
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            title="End Call"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#ea0038',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(234, 0, 56, 0.5)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
              call_end
            </span>
          </button>
        </div>
      </div>
    </div>,
    pipWindow.document.body
  );
}
