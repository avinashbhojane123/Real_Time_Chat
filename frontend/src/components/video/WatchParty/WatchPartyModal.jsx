import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import './WatchPartyModal.css';

const REACTION_EMOJIS = ['🍿', '❤️', '🔥', '😂', '👏', '😭'];

// Supported Movie & Series Platforms
const SUPPORTED_MOVIE_SITES = [
  {
    name: 'CineHD',
    url: 'https://cinehd.vc',
    tagline: '4K Cinema',
    icon: 'solar:videocamera-record-bold-duotone',
    color: '#3b82f6',
  },
  {
    name: 'PRMovies',
    url: 'https://prmovies.energy/',
    tagline: 'Bollywood & Hollywood',
    icon: 'solar:film-strip-bold-duotone',
    color: '#ef4444',
  },
  {
    name: 'CinemaOS',
    url: 'https://cinemaos.live',
    tagline: 'HD Movies & Series',
    icon: 'solar:clapperboard-play-bold-duotone',
    color: '#00a884',
  },
  {
    name: 'Cineby',
    url: 'https://cinebytv.com/',
    tagline: 'Free Streaming',
    icon: 'solar:tv-bold-duotone',
    color: '#ec4899',
  },
  {
    name: 'Cinevice',
    url: 'https://cinevice.net/',
    tagline: 'Fast Streams',
    icon: 'solar:playback-speed-bold-duotone',
    color: '#8b5cf6',
  },
  {
    name: 'MX Player',
    url: 'https://www.mxplayer.in/',
    tagline: 'Indian & Global Shows',
    icon: 'solar:play-circle-bold-duotone',
    color: '#f59e0b',
  },
];

export default function WatchPartyModal({
  isOpen,
  onClose,
  watchParty,
  recipientUser,
  currentNickname,
  webRTC,
  onSendChatMessage,
}) {
  const {
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
    isBuffering,
    partnerSyncStatus,
    flyingReactions,
    danmakuComments: hookDanmakuComments,
    videoElementRef,
    togglePlay,
    seek,
    changeRate,
    changeVideo,
    notifyBuffering,
    sendReaction,
    sendComment,
    closeWatchParty,
  } = watchParty;

  // Local UI states
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [customInputTitle, setCustomInputTitle] = useState('');
  const [showDrawer, setShowDrawer] = useState(!videoSource);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [quickComment, setQuickComment] = useState('');
  const [localDanmakuComments, setLocalDanmakuComments] = useState([]);
  const [showPlatformsMenu, setShowPlatformsMenu] = useState(false);
  const platformsDropdownRef = useRef(null);
  const activeDanmaku = (hookDanmakuComments && hookDanmakuComments.length > 0)
    ? hookDanmakuComments
    : localDanmakuComments;
  const scrubberRef = useRef(null);

  // Close platforms dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (platformsDropdownRef.current && !platformsDropdownRef.current.contains(e.target)) {
        setShowPlatformsMenu(false);
      }
    };
    if (showPlatformsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlatformsMenu]);

  // Live Face Cams (Sender & Receiver) states & refs
  const [showFaceCams, setShowFaceCams] = useState(true);
  const [faceCamsMinimized, setFaceCamsMinimized] = useState(false);
  const partyLocalVideoRef = useRef(null);
  const partyRemoteVideoRef = useRef(null);

  // Sync webRTC streams to Watch Party face cams
  useEffect(() => {
    if (partyLocalVideoRef.current && webRTC?.localStream) {
      if (partyLocalVideoRef.current.srcObject !== webRTC.localStream) {
        partyLocalVideoRef.current.srcObject = webRTC.localStream;
      }
      partyLocalVideoRef.current.play().catch(() => {});
    }
  }, [webRTC?.localStream, webRTC?.callState, showFaceCams, faceCamsMinimized]);

  useEffect(() => {
    if (partyRemoteVideoRef.current && webRTC?.remoteStream) {
      if (partyRemoteVideoRef.current.srcObject !== webRTC.remoteStream) {
        partyRemoteVideoRef.current.srcObject = webRTC.remoteStream;
      }
      partyRemoteVideoRef.current.play().catch(() => {});
    }
  }, [webRTC?.remoteStream, webRTC?.callState, showFaceCams, faceCamsMinimized]);

  // Video element sync & event wiring
  const handleTimeUpdate = (e) => {
    const time = e.currentTarget.currentTime;
    setCurrentTime(time);
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.currentTarget.duration || 0);
    if (currentTime > 0) {
      e.currentTarget.currentTime = currentTime;
    }
  };

  const handleScrubberClick = (e) => {
    if (!scrubberRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * duration;
    seek(target);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoElementRef.current) {
      videoElementRef.current.volume = val;
      videoElementRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoElementRef.current) {
      videoElementRef.current.muted = nextMuted;
      if (!nextMuted && volume === 0) {
        setVolume(0.5);
        videoElementRef.current.volume = 0.5;
      }
    }
  };

  const handleCustomUrlSubmit = (e) => {
    e.preventDefault();
    let rawUrl = customInputUrl.trim();
    if (!rawUrl) return;

    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
    }

    const isYt = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(rawUrl);
    const isDirectVideo = /\.(mp4|webm|ogg|mov|mkv|m4v|m3u8)(\?.*)?$/i.test(rawUrl);
    const isCinemaOs = /cinemaos\.live/i.test(rawUrl);
    const isCineHd = /cinehd\./i.test(rawUrl);
    const isCineby = /cineby/i.test(rawUrl);
    const isCinevice = /cinevice/i.test(rawUrl);
    const isMxPlayer = /mxplayer\.in/i.test(rawUrl);
    const isPrMovies = /prmovies/i.test(rawUrl);

    // Extract type and ID from movie links (e.g. cinemaos.live/watch/movie/1365884 or cinemaos.live/watch/tv/1234/1/1)
    const mediaTypeMatch = rawUrl.match(/(?:watch\/)?(movie|tv)\/([a-zA-Z0-9_\-]+)(?:\/(\d+)\/(\d+))?/i);
    const tmdbMatch = rawUrl.match(/(?:movie|tv|id|video_id=)\/?(\d+)/i);
    const imdbMatch = rawUrl.match(/(tt\d{7,8})/i);

    const mediaType = mediaTypeMatch ? mediaTypeMatch[1].toLowerCase() : (rawUrl.includes('/tv/') ? 'tv' : 'movie');
    const extractedTmdbId = tmdbMatch ? tmdbMatch[1] : (mediaTypeMatch && /^\d+$/.test(mediaTypeMatch[2]) ? mediaTypeMatch[2] : null);
    const extractedImdbId = imdbMatch ? imdbMatch[1] : null;
    const season = mediaTypeMatch && mediaTypeMatch[3] ? mediaTypeMatch[3] : '1';
    const episode = mediaTypeMatch && mediaTypeMatch[4] ? mediaTypeMatch[4] : '1';

    let videoType = 'direct';
    let provider = 'Web Stream';
    let providerColor = '#00a884';
    let providerIcon = 'solar:clapperboard-play-bold-duotone';

    if (isYt) {
      videoType = 'youtube';
      provider = 'YouTube';
      providerColor = '#ff4444';
      providerIcon = 'solar:play-circle-bold-duotone';
    } else if (isDirectVideo) {
      videoType = 'direct';
      provider = 'Direct Stream';
      providerColor = '#00a884';
      providerIcon = 'solar:videocamera-record-bold-duotone';
    } else {
      videoType = 'embed';
      if (isCinemaOs) {
        provider = 'CinemaOS';
        providerColor = '#00a884';
        providerIcon = 'solar:clapperboard-play-bold-duotone';
      } else if (isCineHd) {
        provider = 'CineHD';
        providerColor = '#3b82f6';
        providerIcon = 'solar:videocamera-record-bold-duotone';
      } else if (isCineby) {
        provider = 'Cineby';
        providerColor = '#ec4899';
        providerIcon = 'solar:tv-bold-duotone';
      } else if (isCinevice) {
        provider = 'Cinevice';
        providerColor = '#8b5cf6';
        providerIcon = 'solar:playback-speed-bold-duotone';
      } else if (isMxPlayer) {
        provider = 'MX Player';
        providerColor = '#f59e0b';
        providerIcon = 'solar:play-circle-bold-duotone';
      } else if (isPrMovies) {
        provider = 'PRMovies';
        providerColor = '#ef4444';
        providerIcon = 'solar:film-strip-bold-duotone';
      }
    }

    // Auto-convert cinemaos.live/movie/12345 to watch format cinemaos.live/watch/movie/12345
    let streamUrl = rawUrl;
    if (isCinemaOs && !streamUrl.includes('/watch/')) {
      if (extractedTmdbId) {
        streamUrl = `https://cinemaos.live/watch/movie/${extractedTmdbId}`;
      }
    }

    // Smartly derive title from URL slug or parameters
    let defaultTitle = customInputTitle.trim();
    if (!defaultTitle) {
      try {
        const parsed = new URL(rawUrl);
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2] || '';

        if (lastSegment && !/^\d+$/.test(lastSegment)) {
          let clean = decodeURIComponent(lastSegment)
            .replace(/^watch-?/i, '')
            .replace(/-(?:full-)?movie(?:-online)?(?:-free)?$/i, '')
            .replace(/-(?:online-free|online|free|hd|4k|hindi|dubbed|dual-audio)$/i, '')
            .replace(/-\d{6,}$/i, '')
            .replace(/[-_]+/g, ' ')
            .trim();

          if (clean) {
            clean = clean
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
            defaultTitle = `${clean} • ${provider}`;
          }
        }
      } catch (err) {
        // Fallback below
      }

      if (!defaultTitle) {
        if (rawUrl.includes('1365884') || rawUrl.toLowerCase().includes('call-my-agent')) {
          defaultTitle = 'Call My Agent! The Movie (2026)';
        } else if (isCinemaOs) {
          defaultTitle = `CinemaOS ${mediaType === 'tv' ? `Series (S${season}E${episode})` : 'Movie'} #${extractedTmdbId || 'Stream'}`;
        } else if (isYt) {
          defaultTitle = 'YouTube Video';
        } else if (extractedTmdbId) {
          defaultTitle = `${provider} Movie #${extractedTmdbId}`;
        } else {
          defaultTitle = `${provider} Movie Stream`;
        }
      }
    }

    const source = {
      url: streamUrl,
      originalUrl: rawUrl,
      title: defaultTitle,
      type: videoType,
      provider,
      providerColor,
      providerIcon,
      isCinemaOs,
      mediaType,
      tmdbId: extractedTmdbId,
      imdbId: extractedImdbId,
      season,
      episode,
    };
    changeVideo(source);
    setCustomInputUrl('');
    setCustomInputTitle('');
    setShowDrawer(false);
  };

  const handleSendQuickComment = (e) => {
    e.preventDefault();
    const text = quickComment.trim();
    if (!text) return;

    // 1. Send live on-screen comment across the room to all participants via socket
    if (sendComment) {
      sendComment(text);
    } else {
      const id = `${Date.now()}-${Math.random()}`;
      const topPos = Math.floor(Math.random() * 60) + 15;
      setLocalDanmakuComments((prev) => [
        ...prev.slice(-20),
        { id, text, top: topPos, from: currentNickname || 'You' },
      ]);
      setTimeout(() => {
        setLocalDanmakuComments((prev) => prev.filter((c) => c.id !== id));
      }, 7500);
    }

    // 2. Send to in-room chat history as well
    onSendChatMessage?.(`🎬 [Watch Party] ${text}`);
    setQuickComment('');
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null) return '00:00';
    const total = Math.floor(secs);
    const m = Math.floor(total / 60);
    const s = total % 60;
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // YouTube Video ID extractor
  const youtubeVideoId = useMemo(() => {
    if (videoSource?.type !== 'youtube' || !videoSource?.url) return null;
    const match = videoSource.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
  }, [videoSource]);

  if (!isOpen) return null;

  // MINIMIZED PICTURE-IN-PICTURE FLOATING PLAYER
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragConstraints={{ left: -window.innerWidth + 360, right: 0, top: -window.innerHeight + 240, bottom: 0 }}
        className="watch-party-pip-container"
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="watch-party-pip-header">
          <div className="watch-party-badge" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>
            <span className="watch-party-pulse-dot" />
            <span>Party</span>
          </div>
          <span className="watch-party-pip-title">{videoSource?.title || 'Watch Party'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="watch-party-btn-icon"
              style={{ width: '28px', height: '28px' }}
              onClick={() => setIsMinimized(false)}
              title="Expand Cinema Mode"
            >
              <Icon icon="solar:maximize-square-bold-duotone" width="16" />
            </button>
            <button
              type="button"
              className="watch-party-btn-icon watch-party-btn-close"
              style={{ width: '28px', height: '28px' }}
              onClick={closeWatchParty}
              title="End Watch Party"
            >
              <Icon icon="line-md:close" width="16" />
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '170px', background: '#000' }}>
          {videoSource?.type === 'direct' ? (
            <video
              ref={videoElementRef}
              src={videoSource.url}
              className="watch-party-video"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => notifyBuffering(true)}
              onPlaying={() => notifyBuffering(false)}
              playsInline
            />
          ) : youtubeVideoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1`}
              className="watch-party-yt-iframe"
              allow="autoplay; encrypted-media; fullscreen"
              title="YouTube Watch Party"
            />
          ) : videoSource?.url ? (
            <iframe
              src={videoSource.url}
              className="watch-party-yt-iframe"
              allow="autoplay; encrypted-media; fullscreen"
              title={videoSource.title || 'Watch Party Stream'}
            />
          ) : null}
        </div>

        <div className="watch-party-pip-controls">
          <button
            type="button"
            className="watch-party-play-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={togglePlay}
          >
            <Icon icon={isPlaying ? 'solar:pause-bold' : 'solar:play-bold'} width="18" />
          </button>
          <span style={{ fontSize: '0.75rem', color: '#8696a0' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {REACTION_EMOJIS.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-btn-tap"
                style={{ padding: '2px 6px', fontSize: '1rem' }}
                onClick={() => sendReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // FULL THEATER CINEMA MODAL
  return (
    <div className={`watch-party-overlay ${cinemaMode ? 'cinema-dimmed' : ''}`}>
      {/* Dynamic Ambient Glow */}
      <div className="watch-party-ambient-glow" />

      <motion.div
        className="watch-party-container"
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        {/* Header */}
        <div className="watch-party-header">
          <div className="watch-party-title-group">
            <div className="watch-party-badge">
              <span className="watch-party-pulse-dot" />
              <span>Watch Together</span>
            </div>
          </div>


          {/* Header Controls */}
          <div className="watch-party-header-actions">
            {/* Live Face Cam (Video Call) Toggle Button */}
            {webRTC && (
              <button
                type="button"
                className={`watch-party-btn-icon ${webRTC.callState === 'active' ? 'active call-active-glow' : ''} ${webRTC.callState === 'incoming' ? 'incoming-pulse' : ''}`}
                onClick={() => {
                  if (webRTC.callState === 'idle') {
                    webRTC.startCall();
                    setShowFaceCams(true);
                    setFaceCamsMinimized(false);
                  } else if (webRTC.callState === 'incoming') {
                    webRTC.acceptCall();
                    setShowFaceCams(true);
                    setFaceCamsMinimized(false);
                  } else {
                    setShowFaceCams(!showFaceCams);
                  }
                }}
                title={
                  webRTC.callState === 'active'
                    ? (showFaceCams ? 'Hide Face Cams' : 'Show Face Cams')
                    : webRTC.callState === 'incoming'
                    ? 'Accept Live Face Cam Call'
                    : 'Start Live Face Cams while Watching'
                }
              >
                {webRTC.callState === 'active' && <span className="watch-party-pulse-dot" style={{ backgroundColor: '#00a884' }} />}
                <Icon
                  icon={
                    webRTC.callState === 'active'
                      ? 'solar:videocamera-record-bold-duotone'
                      : webRTC.callState === 'incoming'
                      ? 'solar:phone-calling-rounded-bold'
                      : 'solar:videocamera-add-bold-duotone'
                  }
                  width="20"
                />
              </button>
            )}

            {/* Supported Platforms Corner Dropdown */}
            <div className="watch-party-platforms-dropdown-wrapper" ref={platformsDropdownRef}>
              <button
                type="button"
                className={`watch-party-btn-icon ${showPlatformsMenu ? 'active' : ''}`}
                onClick={() => setShowPlatformsMenu(!showPlatformsMenu)}
                title="Select Movie from Supported Platforms"
              >
                <Icon icon="solar:clapperboard-play-bold-duotone" width="20" />
              </button>

              <AnimatePresence>
                {showPlatformsMenu && (
                  <motion.div
                    className="watch-party-platforms-menu"
                    initial={{ opacity: 0, scale: 0.92, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="platforms-menu-header">
                      <Icon icon="solar:clapperboard-play-bold-duotone" width="16" style={{ color: '#00a884' }} />
                      <span>SELECT MOVIE FROM SUPPORTED PLATFORMS:</span>
                    </div>
                    <div className="platforms-menu-list">
                      {SUPPORTED_MOVIE_SITES.map((site) => (
                        <a
                          key={site.name}
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="platforms-menu-item"
                          onClick={() => setShowPlatformsMenu(false)}
                          title={`Browse ${site.name} (${site.tagline}) in new tab`}
                        >
                          <div className="platforms-menu-item-left">
                            <span className="platform-icon-box" style={{ background: `${site.color}20`, color: site.color }}>
                              <Icon icon={site.icon} width="16" />
                            </span>
                            <div className="platform-info">
                              <span className="platform-name">{site.name}</span>
                              <span className="platform-tagline">{site.tagline}</span>
                            </div>
                          </div>
                          <Icon icon="solar:arrow-right-up-bold" width="14" className="platform-arrow" />
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              className={`watch-party-btn-icon ${showDrawer ? 'active' : ''}`}
              onClick={() => setShowDrawer(!showDrawer)}
              title="Change Video / Enter URL"
            >
              <Icon icon="solar:link-bold-duotone" width="20" />
            </button>

            <button
              type="button"
              className={`watch-party-btn-icon ${cinemaMode ? 'active' : ''}`}
              onClick={() => setCinemaMode(!cinemaMode)}
              title={cinemaMode ? 'Turn Lights On' : 'Cinema Ambient Mode'}
            >
              <Icon icon={cinemaMode ? 'solar:lamp-bold-duotone' : 'solar:sun-bold-duotone'} width="20" />
            </button>

            <button
              type="button"
              className="watch-party-btn-icon"
              onClick={() => setIsMinimized(true)}
              title="Minimize to Floating PiP Player"
            >
              <Icon icon="solar:minimize-square-bold-duotone" width="20" />
            </button>

            <button
              type="button"
              className="watch-party-btn-icon watch-party-btn-close"
              onClick={closeWatchParty}
              title="Close Watch Party"
            >
              <Icon icon="line-md:close" width="20" />
            </button>
          </div>
        </div>

        {/* Stream Source & Mirror Switcher Bar for Movie Streams */}
        {videoSource && videoSource.type !== 'direct' && (
          <div className="watch-party-stream-bar">
            <div className="stream-bar-provider-badge">
              <Icon icon={videoSource.providerIcon || 'solar:clapperboard-play-bold-duotone'} width="15" style={{ color: videoSource.providerColor || '#00a884' }} />
              <span>{videoSource.provider || 'Movie Stream'}</span>
            </div>

            {videoSource.title && (
              <span className="stream-bar-title" title={videoSource.title}>
                {videoSource.title}
              </span>
            )}

            {/* Switch back to original pasted URL if currently on a mirror */}
            {videoSource.originalUrl && videoSource.originalUrl !== videoSource.url && (
              <button
                type="button"
                className="stream-bar-btn"
                onClick={() => {
                  changeVideo({
                    ...videoSource,
                    url: videoSource.originalUrl,
                  });
                }}
                title="Switch back to original site stream"
              >
                Original Stream
              </button>
            )}

            {/* Multi-Server Mirrors for movies with TMDB ID */}
            {videoSource.tmdbId && (
              <>
                <button
                  type="button"
                  className={`stream-bar-btn ${videoSource.url?.includes('cinemaos.live') ? 'active' : ''}`}
                  onClick={() => {
                    changeVideo({
                      ...videoSource,
                      url: `https://cinemaos.live/watch/movie/${videoSource.tmdbId}`,
                      type: 'embed',
                    });
                  }}
                >
                  CinemaOS
                </button>

                <button
                  type="button"
                  className={`stream-bar-btn ${videoSource.url?.includes('vidlink.pro') ? 'active' : ''}`}
                  onClick={() => {
                    changeVideo({
                      ...videoSource,
                      url: `https://vidlink.pro/movie/${videoSource.tmdbId}`,
                      type: 'embed',
                    });
                  }}
                >
                  VidLink
                </button>

                <button
                  type="button"
                  className={`stream-bar-btn ${videoSource.url?.includes('vidsrc.pro') ? 'active' : ''}`}
                  onClick={() => {
                    changeVideo({
                      ...videoSource,
                      url: `https://vidsrc.pro/embed/movie/${videoSource.tmdbId}`,
                      type: 'embed',
                    });
                  }}
                >
                  VidSrc
                </button>

                <button
                  type="button"
                  className={`stream-bar-btn ${videoSource.url?.includes('multiembed.mov') ? 'active' : ''}`}
                  onClick={() => {
                    changeVideo({
                      ...videoSource,
                      url: `https://multiembed.mov/?video_id=${videoSource.tmdbId}&tmdb=1`,
                      type: 'embed',
                    });
                  }}
                >
                  MultiEmbed
                </button>
              </>
            )}

            <div className="stream-bar-actions">
              <a
                href={videoSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="stream-bar-link"
                title="Open stream in a new tab if playback is restricted by the website"
              >
                <span>Open in Tab</span>
                <Icon icon="solar:arrow-right-up-bold" width="12" />
              </a>
            </div>
          </div>
        )}

        {/* Video Player Surface */}
        <div className="watch-party-player-surface">
          {videoSource?.type === 'direct' ? (
            <video
              ref={videoElementRef}
              src={videoSource.url}
              className="watch-party-video"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => notifyBuffering(true)}
              onPlaying={() => notifyBuffering(false)}
              onClick={togglePlay}
              playsInline
            />
          ) : youtubeVideoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1`}
              className="watch-party-yt-iframe"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title="YouTube Watch Party"
            />
          ) : videoSource?.type === 'embed' || videoSource?.url ? (
            <iframe
              key={videoSource.url}
              src={videoSource.url}
              className="watch-party-yt-iframe"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope; clipboard-write; web-share"
              allowFullScreen
              referrerPolicy="no-referrer"
              title={videoSource.title || 'Movie Watch Party'}
            />
          ) : null}

          {/* Zero-Lag Buffering Lock Overlay */}
          <AnimatePresence>
            {isBuffering && (
              <motion.div
                className="watch-party-sync-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="watch-party-spinner" />
                <span style={{ fontWeight: 600, color: '#00a884', fontSize: '0.95rem' }}>
                  Syncing with {lastActorNickname || 'Partner'}...
                </span>
                <span style={{ fontSize: '0.78rem', color: '#8696a0' }}>
                  Zero-lag buffer lock keeps both of you at the exact same moment
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flying Synchronized Reactions */}
          <div className="watch-party-reactions-layer">
            <AnimatePresence>
              {flyingReactions.map((r) => (
                <div
                  key={r.id}
                  className="watch-party-flying-reaction"
                  style={{ left: `${r.x}%` }}
                >
                  <span className="reaction-emoji">{r.reaction}</span>
                  {r.from && <span className="reaction-author">{r.from}</span>}
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* Danmaku Comments Flying Across Video */}
          <div className="watch-party-danmaku-layer">
            <AnimatePresence>
              {activeDanmaku.map((c) => (
                <div
                  key={c.id}
                  className="watch-party-danmaku-chip"
                  style={{ top: `${c.top}%` }}
                >
                  <Icon icon="solar:chat-round-dots-bold-duotone" width="16" style={{ color: '#00a884', flexShrink: 0 }} />
                  <span className="danmaku-author">{c.from}:</span>
                  <span className="danmaku-text">{c.text}</span>
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* Live Floating Face Cams (Sender & Receiver Live Webcams) */}
          <AnimatePresence>
            {webRTC && showFaceCams && (webRTC.callState === 'active' || webRTC.callState === 'calling' || webRTC.callState === 'incoming') && (
              <motion.div
                drag
                dragMomentum={false}
                className={`watch-party-face-cams ${faceCamsMinimized ? 'minimized' : ''}`}
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 15 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                {/* Face Cams Header */}
                <div className="face-cams-header">
                  <div className="face-cams-header-badge">
                    <span className="face-cam-live-indicator" />
                    <span>Live Faces</span>
                    {webRTC.callDuration > 0 && (
                      <span className="face-cams-duration">
                        {Math.floor(webRTC.callDuration / 60)}:{(webRTC.callDuration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div className="face-cams-header-controls">
                    <button
                      type="button"
                      className="face-cam-mini-btn"
                      onClick={() => setFaceCamsMinimized(!faceCamsMinimized)}
                      title={faceCamsMinimized ? 'Expand Face Cams' : 'Minimize Face Cams'}
                    >
                      <Icon icon={faceCamsMinimized ? 'solar:maximize-square-bold' : 'solar:minimize-square-bold'} width="13" />
                    </button>
                    <button
                      type="button"
                      className="face-cam-mini-btn end-call"
                      onClick={webRTC.endCall}
                      title="Disconnect Face Cams"
                    >
                      <Icon icon="line-md:close" width="13" />
                    </button>
                  </div>
                </div>

                {!faceCamsMinimized && (
                  <>
                    {/* Incoming Call In-Cinema Prompt */}
                    {webRTC.callState === 'incoming' && (
                      <div className="face-cams-prompt">
                        <div className="prompt-caller-info">
                          <Icon icon="solar:phone-calling-rounded-bold-duotone" width="22" style={{ color: '#00a884' }} />
                          <span><strong>{webRTC.callerName || 'Partner'}</strong> is video calling!</span>
                        </div>
                        <div className="prompt-actions">
                          <button type="button" className="prompt-btn accept" onClick={webRTC.acceptCall}>
                            <Icon icon="solar:videocamera-bold" width="15" />
                            <span>Accept</span>
                          </button>
                          <button type="button" className="prompt-btn decline" onClick={webRTC.declineCall}>
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Calling / Waiting State with Sender Face Preview */}
                    {webRTC.callState === 'calling' && (
                      <div className="face-cams-calling-box" style={{ padding: '8px', minWidth: '180px' }}>
                        <div className="face-cam-card sender single" style={{ width: '100%', height: '125px', position: 'relative' }}>
                          {webRTC?.localStream && !webRTC.cameraOff ? (
                            <video
                              ref={(el) => {
                                partyLocalVideoRef.current = el;
                                if (el && webRTC.localStream && el.srcObject !== webRTC.localStream) {
                                  el.srcObject = webRTC.localStream;
                                  el.play().catch(() => {});
                                }
                              }}
                              autoPlay
                              playsInline
                              muted
                              className="face-cam-video"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                            />
                          ) : (
                            <div className="face-cam-avatar-fallback">
                              <span className="avatar-letter">{(currentNickname || 'Me').slice(0, 2).toUpperCase()}</span>
                              <span className="avatar-status">Live Camera</span>
                            </div>
                          )}
                          <div className="face-cam-tag">
                            <span className="face-cam-dot active" />
                            <span>Calling {recipientUser?.nickname || 'Partner'}...</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="prompt-btn decline"
                            style={{ padding: '4px 14px', fontSize: '0.75rem', width: '100%' }}
                            onClick={webRTC.endCall}
                          >
                            Cancel Call
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Dual Face Cams (Sender & Receiver) */}
                    {webRTC.callState === 'active' && (
                      <div className="face-cams-grid">
                        {/* Receiver (Partner) Cam */}
                        <div className="face-cam-card receiver">
                          <video
                            ref={(el) => {
                              partyRemoteVideoRef.current = el;
                              if (el && webRTC?.remoteStream && el.srcObject !== webRTC.remoteStream) {
                                el.srcObject = webRTC.remoteStream;
                                el.play().catch(() => {});
                              }
                            }}
                            autoPlay
                            playsInline
                            className="face-cam-video"
                          />
                          {(!webRTC?.remoteStream || !webRTC.remoteStream.getVideoTracks()?.length) && (
                            <div className="face-cam-avatar-fallback">
                              <span className="avatar-letter">{(recipientUser?.nickname || 'P').slice(0, 2).toUpperCase()}</span>
                              <span className="avatar-status">Connecting...</span>
                            </div>
                          )}
                          <div className="face-cam-tag">
                            <span className="face-cam-dot active" />
                            <span>{recipientUser?.nickname || webRTC.remoteUserName || 'Partner'}</span>
                          </div>
                        </div>

                        {/* Sender (You) Cam */}
                        <div className="face-cam-card sender">
                          <video
                            ref={(el) => {
                              partyLocalVideoRef.current = el;
                              if (el && webRTC?.localStream && el.srcObject !== webRTC.localStream) {
                                el.srcObject = webRTC.localStream;
                                el.play().catch(() => {});
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className={`face-cam-video ${webRTC.cameraOff ? 'cam-off' : ''}`}
                            style={{ transform: 'scaleX(-1)' }}
                          />
                          {webRTC.cameraOff && (
                            <div className="face-cam-avatar-fallback">
                              <span className="avatar-letter">{(currentNickname || 'Me').slice(0, 2).toUpperCase()}</span>
                              <span className="avatar-status">Camera Off</span>
                            </div>
                          )}
                          <div className="face-cam-tag">
                            <span className="face-cam-dot" />
                            <span>You</span>
                            {webRTC.micMuted && (
                              <Icon icon="solar:muted-bold" width="12" style={{ color: '#f15c6d', marginLeft: '3px' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Cam Controls Bar */}
                    {webRTC.callState === 'active' && (
                      <div className="face-cams-actions-row">
                        <button
                          type="button"
                          className={`face-cam-action-btn ${webRTC.micMuted ? 'muted' : ''}`}
                          onClick={webRTC.toggleMic}
                          title={webRTC.micMuted ? 'Unmute Mic' : 'Mute Mic'}
                        >
                          <Icon icon={webRTC.micMuted ? 'solar:muted-bold' : 'solar:microphone-bold'} width="15" />
                        </button>
                        <button
                          type="button"
                          className={`face-cam-action-btn ${webRTC.cameraOff ? 'muted' : ''}`}
                          onClick={webRTC.toggleCamera}
                          title={webRTC.cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                        >
                          <Icon icon={webRTC.cameraOff ? 'solar:videocamera-cross-bold' : 'solar:videocamera-bold'} width="15" />
                        </button>
                        {webRTC.flipCamera && (
                          <button
                            type="button"
                            className="face-cam-action-btn"
                            onClick={webRTC.flipCamera}
                            title="Flip Camera"
                          >
                            <Icon icon="solar:camera-rotate-bold" width="15" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="face-cam-action-btn end-btn"
                          onClick={webRTC.endCall}
                          title="Disconnect Face Cams"
                        >
                          <Icon icon="solar:phone-calling-rounded-bold" width="15" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Scrubber & Playback Controls Bar */}
        <div className="watch-party-controls-bar">
          <div className="watch-party-timeline-row">
            <div
              ref={scrubberRef}
              className="watch-party-scrubber"
              onClick={handleScrubberClick}
            >
              <div
                className="watch-party-progress-fill"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div
                className="watch-party-scrubber-handle"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="watch-party-time-text">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="watch-party-buttons-row">
            <div className="watch-party-left-controls">
              <button
                type="button"
                className="watch-party-play-btn"
                onClick={togglePlay}
                title={isPlaying ? 'Pause (Synced)' : 'Play (Synced)'}
              >
                <Icon icon={isPlaying ? 'solar:pause-bold' : 'solar:play-bold'} width="22" />
              </button>

              <button
                type="button"
                className="watch-party-btn-icon"
                onClick={() => seek(Math.max(0, currentTime - 10))}
                title="Rewind 10s (Synced)"
              >
                <Icon icon="solar:rewind-back-10-seconds-bold-duotone" width="20" />
              </button>

              <button
                type="button"
                className="watch-party-btn-icon"
                onClick={() => seek(Math.min(duration, currentTime + 10))}
                title="Forward 10s (Synced)"
              >
                <Icon icon="solar:rewind-forward-10-seconds-bold-duotone" width="20" />
              </button>

              {/* Playback Rate Selector */}
              <select
                className="watch-party-rate-select"
                value={playbackRate}
                onChange={(e) => changeRate(parseFloat(e.target.value))}
                title="Synchronized Playback Speed"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1.0x (Normal)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>

              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                <button
                  type="button"
                  className="watch-party-btn-icon"
                  style={{ width: '30px', height: '30px' }}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  <Icon
                    icon={isMuted || volume === 0 ? 'solar:volume-cross-bold-duotone' : 'solar:volume-loud-bold-duotone'}
                    width="18"
                  />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: '70px', accentColor: '#00a884', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="watch-party-right-controls">
              {lastActorNickname && (
                <span style={{ fontSize: '0.75rem', color: '#8696a0' }}>
                  Last action by <strong style={{ color: '#00a884' }}>{lastActorNickname}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Floating Reactions Bar & In-Party Quick Chat Overlay */}
        <div className="watch-party-interaction-row">
          <div className="watch-party-reactions-group">
            <span style={{ fontSize: '0.8rem', color: '#8696a0', fontWeight: 600, marginRight: '4px' }}>
              Live React:
            </span>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-btn-tap"
                onClick={() => sendReaction(emoji)}
                title={`Send ${emoji} to everyone`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <form className="watch-party-quick-chat-form" onSubmit={handleSendQuickComment}>
            <input
              type="text"
              className="watch-party-quick-chat-input"
              placeholder="React live on screen or chat together..."
              value={quickComment}
              onChange={(e) => setQuickComment(e.target.value)}
            />
            <button
              type="submit"
              className="watch-party-play-btn"
              style={{ width: '34px', height: '34px' }}
              title="Send Comment to Screen & Chat"
            >
              <Icon icon="solar:plain-bold" width="18" />
            </button>
          </form>
        </div>

        {/* Source Selection Drawer (Platform Shortcuts & URL Input) */}
        <AnimatePresence>
          {showDrawer && (
            <motion.div
              className="watch-party-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            >
              <form className="custom-url-form" onSubmit={handleCustomUrlSubmit}>
                <input
                  type="text"
                  className="custom-url-input"
                  placeholder="Paste movie link from CinemaOS, CineHD, Cineby, Cinevice, MX Player, PRMovies, or YouTube..."
                  value={customInputUrl}
                  onChange={(e) => setCustomInputUrl(e.target.value)}
                  required
                  autoFocus
                />
                <input
                  type="text"
                  className="custom-url-input"
                  style={{ flex: 0.5 }}
                  placeholder="Movie Title (Optional - auto-detected)"
                  value={customInputTitle}
                  onChange={(e) => setCustomInputTitle(e.target.value)}
                />
                <button type="submit" className="custom-url-btn">
                  <Icon icon="solar:play-bold" width="18" />
                  <span>Watch Together</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
