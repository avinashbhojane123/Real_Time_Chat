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
              controlsList="nodownload"
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
            <div
              style={{
                position: 'relative',
                width: '100%',
                padding: '48px 24px',
                background: 'linear-gradient(135deg, #111b21 0%, #1a162b 50%, #201124 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 8px 30px rgba(225, 48, 108, 0.5)',
                  marginBottom: '16px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
                  play_circle
                </span>
              </div>

              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e9edef', marginBottom: '6px' }}>
                {title || 'Instagram Reel'}
              </div>

              <div style={{ fontSize: '0.82rem', color: '#8696a0', marginBottom: '24px', maxWidth: '340px' }}>
                Watch this Reel directly on Instagram in full high definition with original audio.
              </div>

              {cleanUrl && (
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(220, 39, 67, 0.4)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
                  <span>Watch on Instagram</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </AnimatedModal>
  );
}

