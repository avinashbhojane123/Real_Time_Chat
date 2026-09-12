import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWatchParty Hook
 * Zero-Lag Synchronized Video & Movie Player Engine
 * Supports Play/Pause sync, Seek sync, Playback rate sync,
 * Drift correction (subtle micro-adjustments), Zero-lag buffering lock,
 * YouTube and HTML5 direct video players, and synchronized flying reactions.
 */
export function useWatchParty({ socketRef, passcode, nickname, showToast }) {
  const [isActive, setIsActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(true);

  const [videoSource, setVideoSource] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [lastActorNickname, setLastActorNickname] = useState('');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(Date.now());

  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingUsers, setBufferingUsers] = useState([]);
  const [partnerSyncStatus, setPartnerSyncStatus] = useState('synced'); // 'synced' | 'buffering' | 'drift_correcting'
  const [flyingReactions, setFlyingReactions] = useState([]);
  const [danmakuComments, setDanmakuComments] = useState([]);
  const [incomingInvite, setIncomingInvite] = useState(null);

  // Ref tracking to prevent feedback loops when local action triggers video events
  const isLocalActionRef = useRef(false);
  const videoElementRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const lastEmittedTimeRef = useRef(0);
  const lastEmittedStateRef = useRef(null);

  // Helper to get socket safely
  const getSocket = useCallback(() => socketRef?.current, [socketRef]);

  // Handle incoming watchPartyUpdate event from server
  const handleWatchPartyUpdate = useCallback(
    (data) => {
      if (!data) return;

      if (data.action === 'close') {
        setIsActive(false);
        setIsOpen(false);
        setIsPlaying(false);
        if (data.lastActorNickname && data.lastActorNickname !== nickname) {
          showToast?.(`${data.lastActorNickname} ended the Watch Party`);
        }
        return;
      }

      setIsActive(true);
      if (data.videoSource) {
        setVideoSource(data.videoSource);
      }

      setIsPlaying(Boolean(data.isPlaying));
      setPlaybackRate(data.playbackRate || 1);
      setLastActorNickname(data.lastActorNickname || '');
      setLastSyncTimestamp(data.lastUpdatedTimestamp || Date.now());
      setIsBuffering(Boolean(data.isBuffering));
      setBufferingUsers(data.bufferingUsers || []);

      const serverNow = data.serverTime || Date.now();
      const clientNow = Date.now();
      const oneWayLatencySec = Math.max(0, (clientNow - serverNow) / 1000);

      let targetTime = typeof data.currentTime === 'number' ? data.currentTime : 0;
      if (data.isPlaying && !data.isBuffering) {
        const elapsedSec =
          Math.max(0, (clientNow - (data.lastUpdatedTimestamp || clientNow)) / 1000) *
          (data.playbackRate || 1);
        targetTime += elapsedSec + oneWayLatencySec;
      }
      setCurrentTime(targetTime);

      // Perform synchronized player control on active video element or YouTube player
      if (!isLocalActionRef.current) {
        syncVideoElement(targetTime, Boolean(data.isPlaying), data.playbackRate || 1, Boolean(data.isBuffering));
      }

      if (data.action === 'change_video' && data.lastActorNickname && data.lastActorNickname !== nickname) {
        showToast?.(`${data.lastActorNickname} changed the video to "${data.videoSource?.title || 'a new movie'}"`);
      }
    },
    [nickname, showToast]
  );

  // Sync the physical HTML5 video element with target state
  const syncVideoElement = (targetTime, targetPlaying, targetRate, targetBuffering) => {
    const video = videoElementRef.current;
    if (video) {
      video.playbackRate = targetRate;

      const drift = Math.abs(video.currentTime - targetTime);

      if (drift > 1.2) {
        // High drift (seek or fast-forward) -> hard seek
        video.currentTime = targetTime;
        setPartnerSyncStatus('drift_correcting');
        setTimeout(() => setPartnerSyncStatus('synced'), 800);
      } else if (drift > 0.35) {
        // Subtle drift (network jitter) -> gently nudge speed to smoothly realign
        video.playbackRate = video.currentTime < targetTime ? targetRate * 1.08 : targetRate * 0.92;
        setPartnerSyncStatus('drift_correcting');
        setTimeout(() => {
          if (videoElementRef.current) {
            videoElementRef.current.playbackRate = targetRate;
            setPartnerSyncStatus('synced');
          }
        }, 1200);
      } else {
        setPartnerSyncStatus('synced');
      }

      if (targetPlaying && !targetBuffering) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    // Handle YouTube player sync if YouTube is active
    const yt = ytPlayerRef.current;
    if (yt && typeof yt.getPlayerState === 'function') {
      try {
        const ytTime = yt.getCurrentTime() || 0;
        const drift = Math.abs(ytTime - targetTime);
        if (drift > 1.5) {
          yt.seekTo(targetTime, true);
        }
        if (targetRate && typeof yt.setPlaybackRate === 'function') {
          yt.setPlaybackRate(targetRate);
        }
        if (targetPlaying && !targetBuffering) {
          yt.playVideo();
        } else {
          yt.pauseVideo();
        }
      } catch (err) {
        console.warn('[WatchParty] Error syncing YouTube player', err);
      }
    }
  };

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onUpdate = (data) => handleWatchPartyUpdate(data);
    const onState = (data) => {
      if (data) {
        handleWatchPartyUpdate(data);
      } else {
        setIsActive(false);
      }
    };
    const onReaction = ({ from, reaction, timestamp }) => {
      const id = `${timestamp}-${Math.random()}`;
      // Random X position between 15% and 85% of screen width
      const xPercent = Math.floor(Math.random() * 70) + 15;
      setFlyingReactions((prev) => [
        ...prev.slice(-20),
        { id, from, reaction, x: xPercent, createdAt: Date.now() },
      ]);
      // Remove reaction after 2.8s
      setTimeout(() => {
        setFlyingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2800);
    };

    const onComment = ({ id, from, text, top, timestamp }) => {
      const commentId = id || `${timestamp || Date.now()}-${Math.random()}`;
      setDanmakuComments((prev) => [
        ...prev.slice(-25),
        {
          id: commentId,
          from,
          text,
          top: typeof top === 'number' ? top : Math.floor(Math.random() * 60) + 15,
          createdAt: timestamp || Date.now(),
        },
      ]);
      setTimeout(() => {
        setDanmakuComments((prev) => prev.filter((c) => c.id !== commentId));
      }, 7500);
    };

    const onClosed = ({ closedBy }) => {
      setIsActive(false);
      setIsOpen(false);
      setIsPlaying(false);
      setIncomingInvite(null);
      if (closedBy && closedBy !== nickname) {
        showToast?.(`${closedBy} closed the Watch Party`);
      }
    };

    const onInvite = (invite) => {
      if (invite && invite.from !== nickname) {
        setIncomingInvite(invite);
      }
    };

    const onAccepted = ({ acceptedBy, videoSource: source }) => {
      if (source) setVideoSource(source);
      setIsActive(true);
      setIsOpen(true);
      setIsPlaying(true);
      setIncomingInvite(null);
      if (acceptedBy && acceptedBy !== nickname) {
        showToast?.(`🍿 ${acceptedBy} accepted the invitation! Starting movie directly...`);
      }
    };

    const onDeclined = ({ declinedBy }) => {
      setIncomingInvite(null);
      if (declinedBy && declinedBy !== nickname) {
        showToast?.(`${declinedBy} declined the Watch Party invitation`);
      }
    };

    socket.on('watchPartyUpdate', onUpdate);
    socket.on('watchPartyState', onState);
    socket.on('watchPartyReaction', onReaction);
    socket.on('watchPartyComment', onComment);
    socket.on('watchPartyClosed', onClosed);
    socket.on('watchPartyInvite', onInvite);
    socket.on('watchPartyAccepted', onAccepted);
    socket.on('watchPartyDeclined', onDeclined);

    // Fetch current state on mount or room join
    socket.emit('getWatchPartyState', { passcode });

    return () => {
      socket.off('watchPartyUpdate', onUpdate);
      socket.off('watchPartyState', onState);
      socket.off('watchPartyReaction', onReaction);
      socket.off('watchPartyComment', onComment);
      socket.off('watchPartyClosed', onClosed);
      socket.off('watchPartyInvite', onInvite);
      socket.off('watchPartyAccepted', onAccepted);
      socket.off('watchPartyDeclined', onDeclined);
    };
  }, [getSocket, passcode, nickname, handleWatchPartyUpdate, showToast]);

  // Emit watch party action helper
  const emitAction = useCallback(
    (action, extra = {}) => {
      const socket = getSocket();
      if (!socket) return;

      isLocalActionRef.current = true;
      const payload = {
        passcode,
        action,
        currentTime: extra.currentTime !== undefined ? extra.currentTime : currentTime,
        isPlaying: extra.isPlaying !== undefined ? extra.isPlaying : isPlaying,
        playbackRate: extra.playbackRate || playbackRate,
        videoSource: extra.videoSource || videoSource,
        ...extra,
      };

      socket.emit('watchPartyAction', payload);

      setTimeout(() => {
        isLocalActionRef.current = false;
      }, 400);
    },
    [getSocket, passcode, currentTime, isPlaying, playbackRate, videoSource]
  );

  // User Action Handlers
  const startWatchParty = useCallback(
    (initialSource = null) => {
      const sourceToUse = initialSource || videoSource;
      setIsOpen(true);
      setIsMinimized(false);
      setIsActive(true);
      setIsPlaying(false);
      if (sourceToUse) setVideoSource(sourceToUse);
      emitAction('invite', {
        videoSource: sourceToUse,
        currentTime: 0,
        isPlaying: false,
      });
      showToast?.('Sent Watch Together invitation to partner 🍿');
    },
    [emitAction, videoSource, showToast]
  );

  const acceptWatchPartyInvite = useCallback(() => {
    if (!incomingInvite) return;
    const source = incomingInvite.videoSource;
    setIncomingInvite(null);
    if (source) setVideoSource(source);
    setIsActive(true);
    setIsOpen(true);
    setIsMinimized(false);
    setIsPlaying(true);
    emitAction('accept', {
      videoSource: source,
      currentTime: 0,
      isPlaying: true,
    });
    showToast?.('🍿 Accepted! Movie starting directly in sync...');
  }, [incomingInvite, emitAction, showToast]);

  const declineWatchPartyInvite = useCallback(() => {
    setIncomingInvite(null);
    emitAction('decline');
  }, [emitAction]);

  const closeWatchParty = useCallback(() => {
    emitAction('close');
    setIsActive(false);
    setIsOpen(false);
    setIsPlaying(false);
    if (videoElementRef.current) {
      videoElementRef.current.pause();
    }
    if (ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
    }
  }, [emitAction]);

  const togglePlay = useCallback(() => {
    const video = videoElementRef.current;
    const current = video ? video.currentTime : currentTime;
    const nextPlaying = !isPlaying;

    setIsPlaying(nextPlaying);
    emitAction(nextPlaying ? 'play' : 'pause', {
      currentTime: current,
      isPlaying: nextPlaying,
    });
  }, [isPlaying, currentTime, emitAction]);

  const seek = useCallback(
    (targetTime) => {
      setCurrentTime(targetTime);
      emitAction('seek', {
        currentTime: targetTime,
        isPlaying,
      });
    },
    [isPlaying, emitAction]
  );

  const changeRate = useCallback(
    (rate) => {
      setPlaybackRate(rate);
      const video = videoElementRef.current;
      const current = video ? video.currentTime : currentTime;
      emitAction('rate', {
        playbackRate: rate,
        currentTime: current,
      });
    },
    [currentTime, emitAction]
  );

  const changeVideo = useCallback(
    (source) => {
      setVideoSource(source);
      setCurrentTime(0);
      setIsPlaying(false);
      emitAction('change_video', {
        videoSource: source,
        currentTime: 0,
        isPlaying: false,
      });
    },
    [emitAction]
  );

  const notifyBuffering = useCallback(
    (buffering) => {
      emitAction(buffering ? 'buffering' : 'ready');
    },
    [emitAction]
  );

  const sendReaction = useCallback(
    (reactionEmoji) => {
      const socket = getSocket();
      if (!socket) return;
      socket.emit('watchPartyReaction', {
        passcode,
        reaction: reactionEmoji,
      });
    },
    [getSocket, passcode]
  );

  const sendComment = useCallback(
    (text) => {
      const socket = getSocket();
      if (!socket || !text?.trim()) return;
      const topPos = Math.floor(Math.random() * 60) + 15;
      socket.emit('watchPartyComment', {
        passcode,
        text: text.trim(),
        top: topPos,
      });
    },
    [getSocket, passcode]
  );

  return {
    isActive,
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    cinemaMode,
    setCinemaMode,
    videoSource,
    isPlaying,
    currentTime,
    setCurrentTime,
    playbackRate,
    lastActorNickname,
    lastSyncTimestamp,
    isBuffering,
    bufferingUsers,
    partnerSyncStatus,
    flyingReactions,
    danmakuComments,
    incomingInvite,
    videoElementRef,
    ytPlayerRef,
    startWatchParty,
    acceptWatchPartyInvite,
    declineWatchPartyInvite,
    closeWatchParty,
    togglePlay,
    seek,
    changeRate,
    changeVideo,
    notifyBuffering,
    sendReaction,
    sendComment,
    syncVideoElement,
  };
}
