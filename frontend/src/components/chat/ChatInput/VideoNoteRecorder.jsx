import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './VideoNoteRecorder.css';

export default function VideoNoteRecorder({
  isOpen,
  initialWithoutSound = false,
  onClose,
  onSend,
  showToast,
}) {
  const [withoutSound, setWithoutSound] = useState(initialWithoutSound);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [isRecording, setIsRecording] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const videoPreviewRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const withoutSoundRef = useRef(withoutSound);

  useEffect(() => {
    withoutSoundRef.current = withoutSound;
  }, [withoutSound]);

  // Start Camera Stream & Recording
  const startCamera = async (currentFacing = facingMode, isMuted = withoutSound) => {
    try {
      setCameraError(null);
      // Stop any existing tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: {
          facingMode: currentFacing,
          width: { ideal: 480 },
          height: { ideal: 480 },
          aspectRatio: 1,
        },
        audio: isMuted ? false : { echoCancellation: true, noiseSuppression: true },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      // Check supported MIME types for video recording
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 60) {
            handleFinishRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Camera stream error:', err);
      setCameraError(err.message || 'Could not access camera/microphone');
      if (showToast) showToast('Camera access denied or unavailable');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setWithoutSound(initialWithoutSound);
      startCamera(facingMode, initialWithoutSound);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // Toggle Sound ON / OFF live
  const handleToggleSound = () => {
    const nextMuted = !withoutSound;
    setWithoutSound(nextMuted);

    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach((t) => {
          t.enabled = !nextMuted;
        });
      }
    }

    if (showToast) {
      showToast(nextMuted ? 'Sound muted (Without Sound)' : 'Sound unmuted');
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    startCamera(nextFacing, withoutSound);
  };

  // Cancel & Discard
  const handleCancel = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    recordedChunksRef.current = [];
    setIsRecording(false);
    onClose();
    if (showToast) showToast('Video note discarded');
  };

  // Finish and Send
  const handleFinishRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    mediaRecorderRef.current.onstop = () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });

      if (blob.size > 0) {
        onSend({
          blob,
          duration,
          withoutSound: withoutSoundRef.current,
          mimeType,
        });
      }
      setIsRecording(false);
      onClose();
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (_) {}
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="vn-recorder-backdrop">
        <motion.div
          className="vn-recorder-card"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        >
          {/* Header Info */}
          <div className="vn-recorder-header">
            <div className="vn-status-badge">
              <span className="vn-pulse-dot" />
              <span className="vn-timer-text">{formatTimer(duration)}</span>
              <span className="vn-max-tag">/ 01:00</span>
            </div>

            <div className={`vn-mode-badge ${withoutSound ? 'is-muted' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {withoutSound ? 'volume_off' : 'videocam'}
              </span>
              <span>{withoutSound ? 'Without Sound' : 'Video Note'}</span>
            </div>
          </div>

          {/* Camera Viewport (Telegram-style circular mask) */}
          <div className="vn-viewport-wrapper">
            <div className="vn-circular-viewport">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`vn-video-element ${facingMode === 'user' ? 'vn-mirror' : ''}`}
              />

              {/* Pulsing Recording Frame */}
              <div className="vn-pulse-border" />

              {cameraError && (
                <div className="vn-error-overlay">
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#ff4444' }}>
                    videocam_off
                  </span>
                  <p>{cameraError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="vn-controls-bar">
            {/* Discard Button */}
            <button
              type="button"
              className="vn-btn vn-btn-discard"
              onClick={handleCancel}
              title="Discard Video Note"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>

            {/* Sound Toggle Button (With Sound / Without Sound) */}
            <button
              type="button"
              className={`vn-btn vn-btn-sound ${withoutSound ? 'is-muted' : ''}`}
              onClick={handleToggleSound}
              title={withoutSound ? 'Enable Sound' : 'Mute Sound (Without Sound)'}
            >
              <span className="material-symbols-outlined">
                {withoutSound ? 'volume_off' : 'volume_up'}
              </span>
              <span className="vn-btn-sublabel">{withoutSound ? 'Muted' : 'Sound'}</span>
            </button>

            {/* Flip Camera Button */}
            <button
              type="button"
              className="vn-btn vn-btn-flip"
              onClick={handleFlipCamera}
              title="Flip Camera"
            >
              <span className="material-symbols-outlined">flip_camera_ios</span>
              <span className="vn-btn-sublabel">Flip</span>
            </button>

            {/* Send Button */}
            <button
              type="button"
              className="vn-btn vn-btn-send"
              onClick={handleFinishRecording}
              disabled={duration === 0 && !isRecording}
              title="Send Video Note"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
