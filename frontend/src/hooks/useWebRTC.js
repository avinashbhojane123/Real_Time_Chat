import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebRTC({ socketRef, passcode, nickname, recipientUser, showToast }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [callerName, setCallerName] = useState('');
  const [remoteUserName, setRemoteUserName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [videoFit, setVideoFit] = useState('cover');
  const [facingMode, setFacingMode] = useState('user');
  const [isStreamSwapped, setIsStreamSwapped] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showVideoPanel, setShowVideoPanel] = useState(false);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

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

  const cleanUpCall = useCallback(() => {
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

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
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
  }, []);

  const triggerIceRestart = useCallback(() => {
    const pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') return;
    pc.createOffer({ iceRestart: true })
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current?.emit('webrtcOffer', { passcode, offer: pc.localDescription });
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
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
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
        socketRef.current?.emit('webrtcCandidate', { passcode, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      let stream = e.streams && e.streams[0] ? e.streams[0] : null;
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(e.track);
        stream = remoteStreamRef.current;
      }
      remoteStreamRef.current = stream;
      setRemoteStream(stream);

      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
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
  }, [passcode, socketRef, triggerIceRestart]);

  // Sync localStream and remoteStream to video nodes
  useEffect(() => {
    const mainNode = isStreamSwapped ? localVideoRef.current : remoteVideoRef.current;
    const pipNode = isStreamSwapped ? remoteVideoRef.current : localVideoRef.current;

    const mainStream = isStreamSwapped ? localStream : remoteStream;
    const pipStream = isStreamSwapped ? remoteStream : localStream;

    if (mainNode && mainStream) {
      mainNode.srcObject = mainStream;
      mainNode.play().catch((err) => console.warn('[WebRTC] Main video play error:', err));
    }
    if (pipNode && pipStream) {
      pipNode.srcObject = pipStream;
      pipNode.play().catch((err) => console.warn('[WebRTC] PIP video play error:', err));
    }
  }, [localStream, remoteStream, callState, showVideoPanel, isStreamSwapped]);

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

    const handleCallUser = ({ callerName: cName }) => {
      if (Date.now() - lastCallEndedAtRef.current < 2500) return;
      setCallerName(cName || 'Participant');
      updateCallState('incoming');
      setShowVideoPanel(true);
    };

    const handleWebrtcOffer = async ({ offer, callerName: cName }) => {
      if (Date.now() - lastCallEndedAtRef.current < 2500) return;
      latestOfferRef.current = offer;

      if (callStateRef.current === 'idle') {
        setCallerName(cName || 'Participant');
        updateCallState('incoming');
        setShowVideoPanel(true);
      } else if (callStateRef.current === 'active') {
        const pc = peerConnectionRef.current || createPeerConnection();
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          processPendingIceCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtcAnswer', { passcode, answer });
        } catch (err) {
          console.warn('[WebRTC] Handling offer error:', err);
        }
      }
    };

    const handleWebrtcAnswer = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc) {
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
      addIceCandidateSafely(candidate);
    };

    const handleCallEnd = () => {
      if (showToast) showToast('Call ended');
      cleanUpCall();
    };

    const handleCallDeclined = () => {
      if (showToast) showToast('Call was declined');
      cleanUpCall();
    };

    socket.on('callUser', handleCallUser);
    socket.on('webrtcOffer', handleWebrtcOffer);
    socket.on('webrtcAnswer', handleWebrtcAnswer);
    socket.on('webrtcCandidate', handleWebrtcCandidate);
    socket.on('callEnded', handleCallEnd);
    socket.on('endCall', handleCallEnd);
    socket.on('callDeclined', handleCallDeclined);

    return () => {
      socket.off('callUser', handleCallUser);
      socket.off('webrtcOffer', handleWebrtcOffer);
      socket.off('webrtcAnswer', handleWebrtcAnswer);
      socket.off('webrtcCandidate', handleWebrtcCandidate);
      socket.off('callEnded', handleCallEnd);
      socket.off('endCall', handleCallEnd);
      socket.off('callDeclined', handleCallDeclined);
    };
  }, [socketRef, passcode, createPeerConnection, processPendingIceCandidates, addIceCandidateSafely, cleanUpCall, showToast]);

  const startCall = async () => {
    updateCallState('calling');
    setShowVideoPanel(true);
    setRemoteUserName(recipientUser ? recipientUser.nickname : 'Participant');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current?.emit('callUser', { passcode, callerName: nickname });
      socketRef.current?.emit('webrtcOffer', { passcode, offer: pc.localDescription, callerName: nickname });
    } catch (err) {
      alert('Could not access camera/microphone: ' + err.message);
      cleanUpCall();
    }
  };

  const acceptCall = async () => {
    updateCallState('active');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();
      if (latestOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(latestOfferRef.current));
        processPendingIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current?.emit('webrtcAnswer', { passcode, answer });
      }
    } catch (err) {
      alert('Could not access camera/microphone to accept call: ' + err.message);
      cleanUpCall();
    }
  };

  const declineCall = () => {
    socketRef.current?.emit('declineCall', { passcode });
    cleanUpCall();
  };

  const endCall = () => {
    socketRef.current?.emit('endCall', { passcode });
    cleanUpCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  };

  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: !micMuted,
      });
      localStreamRef.current = newStream;
      setLocalStream(newStream);

      const pc = peerConnectionRef.current;
      if (pc) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (videoSender && newVideoTrack) {
          videoSender.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      console.warn('Error flipping camera:', err);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);

      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        const pc = peerConnectionRef.current;
        if (pc) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        }
        setLocalStream(camStream);
        localStreamRef.current = camStream;
      } catch (e) {}
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];
        const pc = peerConnectionRef.current;
        if (pc) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          toggleScreenShare();
        };

        setLocalStream(screenStream);
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

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
    callDuration,
    showVideoPanel,
    setShowVideoPanel,
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
