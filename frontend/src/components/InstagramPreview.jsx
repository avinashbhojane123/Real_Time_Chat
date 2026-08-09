import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiConfig';
import { parseInstagramUrl } from '../utils/instagram';

export default function InstagramPreview({ messageText, baseUrl, onCopySuccess }) {
  const instaData = parseInstagramUrl(messageText);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [error, setError] = useState(false);

  const shortcode = instaData?.shortcode;

  useEffect(() => {
    if (!shortcode) return;
    let isMounted = true;

    const fetchMeta = async () => {
      try {
        setLoading(true);
        setError(false);
        const cleanApiUrl = (baseUrl || getApiBaseUrl()).replace(/\/+$/, '');
        const targetUrl = instaData?.cleanUrl || `https://www.instagram.com/reel/${shortcode}/`;

        const res = await axios.get(`${cleanApiUrl}/instagram/view`, {
          params: { url: targetUrl },
          timeout: 10000,
        });

        if (isMounted && res.data) {
          setMeta(res.data);
        }
      } catch (err) {
        console.log('Instagram metadata fetch notice:', err?.message || err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMeta();

    return () => {
      isMounted = false;
    };
  }, [shortcode, baseUrl, instaData?.cleanUrl]);

  if (!instaData || !shortcode) return null;

  const cleanApiUrl = (baseUrl || getApiBaseUrl()).replace(/\/+$/, '');
  const baseHost = cleanApiUrl.replace(/\/api\/?$/, '');

  const proxyUrl = meta?.proxyVideoUrl
    ? (meta.proxyVideoUrl.startsWith('http') ? meta.proxyVideoUrl : `${baseHost}${meta.proxyVideoUrl}`)
    : null;

  const posterUrl = meta?.proxyThumbnailUrl
    ? (meta.proxyThumbnailUrl.startsWith('http') ? meta.proxyThumbnailUrl : `${baseHost}${meta.proxyThumbnailUrl}`)
    : meta?.thumbnailUrl;

  const cleanUrl = instaData.cleanUrl || `https://www.instagram.com/reel/${shortcode}/`;
  const authorName = meta?.author?.username || meta?.username || (meta?.author?.name) || null;
  const isPost = instaData.type === 'post' || meta?.mediaType === 'post';

  const handleCopyCleanLink = (e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(cleanUrl);
    setCopiedLink(true);
    if (onCopySuccess) onCopySuccess('Clean Instagram link copied!');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyText = (e) => {
    if (e) e.stopPropagation();
    const textToCopy = meta?.caption
      ? `${meta.caption}\n${cleanUrl}`
      : (authorName ? `@${authorName}\n${cleanUrl}` : cleanUrl);
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    if (onCopySuccess) onCopySuccess('Instagram caption & link copied!');
    setTimeout(() => setCopiedText(false), 2200);
  };

  const handleRetry = (e) => {
    if (e) e.stopPropagation();
    setLoading(true);
    setError(false);
    const targetUrl = instaData?.cleanUrl || `https://www.instagram.com/reel/${shortcode}/`;
    axios.get(`${cleanApiUrl}/instagram/view`, {
      params: { url: targetUrl },
      timeout: 10000,
    })
      .then((res) => {
        if (res.data) setMeta(res.data);
      })
      .catch((err) => {
        console.log('Retry fetch notice:', err?.message || err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div
      className="insta-preview-card"
      style={{
        marginTop: '10px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(225, 48, 108, 0.3)',
        backgroundColor: '#0a0a0e',
        maxWidth: '380px',
        width: '100%',
        position: 'relative',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: 'rgba(24, 18, 26, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f0f0f5', fontWeight: 600 }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '18px',
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}
          >
            {isPost ? 'photo_camera' : 'movie'}
          </span>
          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {authorName ? `@${authorName}` : (isPost ? 'Instagram Post' : 'Instagram Reel')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="m3-btn m3-btn-outlined"
            type="button"
            style={{
              padding: '2px 8px',
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
            onClick={handleCopyCleanLink}
            title="Copy clean link without tracking tags"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
              {copiedLink ? 'check' : 'link'}
            </span>
            {copiedLink ? 'Copied' : 'Copy Link'}
          </button>

          <button
            className="m3-btn m3-btn-outlined"
            type="button"
            style={{
              padding: '2px 8px',
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
            onClick={handleCopyText}
            title="Copy caption text & link"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
              {copiedText ? 'check' : 'content_copy'}
            </span>
            {copiedText ? 'Copied' : 'Text'}
          </button>
        </div>
      </div>

      {/* Main Video/Media Body - Account-Free and Zero Navigation Escapes */}
      {proxyUrl ? (
        /* 1. Direct HTML5 Native Video Stream Player (Never navigates away) */
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000' }}>
          <video
            src={proxyUrl}
            controls
            loop
            playsInline
            poster={posterUrl}
            style={{
              width: '100%',
              maxHeight: '460px',
              display: 'block',
              objectFit: 'contain',
              backgroundColor: '#000',
            }}
          />
        </div>
      ) : loading ? (
        /* 2. Loading State */
        <div
          style={{
            height: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: '#121118',
            color: '#e2e2e6',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '36px',
              color: '#e1306c',
              animation: 'spin 1.5s linear infinite',
            }}
          >
            sync
          </span>
          <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Resolving Instagram Media Preview...</span>
        </div>
      ) : showEmbed ? (
        /* 3. Securely Sandboxed Embed (Strictly disallows top-navigation and popups) */
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', overflow: 'hidden' }}>
          <iframe
            src={`https://www.instagram.com/p/${shortcode}/embed/captioned/`}
            style={{ width: '100%', height: '440px', border: 'none', background: '#000' }}
            title="Instagram Media Secure Sandboxed Preview"
            allowTransparency="true"
            allow="encrypted-media"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        /* 4. Interactive In-App Card with Poster & Play Toggle (Prevents Accidental Navigation) */
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            backgroundColor: '#131118',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {posterUrl && (
            <img
              src={posterUrl}
              alt="Instagram Preview"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.35,
                filter: 'blur(4px)',
                transform: 'scale(1.05)',
              }}
            />
          )}

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(225, 48, 108, 0.4)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onClick={() => setShowEmbed(true)}
              title="Click to load in-app sandboxed preview"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ffffff' }}>
                play_arrow
              </span>
            </div>

            <div style={{ maxWidth: '280px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                {authorName ? `@${authorName}` : (isPost ? 'Instagram Post' : 'Instagram Reel')}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#c7c5d0', lineHeight: 1.4 }}>
                {meta?.caption
                  ? (meta.caption.length > 90 ? `${meta.caption.slice(0, 90)}...` : meta.caption)
                  : `Preview shortcode: ${shortcode}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="m3-btn m3-btn-filled"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                }}
                onClick={() => setShowEmbed(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                View In-App Preview
              </button>

              {error && (
                <button
                  type="button"
                  className="m3-btn m3-btn-outlined"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    borderRadius: '12px',
                    color: '#e2e2e6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={handleRetry}
                  title="Retry fetching media"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Caption & Account-Free Indicator Footer */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(20, 18, 24, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {meta?.caption ? (
            <p
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: '#c7c5d0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.35,
              }}
            >
              {meta.caption}
            </p>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--m3-on-surface-variant)' }}>
              {loading ? 'Resolving Instagram media...' : `Reel • ${shortcode}`}
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: '0.68rem',
            color: '#81c784',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
            check_circle
          </span>
          In-Chat View
        </span>
      </div>
    </div>
  );
}
