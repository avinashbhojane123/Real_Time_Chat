import { useState, useEffect, useRef } from 'react';
import { parseYouTubeUrl } from './YouTubePreview';

export default function StatusViewerModal({
  statuses = [],
  initialIndex = 0,
  currentNickname,
  onClose,
  onViewStatus,
  onDeleteStatus,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const videoRef = useRef(null);

  const currentStatus = statuses[currentIndex];
  const isMyStatus = currentStatus?.nickname === currentNickname;

  // Mark current status as viewed by me
  useEffect(() => {
    if (currentStatus && onViewStatus) {
      onViewStatus(currentStatus.id);
    }
  }, [currentStatus?.id, onViewStatus]);

  // Handle timer auto-advance (5s default for text & image, video uses video duration)
  useEffect(() => {
    if (!currentStatus || isPaused) return;

    // Reset progress when index changes
    setProgress(0);

    const DURATION = currentStatus.type === 'video' ? 12000 : 5000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, currentStatus]);

  if (!currentStatus) return null;

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  // Extract link if status has URL
  const getLinkPreview = (text) => {
    if (!text) return null;
    const yt = parseYouTubeUrl(text);
    if (yt) {
      return {
        type: 'youtube',
        title: 'YouTube Video',
        url: yt.cleanUrl,
        icon: 'play_circle',
        badge: '#ff0000',
      };
    }
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const match = text.match(urlRegex);
    if (match && match[0]) {
      return {
        type: 'web',
        title: 'Open Link',
        url: match[0],
        icon: 'open_in_new',
        badge: '#00a884',
      };
    }
    return null;
  };

  const linkPreview = getLinkPreview(currentStatus.content);

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="status-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(12px)',
        userSelect: 'none',
      }}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Story Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          maxHeight: '840px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: currentStatus.bgColor || '#111b21',
          background: currentStatus.bgColor || 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Top Segmented Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '12px 12px 6px 12px',
            display: 'flex',
            gap: '4px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          }}
        >
          {statuses.map((st, i) => (
            <div
              key={st.id || i}
              style={{
                flex: 1,
                height: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#ffffff',
                  width:
                    i < currentIndex
                      ? '100%'
                      : i === currentIndex
                      ? `${progress}%`
                      : '0%',
                  transition: i === currentIndex ? 'width 50ms linear' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: 0,
            right: 0,
            zIndex: 10,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#25d366',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                border: '2px solid #fff',
              }}
            >
              {currentStatus.nickname?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                {currentStatus.nickname} {isMyStatus && '(You)'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>
                {formatTimestamp(currentStatus.createdAt)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isMyStatus && onDeleteStatus && (
              <button
                type="button"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ff5252',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteStatus(currentStatus.id);
                  handleNext();
                }}
                title="Delete status"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  delete
                </span>
              </button>
            )}

            <button
              type="button"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close status"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Story Main Media / Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '70px 20px 80px 20px',
          }}
        >
          {/* Navigation Click Zones */}
          <div
            style={{
              position: 'absolute',
              top: '70px',
              left: 0,
              bottom: '80px',
              width: '35%',
              zIndex: 5,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '70px',
              right: 0,
              bottom: '80px',
              width: '35%',
              zIndex: 5,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />

          {/* Render Text Status */}
          {currentStatus.type === 'text' && (
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                color: '#ffffff',
                fontSize: '1.4rem',
                fontWeight: 600,
                lineHeight: '1.5',
                padding: '24px',
                wordBreak: 'break-word',
                fontFamily: currentStatus.fontStyle || 'sans-serif',
              }}
            >
              {currentStatus.content}
            </div>
          )}

          {/* Render Image Status */}
          {currentStatus.type === 'image' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={currentStatus.mediaUrl}
                alt="Status Media"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80%',
                  objectFit: 'contain',
                  borderRadius: '12px',
                }}
              />
              {currentStatus.content && (
                <div
                  style={{
                    marginTop: '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '90%',
                  }}
                >
                  {currentStatus.content}
                </div>
              )}
            </div>
          )}

          {/* Render Video Status */}
          {currentStatus.type === 'video' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                src={currentStatus.mediaUrl}
                autoPlay
                playsInline
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '80%',
                  objectFit: 'contain',
                  borderRadius: '12px',
                }}
              />
              {currentStatus.content && (
                <div
                  style={{
                    marginTop: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '90%',
                  }}
                >
                  {currentStatus.content}
                </div>
              )}
            </div>
          )}

          {/* Enhanced WhatsApp Link Preview Overlay Card */}
          {linkPreview && (
            <a
              href={linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '90px',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(18, 18, 24, 0.92)',
                border: `1px solid ${linkPreview.badge}`,
                padding: '10px 16px',
                borderRadius: '24px',
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)',
                transition: 'transform 0.2s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: linkPreview.badge, fontSize: '22px' }}>
                {linkPreview.icon}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                  {linkPreview.title}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.7)',
                    maxWidth: '240px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {linkPreview.url}
                </span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)' }}>
                arrow_forward_ios
              </span>
            </a>
          )}
        </div>

        {/* Footer: Viewers Count & List Button */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowViewers((prev) => !prev);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#25d366' }}>
              visibility
            </span>
            <span>{currentStatus.viewers?.length || 0} Viewers</span>
          </button>
        </div>

        {/* Viewers List Popover */}
        {showViewers && (
          <div
            style={{
              position: 'absolute',
              bottom: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '280px',
              maxHeight: '200px',
              backgroundColor: 'rgba(20, 20, 26, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '12px',
              zIndex: 30,
              color: '#ffffff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              Viewed by ({currentStatus.viewers?.length || 0})
            </div>
            {currentStatus.viewers && currentStatus.viewers.length > 0 ? (
              currentStatus.viewers.map((viewer, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#e2e2e6',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#25d366' }}>
                    check_circle
                  </span>
                  <span>{viewer}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '8px 0' }}>
                No views yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
