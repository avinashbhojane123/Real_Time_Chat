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
  acceptCall,
  declineCall,
  endCall,
}) {
  if (!showVideoPanel) return null;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
