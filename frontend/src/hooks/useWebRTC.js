import { useState, useEffect, useRef, useCallback } from 'react';
import {
  startIncomingRingtone,
  startOutgoingDialTone,
  playCallEndedTone,
  playCallDeclinedTone,
} from '../utils/audioAlert';

export function useWebRTC({ socketRef, passcode, nickname, recipientUser, showToast }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [callerName, setCallerName] = useState('');
  const [remoteUserName, setRemoteUserName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [videoFit, setVideoFit] = useState('contain');
  const [facingMode, setFacingMode] = useState('user');
  const [isStreamSwapped, setIsStreamSwapped] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [isVoiceOnlyCall, setIsVoiceOnlyCall] = useState(false);

  // Unified PiP State: 'none' | 'in-app' | 'desktop-os'
  const [pipMode, setPipMode] = useState('none');
  const [pipWindow, setPipWindow] = useState(null);
  const pipWindowRef = useRef(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Dedicated HTMLAudioElement for pristine, uninterrupted remote audio
  const remoteAudioElRef = useRef(null);

  // Audio tone cleanup handlers
  const ringtoneCleanupRef = useRef(null);
  const dialToneCleanupRef = useRef(null);

  // Peer targeting socket ID ref
  const targetSocketIdRef = useRef(null);

  const isScreenSharingRef = useRef(false);
  const facingModeRef = useRef('user');
  const cameraOffRef = useRef(false);
  const micMutedRef = useRef(false);
  const isVoiceOnlyRef = useRef(false);

  // Screen sharing capability check
  const isScreenShareSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');

  // Keep refs in sync with state
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  useEffect(() => {
    cameraOffRef.current = cameraOff;
  }, [cameraOff]);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    isVoiceOnlyRef.current = isVoiceOnlyCall;
  }, [isVoiceOnlyCall]);

  const callStateRef = useRef('idle');
  const pendingIceCandidatesRef = useRef([]);
  const callTimerRef = useRef(null);
  const watchDogTimerRef = useRef(null);
  const lastInboundBytesRef = useRef(0);
  const stalledCountRef = useRef(0);
  const latestOfferRef = useRef(null);
  const lastCallEndedAtRef = useRef(0);

  const updateCallState = (state) => {
    setCallState(state);
    callStateRef.current = state;
  };

  // Stop all active ringtones/dialtones
  const stopAllAudioAlerts = useCallback(() => {
    if (ringtoneCleanupRef.current) {
      try {
        ringtoneCleanupRef.current();
      } catch (_) {}
      ringtoneCleanupRef.current = null;
    }
    if (dialToneCleanupRef.current) {
      try {
        dialToneCleanupRef.current();
      } catch (_) {}
      dialToneCleanupRef.current = null;
    }
  }, []);

  // Manage call state sound effects (outgoing ringing / incoming ringing)
  useEffect(() => {
    if (callState === 'calling') {
      stopAllAudioAlerts();
      dialToneCleanupRef.current = startOutgoingDialTone();
    } else if (callState === 'incoming') {
      stopAllAudioAlerts();
      ringtoneCleanupRef.current = startIncomingRingtone();
    } else {
      stopAllAudioAlerts();
    }
    return () => {
      stopAllAudioAlerts();
    };
  }, [callState, stopAllAudioAlerts]);

  // Maintain dedicated remote audio playback element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      remoteAudioElRef.current = audioEl;
      return () => {
        audioEl.srcObject = null;
        remoteAudioElRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (remoteAudioElRef.current && remoteStream) {
      if (remoteAudioElRef.current.srcObject !== remoteStream) {
        remoteAudioElRef.current.srcObject = remoteStream;
      }
      remoteAudioElRef.current.play().catch((err) => {
        console.warn('[WebRTC] Remote audio autoplay blocked:', err);
      });
    }
  }, [remoteStream]);

  // Close any active OS PiP window / exit video PiP
  const closeAllPipWindows = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.close();
      } catch (e) {}
      pipWindowRef.current = null;
      setPipWindow(null);
    }
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }, []);

  const cleanUpCall = useCallback(() => {
    stopAllAudioAlerts();
    targetSocketIdRef.current = null;

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (watchDogTimerRef.current) {
      clearInterval(watchDogTimerRef.current);
      watchDogTimerRef.current = null;
    }
    setCallDuration(0);
    pendingIceCandidatesRef.current = [];
    latestOfferRef.current = null;
    lastInboundBytesRef.current = 0;
    stalledCountRef.current = 0;
    lastCallEndedAtRef.current = Date.now();

    closeAllPipWindows();

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      screenStreamRef.current = null;
    }
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (remoteAudioElRef.current) {
      remoteAudioElRef.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (err) {
        console.warn('Error closing peerConnection:', err);
      }
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);

    updateCallState('idle');
    setMicMuted(false);
    setCameraOff(false);
    setShowVideoPanel(false);
    setIsVoiceOnlyCall(false);
    setPipMode('none');
  }, [closeAllPipWindows, stopAllAudioAlerts]);

  // Clean up all media tracks, timers, and connections on unmount
  useEffect(() => {
    return () => {
      cleanUpCall();
    };
  }, [cleanUpCall]);

  const triggerIceRestart = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') return;
    pc.createOffer({ iceRestart: true })
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current?.emit('webrtcOffer', {
          passcode,
          offer: pc.localDescription,
          targetSocketId: targetSocketIdRef.current,
        });
      })
      .catch((err) => console.warn('[WebRTC] ICE restart offer failed:', err));
  }, [passcode, socketRef]);

  const addIceCandidateSafely = useCallback((candidate) => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
        console.warn('Error adding ICE candidate:', err);
      });
    } else {
      pendingIceCandidatesRef.current.push(candidate);
    }
  }, []);

  const processPendingIceCandidates = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      while (pendingIceCandidatesRef.current.length > 0) {
        const cand = pendingIceCandidatesRef.current.shift();
        pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
          console.warn('Error processing pending ICE candidate:', err);
        });
      }
    }
  }, []);

  /**
   * Safe media acquisition helper:
   * - Applies full AEC, ANS, AGC constraints
   * - If camera fails (missing webcam, desktop PC), automatically falls back to audio-only
   */
  const acquireMediaStream = useCallback(async ({ isVoice = false } = {}) => {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    if (!isVoice) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingModeRef.current || 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: audioConstraints,
        });
        setIsVoiceOnlyCall(false);
        return stream;
      } catch (err) {
        console.warn('[WebRTC] Camera unavailable or permission denied, falling back to audio only:', err);
        if (showToast) showToast('Camera unavailable — continuing with audio only');
      }
    }

    const audioStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: audioConstraints,
    });
    setIsVoiceOnlyCall(true);
    return audioStream;
  }, [showToast]);

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {}
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp',
          ],
          username: 'openrelay',
          credential: 'openrelay',
        },
      ],
      iceCandidatePoolSize: 10,
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtcCandidate', {
          passcode,
          candidate: e.candidate,
          targetSocketId: targetSocketIdRef.current,
        });
      }
    };

    pc.ontrack = (e) => {
      console.log('[WebRTC] ontrack received:', e.track.kind, 'id:', e.track.id, 'streams:', e.streams?.length);
      e.track.enabled = true;

      // 1. Maintain a single permanent MediaStream container for remote tracks
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      // Remove any existing track of same kind if ID changed to avoid stream collision
      const existing = remoteStreamRef.current.getTracks().find((t) => t.kind === e.track.kind && t.id !== e.track.id);
      if (existing) {
        remoteStreamRef.current.removeTrack(existing);
      }

      // Add newly received track if not yet present
      if (!remoteStreamRef.current.getTracks().some((t) => t.id === e.track.id)) {
        remoteStreamRef.current.addTrack(e.track);
      }

      // Ingest any accompanying tracks from e.streams[0] if provided
      if (e.streams && e.streams[0]) {
        e.streams[0].getTracks().forEach((st) => {
          st.enabled = true;
          if (!remoteStreamRef.current.getTracks().some((t) => t.id === st.id)) {
            remoteStreamRef.current.addTrack(st);
          }
        });
      }

      // 2. Clone into a fresh MediaStream instance with all current tracks so React state updates
      const updatedStream = new MediaStream(remoteStreamRef.current.getTracks());
      remoteStreamRef.current = updatedStream;
      setRemoteStream(updatedStream);

      // Play through dedicated audio element
      if (remoteAudioElRef.current) {
        remoteAudioElRef.current.srcObject = updatedStream;
        remoteAudioElRef.current.play().catch(() => {});
      }

      // 3. Immediately assign to active remote video node with autoplay fallback
      const targetVideo = isStreamSwapped ? localVideoRef.current : remoteVideoRef.current;
      if (targetVideo) {
        if (targetVideo.srcObject !== updatedStream) {
          targetVideo.srcObject = updatedStream;
        }
        targetVideo.play().catch((playErr) => {
          console.warn('[WebRTC] Autoplay blocked, playing muted as fallback:', playErr);
          targetVideo.muted = true;
          targetVideo.play().catch(() => {});
        });
      }

      // 4. Listen for track unmute to guarantee video renders the instant receiver frames arrive
      e.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted:', e.track.kind);
        const activeStream = new MediaStream(remoteStreamRef.current.getTracks());
        remoteStreamRef.current = activeStream;
        setRemoteStream(activeStream);
        const node = isStreamSwapped ? localVideoRef.current : remoteVideoRef.current;
        if (node) {
          if (node.srcObject !== activeStream) {
            node.srcObject = activeStream;
          }
          node.play().catch(() => {});
        }
      };
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        triggerIceRestart();
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [passcode, socketRef, triggerIceRestart, isStreamSwapped]);

  // Sync localStream and remoteStream to main video nodes
  useEffect(() => {
    const mainNode = isStreamSwapped ? localVideoRef.current : remoteVideoRef.current;
    const pipNode = isStreamSwapped ? remoteVideoRef.current : localVideoRef.current;

    const mainStream = isStreamSwapped ? localStream : remoteStream;
    const pipStream = isStreamSwapped ? remoteStream : localStream;

    if (mainNode && mainStream) {
      if (mainNode.srcObject !== mainStream) {
        mainNode.srcObject = mainStream;
      }
      mainNode.play().catch((err) => {
        console.warn('[WebRTC] Main video play error, attempting muted fallback:', err);
        if (!isStreamSwapped && mainNode) {
          mainNode.muted = true;
          mainNode.play().catch(() => {});
        }
      });
    }
    if (pipNode && pipStream) {
      if (pipNode.srcObject !== pipStream) {
        pipNode.srcObject = pipStream;
      }
      pipNode.play().catch((err) => console.warn('[WebRTC] PIP video play error:', err));
    }
  }, [localStream, remoteStream, callState, showVideoPanel, isStreamSwapped, pipMode]);

  // Active call duration timer & watchdog
  useEffect(() => {
    if (callState === 'active') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      stalledCountRef.current = 0;
      lastInboundBytesRef.current = 0;
      watchDogTimerRef.current = setInterval(async () => {
        const pc = peerConnectionRef.current;
        if (!pc || pc.connectionState === 'closed') return;
        try {
          const stats = await pc.getStats();
          let currentBytes = 0;
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.mediaType === 'video')) {
              currentBytes += report.bytesReceived || 0;
            }
          });

          if (currentBytes > 0 && currentBytes === lastInboundBytesRef.current) {
            stalledCountRef.current += 1;
            if (stalledCountRef.current >= 3) {
              stalledCountRef.current = 0;
              triggerIceRestart();
            }
          } else {
            stalledCountRef.current = 0;
          }
          lastInboundBytesRef.current = currentBytes;
        } catch (e) {}
      }, 4000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (watchDogTimerRef.current) clearInterval(watchDogTimerRef.current);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (watchDogTimerRef.current) clearInterval(watchDogTimerRef.current);
    };
  }, [callState, triggerIceRestart]);

  // WebRTC Socket Listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleCallUser = ({ callerName: cName, from, callerSocketId, isVoiceOnly }) => {
      if (Date.now() - lastCallEndedAtRef.current < 2500) return;
      if (callerSocketId) targetSocketIdRef.current = callerSocketId;
      if (isVoiceOnly !== undefined) setIsVoiceOnlyCall(Boolean(isVoiceOnly));

      const peerName = cName || from || 'Participant';
      setCallerName(peerName);
      setRemoteUserName(peerName);
      updateCallState('incoming');
      setShowVideoPanel(true);
    };

    const handleCallAccepted = ({ receiverName: rName, from, receiverSocketId } = {}) => {
      if (receiverSocketId) targetSocketIdRef.current = receiverSocketId;
      if (rName || from) {
        setRemoteUserName(rName || from);
      }
      updateCallState('active');
    };

    const handleWebrtcOffer = async ({ offer, callerName: cName, from, callerSocketId, isVoiceOnly }) => {
      if (Date.now() - lastCallEndedAtRef.current < 2500) return;
      if (callerSocketId) targetSocketIdRef.current = callerSocketId;
      if (isVoiceOnly !== undefined) setIsVoiceOnlyCall(Boolean(isVoiceOnly));
      latestOfferRef.current = offer;

      if (callStateRef.current === 'idle') {
        const peerName = cName || from || 'Participant';
        setCallerName(peerName);
        setRemoteUserName(peerName);
        updateCallState('incoming');
        setShowVideoPanel(true);
      } else if (callStateRef.current === 'active') {
        let pc = peerConnectionRef.current;
        if (!pc && localStreamRef.current) {
          pc = createPeerConnection();
        }
        if (pc && pc.signalingState !== 'closed') {
          try {
            if (pc.signalingState === 'stable' || pc.signalingState === 'have-remote-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              processPendingIceCandidates();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socketRef.current?.emit('webrtcAnswer', {
                passcode,
                answer,
                receiverName: nickname,
                targetSocketId: targetSocketIdRef.current,
              });
            }
          } catch (err) {
            console.warn('[WebRTC] Handling offer error:', err);
          }
        }
      }
    };

    const handleWebrtcAnswer = async ({ answer, receiverName: rName, from, receiverSocketId }) => {
      if (receiverSocketId) targetSocketIdRef.current = receiverSocketId;
      if (rName || from) {
        setRemoteUserName(rName || from);
      }
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          processPendingIceCandidates();
          updateCallState('active');
        } catch (err) {
          console.warn('[WebRTC] Answer set error:', err);
        }
      }
    };

    const handleWebrtcCandidate = ({ candidate }) => {
      if (candidate) {
        addIceCandidateSafely(candidate);
      }
    };

    const handleScreenShareStatus = ({ isSharing }) => {
      console.log('[WebRTC] Remote peer screen share status changed:', isSharing);
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    const handleCallBusy = ({ nickname: busyUser, reason }) => {
      playCallDeclinedTone();
      if (showToast) showToast(`${busyUser || 'Participant'} is busy on another call`);
      cleanUpCall();
    };

    const handleCallTimeout = ({ reason }) => {
      playCallDeclinedTone();
      if (showToast) showToast(reason || 'Call timed out (no answer)');
      cleanUpCall();
    };

    const handleCallMissed = ({ callerName: cName }) => {
      if (showToast) showToast(`Missed call from ${cName || 'Contact'}`);
      cleanUpCall();
    };

    const handleCallError = ({ message }) => {
      if (showToast) showToast(message || 'Unable to connect call');
      cleanUpCall();
    };

    const handleCallEnd = ({ reason } = {}) => {
      playCallEndedTone();
      if (showToast) showToast(reason || 'Call ended');
      cleanUpCall();
    };

    const handleCallDeclined = ({ reason } = {}) => {
      playCallDeclinedTone();
      if (showToast) showToast(reason || 'Call was declined');
      cleanUpCall();
    };

    socket.on('callUser', handleCallUser);
    socket.on('acceptCall', handleCallAccepted);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('webrtcOffer', handleWebrtcOffer);
    socket.on('webrtcAnswer', handleWebrtcAnswer);
    socket.on('webrtcCandidate', handleWebrtcCandidate);
    socket.on('screenShareStatus', handleScreenShareStatus);
    socket.on('callBusy', handleCallBusy);
    socket.on('callTimeout', handleCallTimeout);
    socket.on('callMissed', handleCallMissed);
    socket.on('callError', handleCallError);
    socket.on('callEnded', handleCallEnd);
    socket.on('endCall', handleCallEnd);
    socket.on('callDeclined', handleCallDeclined);
    socket.on('declineCall', handleCallDeclined);

    return () => {
      socket.off('callUser', handleCallUser);
      socket.off('acceptCall', handleCallAccepted);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('webrtcOffer', handleWebrtcOffer);
      socket.off('webrtcAnswer', handleWebrtcAnswer);
      socket.off('webrtcCandidate', handleWebrtcCandidate);
      socket.off('screenShareStatus', handleScreenShareStatus);
      socket.off('callBusy', handleCallBusy);
      socket.off('callTimeout', handleCallTimeout);
      socket.off('callMissed', handleCallMissed);
      socket.off('callError', handleCallError);
      socket.off('callEnded', handleCallEnd);
      socket.off('endCall', handleCallEnd);
      socket.off('callDeclined', handleCallDeclined);
      socket.off('declineCall', handleCallDeclined);
    };
  }, [
    socketRef,
    passcode,
    nickname,
    createPeerConnection,
    processPendingIceCandidates,
    addIceCandidateSafely,
    cleanUpCall,
    showToast,
  ]);

  const startCall = async (options = {}) => {
    const isVoice = Boolean(options?.isVoiceOnly);
    updateCallState('calling');
    setShowVideoPanel(true);
    setPipMode('none');
    setIsVoiceOnlyCall(isVoice);
    setRemoteUserName(recipientUser ? recipientUser.nickname : 'Participant');

    try {
      const stream = await acquireMediaStream({ isVoice });
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localVideoRef.current && !isVoice) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('callUser', {
        passcode,
        callerName: nickname,
        targetNickname: recipientUser ? recipientUser.nickname : undefined,
        isVoiceOnly: isVoice,
      });

      socketRef.current?.emit('webrtcOffer', {
        passcode,
        offer: pc.localDescription,
        callerName: nickname,
        targetNickname: recipientUser ? recipientUser.nickname : undefined,
        isVoiceOnly: isVoice,
      });
    } catch (err) {
      if (showToast) showToast('Microphone/camera access denied: ' + err.message);
      else alert('Could not access microphone/camera: ' + err.message);
      cleanUpCall();
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await acquireMediaStream({ isVoice: isVoiceOnlyRef.current });
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      updateCallState('active');
      socketRef.current?.emit('acceptCall', {
        passcode,
        receiverName: nickname,
        targetSocketId: targetSocketIdRef.current,
      });

      const pc = createPeerConnection();

      if (localVideoRef.current && !isVoiceOnlyRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      if (latestOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(latestOfferRef.current));
        processPendingIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current?.emit('webrtcAnswer', {
          passcode,
          answer,
          receiverName: nickname,
          targetSocketId: targetSocketIdRef.current,
        });
      }
    } catch (err) {
      if (showToast) showToast('Microphone/camera access denied: ' + err.message);
      else alert('Could not access camera/microphone to accept call: ' + err.message);
      cleanUpCall();
    }
  };

  const declineCall = () => {
    playCallDeclinedTone();
    socketRef.current?.emit('declineCall', {
      passcode,
      receiverName: nickname,
      targetSocketId: targetSocketIdRef.current,
    });
    cleanUpCall();
  };

  const endCall = useCallback(() => {
    playCallEndedTone();
    socketRef.current?.emit('endCall', {
      passcode,
      targetSocketId: targetSocketIdRef.current,
    });
    cleanUpCall();
  }, [passcode, socketRef, cleanUpCall]);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  }, []);

  const flipCamera = async () => {
    if (isVoiceOnlyRef.current) return;
    const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    facingModeRef.current = nextMode;

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        newVideoTrack.enabled = !cameraOffRef.current;

        const pc = peerConnectionRef.current;
        if (pc) {
          const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }

        const existingAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
        const combined = new MediaStream([newVideoTrack, ...existingAudioTracks]);
        localStreamRef.current = combined;
        setLocalStream(combined);
      }
    } catch (err) {
      console.warn('Error flipping camera:', err);
    }
  };

  // =========================================================================
  // SCREEN SHARING CONTROLLER (Mobile / Desktop Compatible with Audio)
  // =========================================================================

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharingRef.current) return;
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);

    try {
      // 1. Get user camera stream with the current facing mode
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingModeRef.current || 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      const newCamTrack = camStream.getVideoTracks()[0];
      if (newCamTrack) {
        newCamTrack.enabled = !cameraOffRef.current;
      }

      // 2. Replace track on peer connection
      const pc = peerConnectionRef.current;
      if (pc) {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video' || (s.track === null && s.dtlsTransport));
        if (videoSender && newCamTrack) {
          await videoSender.replaceTrack(newCamTrack);
        }
      }

      // 3. Stop old screen stream tracks AFTER new track is attached
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
        screenStreamRef.current = null;
      }

      // 4. Combine existing audio with new camera track
      const existingAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
      const combinedStream = new MediaStream(newCamTrack ? [newCamTrack, ...existingAudioTracks] : existingAudioTracks);
      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);

      // 5. Notify peer that screen share stopped
      socketRef.current?.emit('screenShareStatus', {
        passcode,
        isSharing: false,
        targetSocketId: targetSocketIdRef.current,
      });
    } catch (err) {
      console.warn('[WebRTC] Error reverting from screen share to camera:', err);
    }
  }, [passcode, socketRef]);

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      if (showToast) showToast('Screen sharing is not supported by your device or browser');
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      }).catch(() => navigator.mediaDevices.getDisplayMedia({ video: true }));

      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = screenStream;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);

      const pc = peerConnectionRef.current;
      if (pc) {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video' || (s.track === null && s.dtlsTransport));
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      // Handle browser native "Stop sharing" floating bar
      screenTrack.onended = () => {
        stopScreenShare();
      };

      const existingAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
      const screenAudioTracks = screenStream.getAudioTracks();
      const combinedAudio = screenAudioTracks.length > 0 ? [...screenAudioTracks, ...existingAudioTracks] : existingAudioTracks;
      const combinedStream = new MediaStream([screenTrack, ...combinedAudio]);
      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);

      socketRef.current?.emit('screenShareStatus', {
        passcode,
        isSharing: true,
        targetSocketId: targetSocketIdRef.current,
      });
    } catch (err) {
      console.warn('[WebRTC] Screen share error/cancel:', err);
      isScreenSharingRef.current = false;
      setIsScreenSharing(false);
      if (err.name === 'NotAllowedError') {
        if (showToast) showToast('Screen sharing was cancelled or denied permission');
      } else if (err.name === 'NotSupportedError') {
        if (showToast) showToast('Screen sharing is not supported on this device/browser');
      } else {
        if (showToast) showToast('Unable to start screen share: ' + (err.message || 'Error'));
      }
    }
  }, [passcode, socketRef, stopScreenShare, showToast]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharingRef.current) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [startScreenShare, stopScreenShare]);

  // =========================================================================
  // UNIFIED PICTURE-IN-PICTURE (In-App + Desktop OS PiP)
  // =========================================================================

  const isDocPipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  const isNativeVideoPipSupported = typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled);
  const isPipSupported = isDocPipSupported || isNativeVideoPipSupported;

  // Open In-App Floating PiP
  const openInAppPip = useCallback(() => {
    closeAllPipWindows();
    setPipMode('in-app');
  }, [closeAllPipWindows]);

  // Open Desktop OS PiP (Always on top across Windows/OS)
  const openDesktopPip = useCallback(async () => {
    try {
      // Priority 1: Modern Chromium Document Picture-in-Picture API
      if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          pipWindowRef.current.focus();
          setPipMode('desktop-os');
          return;
        }

        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 380,
          height: 250,
          disallowReturnToOpener: false,
        });

        // Copy styles into new window
        try {
          [...document.styleSheets].forEach((styleSheet) => {
            try {
              const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
              const style = document.createElement('style');
              style.textContent = cssRules;
              pipWin.document.head.appendChild(style);
            } catch (e) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.type = styleSheet.type || 'text/css';
              link.media = styleSheet.media;
              link.href = styleSheet.href;
              pipWin.document.head.appendChild(link);
            }
          });
        } catch (e) {
          console.warn('[WebRTC PiP] Stylesheet copy error:', e);
        }

        // Copy fonts & link elements
        try {
          document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]').forEach((el) => {
            pipWin.document.head.appendChild(el.cloneNode(true));
          });
        } catch (e) {}

        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.backgroundColor = '#0b141a';
        pipWin.document.body.style.overflow = 'hidden';

        pipWindowRef.current = pipWin;
        setPipWindow(pipWin);
        setPipMode('desktop-os');

        pipWin.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
          setPipWindow(null);
          // Seamless fallback to In-App PiP without closing call
          setPipMode((prev) => (prev === 'desktop-os' ? 'in-app' : prev));
        });
        return;
      }

      // Priority 2: Standard HTML5 Video RequestPictureInPicture fallback
      const targetVideo = isStreamSwapped ? localVideoRef.current : remoteVideoRef.current;
      if (targetVideo && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        await targetVideo.requestPictureInPicture();
        setPipMode('desktop-os');

        const onLeavePip = () => {
          targetVideo.removeEventListener('leavepictureinpicture', onLeavePip);
          setPipMode((prev) => (prev === 'desktop-os' ? 'in-app' : prev));
        };
        targetVideo.addEventListener('leavepictureinpicture', onLeavePip);
      } else {
        setPipMode('in-app');
        if (showToast) showToast('Desktop PiP not supported on this browser. Switched to In-App PiP.');
      }
    } catch (err) {
      console.warn('[WebRTC] Desktop PiP launch failed:', err);
      setPipMode('in-app');
      if (showToast) showToast('Desktop PiP unavailable, switched to In-App PiP');
    }
  }, [isStreamSwapped, showToast]);

  // Close any PiP and return to Fullscreen
  const closePip = useCallback(() => {
    closeAllPipWindows();
    setPipMode('none');
  }, [closeAllPipWindows]);

  // Master PiP Toggle
  const togglePip = useCallback(
    (mode = null) => {
      if (pipMode !== 'none') {
        closePip();
      } else {
        if (mode === 'desktop' || (!mode && (isDocPipSupported || isNativeVideoPipSupported))) {
          openDesktopPip();
        } else {
          openInAppPip();
        }
      }
    },
    [pipMode, closePip, openDesktopPip, openInAppPip, isDocPipSupported, isNativeVideoPipSupported]
  );

  // Backward compatibility helpers
  const isPipMinimized = pipMode === 'in-app';
  const setIsPipMinimized = (val) => setPipMode(val ? 'in-app' : 'none');
  const togglePipMinimized = () => (pipMode === 'in-app' ? closePip() : openInAppPip());
  const toggleNativePip = () => (pipMode === 'desktop-os' ? closePip() : openDesktopPip());

  // MediaSession API Integration for OS Overlays and Action Keys
  useEffect(() => {
    if (callState === 'active' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: `WhatsApp ${isVoiceOnlyCall ? 'Voice' : 'Video'} Call • ${remoteUserName || callerName || 'Contact'}`,
          artist: 'Real-Time WebRTC Call',
          album: 'End-to-End Encrypted',
        });
        navigator.mediaSession.setActionHandler('hangup', () => endCall());
        navigator.mediaSession.setActionHandler('togglemicrophone', () => toggleMic());
        navigator.mediaSession.setActionHandler('togglecamera', () => toggleCamera());
      } catch (e) {}
    } else if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('hangup', null);
        navigator.mediaSession.setActionHandler('togglemicrophone', null);
        navigator.mediaSession.setActionHandler('togglecamera', null);
      } catch (e) {}
    }
  }, [callState, remoteUserName, callerName, endCall, toggleMic, toggleCamera, isVoiceOnlyCall]);

  return {
    callState,
    callerName,
    remoteUserName,
    localStream,
    remoteStream,
    micMuted,
    cameraOff,
    videoFit,
    setVideoFit,
    facingMode,
    isStreamSwapped,
    setIsStreamSwapped,
    isScreenSharing,
    isScreenShareSupported,
    callDuration,
    showVideoPanel,
    setShowVideoPanel,
    isVoiceOnlyCall,
    // Unified PiP System
    pipMode,
    setPipMode,
    pipWindow,
    isPipSupported,
    isDocPipSupported,
    openDesktopPip,
    openInAppPip,
    closePip,
    togglePip,
    // Backward compatibility
    isPipMinimized,
    setIsPipMinimized,
    togglePipMinimized,
    toggleNativePip,
    remoteVideoRef,
    localVideoRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCamera,
    flipCamera,
    toggleScreenShare,
    cleanUpCall,
  };
}
