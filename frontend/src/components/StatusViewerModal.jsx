import { useState, useEffect, useRef } from 'react';
import { parseYouTubeUrl } from './YouTubePreview';
import AnimatedModal from './animated/AnimatedModal';


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

  // Mark current status as viewed
  useEffect(() => {
    if (currentStatus && onViewStatus) {
      onViewStatus(currentStatus.id);
    }
  }, [currentStatus?.id, onViewStatus]);

  // Timer auto-advance (5s default for text/photo, 12s for video)
  useEffect(() => {
    if (!currentStatus || isPaused) return;

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
    <AnimatedModal
      isOpen={!!currentStatus}
      onClose={onClose}
      maxWidth="460px"
      enableDragDismiss={true}
      zIndex={99999}
      backdropStyle={{
        backgroundColor: '#0b141a',
        userSelect: 'none',
      }}
    >
      {/* Story Card Container */}
      <div
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxHeight: '840px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: currentStatus.bgColor || '#111b21',

          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Top Segmented Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            padding: '12px 12px 6px 12px',
            display: 'flex',
            gap: '4px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
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

        {/* WhatsApp Header */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: 0,
            right: 0,
            zIndex: 20,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem',
                boxShadow: '0 0 0 2px #00a884',
              }}
            >
              {currentStatus.nickname?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{currentStatus.nickname}</span>
                {isMyStatus && (
                  <span style={{ backgroundColor: '#00a884', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px' }}>
                    You
                  </span>
                )}
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
                  width: '34px',
                  height: '34px',
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
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
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
                width: '34px',
                height: '34px',
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
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Story Viewport */}
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
          {/* Touch Click Zones for Prev/Next */}
          <div
            style={{ position: 'absolute', top: '70px', left: 0, bottom: '80px', width: '35%', zIndex: 10, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            style={{ position: 'absolute', top: '70px', right: 0, bottom: '80px', width: '35%', zIndex: 10, cursor: 'pointer' }}
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
                fontWeight: 700,
                lineHeight: '1.5',
                padding: '24px',
                wordBreak: 'break-word',
              }}
            >
              {currentStatus.content}
            </div>
          )}

          {/* Render Photo Status */}
          {currentStatus.type === 'image' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={currentStatus.mediaUrl}
                alt="Status Media"
                style={{ maxWidth: '100%', maxHeight: '80%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.8)' }}
              />
              {currentStatus.content && (
                <div
                  style={{
                    marginTop: '16px',
                    backgroundColor: 'rgba(11, 20, 26, 0.85)',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '90%',
                    backdropFilter: 'blur(6px)',
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
                style={{ maxWidth: '100%', maxHeight: '80%', objectFit: 'contain', borderRadius: '12px', backgroundColor: '#000' }}
              />
              {currentStatus.content && (
                <div
                  style={{
                    marginTop: '12px',
                    backgroundColor: 'rgba(11, 20, 26, 0.85)',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '90%',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {currentStatus.content}
                </div>
              )}
            </div>
          )}

          {/* Link Preview Card Overlay */}
          {linkPreview && (
            <a
              href={linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '90px',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(32, 44, 51, 0.95)',
                border: `1px solid ${linkPreview.badge}`,
                padding: '10px 16px',
                borderRadius: '24px',
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: linkPreview.badge, fontSize: '20px' }}>
                {linkPreview.icon}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                  {linkPreview.title}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#8696a0', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {linkPreview.url}
                </span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8696a0' }}>
                arrow_forward_ios
              </span>
            </a>
          )}
        </div>

        {/* Footer: Viewers Button */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: 0,
            right: 0,
            zIndex: 20,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={{
              backgroundColor: 'rgba(0, 168, 132, 0.9)',
              border: 'none',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowViewers((prev) => !prev);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
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
              backgroundColor: '#202c33',
              border: '1px solid rgba(134, 150, 160, 0.2)',
              borderRadius: '16px',
              padding: '14px',
              zIndex: 40,
              color: '#e9edef',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', paddingBottom: '6px', display: 'flex', justifyBetween: 'space-between' }}>
              <span>Viewed by</span>
              <span style={{ color: '#00a884', fontWeight: 700 }}>{currentStatus.viewers?.length || 0}</span>
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
                    color: '#e9edef',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#00a884' }}>
                    check_circle
                  </span>
                  <span>{viewer}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#8696a0', textAlign: 'center', padding: '8px 0' }}>
                No views yet
              </div>
            )}
          </div>
        )}
      </div>
    </AnimatedModal>
  );
}

