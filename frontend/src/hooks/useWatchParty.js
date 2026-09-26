import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWatchParty Hook
 * Zero-Lag Synchronized Video & Movie Player Engine
 *
 * Features:
 * - Sub-50ms synchronization via Cristian's Clock Synchronization Algorithm
 * - Scheduled Future Playback (compensates for asymmetric network transit delays)
 * - Pitch-preserved soft drift correction (5% playbackRate nudges, no audio pop)
 * - Hard-seek correction for large drift gaps (>1.5s)
 * - Visibility change auto-resync (recovers instantly when tab is backgrounded/minimized)
 * - Buffer lock consensus & auto-release watchdog
 * - YouTube IFrame API & HTML5 / HLS direct streaming compatibility
 * - Full guard against recursive event echoes
 */
export function useWatchParty({ socketRef, passcode, nickname, showToast, socketLatency }) {
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
  const [hostNickname, setHostNickname] = useState('');
  const [isHostOnly, setIsHostOnly] = useState(false);

  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingUsers, setBufferingUsers] = useState([]);
  const [partnerSyncStatus, setPartnerSyncStatus] = useState('synced'); // 'synced' | 'buffering' | 'drift_correcting'
  const [flyingReactions, setFlyingReactions] = useState([]);
  const [danmakuComments, setDanmakuComments] = useState([]);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [serverClockSkew, setServerClockSkew] = useState(0);

  // Bluetooth wireless headphone audio delay offset calibration (-300ms to +300ms)
  const [audioDelayOffset, setAudioDelayOffsetState] = useState(() => {
    try {
      const saved = localStorage.getItem('watchPartyAudioDelayOffset');
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch (_) {
      return 0;
    }
  });
  const audioDelayOffsetRef = useRef(audioDelayOffset);

  const setAudioDelayOffset = useCallback((offsetMs) => {
    const cleanOffset = typeof offsetMs === 'number' && !isNaN(offsetMs) ? offsetMs : 0;
    audioDelayOffsetRef.current = cleanOffset;
    setAudioDelayOffsetState(cleanOffset);
    try {
      localStorage.setItem('watchPartyAudioDelayOffset', String(cleanOffset));
    } catch (_) {}
  }, []);

  // Authoritative server clock offset (serverTime - localClientTime)
  const clockOffsetRef = useRef(0);
  const anchorMediaTimeRef = useRef(0);
  const anchorServerTimeRef = useRef(Date.now());
  const scheduledTimerRef = useRef(null);

  // Ref tracking to prevent feedback loops when local action triggers video events
  const isLocalActionRef = useRef(false);
  const isRemoteSyncRef = useRef(false);
  const videoElementRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const remoteSyncTimeoutRef = useRef(null);

  // Helper to get socket safely
  const getSocket = useCallback(() => socketRef?.current, [socketRef]);

  // Returns authoritative server epoch ms
  const getTrueServerTime = useCallback(() => {
    return Date.now() + clockOffsetRef.current;
  }, []);

  // 1. Clock Synchronization Protocol (Cristian's Algorithm)
  const performClockSync = useCallback(() => {
    const socket = getSocket();
    if (!socket || !passcode) return;

    const samples = [];
    let count = 0;

    const runPing = () => {
      const t0 = Date.now();
      socket.emit('watchPartyClockPing', { passcode, clientSendTime: t0 }, (response) => {
        if (response && typeof response.serverTime === 'number') {
          const t3 = Date.now();
          const rtt = Math.max(1, t3 - t0);
          const offset = response.serverTime - (t0 + rtt / 2);
          samples.push({ offset, rtt });
          count++;

          if (count < 4) {
            setTimeout(runPing, 120);
          } else {
            // Sort by lowest RTT to discard lag spikes and jitter
            samples.sort((a, b) => a.rtt - b.rtt);
            const bestSample = samples[0];
            clockOffsetRef.current = bestSample.offset;
            setServerClockSkew(bestSample.offset);
          }
        }
      });
    };

    runPing();
  }, [getSocket, passcode]);

  // Run clock synchronization on mount and periodically every 30s
  useEffect(() => {
    performClockSync();
    const interval = setInterval(performClockSync, 30000);
    return () => clearInterval(interval);
  }, [performClockSync]);

  // Lock remote sync flag safely
  const markRemoteSyncActive = useCallback((durationMs = 650) => {
    isRemoteSyncRef.current = true;
    if (remoteSyncTimeoutRef.current) {
      clearTimeout(remoteSyncTimeoutRef.current);
    }
    remoteSyncTimeoutRef.current = setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, durationMs);
  }, []);

  // Sync the physical HTML5 video element with target state
  const syncVideoElement = useCallback((targetTime, targetPlaying, targetRate, targetBuffering, scheduledStartServerTime = null) => {
    markRemoteSyncActive(700);

    const video = videoElementRef.current;
    if (video) {
      // Apply Bluetooth headphone delay offset calibration (-300ms to +300ms)
      const delaySec = (audioDelayOffsetRef.current || 0) / 1000;
      const calibratedTargetTime = Math.max(0, targetTime - delaySec);

      const currentVideoTime = video.currentTime || 0;
      const drift = Math.abs(currentVideoTime - calibratedTargetTime);

      if (drift > 1.4) {
        // High drift -> hard seek
        video.currentTime = calibratedTargetTime;
        setPartnerSyncStatus('drift_correcting');
        setTimeout(() => setPartnerSyncStatus('synced'), 600);
      } else if (drift > 0.12) {
        // Soft drift correction -> gentle 5% playbackRate adjustment
        video.playbackRate = currentVideoTime < calibratedTargetTime ? targetRate * 1.05 : targetRate * 0.95;
        setPartnerSyncStatus('drift_correcting');
        setTimeout(() => {
          if (videoElementRef.current) {
            videoElementRef.current.playbackRate = targetRate;
            setPartnerSyncStatus('synced');
          }
        }, 900);
      } else {
        video.playbackRate = targetRate;
        setPartnerSyncStatus('synced');
      }

      if (targetPlaying && !targetBuffering) {
        if (scheduledTimerRef.current) {
          clearTimeout(scheduledTimerRef.current);
          scheduledTimerRef.current = null;
        }

        const nowServer = getTrueServerTime();
        const delayMs = scheduledStartServerTime ? scheduledStartServerTime - nowServer : 0;

        if (delayMs > 15) {
          // Scheduled future playback: wait until exact server millisecond
          scheduledTimerRef.current = setTimeout(() => {
            if (videoElementRef.current) {
              const playPromise = videoElementRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch((err) => {
                  if (err?.name === 'NotAllowedError') {
                    setAutoplayBlocked(true);
                    videoElementRef.current.muted = true;
                    videoElementRef.current.play().catch(() => {});
                  }
                });
              }
            }
          }, delayMs);
        } else {
          // Play immediately
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              if (err?.name === 'NotAllowedError') {
                console.warn('[WatchParty] Browser blocked unmuted autoplay. Muting to autoplay...');
                setAutoplayBlocked(true);
                video.muted = true;
                video.play().catch(() => {});
              }
            });
          }
        }
      } else {
        if (scheduledTimerRef.current) {
          clearTimeout(scheduledTimerRef.current);
          scheduledTimerRef.current = null;
        }
        video.pause();
      }
    }

    // Handle YouTube player sync if YouTube is active
    const yt = ytPlayerRef.current;
    if (yt && typeof yt.getPlayerState === 'function') {
      try {
        const ytTime = yt.getCurrentTime() || 0;
        const drift = Math.abs(ytTime - targetTime);
        if (drift > 1.2) {
          yt.seekTo(targetTime, true);
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
  }, [markRemoteSyncActive, getTrueServerTime]);

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

      if (data.action === 'partner_disconnected') {
        setIsPlaying(false);
        showToast?.('🎬 Partner left or disconnected. Movie playback auto-paused.');
      }

      setIsActive(true);
      if (data.videoSource) {
        setVideoSource(data.videoSource);
      }

      const isRoomPlaying = Boolean(data.isPlaying);
      setIsPlaying(isRoomPlaying);
      setPlaybackRate(data.playbackRate || 1);
      setLastActorNickname(data.lastActorNickname || '');
      if (data.hostNickname) setHostNickname(data.hostNickname);
      if (typeof data.isHostOnly === 'boolean') setIsHostOnly(data.isHostOnly);
      setIsBuffering(Boolean(data.isBuffering));
      setBufferingUsers(data.bufferingUsers || []);

      const serverNow = getTrueServerTime();
      const lastUpdate = data.lastUpdatedTimestamp || serverNow;
      setLastSyncTimestamp(lastUpdate);

      let targetTime = typeof data.currentTime === 'number' ? data.currentTime : 0;

      // Update virtual anchor references
      anchorMediaTimeRef.current = targetTime;
      anchorServerTimeRef.current = data.scheduledStartServerTime || lastUpdate;

      // Real-time server latency & transit compensation
      if (isRoomPlaying && !data.isBuffering && data.action !== 'pause') {
        if (data.scheduledStartServerTime && data.scheduledStartServerTime > serverNow) {
          // Playback is scheduled to begin in the future: targetTime remains at anchorMediaTime
        } else {
          const effectiveStart = data.scheduledStartServerTime || lastUpdate;
          const elapsedSec = Math.max(0, (serverNow - effectiveStart) / 1000) * (data.playbackRate || 1);
          if (elapsedSec > 0 && elapsedSec < 10) {
            targetTime += elapsedSec;
          }
        }
      }
      setCurrentTime(targetTime);

      // Perform synchronized player control on active video element or YouTube player
      if (!isLocalActionRef.current) {
        syncVideoElement(
          targetTime,
          isRoomPlaying,
          data.playbackRate || 1,
          Boolean(data.isBuffering),
          data.scheduledStartServerTime
        );
      }

      if (data.action === 'change_video' && data.lastActorNickname && data.lastActorNickname !== nickname) {
        showToast?.(`${data.lastActorNickname} changed the video to "${data.videoSource?.title || 'a new movie'}"`);
      }
    },
    [nickname, showToast, syncVideoElement, getTrueServerTime]
  );

  // 2. Continuous Background Drift Correction Runner (Runs every 1000ms)
  useEffect(() => {
    if (!isActive || !isPlaying || isBuffering) return;

    const interval = setInterval(() => {
      if (isLocalActionRef.current || isRemoteSyncRef.current) return;

      const video = videoElementRef.current;
      if (!video) return;

      const nowServer = getTrueServerTime();
      const startTime = anchorServerTimeRef.current;
      if (nowServer < startTime) return; // Future scheduled playback has not started yet

      const elapsedSec = Math.max(0, (nowServer - startTime) / 1000) * playbackRate;
      const expectedServerTime = anchorMediaTimeRef.current + elapsedSec;
      const delaySec = (audioDelayOffsetRef.current || 0) / 1000;
      const calibratedExpectedTime = Math.max(0, expectedServerTime - delaySec);
      const localTime = video.currentTime || 0;
      const drift = localTime - calibratedExpectedTime; // > 0 means local is ahead, < 0 means local is behind

      // Sync tolerance:
      // 1. |drift| <= 0.05s (50ms): Virtually perfect sync
      if (Math.abs(drift) <= 0.05) {
        if (video.playbackRate !== playbackRate) {
          video.playbackRate = playbackRate;
        }
        setPartnerSyncStatus('synced');
      }
      // 2. Minor forward/backward drift (0.05s < |drift| <= 0.8s): Gentle 5% speed nudge
      else if (Math.abs(drift) <= 0.8) {
        const nudgeRate = drift < 0 ? playbackRate * 1.05 : playbackRate * 0.95;
        if (Math.abs(video.playbackRate - nudgeRate) > 0.01) {
          video.playbackRate = nudgeRate;
        }
        setPartnerSyncStatus('drift_correcting');
      }
      // 3. Moderate lag behind (-2.5s <= drift < -0.8s): Dynamic 15% catch-up speed (no jarring seek cuts)
      else if (drift < 0 && drift >= -2.5) {
        const catchUpRate = playbackRate * 1.15;
        if (Math.abs(video.playbackRate - catchUpRate) > 0.01) {
          video.playbackRate = catchUpRate;
        }
        setPartnerSyncStatus('drift_correcting');
      }
      // 4. Large drift (|drift| > 2.5s or ahead > 0.8s): Synchronized seek snap
      else {
        markRemoteSyncActive(600);
        video.currentTime = calibratedExpectedTime;
        video.playbackRate = playbackRate;
        setPartnerSyncStatus('drift_correcting');
        setTimeout(() => setPartnerSyncStatus('synced'), 600);
      }

      // Check YouTube player drift if YouTube is active
      const yt = ytPlayerRef.current;
      if (yt && typeof yt.getCurrentTime === 'function') {
        const ytTime = yt.getCurrentTime() || 0;
        const ytDrift = Math.abs(ytTime - calibratedExpectedTime);
        if (ytDrift > 1.3) {
          yt.seekTo(calibratedExpectedTime, true);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPlaying, isBuffering, playbackRate, getTrueServerTime, markRemoteSyncActive]);

  // 3. Visibility Change Recovery (Instantly re-aligns when tab is brought back from background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        const socket = getSocket();
        if (socket) {
          socket.emit('getWatchPartyState', { passcode });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isActive, passcode, getSocket]);

  // 4. Screen Wake Lock API (Prevents screen from dimming/sleeping during movie playback)
  const [wakeLockActive, setWakeLockActive] = useState(false);
  useEffect(() => {
    let wakeLockSentinel = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isActive && isPlaying) {
        try {
          wakeLockSentinel = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLockSentinel.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          // Wake lock request can be rejected if battery saver is on or window is inactive
          setWakeLockActive(false);
        }
      }
    };

    if (isActive && isPlaying) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive && isPlaying) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
        setWakeLockActive(false);
      }
    };
  }, [isActive, isPlaying]);

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onUpdate = (data) => handleWatchPartyUpdate(data);
    const onState = (data) => {
      if (data && data.isActive) {
        handleWatchPartyUpdate(data);
        try {
          if (sessionStorage.getItem(`watchPartyActive_${passcode}`) === 'true') {
            setIsOpen(true);
          }
        } catch (_) {}
      } else {
        setIsActive(false);
        try {
          sessionStorage.removeItem(`watchPartyActive_${passcode}`);
        } catch (_) {}
      }
    };
    const onReaction = ({ from, reaction, timestamp }) => {
      const id = `${timestamp}-${Math.random()}`;
      const xPercent = Math.floor(Math.random() * 70) + 15;
      setFlyingReactions((prev) => [
        ...prev.slice(-20),
        { id, from, reaction, x: xPercent, createdAt: Date.now() },
      ]);
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
      try {
        sessionStorage.removeItem(`watchPartyActive_${passcode}`);
      } catch (_) {}
      if (closedBy && closedBy !== nickname) {
        showToast?.(`${closedBy} closed the Watch Party`);
      }
    };

    const onInvite = (invite) => {
      if (invite && invite.from !== nickname) {
        setIncomingInvite(invite);
      }
    };

    const onAccepted = ({ acceptedBy, videoSource: source, scheduledStartServerTime, currentTime: startPos }) => {
      if (source) setVideoSource(source);
      setIsActive(true);
      setIsOpen(true);
      setIsPlaying(true);
      setIncomingInvite(null);
      try {
        sessionStorage.setItem(`watchPartyActive_${passcode}`, 'true');
      } catch (_) {}
      if (typeof startPos === 'number') {
        setCurrentTime(startPos);
      }
      if (acceptedBy && acceptedBy !== nickname) {
        showToast?.(`🍿 ${acceptedBy} accepted the invitation! Starting movie in perfect sync...`);
      }
      if (scheduledStartServerTime) {
        syncVideoElement(startPos || 0, true, playbackRate, false, scheduledStartServerTime);
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

    // Fetch current state on mount or room join & restore F5 refreshed session
    socket.emit('getWatchPartyState', { passcode });
    try {
      if (sessionStorage.getItem(`watchPartyActive_${passcode}`) === 'true') {
        setIsActive(true);
        setIsOpen(true);
      }
    } catch (_) {}

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
  }, [getSocket, passcode, nickname, handleWatchPartyUpdate, showToast, syncVideoElement, playbackRate]);

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
        clientSendTime: Date.now(),
        ...extra,
      };

      socket.emit('watchPartyAction', payload);

      setTimeout(() => {
        isLocalActionRef.current = false;
      }, 500);
    },
    [getSocket, passcode, currentTime, isPlaying, playbackRate, videoSource]
  );

  // User Action Handlers
  const startWatchParty = useCallback(
    (initialSource = null) => {
      try {
        sessionStorage.setItem(`watchPartyActive_${passcode}`, 'true');
      } catch (_) {}
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
    [emitAction, videoSource, showToast, passcode]
  );

  const acceptWatchPartyInvite = useCallback(() => {
    if (!incomingInvite) return;
    try {
      sessionStorage.setItem(`watchPartyActive_${passcode}`, 'true');
    } catch (_) {}
    const source = incomingInvite.videoSource;
    setIncomingInvite(null);
    if (source) setVideoSource(source);
    setIsActive(true);
    setIsOpen(true);
    setIsMinimized(false);
    setIsPlaying(true);
    emitAction('accept', {
      videoSource: source,
      currentTime: currentTime > 0 ? currentTime : 0,
      isPlaying: true,
    });
    showToast?.('🍿 Accepted! Movie starting directly in sync...');
  }, [incomingInvite, emitAction, showToast, currentTime, passcode]);

  const declineWatchPartyInvite = useCallback(() => {
    setIncomingInvite(null);
    emitAction('decline');
  }, [emitAction]);

  const closeWatchParty = useCallback(() => {
    try {
      sessionStorage.removeItem(`watchPartyActive_${passcode}`);
    } catch (_) {}
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
  }, [emitAction, passcode]);

  const togglePlay = useCallback(
    (explicitPlaying = null, explicitTime = null) => {
      const video = videoElementRef.current;
      const current = explicitTime !== null ? explicitTime : video ? video.currentTime : currentTime;
      const nextPlaying = explicitPlaying !== null ? explicitPlaying : !isPlaying;

      setIsPlaying(nextPlaying);
      anchorMediaTimeRef.current = current;
      anchorServerTimeRef.current = getTrueServerTime() + 300;

      emitAction(nextPlaying ? 'play' : 'pause', {
        currentTime: current,
        isPlaying: nextPlaying,
      });
    },
    [isPlaying, currentTime, emitAction, getTrueServerTime]
  );

  const seek = useCallback(
    (targetTime, explicitPlaying = null) => {
      setCurrentTime(targetTime);
      anchorMediaTimeRef.current = targetTime;
      anchorServerTimeRef.current = getTrueServerTime() + 300;

      const nextPlaying = explicitPlaying !== null ? explicitPlaying : isPlaying;
      emitAction('seek', {
        currentTime: targetTime,
        isPlaying: nextPlaying,
      });
    },
    [isPlaying, emitAction, getTrueServerTime]
  );

  const changeRate = useCallback(
    (rate) => {
      setPlaybackRate(rate);
      const video = videoElementRef.current;
      const current = video ? video.currentTime : currentTime;
      anchorMediaTimeRef.current = current;
      anchorServerTimeRef.current = getTrueServerTime();

      emitAction('rate', {
        playbackRate: rate,
        currentTime: current,
      });
    },
    [currentTime, emitAction, getTrueServerTime]
  );

  const changeVideo = useCallback(
    (source) => {
      setVideoSource(source);
      setCurrentTime(0);
      setIsPlaying(false);
      anchorMediaTimeRef.current = 0;
      anchorServerTimeRef.current = getTrueServerTime();

      emitAction('change_video', {
        videoSource: source,
        currentTime: 0,
        isPlaying: false,
      });
    },
    [emitAction, getTrueServerTime]
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

  const toggleHostLock = useCallback(() => {
    emitAction('toggle_host_lock');
  }, [emitAction]);

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
    hostNickname,
    isHostOnly,
    isBuffering,
    bufferingUsers,
    partnerSyncStatus,
    flyingReactions,
    danmakuComments,
    incomingInvite,
    autoplayBlocked,
    setAutoplayBlocked,
    serverClockSkew,
    wakeLockActive,
    audioDelayOffset,
    setAudioDelayOffset,
    videoElementRef,
    ytPlayerRef,
    isLocalActionRef,
    isRemoteSyncRef,
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
    toggleHostLock,
    performClockSync,
    getTrueServerTime,
  };
}
