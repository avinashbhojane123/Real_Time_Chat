import { useEffect } from 'react';

export default function VideoLightboxModal({
  isOpen,
  onClose,
  type = 'youtube', // 'youtube' | 'instagram'
  videoSrc,
  embedUrl,
  posterSrc,
  title,
  cleanUrl,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      {/* Container - Stop propagation so clicking inside video won't close modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: type === 'instagram' ? '460px' : '900px',
          maxHeight: '90vh',
          backgroundColor: '#0a0a0d',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow:
            type === 'instagram'
              ? '0 12px 40px rgba(225, 48, 108, 0.3)'
              : '0 12px 40px rgba(255, 0, 0, 0.3)',
          border:
            type === 'instagram'
              ? '1px solid rgba(225, 48, 108, 0.3)'
              : '1px solid rgba(255, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor:
              type === 'instagram'
                ? 'rgba(225, 48, 108, 0.15)'
                : 'rgba(255, 0, 0, 0.15)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: type === 'instagram' ? '#e1306c' : '#ff0000',
                fontSize: '22px',
              }}
            >
              {type === 'instagram' ? 'smart_display' : 'play_circle'}
            </span>
            <span
              style={{
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title || (type === 'instagram' ? 'Instagram Live Reel' : 'YouTube Video')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {cleanUrl && (
              <a
                href={cleanUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: type === 'instagram' ? '#ff7597' : '#ff6b6b',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                }}
              >
                <span>Open Link</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  open_in_new
                </span>
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Close modal (Esc)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Modal Video Viewport */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '320px',
          }}
        >
          {type === 'youtube' ? (
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingTop: '56.25%', // 16:9 Aspect Ratio
              }}
            >
              <iframe
                src={`${embedUrl}?autoplay=1&rel=0`}
                title={title || 'YouTube Player'}
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
          ) : (
            /* Instagram HTML5 Video or Embed */
            videoSrc ? (
              <video
                src={videoSrc}
                poster={posterSrc}
                autoPlay
                controls
                playsInline
                loop
                style={{
                  width: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  backgroundColor: '#000',
                }}
              />
            ) : (
              <iframe
                src={embedUrl}
                title="Instagram Reel Player"
                style={{
                  width: '100%',
                  height: '520px',
                  border: 0,
                  overflow: 'hidden',
                }}
                scrolling="no"
                allowTransparency="true"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
