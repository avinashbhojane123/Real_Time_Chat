import { useState, useEffect } from 'react';
import axios from 'axios';

export function parseYouTubeUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = text.match(ytRegex);
  if (match && match[1]) {
    return {
      videoId: match[1],
      fullUrl: match[0],
      cleanUrl: `https://www.youtube.com/watch?v=${match[1]}`,
    };
  }
  return null;
}

export default function YouTubePreview({ messageText, onCopySuccess }) {
  const ytData = parseYouTubeUrl(messageText);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!ytData?.cleanUrl) return;
    let isMounted = true;
    const fetchOEmbed = async () => {
      try {
        setLoadingMeta(true);
        const res = await axios.get(
          `https://noembed.com/embed?url=${encodeURIComponent(ytData.cleanUrl)}`
        );
        if (isMounted && res.data && res.data.title) {
          setMeta(res.data);
        }
      } catch (e) {
        console.log('YouTube oEmbed fetch error', e);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };
    fetchOEmbed();
    return () => {
      isMounted = false;
    };
  }, [ytData?.cleanUrl]);

  if (!ytData) return null;

  const handleCopyCleanLink = (e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(ytData.cleanUrl);
    setCopiedLink(true);
    if (onCopySuccess) onCopySuccess('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyText = (e) => {
    if (e) e.stopPropagation();
    const textToCopy = meta?.title ? `${meta.title}\n${ytData.cleanUrl}` : messageText;
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    if (onCopySuccess) onCopySuccess('Text copied to clipboard!');
    setTimeout(() => setCopiedText(false), 2200);
  };

  return (
    <div
      className="yt-preview-card"
      style={{
        marginTop: '10px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 0, 0, 0.25)',
        backgroundColor: '#0f0f13',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            color: '#ff4e4e',
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff0000' }}>
            play_circle
          </span>
          <span>YouTube Video</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="m3-btn m3-btn-outlined"
            type="button"
            style={{
              padding: '2px 10px',
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
            title="Copy clean YouTube link"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
              {copiedLink ? 'check' : 'link'}
            </span>
            {copiedLink ? 'Copied Link' : 'Copy Link'}
          </button>

          <button
            className="m3-btn m3-btn-outlined"
            type="button"
            style={{
              padding: '2px 10px',
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
            title="Copy video title & text"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
              {copiedText ? 'check' : 'content_copy'}
            </span>
            {copiedText ? 'Copied Text' : 'Copy Text'}
          </button>
        </div>
      </div>

      {/* Embedded Iframe Player */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytData.videoId}?autoplay=0&rel=0`}
          title={meta?.title || 'YouTube Video Player'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Meta Footer */}
      {(meta?.title || meta?.author_name || loadingMeta) && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(18, 18, 22, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {meta?.title && (
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#f0f0f5',
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                marginBottom: '4px',
              }}
            >
              {meta.title}
            </div>
          )}
          {meta?.author_name && (
            <div style={{ fontSize: '0.72rem', color: '#a0a0b0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ff4e4e' }}>
                account_circle
              </span>
              <span>{meta.author_name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
