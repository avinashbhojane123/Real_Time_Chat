import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiConfig';
import VideoLightboxModal from './VideoLightboxModal';

/**
 * Extract Instagram shortcode and clean URL from message text
 */
export function parseInstagramUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const igRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:(reel|reels|p|tv|share\/reel))\/([a-zA-Z0-9_-]+)/i;
  const match = text.match(igRegex);
  if (match && match[2]) {
    const rawType = match[1] === 'reels' ? 'reel' : match[1];
    const shortcode = match[2];
    const isReel = rawType === 'reel' || rawType === 'share/reel';
    return {
      shortcode,
      fullUrl: match[0],
      cleanUrl: `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${shortcode}/`,
      type: isReel ? 'Reel' : 'Post',
    };
  }
  return null;
}

function formatNumber(num) {
  if (!num || isNaN(num)) return null;
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export default function InstagramPreview({ messageText, onCopySuccess }) {
  const igData = parseInstagramUrl(messageText);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Video & Audio playback states
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [videoProgress, setVideoProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const [durationStr, setDurationStr] = useState('0:00');
  const [hasVideoError, setHasVideoError] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    if (!igData?.cleanUrl) return;

    let isMounted = true;
    const fetchInstagramPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasVideoError(false);

        const res = await axios.get(
          `${apiBaseUrl}/instagram/preview?url=${encodeURIComponent(igData.cleanUrl)}`
        );

        if (isMounted && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.warn('Instagram preview fetch error:', err);
        if (isMounted) {
          setError('Could not load Instagram preview');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInstagramPreview();

    return () => {
      isMounted = false;
    };
  }, [igData?.cleanUrl, apiBaseUrl]);

  // Synchronize audio properties with DOM video & audio elements
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  if (!igData) return null;

  // Media sources
  const videoSrc = data?.proxyVideoUrl
    ? (data.proxyVideoUrl.startsWith('http')
        ? data.proxyVideoUrl
        : `${apiBaseUrl.replace(/\/api\/?$/, '')}${data.proxyVideoUrl}`)
    : data?.videoUrl;

  const rawAudioUrl = data?.audio?.proxyAudioUrl || data?.audio?.audioUrl;
  const audioSrc = rawAudioUrl
    ? (rawAudioUrl.startsWith('http')
        ? rawAudioUrl
        : `${apiBaseUrl.replace(/\/api\/?$/, '')}${rawAudioUrl}`)
    : null;

  const posterSrc = data?.proxyThumbnailUrl
    ? (data.proxyThumbnailUrl.startsWith('http')
        ? data.proxyThumbnailUrl
        : `${apiBaseUrl.replace(/\/api\/?$/, '')}${data.proxyThumbnailUrl}`)
    : data?.thumbnailUrl;

  const authorAvatar = data?.author?.proxyProfilePicUrl
    ? (data.author.proxyProfilePicUrl.startsWith('http')
        ? data.author.proxyProfilePicUrl
        : `${apiBaseUrl.replace(/\/api\/?$/, '')}${data.author.proxyProfilePicUrl}`)
    : data?.author?.profilePicUrl;

  const isVideoPost = data?.isVideo && videoSrc && !hasVideoError;



  const audioOffset = (data?.audio?.audioStartTimeMs || 0) / 1000;

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = volume;

      if (audioRef.current && audioSrc) {
        audioRef.current.currentTime =
          (videoRef.current.currentTime || 0) + audioOffset;
        audioRef.current.muted = isMuted;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {});
      }

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Autoplay sound blocked, fallback to muted:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch(() => {});
            }
          });
      }
    } else {
      videoRef.current.pause();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  const handleUnmute = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
    }
    if (audioRef.current && audioSrc) {
      audioRef.current.muted = false;
      audioRef.current.volume = 1.0;
      audioRef.current.currentTime =
        (videoRef.current ? videoRef.current.currentTime : 0) + audioOffset;
      audioRef.current.play().catch(() => {});
    }
    setIsMuted(false);
    setVolume(1.0);
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;

    if (audioRef.current && audioSrc) {
      audioRef.current.muted = nextMuted;
      if (!nextMuted && isPlaying) {
        audioRef.current.currentTime =
          videoRef.current.currentTime + audioOffset;
        audioRef.current.play().catch(() => {});
      }
    }

    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      videoRef.current.volume = 1.0;
      if (audioRef.current) audioRef.current.volume = 1.0;
      setVolume(1.0);
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      } else if (val === 0 && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    }
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val > 0 && isMuted) {
        audioRef.current.muted = false;
      } else if (val === 0 && !isMuted) {
        audioRef.current.muted = true;
      }
    }
  };

  const formatSec = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const progress =
      (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(progress);
    setCurrentTimeStr(formatSec(videoRef.current.currentTime));
    setDurationStr(formatSec(videoRef.current.duration));

    // Keep audio synced with video with start offset
    if (audioRef.current && audioSrc && !audioRef.current.paused) {
      const targetAudioTime = videoRef.current.currentTime + audioOffset;
      const diff = Math.abs(audioRef.current.currentTime - targetAudioTime);
      if (diff > 0.35) {
        audioRef.current.currentTime = targetAudioTime;
      }
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!videoRef.current || !videoRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    if (audioRef.current && audioSrc) {
      audioRef.current.currentTime = newTime + audioOffset;
    }
  };

  const handleVideoError = () => {
    console.warn('Direct Instagram video playback error, falling back to embed');
    setHasVideoError(true);
  };

  return (
    <div
      className="ig-preview-card"
      style={{
        marginTop: '10px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(225, 48, 108, 0.3)',
        background:
          'linear-gradient(180deg, rgba(26, 16, 28, 0.95) 0%, rgba(15, 12, 18, 0.98) 100%)',
        maxWidth: '380px',
        width: '100%',
        boxShadow:
          '0 8px 24px rgba(225, 48, 108, 0.15), 0 4px 16px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
      }}
    >


      {/* Loading Skeleton */}
      {loading && (
        <div
          style={{
            height: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '3px solid rgba(225, 48, 108, 0.2)',
              borderTopColor: '#e1306c',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span
            style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)' }}
          >
            Loading Instagram preview...
          </span>
        </div>
      )}

      {/* Media Player View */}
      {!loading && isVideoPost && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            cursor: 'pointer',
            overflow: 'hidden',
            maxHeight: '440px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={togglePlay}
        >
          {/* Synchronized Background Audio Stream for Reels with Instagram Music Library */}
          {audioSrc && (
            <audio
              ref={audioRef}
              src={audioSrc}
              playsInline
              loop
              preload="auto"
              style={{ display: 'none' }}
            />
          )}

          {/* Floating Pop-Out Lightbox Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '6px 10px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(6px)',
              zIndex: 10,
            }}
            title="Expand in full-screen modal"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '15px', color: '#ff7597' }}
            >
              open_in_full
            </span>
            <span>Pop-Out</span>
          </button>

          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            playsInline
            loop
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={handleVideoError}
            style={{
              width: '100%',
              maxHeight: '440px',
              objectFit: 'contain',
              display: 'block',
              backgroundColor: '#000',
            }}
          />

          {/* Big Play / Pause Overlay Icon */}
          {!isPlaying && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '2px solid rgba(255, 255, 255, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'none',
                transition: 'transform 0.2s ease',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '34px', color: '#fff', marginLeft: '3px' }}
              >
                play_arrow
              </span>
            </div>
          )}

          {/* Prominent Floating "Tap to Unmute" Badge when playing but muted */}
          {isPlaying && isMuted && (
            <button
              type="button"
              onClick={handleUnmute}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(6px)',
                zIndex: 10,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', color: '#ff4b72' }}
              >
                volume_off
              </span>
              <span>Tap to Unmute</span>
            </button>
          )}

          {/* Bottom Floating Video Controls Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px 12px',
              background:
                'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrubber / Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
              }}
              onClick={handleSeek}
            >
              <div
                style={{
                  height: '100%',
                  width: `${videoProgress}%`,
                  background:
                    'linear-gradient(90deg, #f09433, #dc2743, #bc1888)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>

            {/* Bottom Row: Play/Pause, Time, Volume Slider, Mute */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Play/Pause Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '22px' }}
                  >
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                {/* Time Display */}
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontFamily: 'monospace',
                  }}
                >
                  {currentTimeStr} / {durationStr}
                </span>
              </div>

              {/* Volume & Audio Controls */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {/* Mute/Unmute Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isMuted ? '#ff4b72' : '#fff',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '20px' }}
                  >
                    {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
                  </span>
                </button>

                {/* Volume Slider */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{
                    width: '60px',
                    height: '4px',
                    accentColor: '#e1306c',
                    cursor: 'pointer',
                  }}
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Post View */}
      {!loading && !isVideoPost && posterSrc && !hasVideoError && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            maxHeight: '400px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={posterSrc}
            alt={data?.caption || 'Instagram Post'}
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Embed Fallback Iframe (if direct video/image failed or embed format) */}
      {!loading && (!posterSrc || hasVideoError) && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '380px',
            backgroundColor: '#000',
          }}
        >
          <iframe
            src={`https://www.instagram.com/p/${igData.shortcode}/embed/`}
            title="Instagram Reel Player"
            style={{
              width: '100%',
              height: '420px',
              border: 0,
              overflow: 'hidden',
            }}
            scrolling="no"
            allowTransparency="true"
          />
        </div>
      )}

      {/* Post Metadata & Caption Footer */}
      {!loading &&
        (data?.metrics?.likeCount != null ||
          data?.metrics?.commentCount != null ||
          data?.caption) && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(18, 14, 22, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >

            {/* Metrics Pills (Likes, Comments) */}
            {(data?.metrics?.likeCount != null ||
              data?.metrics?.commentCount != null) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
                {data?.metrics?.likeCount !== undefined &&
                  data?.metrics?.likeCount !== null && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.7rem',
                        color: '#ff4b72',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '13px' }}
                      >
                        favorite
                      </span>
                      <span>{formatNumber(data.metrics.likeCount)}</span>
                    </div>
                  )}

                {data?.metrics?.commentCount !== undefined &&
                  data?.metrics?.commentCount !== null && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.7rem',
                        color: '#a0a0b0',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '13px' }}
                      >
                        chat_bubble
                      </span>
                      <span>{formatNumber(data.metrics.commentCount)}</span>
                    </div>
                  )}
              </div>
            )}

            {/* Caption Text */}
            {data?.caption && (
              <div
                style={{
                  fontSize: '0.76rem',
                  color: '#d5d5e2',
                  lineHeight: '1.35',
                }}
              >
                <span
                  style={{
                    display: showFullCaption ? 'inline' : '-webkit-box',
                    WebkitLineClamp: showFullCaption ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {data.caption}
                </span>
                {data.caption.length > 90 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullCaption(!showFullCaption);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e1306c',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0 4px',
                      marginLeft: '2px',
                    }}
                  >
                    {showFullCaption ? 'less' : 'more'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      {/* Lightbox Modal */}
      <VideoLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        type="instagram"
        videoSrc={videoSrc}
        embedUrl={`https://www.instagram.com/p/${igData.shortcode}/embed/`}
        posterSrc={posterSrc}
        title={data?.caption || `Instagram ${igData.type}`}
        cleanUrl={igData.cleanUrl}
      />
    </div>
  );
}
