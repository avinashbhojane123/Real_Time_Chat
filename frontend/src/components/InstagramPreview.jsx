import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiConfig';

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

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  // Video playback states
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
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

  if (!igData) return null;

  const handleCopyLink = (e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(igData.cleanUrl);
    setCopiedLink(true);
    if (onCopySuccess) onCopySuccess('Instagram link copied!');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyCaption = (e) => {
    if (e) e.stopPropagation();
    const text = data?.caption
      ? `${data.caption}\n\n${igData.cleanUrl}`
      : igData.cleanUrl;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    if (onCopySuccess) onCopySuccess('Caption copied to clipboard!');
    setTimeout(() => setCopiedText(false), 2200);
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(progress);
  };

  const handleVideoError = () => {
    console.warn('Direct Instagram video playback error, falling back to embed');
    setHasVideoError(true);
  };

  // Video source: prioritize proxyVideoUrl to bypass Instagram CORS / CDN referrer blocks
  const videoSrc = data?.proxyVideoUrl
    ? (data.proxyVideoUrl.startsWith('http')
        ? data.proxyVideoUrl
        : `${apiBaseUrl.replace(/\/api\/?$/, '')}${data.proxyVideoUrl}`)
    : data?.videoUrl;

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

  return (
    <div
      className="ig-preview-card"
      style={{
        marginTop: '10px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(225, 48, 108, 0.3)',
        background: 'linear-gradient(180deg, rgba(26, 16, 28, 0.95) 0%, rgba(15, 12, 18, 0.98) 100%)',
        maxWidth: '380px',
        width: '100%',
        boxShadow: '0 8px 24px rgba(225, 48, 108, 0.15), 0 4px 16px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'linear-gradient(90deg, rgba(225, 48, 108, 0.15) 0%, rgba(131, 58, 180, 0.15) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {/* Instagram Gradient Logo Icon */}
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(225, 48, 108, 0.4)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#fff' }}>
              play_arrow
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Instagram {igData.type}</span>
            </div>
            {data?.author?.username && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                @{data.author.username}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          <button
            type="button"
            className="m3-btn m3-btn-outlined"
            style={{
              padding: '3px 8px',
              fontSize: '0.68rem',
              borderRadius: '8px',
              color: copiedLink ? '#81c784' : '#fff',
              borderColor: copiedLink ? '#81c784' : 'rgba(255,255,255,0.2)',
              backgroundColor: copiedLink ? 'rgba(129, 199, 132, 0.15)' : 'transparent',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={handleCopyLink}
            title="Copy Instagram link"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              {copiedLink ? 'check' : 'link'}
            </span>
            {copiedLink ? 'Copied' : 'Link'}
          </button>

          <button
            type="button"
            className="m3-btn m3-btn-outlined"
            style={{
              padding: '3px 8px',
              fontSize: '0.68rem',
              borderRadius: '8px',
              color: copiedText ? '#81c784' : '#fff',
              borderColor: copiedText ? '#81c784' : 'rgba(255,255,255,0.2)',
              backgroundColor: copiedText ? 'rgba(129, 199, 132, 0.15)' : 'transparent',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={handleCopyCaption}
            title="Copy caption"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
              {copiedText ? 'check' : 'content_copy'}
            </span>
            {copiedText ? 'Copied' : 'Caption'}
          </button>
        </div>
      </div>

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
          <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)' }}>
            Loading Instagram preview...
          </span>
        </div>
      )}

      {/* Media Player or Embed View */}
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
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            playsInline
            loop
            muted={isMuted}
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
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#fff', marginLeft: '3px' }}>
                play_arrow
              </span>
            </div>
          )}

          {/* Bottom Floating Video Controls Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '6px 10px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Play/Pause Mini Toggle */}
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
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Progress Bar */}
            <div
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${videoProgress}%`,
                  background: 'linear-gradient(90deg, #f09433, #e1306c)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
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
        <div style={{ position: 'relative', width: '100%', minHeight: '380px', backgroundColor: '#000' }}>
          <iframe
            src={`https://www.instagram.com/p/${igData.shortcode}/embed/captioned/`}
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
      {!loading && (
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
          {/* Author & Stats Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt={data?.author?.username || 'User'}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(225, 48, 108, 0.5)',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', color: '#e1306c' }}
                >
                  account_circle
                </span>
              )}
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#f0f0f5' }}>
                {data?.author?.fullName || data?.author?.username || 'Instagram User'}
              </span>
            </div>

            {/* Metrics Pills (Likes, Comments) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {data?.metrics?.likeCount !== undefined && data?.metrics?.likeCount !== null && (
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
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                    favorite
                  </span>
                  <span>{formatNumber(data.metrics.likeCount)}</span>
                </div>
              )}

              {data?.metrics?.commentCount !== undefined && data?.metrics?.commentCount !== null && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.7rem',
                    color: '#a0a0b0',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                    chat_bubble
                  </span>
                  <span>{formatNumber(data.metrics.commentCount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Caption Text */}
          {data?.caption && (
            <div style={{ fontSize: '0.76rem', color: '#d5d5e2', lineHeight: '1.35' }}>
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

          {/* Open in Instagram Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
            <a
              href={igData.cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.7rem',
                color: '#e1306c',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 600,
              }}
            >
              <span>Watch on Instagram</span>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                open_in_new
              </span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
