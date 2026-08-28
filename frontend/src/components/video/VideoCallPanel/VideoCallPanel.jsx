import React from 'react';
import { motion } from 'motion/react';
import './VideoCallPanel.css';

export default function VideoCallPanel({
  showVideoPanel,
  setShowVideoPanel,
  callState,
  callerName,
  remoteUserName,
  remoteVideoRef,
  localVideoRef,
  videoFit,
  setVideoFit,
  callDuration,
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
  isPipMinimized,
  setIsPipMinimized,
  togglePipMinimized,
  toggleNativePip,
  acceptCall,
  declineCall,
  endCall,
}) {
  if (!showVideoPanel) return null;

  // Render Compact In-App Floating PiP Window when minimized
  if (isPipMinimized && callState === 'active') {
    return (
      <motion.div
        drag
        dragElastic={0.1}
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '320px',
          height: '210px',
          borderRadius: '16px',
          backgroundColor: '#0b141a',
          border: '2px solid rgba(0, 168, 132, 0.5)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
          zIndex: 99999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'grab',
        }}
      >
        {/* Floating PiP Header */}
        <div style={{ height: '36px', padding: '0 10px', backgroundColor: 'rgba(17, 27, 33, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#e9edef', fontSize: '0.78rem', fontWeight: 700, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '16px' }}>videocam</span>
            <span>{remoteUserName || callerName}</span>
            <span style={{ fontSize: '0.7rem', color: '#00a884', marginLeft: '4px' }}>({formatTimer ? formatTimer(callDuration) : `${callDuration}s`})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Native OS PiP Button */}
            <button
              type="button"
              onClick={toggleNativePip}
              title="OS Native Picture-in-Picture"
              style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>picture_in_picture_alt</span>
            </button>
            {/* Expand / Maximize Full Screen */}
            <button
              type="button"
              onClick={togglePipMinimized}
              title="Expand to Full Screen Call"
              style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_full</span>
            </button>
          </div>
        </div>

        {/* Floating PiP Streams */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#000' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '70px', height: '95px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: '#111b21' }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Quick Floating Action Controls */}
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', gap: '6px', zIndex: 10 }}>
            <button
              onClick={toggleMic}
              style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: micMuted ? '#ea0038' : 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={micMuted ? 'Unmute' : 'Mute'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{micMuted ? 'mic_off' : 'mic'}</span>
            </button>
            <button
              onClick={toggleCamera}
              style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: cameraOff ? '#ea0038' : 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{cameraOff ? 'videocam_off' : 'videocam'}</span>
            </button>
            <button
              onClick={endCall}
              style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ea0038', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="End Call"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>call_end</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0b141a', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <div style={{ height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111b21', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', color: '#e9edef', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ color: '#25d366', fontSize: '24px' }}>videocam</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {callState === 'calling'
                ? `Calling ${remoteUserName}...`
                : callState === 'incoming'
                ? `Incoming call from ${callerName}`
                : `WhatsApp Video Call • ${remoteUserName || callerName}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8696a0' }}>End-to-End Encrypted</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* OS Native Picture-in-Picture Button */}
          {callState === 'active' && toggleNativePip && (
            <button
              type="button"
              onClick={toggleNativePip}
              title="OS Native Picture-in-Picture (Float over Desktop)"
              style={{
                backgroundColor: '#202c33',
                color: '#00a884',
                border: '1px solid rgba(0, 168, 132, 0.35)',
                padding: '6px 12px',
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
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_in_picture_alt</span>
              <span>Desktop PiP</span>
            </button>
          )}

          {/* In-App Floating Window PiP Button */}
          {callState === 'active' && togglePipMinimized && (
            <button
              type="button"
              onClick={togglePipMinimized}
              title="Minimize to Floating Window in Chat"
              style={{
                backgroundColor: '#202c33',
                color: '#00a884',
                border: '1px solid rgba(0, 168, 132, 0.35)',
                padding: '6px 12px',
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
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>picture_in_picture</span>
              <span>In-App PiP</span>
            </button>
          )}

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

          <button
            type="button"
            onClick={() => setShowVideoPanel(false)}
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
        {callState === 'calling' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', backgroundColor: '#0b141a' }}>
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
              {(remoteUserName || 'U').slice(0, 2).toUpperCase()}
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
              Calling {remoteUserName}...
            </h3>
            <p style={{ color: '#8696a0', fontSize: '0.9rem', marginBottom: '32px' }}>
              Waiting for response
            </p>
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

        {callState === 'incoming' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', backgroundColor: '#0b141a' }}>
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
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
              {callerName}
            </h3>
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

        {callState === 'active' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Duration Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                zIndex: 20,
                backgroundColor: 'rgba(11, 20, 26, 0.75)',
                backdropFilter: 'blur(8px)',
                padding: '6px 14px',
                borderRadius: '20px',
                color: '#25d366',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#25d366', display: 'inline-block' }} />
              <span>{formatTimer(callDuration)}</span>
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
              whileDrag={{ scale: 1.08, boxShadow: '0 16px 36px rgba(0,0,0,0.8)' }}
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
                border: '2px solid rgba(255, 255, 255, 0.25)',
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
              <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '0.65rem', color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                You
              </div>
            </motion.div>

            {/* Floating Bottom Control Bar Overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: '28px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                backgroundColor: 'rgba(17, 27, 33, 0.85)',
                backdropFilter: 'blur(16px)',
                padding: '12px 28px',
                borderRadius: '40px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)',
              }}
            >
              <button
                onClick={toggleMic}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: micMuted ? '#ea0038' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                <span className="material-symbols-outlined">{micMuted ? 'mic_off' : 'mic'}</span>
              </button>

              <button
                onClick={toggleCamera}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: cameraOff ? '#ea0038' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                <span className="material-symbols-outlined">{cameraOff ? 'videocam_off' : 'videocam'}</span>
              </button>

              <button
                onClick={flipCamera}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="Flip Camera"
              >
                <span className="material-symbols-outlined">flip_camera_ios</span>
              </button>

              <button
                onClick={toggleScreenShare}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: isScreenSharing ? '#00a884' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
              >
                <span className="material-symbols-outlined">{isScreenSharing ? 'stop_screen_share' : 'screen_share'}</span>
              </button>

              <button
                onClick={endCall}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#ea0038',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(234, 0, 56, 0.5)',
                  transition: 'all 0.2s ease',
                }}
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
