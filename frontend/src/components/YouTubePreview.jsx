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


      {/* Embedded Iframe Player or Click-to-Play Thumbnail Cover */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          backgroundColor: '#000',
          cursor: isPlaying ? 'default' : 'pointer',
        }}
        onClick={() => {
          if (!isPlaying) setIsPlaying(true);
        }}
      >
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
            style={{ fontSize: '15px', color: '#ff6b6b' }}
          >
            open_in_full
          </span>
          <span>Pop-Out</span>
        </button>

        {isPlaying ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytData.videoId}?autoplay=1&rel=0`}
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
        ) : (
          /* Thumbnail Cover with Big Red Play Overlay */
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(https://img.youtube.com/vi/${ytData.videoId}/hqdefault.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 0, 0, 0.88)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(255, 0, 0, 0.6)',
                transition: 'transform 0.2s ease',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '36px', color: '#fff', marginLeft: '3px' }}
              >
                play_arrow
              </span>
            </div>
          </div>
        )}
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

      {/* Lightbox Modal */}
      <VideoLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        type="youtube"
        embedUrl={`https://www.youtube-nocookie.com/embed/${ytData.videoId}`}
        title={meta?.title || 'YouTube Video'}
        cleanUrl={ytData.cleanUrl}
      />
    </div>
  );
}
