import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DesktopPipPortal from './DesktopPipPortal';
import './VideoCallPanel.css';

export default function VideoCallPanel({
  showVideoPanel,
  setShowVideoPanel,
  callState,
  callerName,
  remoteUserName,
  remoteVideoRef,
  localVideoRef,
  localStream,
  remoteStream,
  videoFit = 'contain',
  setVideoFit,
  callDuration = 0,
  formatTimer,
  isStreamSwapped,
  setIsStreamSwapped,
  micMuted,
  cameraOff,
  isScreenSharing,
  toggleMic,
  toggleCamera,
  flipCamera,
  toggleScreenShare,
  // Unified PiP props
  pipMode = 'none',
  setPipMode,
  pipWindow,
  openDesktopPip,
  openInAppPip,
  closePip,
  togglePip,
  isPipSupported,
  isDocPipSupported,
  // Backward compatibility
  isPipMinimized,
  setIsPipMinimized,
  togglePipMinimized,
  toggleNativePip,
  acceptCall,
  declineCall,
  endCall,
}) {
  const [showPipMenu, setShowPipMenu] = useState(false);
  const [pipSize, setPipSize] = useState('standard'); // 'compact' | 'standard' | 'expanded'

  // Dimensions for In-App PiP card
  const pipDimensions = {
    compact: { width: 280, height: 180 },
    standard: { width: 350, height: 225 },
    expanded: { width: 440, height: 280 },
  };

  const currentSize = pipDimensions[pipSize] || pipDimensions.standard;

  const displayName = remoteUserName || callerName || 'WhatsApp Contact';
  const displayTimer = formatTimer ? formatTimer(callDuration) : `${callDuration}s`;
  const initialLetter = displayName.slice(0, 2).toUpperCase();

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => setShowPipMenu(false);
    if (showPipMenu) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [showPipMenu]);

  // If panel is hidden and not in any PiP mode, return null
  if (!showVideoPanel && pipMode === 'none') return null;

  // Resolve current active pip mode from props
  const effectivePipMode = pipMode !== 'none' ? pipMode : isPipMinimized ? 'in-app' : 'none';

  // =========================================================================
  // 1. DESKTOP OS PICTURE-IN-PICTURE (Document PiP Portal)
  // =========================================================================
  if (effectivePipMode === 'desktop-os' && callState === 'active') {
    return (
      <>
        {/* Render Desktop PiP Portal into the Chromium documentPictureInPicture window */}
        {pipWindow && (
          <DesktopPipPortal
            pipWindow={pipWindow}
            callerName={callerName}
            remoteUserName={remoteUserName}
            localStream={localStream}
            remoteStream={remoteStream}
            micMuted={micMuted}
            cameraOff={cameraOff}
            videoFit={videoFit}
            setVideoFit={setVideoFit}
            isStreamSwapped={isStreamSwapped}
            setIsStreamSwapped={setIsStreamSwapped}
            callDuration={callDuration}
            formatTimer={formatTimer}
            toggleMic={toggleMic}
            toggleCamera={toggleCamera}
            endCall={endCall}
            onSwitchToInAppPip={openInAppPip || togglePipMinimized}
            onReturnToFullscreen={closePip || (() => setPipMode && setPipMode('none'))}
          />
        )}

        {/* Hidden video anchor for standard HTML5 requestPictureInPicture fallback */}
        {!pipWindow && (
          <div style={{ position: 'fixed', bottom: 10, right: 10, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
            <video ref={remoteVideoRef} autoPlay playsInline muted />
            <video ref={localVideoRef} autoPlay playsInline muted />
          </div>
        )}
      </>
    );
  }

  // =========================================================================
  // 2. IN-APP FLOATING PICTURE-IN-PICTURE WINDOW
  // =========================================================================
  if (effectivePipMode === 'in-app' && callState === 'active') {
    return (
      <motion.div
        drag
        dragElastic={0.12}
        dragConstraints={{
          top: 10,
          left: -(typeof window !== 'undefined' ? window.innerWidth - currentSize.width - 24 : 800),
          right: 10,
          bottom: typeof window !== 'undefined' ? window.innerHeight - currentSize.height - 24 : 600,
        }}
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="wa-pip-card"
        style={{
          bottom: '24px',
          right: '24px',
          width: `${currentSize.width}px`,
          height: `${currentSize.height}px`,
        }}
      >
        {/* Floating PiP Header */}
        <div className="wa-pip-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span className="material-symbols-outlined" style={{ color: '#25d366', fontSize: '16px' }}>
              videocam
            </span>
            <span
              style={{
                maxWidth: pipSize === 'compact' ? '90px' : '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 700,
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#25d366', marginLeft: '2px', fontWeight: 600 }}>
              ({displayTimer})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Cycle PiP Sizes (Compact -> Standard -> Expanded) */}
            <button
              type="button"
              className="wa-pip-btn"
              onClick={() =>
                setPipSize((prev) => (prev === 'compact' ? 'standard' : prev === 'standard' ? 'expanded' : 'compact'))
              }
              title={`Resize PiP (Current: ${pipSize.toUpperCase()})`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                aspect_ratio
              </span>
            </button>

            {/* Pop out to Desktop OS PiP */}
            <button
              type="button"
              className="wa-pip-btn"
              onClick={openDesktopPip || toggleNativePip}
              title="Pop out to Desktop OS Floating Window"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#00a884' }}>
                picture_in_picture_alt
              </span>
            </button>

            {/* Expand to Full App View */}
            <button
              type="button"
              className="wa-pip-btn"
              onClick={closePip || togglePipMinimized}
              title="Expand to Fullscreen Call"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#25d366' }}>
                open_in_full
              </span>
            </button>
          </div>
        </div>

        {/* Floating Streams Viewport */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>
          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: videoFit || 'cover',
              backgroundColor: '#0b141a',
              display: isStreamSwapped && cameraOff ? 'none' : 'block',
            }}
          />

          {/* Camera Off / Audio Visualizer Avatar Fallback */}
          {((!isStreamSwapped && false) || (isStreamSwapped && cameraOff)) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: '#0b141a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                }}
              >
                {initialLetter}
              </div>
              <div className="wa-sound-waves">
                <span className="wa-sound-bar" />
                <span className="wa-sound-bar" />
                <span className="wa-sound-bar" />
                <span className="wa-sound-bar" />
                <span className="wa-sound-bar" />
              </div>
            </div>
          )}

          {/* Floating Local Stream Mini-PiP (Click to Swap) */}
          <div
            onClick={() => setIsStreamSwapped((prev) => !prev)}
            title="Click to swap main and mini video"
            className="wa-mini-pip"
            style={{
              width: pipSize === 'compact' ? '65px' : pipSize === 'standard' ? '80px' : '95px',
              height: pipSize === 'compact' ? '90px' : pipSize === 'standard' ? '110px' : '130px',
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '3px',
                left: '3px',
                fontSize: '0.55rem',
                color: '#fff',
                backgroundColor: 'rgba(0,0,0,0.65)',
                padding: '1px 4px',
                borderRadius: '3px',
                fontWeight: 600,
              }}
            >
              {isStreamSwapped ? 'Remote' : 'You'}
            </div>
          </div>

          {/* Quick Floating Action Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 25,
            }}
          >
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={toggleMic}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: micMuted ? '#ea0038' : 'rgba(0, 0, 0, 0.65)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
              title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {micMuted ? 'mic_off' : 'mic'}
              </span>
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              onClick={toggleCamera}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: cameraOff ? '#ea0038' : 'rgba(0, 0, 0, 0.65)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
              title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {cameraOff ? 'videocam_off' : 'videocam'}
              </span>
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#ea0038',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(234, 0, 56, 0.5)',
              }}
              title="End Call"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                call_end
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // 3. FULL SCREEN CALL VIEW
  // =========================================================================
  return (
    <div className="wa-call-container">
      {/* Top Header Bar */}
      <div
        style={{
          height: '60px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#111b21',
          borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          color: '#e9edef',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ color: '#25d366', fontSize: '24px' }}>
            videocam
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {callState === 'calling'
                ? `Calling ${remoteUserName}...`
                : callState === 'incoming'
                ? `Incoming call from ${callerName}`
                : `WhatsApp Video Call • ${displayName}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8696a0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#00a884' }}>
                lock
              </span>
              <span>End-to-End Encrypted</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          {/* Unified Picture-in-Picture Control Button with Dropdown Selector */}
          {callState === 'active' && (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#202c33',
                  border: '1px solid rgba(0, 168, 132, 0.4)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {/* Primary PiP Button (Click for instant smart Desktop/In-App PiP) */}
                <button
                  type="button"
                  onClick={() => (openDesktopPip ? openDesktopPip() : toggleNativePip ? toggleNativePip() : openInAppPip())}
                  title="Float Video (Picture-in-Picture)"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#00a884',
                    border: 'none',
                    padding: '7px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    picture_in_picture_alt
                  </span>
                  <span>Picture-in-Picture</span>
                </button>

                {/* Dropdown Chevron for mode selection */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPipMenu((prev) => !prev);
                  }}
                  title="Choose Picture-in-Picture Mode"
                  style={{
                    backgroundColor: 'rgba(0, 168, 132, 0.15)',
                    color: '#00a884',
                    border: 'none',
                    borderLeft: '1px solid rgba(0, 168, 132, 0.3)',
                    padding: '7px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    arrow_drop_down
                  </span>
                </button>
              </div>

              {/* PiP Mode Selector Dropdown */}
              <AnimatePresence>
                {showPipMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="wa-pip-menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Desktop OS PiP Option */}
                    <button
                      type="button"
                      className="wa-pip-menu-item"
                      onClick={() => {
                        setShowPipMenu(false);
                        if (openDesktopPip) openDesktopPip();
                        else if (toggleNativePip) toggleNativePip();
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '20px' }}>
                        desktop_windows
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>Desktop Float (OS PiP)</div>
                        <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Always-on-top over all desktop apps</div>
                      </div>
                    </button>

                    {/* In-App Float PiP Option */}
                    <button
                      type="button"
                      className="wa-pip-menu-item"
                      onClick={() => {
                        setShowPipMenu(false);
                        if (openInAppPip) openInAppPip();
                        else if (togglePipMinimized) togglePipMinimized();
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: '#25d366', fontSize: '20px' }}>
                        dock_to_bottom
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>In-App Float (Chat PiP)</div>
                        <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Draggable widget inside WhatsApp chat</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Video Fit Button */}
          <button
            type="button"
            onClick={() => setVideoFit((prev) => (prev === 'contain' ? 'cover' : 'contain'))}
            title={videoFit === 'contain' ? 'Current: Fit Frame (Click for Fill Screen)' : 'Current: Fill Screen (Click for Fit Frame)'}
            style={{
              backgroundColor: videoFit === 'contain' ? 'rgba(0, 168, 132, 0.15)' : '#202c33',
              color: '#00a884',
              border: '1px solid rgba(0, 168, 132, 0.35)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {videoFit === 'contain' ? 'aspect_ratio' : 'crop_free'}
            </span>
            <span>{videoFit === 'contain' ? 'Fit Frame' : 'Fill Screen'}</span>
          </button>

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={() => {
              if (callState === 'active' && openInAppPip) {
                openInAppPip();
              } else {
                setShowVideoPanel(false);
              }
            }}
            title="Minimize Panel"
            style={{
              background: 'none',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>
        {/* Calling View */}
        {callState === 'calling' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              backgroundColor: '#0b141a',
            }}
          >
            <div
              className="wa-call-pulse"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 700,
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(0, 168, 132, 0.4)',
              }}
            >
              {initialLetter}
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>Calling {remoteUserName}...</h3>
            <p style={{ color: '#8696a0', fontSize: '0.9rem', marginBottom: '32px' }}>Waiting for response</p>
            <button
              onClick={endCall}
              style={{
                backgroundColor: '#ea0038',
                color: '#fff',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '30px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(234, 0, 56, 0.4)',
              }}
            >
              <span className="material-symbols-outlined">call_end</span>
              End Call
            </button>
          </div>
        )}

        {/* Incoming Call View */}
        {callState === 'incoming' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              backgroundColor: '#0b141a',
            }}
          >
            <div
              className="wa-call-pulse"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 700,
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(0, 168, 132, 0.4)',
              }}
            >
              {(callerName || 'C').slice(0, 2).toUpperCase()}
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>{callerName}</h3>
            <p style={{ color: '#25d366', fontSize: '0.95rem', fontWeight: 600, marginBottom: '32px' }}>
              Incoming WhatsApp Video Call...
            </p>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <button
                onClick={acceptCall}
                style={{
                  backgroundColor: '#25d366',
                  color: '#0b141a',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
                }}
              >
                <span className="material-symbols-outlined">call</span>
                Accept
              </button>
              <button
                onClick={declineCall}
                style={{
                  backgroundColor: '#ea0038',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(234, 0, 56, 0.4)',
                }}
              >
                <span className="material-symbols-outlined">call_end</span>
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Active Call View */}
        {callState === 'active' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Live Call Duration & HD Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                zIndex: 20,
                backgroundColor: 'rgba(11, 20, 26, 0.78)',
                backdropFilter: 'blur(10px)',
                padding: '6px 14px',
                borderRadius: '20px',
                color: '#25d366',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#25d366',
                  boxShadow: '0 0 8px #25d366',
                  display: 'inline-block',
                }}
              />
              <span>{displayTimer}</span>
              <span style={{ color: '#8696a0', fontSize: '0.75rem' }}>• HD</span>
            </div>

            {/* Remote Stream Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: videoFit,
                backgroundColor: '#0b141a',
                transition: 'object-fit 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />

            {/* Floating PIP Local Stream */}
            <motion.div
              drag
              dragConstraints={{ top: 0, left: -280, right: 0, bottom: 380 }}
              dragElastic={0.15}
              whileDrag={{ scale: 1.06, boxShadow: '0 16px 36px rgba(0,0,0,0.8)' }}
              onClick={() => setIsStreamSwapped((prev) => !prev)}
              title="Click to swap main and PIP video views"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '140px',
                height: '210px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                border: '2px solid rgba(0, 168, 132, 0.6)',
                backgroundColor: '#111b21',
                zIndex: 30,
                cursor: 'grab',
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '8px',
                  fontSize: '0.65rem',
                  color: '#fff',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                {isStreamSwapped ? 'Remote' : 'You'}
              </div>
            </motion.div>

            {/* Floating Bottom Control Bar Overlay */}
            <div className="wa-floating-controls">
              {/* Mic Toggle */}
              <button
                type="button"
                onClick={toggleMic}
                className={`wa-control-btn ${micMuted ? 'danger' : ''}`}
                title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                <span className="material-symbols-outlined">{micMuted ? 'mic_off' : 'mic'}</span>
              </button>

              {/* Camera Toggle */}
              <button
                type="button"
                onClick={toggleCamera}
                className={`wa-control-btn ${cameraOff ? 'danger' : ''}`}
                title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                <span className="material-symbols-outlined">{cameraOff ? 'videocam_off' : 'videocam'}</span>
              </button>

              {/* Flip Camera */}
              <button type="button" onClick={flipCamera} className="wa-control-btn" title="Flip Camera">
                <span className="material-symbols-outlined">flip_camera_ios</span>
              </button>

              {/* Screen Share */}
              <button
                type="button"
                onClick={toggleScreenShare}
                className={`wa-control-btn ${isScreenSharing ? 'active' : ''}`}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                <span className="material-symbols-outlined">{isScreenSharing ? 'stop_screen_share' : 'screen_share'}</span>
              </button>

              {/* Pop to Desktop OS PiP button in controls */}
              <button
                type="button"
                onClick={openDesktopPip || toggleNativePip}
                className="wa-control-btn"
                title="Pop out to Desktop OS PiP"
                style={{ color: '#00a884' }}
              >
                <span className="material-symbols-outlined">picture_in_picture_alt</span>
              </button>

              {/* End Call */}
              <button
                type="button"
                onClick={endCall}
                className="wa-control-btn danger"
                style={{ width: '52px', height: '52px' }}
                title="End Call"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  call_end
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
