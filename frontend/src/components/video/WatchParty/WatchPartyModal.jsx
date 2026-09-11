import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import './WatchPartyModal.css';

const REACTION_EMOJIS = ['🍿', '❤️', '🔥', '😂', '👏', '😭'];

export default function WatchPartyModal({
  isOpen,
  onClose,
  watchParty,
  recipientUser,
  currentNickname,
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
    videoElementRef,
    togglePlay,
    seek,
    changeRate,
    changeVideo,
    notifyBuffering,
    sendReaction,
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
  const [danmakuComments, setDanmakuComments] = useState([]);
  const scrubberRef = useRef(null);

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

    const isCinemaOs = /cinemaos\.live/i.test(rawUrl);
    const isYt = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(rawUrl);
    const isDirectVideo = /\.(mp4|webm|ogg|mov|mkv|m4v|m3u8)(\?.*)?$/i.test(rawUrl);

    // Extract type and ID from cinemaos or embed links (e.g. cinemaos.live/watch/movie/1365884 or cinemaos.live/watch/tv/1234/1/1)
    const mediaTypeMatch = rawUrl.match(/(?:watch\/)?(movie|tv)\/([a-zA-Z0-9_\-]+)(?:\/(\d+)\/(\d+))?/i);
    const tmdbMatch = rawUrl.match(/(?:movie|tv|id|video_id=)\/?(\d+)/i);
    const imdbMatch = rawUrl.match(/(tt\d{7,8})/i);

    const mediaType = mediaTypeMatch ? mediaTypeMatch[1].toLowerCase() : (rawUrl.includes('/tv/') ? 'tv' : 'movie');
    const extractedTmdbId = tmdbMatch ? tmdbMatch[1] : (mediaTypeMatch ? mediaTypeMatch[2] : null);
    const extractedImdbId = imdbMatch ? imdbMatch[1] : null;
    const season = mediaTypeMatch && mediaTypeMatch[3] ? mediaTypeMatch[3] : '1';
    const episode = mediaTypeMatch && mediaTypeMatch[4] ? mediaTypeMatch[4] : '1';

    let videoType = 'direct';
    if (isYt) {
      videoType = 'youtube';
    } else if (isDirectVideo) {
      videoType = 'direct';
    } else {
      videoType = 'embed';
    }

    let defaultTitle = customInputTitle.trim();
    if (!defaultTitle) {
      if (rawUrl.includes('1365884') || rawUrl.toLowerCase().includes('call-my-agent')) {
        defaultTitle = 'Call My Agent! The Movie (2026)';
      } else if (isCinemaOs) {
        defaultTitle = `CinemaOS ${mediaType === 'tv' ? `Series (S${season}E${episode})` : 'Movie'} #${extractedTmdbId || 'Stream'}`;
      } else if (isYt) {
        defaultTitle = 'YouTube Video';
      } else if (videoType === 'embed') {
        defaultTitle = 'Cinema Movie Stream';
      } else {
        defaultTitle = 'Custom Video Stream';
      }
    }

    const source = {
      url: rawUrl,
      title: defaultTitle,
      type: videoType,
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

    const id = Date.now() + Math.random();
    const topPos = Math.floor(Math.random() * 60) + 15; // Random height percentage
    setDanmakuComments((prev) => [...prev.slice(-15), { id, text, top: topPos, from: currentNickname }]);
    setTimeout(() => {
      setDanmakuComments((prev) => prev.filter((c) => c.id !== id));
    }, 8000);

    // Send to in-room chat as well
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
            <span className="watch-party-video-title" title={videoSource?.title}>
              {videoSource?.title || 'Select a Movie or Video'}
            </span>
          </div>

          {/* Recipient / Partner Sync Status Pill */}
          {recipientUser && (
            <div className={`watch-party-partner-pill ${isBuffering ? 'buffering' : ''}`}>
              <Icon
                icon={isBuffering ? 'line-md:loading-loop' : 'solar:users-group-rounded-bold-duotone'}
                width="16"
              />
              <span>
                {recipientUser.nickname}: {isBuffering ? 'Buffering...' : 'In Perfect Sync'}
              </span>
            </div>
          )}

          {/* Header Controls */}
          <div className="watch-party-header-actions">
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

        {/* Server / Mirror Switcher Bar for Cinema / Embed Streams */}
        {(videoSource?.type === 'embed' || videoSource?.tmdbId || videoSource?.url?.includes('cinemaos') || videoSource?.url?.includes('1365884')) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              background: 'rgba(0, 0, 0, 0.75)',
              borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
              fontSize: '0.78rem',
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#00a884', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <Icon icon="solar:server-square-bold-duotone" width="16" />
              <span>Movie Stream:</span>
            </span>

            <button
              type="button"
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                background: videoSource.url?.includes('cinemaos.live') ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: videoSource.url?.includes('cinemaos.live') ? '#00a884' : '#e9edef',
                border: videoSource.url?.includes('cinemaos.live') ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                const id = videoSource.tmdbId || '1365884';
                changeVideo({
                  ...videoSource,
                  url: `https://cinemaos.live/watch/movie/${id}`,
                  type: 'embed',
                });
              }}
            >
              CinemaOS (Direct)
            </button>

            <button
              type="button"
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                background: videoSource.url?.includes('vidlink.pro') ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: videoSource.url?.includes('vidlink.pro') ? '#00a884' : '#e9edef',
                border: videoSource.url?.includes('vidlink.pro') ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                const id = videoSource.tmdbId || '1365884';
                changeVideo({
                  ...videoSource,
                  url: `https://vidlink.pro/movie/${id}`,
                  type: 'embed',
                });
              }}
            >
              VidLink (Clean Embed)
            </button>

            <button
              type="button"
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                background: videoSource.url?.includes('vidsrc.pro') ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: videoSource.url?.includes('vidsrc.pro') ? '#00a884' : '#e9edef',
                border: videoSource.url?.includes('vidsrc.pro') ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                const id = videoSource.tmdbId || '1365884';
                changeVideo({
                  ...videoSource,
                  url: `https://vidsrc.pro/embed/movie/${id}`,
                  type: 'embed',
                });
              }}
            >
              VidSrc
            </button>

            <button
              type="button"
              style={{
                padding: '3px 10px',
                fontSize: '0.75rem',
                background: videoSource.url?.includes('multiembed.mov') ? 'rgba(0, 168, 132, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: videoSource.url?.includes('multiembed.mov') ? '#00a884' : '#e9edef',
                border: videoSource.url?.includes('multiembed.mov') ? '1px solid #00a884' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                const id = videoSource.tmdbId || '1365884';
                changeVideo({
                  ...videoSource,
                  url: `https://multiembed.mov/?video_id=${id}&tmdb=1`,
                  type: 'embed',
                });
              }}
            >
              MultiEmbed
            </button>

            <a
              href={videoSource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 'auto',
                color: '#00a884',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
              }}
              title="Open stream in a new tab if iframe playback is restricted by browser"
            >
              <span>Open in New Tab</span>
              <Icon icon="solar:arrow-right-up-bold" width="12" />
            </a>
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
              src={videoSource.url}
              className="watch-party-yt-iframe"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              title={videoSource.title || 'Movie Watch Party'}
            />
          ) : (
            <div style={{ color: '#8696a0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Icon icon="solar:clapperboard-play-bold-duotone" width="48" style={{ color: '#00a884' }} />
              <span>Paste a video or YouTube URL to start watching together</span>
            </div>
          )}

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
              {danmakuComments.map((c) => (
                <div
                  key={c.id}
                  className="watch-party-danmaku-chip"
                  style={{ top: `${c.top}%` }}
                >
                  <span style={{ color: '#00a884', marginRight: '6px' }}>{c.from}:</span>
                  <span>{c.text}</span>
                </div>
              ))}
            </AnimatePresence>
          </div>
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

        {/* Source Selection Drawer (Custom URL Input) */}
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
                  placeholder="Paste YouTube link, cinemaos movie URL, or video stream (.mp4, .m3u8)..."
                  value={customInputUrl}
                  onChange={(e) => setCustomInputUrl(e.target.value)}
                  required
                  autoFocus
                />
                <input
                  type="text"
                  className="custom-url-input"
                  style={{ flex: 0.6 }}
                  placeholder="Movie Title (Optional)"
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
