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

    if (audioRef.current && audioSrc && !audioRef.current.paused) {
      const targetAudioTime = videoRef.current.currentTime + audioOffset;
      const diff = Math.abs(audioRef.current.currentTime - targetAudioTime);
      if (diff > 0.35) {
        audioRef.current.currentTime = targetAudioTime;
      }
    }
  };

  const handleVideoError = () => {
    setHasVideoError(true);
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(igData.cleanUrl);
    if (onCopySuccess) onCopySuccess('Instagram link copied!');
  };

  return (
    <div
      style={{
        marginTop: '8px',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#1f2c34',
        border: '1px solid rgba(134, 150, 160, 0.15)',
        maxWidth: '360px',
        width: '100%',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      {/* WhatsApp Header Tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          backgroundColor: '#182229',
          borderBottom: '1px solid rgba(134, 150, 160, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#e1306c', fontWeight: 700 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            smart_display
          </span>
          <span>Instagram {igData.type}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            title="Copy Link"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              content_copy
            </span>
            <span>Copy</span>
          </button>
          <a
            href={igData.cleanUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#00a884', fontSize: '0.7rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              open_in_new
            </span>
          </a>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111b21', color: '#8696a0', fontSize: '0.75rem' }}>
          Loading Instagram preview...
        </div>
      )}

      {/* Media Player */}
      {!loading && isVideoPost && (
        <div
          style={{ position: 'relative', width: '100%', backgroundColor: '#000', cursor: 'pointer', overflow: 'hidden', maxHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={togglePlay}
        >
          {audioSrc && (
            <audio ref={audioRef} src={audioSrc} playsInline loop preload="auto" style={{ display: 'none' }} />
          )}

          {/* Lightbox Pop-Out */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ff7597' }}>
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
            style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', backgroundColor: '#000' }}
          />

          {!isPlaying && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#e1306c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '26px', marginLeft: '2px' }}>
                  play_arrow
                </span>
              </div>
            </div>
          )}

          {isPlaying && isMuted && (
            <button
              type="button"
              onClick={handleUnmute}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#e1306c' }}>
                volume_off
              </span>
              <span>Unmute</span>
            </button>
          )}
        </div>
      )}

      {/* Image Post View */}
      {!loading && !isVideoPost && posterSrc && !hasVideoError && (
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', maxHeight: '360px', overflow: 'hidden' }}>
          <img src={posterSrc} alt={data?.caption || 'Instagram Post'} style={{ width: '100%', maxHeight: '360px', objectFit: 'cover' }} />
        </div>
      )}

      {/* Embed Fallback */}
      {!loading && (!posterSrc || hasVideoError) && (
        <div style={{ position: 'relative', width: '100%', height: '420px', backgroundColor: '#000', overflow: 'hidden' }}>
          <iframe
            src={`https://www.instagram.com/p/${igData.shortcode}/embed/`}
            title="Instagram Reel Player"
            style={{ width: '100%', height: '500px', marginTop: '-56px', border: 0 }}
            scrolling="no"
          />
        </div>
      )}

      {/* Metadata & Caption */}
      {!loading && (data?.metrics?.likeCount != null || data?.caption) && (
        <div style={{ padding: '8px 10px', backgroundColor: '#1f2c34', borderTop: '1px solid rgba(134, 150, 160, 0.1)' }}>
          {data?.metrics?.likeCount != null && (
            <div style={{ fontSize: '0.72rem', color: '#ff7597', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>favorite</span>
              <span>{formatNumber(data.metrics.likeCount)} likes</span>
            </div>
          )}
          {data?.caption && (
            <div style={{ fontSize: '0.76rem', color: '#e9edef', lineHeight: '1.35' }}>
              <span style={{ display: showFullCaption ? 'inline' : '-webkit-box', WebkitLineClamp: showFullCaption ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {data.caption}
              </span>
              {data.caption.length > 90 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullCaption(!showFullCaption);
                  }}
                  style={{ background: 'none', border: 'none', color: '#00a884', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: '0 4px' }}
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
