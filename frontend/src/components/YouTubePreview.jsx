import { useState, useEffect } from 'react';
import axios from 'axios';
import VideoLightboxModal from './VideoLightboxModal';

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

  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  const embedUrl = `https://www.youtube.com/embed/${ytData.videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${ytData.videoId}/hqdefault.jpg`;

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ytData.cleanUrl);
    if (onCopySuccess) onCopySuccess('YouTube link copied!');
  };

  return (
    <>
      <div
        style={{
          marginTop: '8px',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#1f2c34',
          border: '1px solid rgba(134, 150, 160, 0.15)',
          maxWidth: '380px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        {/* WhatsApp Card Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#ff4e4e', fontWeight: 700 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              play_circle
            </span>
            <span>YouTube Video</span>
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
              href={ytData.cleanUrl}
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

        {/* Thumbnail / Embed Viewport */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000' }}>
          {isPlaying ? (
            <iframe
              src={`${embedUrl}?autoplay=1&rel=0`}
              title={meta?.title || 'YouTube Player'}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} onClick={() => setIsPlaying(true)}>
              <img
                src={thumbnailUrl}
                alt={meta?.title || 'YouTube Thumbnail'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ff0000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', marginLeft: '2px' }}>
                    play_arrow
                  </span>
                </div>
              </div>

              {/* Lightbox Pop-Out Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Watch in Lightbox"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  aspect_ratio
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Video Info */}
        {meta && (
          <div style={{ padding: '8px 10px', backgroundColor: '#1f2c34' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e9edef', lineHeight: '1.3' }}>
              {meta.title}
            </div>
            {meta.author_name && (
              <div style={{ fontSize: '0.72rem', color: '#8696a0', marginTop: '2px' }}>
                {meta.author_name}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <VideoLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        type="youtube"
        embedUrl={embedUrl}
        cleanUrl={ytData.cleanUrl}
        title={meta?.title}
      />
    </>
  );
}
