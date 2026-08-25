import { useEffect } from 'react';
import AnimatedModal from './animated/AnimatedModal';

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

  const isInstagram = type === 'instagram';

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={isInstagram ? '460px' : '900px'}
      enableDragDismiss={true}
      zIndex={99999}
      backdropStyle={{
        backgroundColor: 'rgba(11, 20, 26, 0.94)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxHeight: '90vh',
          backgroundColor: '#111b21',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(134, 150, 160, 0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* Modal Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: '#202c33',
            borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              className="material-symbols-outlined"
              style={{
                color: isInstagram ? '#e1306c' : '#ff0000',
                fontSize: '22px',
              }}
            >
              {isInstagram ? 'smart_display' : 'play_circle'}
            </span>
            <span
              style={{
                color: '#e9edef',
                fontSize: '0.9rem',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title || (isInstagram ? 'Instagram Reel' : 'YouTube Video')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {cleanUrl && (
              <a
                href={cleanUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#00a884',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(0, 168, 132, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                <span>Open Link</span>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  open_in_new
                </span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8696a0',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Close (Esc)"
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
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
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
          ) : videoSrc ? (
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
            <div style={{ position: 'relative', width: '100%', height: '560px', overflow: 'hidden', backgroundColor: '#000' }}>
              <iframe
                src={embedUrl}
                title="Instagram Reel Player"
                style={{
                  width: '100%',
                  height: '630px',
                  marginTop: '-56px',
                  border: 0,
                  overflow: 'hidden',
                }}
                scrolling="no"
                allowTransparency="true"
              />
            </div>
          )}
        </div>
      </div>
    </AnimatedModal>
  );
}

