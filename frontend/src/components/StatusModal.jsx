import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import { getApiBaseUrl } from '../utils/apiConfig';
import { compressImageFile } from '../utils/imageUtils';
import { parseYouTubeUrl } from './YouTubePreview';
import AnimatedModal from './animated/AnimatedModal';
import MagneticButton from './animated/MagneticButton';

const GRADIENTS = [
  'linear-gradient(135deg, #0b141a, #005c4b, #00a884)',
  'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
  'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  'linear-gradient(135deg, #fc466b, #3f5efb)',
  'linear-gradient(135deg, #ee0979, #ff6a00)',
  'linear-gradient(135deg, #1f1c2c, #928dab)',
];

const STICKER_LIST = ['✨', '🔥', '❤️', '🎉', '⭐', '🚀', '💯', '😎'];

export default function StatusModal({
  isOpen = true,
  onClose,
  statuses = [],
  statusUserList = [],
  initialUserIndex = 0,
  initialMode = 'view', // 'view' | 'create' | 'list'
  currentNickname,
  baseUrl,
  onViewStatus,
  onDeleteStatus,
  onReplyStatus,
  onSubmitStatus,
}) {
  const [mode, setMode] = useState(initialMode); // 'view' | 'create' | 'list'
  
  // Viewer state
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySentToast, setReplySentToast] = useState(false);
  const videoRef = useRef(null);

  // Creator state
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'video'
  const [text, setText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [stickers, setStickers] = useState([]);

  const cleanApiUrl = (baseUrl || getApiBaseUrl()).replace(/\/+$/, '');

  // Filter stories older than 24 hours
  const is24hValid = (st) => {
    const timeVal = st?.createdAt || st?.timestamp;
    if (!timeVal) return true;
    return Date.now() - new Date(timeVal).getTime() <= 24 * 60 * 60 * 1000;
  };

  // Flattened users list for viewer
  const effectiveUserList = (() => {
    const rawList = statusUserList && statusUserList.length > 0
      ? statusUserList
      : (() => {
          const map = {};
          (statuses || []).forEach((st) => {
            if (!map[st.nickname]) {
              map[st.nickname] = { nickname: st.nickname, avatarUrl: st.avatarUrl, statuses: [] };
            }
            map[st.nickname].statuses.push(st);
          });
          return Object.values(map);
        })();

    return rawList
      .map((u) => ({
        ...u,
        statuses: (u.statuses || []).filter(is24hValid),
      }))
      .filter((u) => u.statuses.length > 0);
  })();

  const currentUserObj = effectiveUserList[userIndex];
  const currentUserStories = currentUserObj?.statuses || [];
  const currentStatus = currentUserStories[storyIndex];
  const isMyStatus = currentStatus?.nickname === currentNickname;

  // Mark current status as viewed when viewing
  useEffect(() => {
    if (mode === 'view' && currentStatus && onViewStatus) {
      onViewStatus(currentStatus.id);
    }
  }, [mode, currentStatus?.id, onViewStatus]);

  // Story auto-advance timer
  useEffect(() => {
    if (mode !== 'view' || !currentStatus || isPaused) return;

    setProgress(0);
    const DURATION = currentStatus.type === 'video' ? 12000 : 5000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [mode, userIndex, storyIndex, isPaused, currentStatus]);

  const handleNextStory = () => {
    if (storyIndex < currentUserStories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (userIndex < effectiveUserList.length - 1) {
      setUserIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (userIndex > 0) {
      setUserIndex((prev) => prev - 1);
      const prevUserStories = effectiveUserList[userIndex - 1]?.statuses || [];
      setStoryIndex(Math.max(0, prevUserStories.length - 1));
      setProgress(0);
    }
  };

  const handleFileUpload = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploading(true);
    try {
      const file = await compressImageFile(rawFile);
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${cleanApiUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.fileUrl) {
        const fullUrl = res.data.fileUrl.startsWith('http')
          ? res.data.fileUrl
          : `${cleanApiUrl.replace(/\/api\/?$/, '')}${res.data.fileUrl}`;
        setMediaUrl(fullUrl);
        setMediaFileName(file.name);
      }
    } catch (err) {
      console.error('File upload failed for status', err);
      alert('Failed to upload media file.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmitNewStatus = () => {
    if (activeTab === 'text' && !text.trim()) {
      alert('Please enter text for your status update.');
      return;
    }
    if ((activeTab === 'image' || activeTab === 'video') && !mediaUrl) {
      alert('Please select and upload a media file.');
      return;
    }

    if (onSubmitStatus) {
      onSubmitStatus({
        type: activeTab,
        content: text.trim(),
        mediaUrl: mediaUrl || null,
        bgColor: activeTab === 'text' ? selectedGradient : '#0b141a',
      });
    }

    // Reset creation fields and switch to view mode
    setText('');
    setMediaUrl('');
    setMediaFileName('');
    setStickers([]);
    if (effectiveUserList.length > 0) {
      setMode('view');
    } else {
      onClose();
    }
  };

  const addSticker = (emoji) => {
    setStickers((prev) => [...prev, { id: Date.now() + Math.random(), emoji }]);
  };

  const removeSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const getLinkPreview = (txt) => {
    if (!txt) return null;
    const yt = parseYouTubeUrl(txt);
    if (yt) {
      return { type: 'youtube', title: 'YouTube Video', url: yt.cleanUrl, icon: 'play_circle' };
    }
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const match = txt.match(urlRegex);
    if (match && match[0]) {
      return { type: 'web', title: 'Open Link', url: match[0], icon: 'open_in_new' };
    }
    return null;
  };

  // Helper to format status creation timestamp
  const formatStatusTime = (st) => {
    const timeVal = st?.createdAt || st?.timestamp;
    if (!timeVal) return 'Just now';
    const date = new Date(timeVal);
    if (isNaN(date.getTime())) return String(timeVal);

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (!isOpen) return null;

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={mode === 'create' ? '540px' : '460px'}
      enableDragDismiss={true}
      zIndex={9999}
      backdropStyle={{
        backgroundColor: 'rgba(11, 20, 26, 0.94)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '520px',
          maxHeight: '90vh',
          backgroundColor: '#0b141a',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(134, 150, 160, 0.2)',
        }}
      >
        {/* =========================================================================
            MODE 1: VIEW STATUS STORIES
           ========================================================================= */}
        {mode === 'view' && (
          currentStatus ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: currentStatus.bgColor || '#0b141a' }}>
              {/* Top Multi-Segment Progress Bars */}
              <div style={{ position: 'absolute', top: 12, left: 16, right: 16, zIndex: 30, display: 'flex', gap: '4px' }}>
                {currentUserStories.map((_, idx) => (
                  <div
                    key={idx}
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
                        width: `${idx < storyIndex ? 100 : idx === storyIndex ? progress : 0}%`,
                        transition: idx === storyIndex ? 'width 0.05s linear' : 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header: User Info, Pause Button, Add Status Button & Close Button */}
              <div style={{ position: 'absolute', top: 24, left: 16, right: 16, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#00a884', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden', fontSize: '0.9rem' }}>
                    {currentStatus.avatarUrl ? (
                      <img src={currentStatus.avatarUrl} alt={currentStatus.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (currentStatus.nickname || 'U').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                      {currentStatus.nickname} {isMyStatus ? '(You)' : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85, textShadow: '0 1px 3px rgba(0,0,0,0.8)', fontWeight: 600 }}>
                      {formatStatusTime(currentStatus)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Pause / Play Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsPaused((prev) => !prev)}
                    title={isPaused ? 'Resume Story Playback' : 'Pause Story Playback'}
                    style={{
                      background: isPaused ? 'rgba(0, 168, 132, 0.3)' : 'rgba(0,0,0,0.4)',
                      border: isPaused ? '1px solid #00a884' : 'none',
                      color: isPaused ? '#00a884' : '#fff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      {isPaused ? 'play_arrow' : 'pause'}
                    </span>
                  </button>

                  {/* Header "+ Add Status" Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={() => {
                      setIsPaused(true);
                      setMode('create');
                    }}
                    style={{
                      backgroundColor: '#00a884',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                    }}
                  >
                    <Icon icon="solar:add-circle-bold-duotone" width="16" height="16" />
                    <span>Add Status</span>
                  </motion.button>

                  <button
                    type="button"
                    onClick={onClose}
                    style={{ background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                  </button>
                </div>
              </div>

              {/* Story Viewport Content */}
              <div
                style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '70px 20px 80px' }}
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              >
                {/* PAUSED Badge Indicator */}
                {isPaused && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      top: '74px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      color: '#00a884',
                      border: '1px solid rgba(0, 168, 132, 0.5)',
                      padding: '4px 14px',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      zIndex: 25,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      pointerEvents: 'none',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>pause</span>
                    <span>PAUSED</span>
                  </motion.div>
                )}

                {currentStatus.type === 'text' && (
                  <div style={{ textAlign: 'center', color: '#fff', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.4, padding: '20px', wordBreak: 'break-word', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {currentStatus.content}
                  </div>
                )}

                {currentStatus.type === 'image' && currentStatus.mediaUrl && (
                  <img
                    src={currentStatus.mediaUrl}
                    alt="Status Media"
                    style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '12px' }}
                  />
                )}

                {currentStatus.type === 'video' && currentStatus.mediaUrl && (
                  <video
                    ref={videoRef}
                    src={currentStatus.mediaUrl}
                    autoPlay
                    controls
                    controlsList="nodownload"
                    playsInline
                    style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '12px' }}
                  />
                )}

                {/* Tap Left/Right Navigation Areas */}
                <div onClick={handlePrevStory} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', zIndex: 10, cursor: 'pointer' }} />
                <div onClick={handleNextStory} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '30%', zIndex: 10, cursor: 'pointer' }} />
              </div>

              {/* Optional Link Preview Pill */}
              {(() => {
                const link = getLinkPreview(currentStatus.content);
                if (!link) return null;
                return (
                  <div style={{ position: 'absolute', bottom: isMyStatus ? '64px' : '74px', left: '50%', transform: 'translateX(-50%)', zIndex: 25 }}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        backgroundColor: 'rgba(0, 168, 132, 0.9)',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{link.icon}</span>
                      <span>{link.title}</span>
                    </a>
                  </div>
                );
              })()}

              {/* Bottom Footer Controls: Views count / Delete for Owner, Reply box for Contact */}
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(17, 27, 33, 0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 30 }}>
                {isMyStatus ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', color: '#e9edef' }}>
                    <button
                      type="button"
                      onClick={() => setShowViewers(!showViewers)}
                      style={{ background: 'none', border: 'none', color: '#00a884', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                      <span>{currentStatus.viewedBy ? currentStatus.viewedBy.length : 0} Views</span>
                    </button>
                    {onDeleteStatus && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this status story?')) {
                            onDeleteStatus(currentStatus.id);
                            handleNextStory();
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#f15c6d', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!replyText.trim() || !onReplyStatus) return;
                      onReplyStatus({ status: currentStatus, message: replyText.trim() });
                      setReplyText('');
                      setReplySentToast(true);
                      setTimeout(() => setReplySentToast(false), 2000);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                  >
                    <input
                      type="text"
                      placeholder={`Reply to ${currentStatus.nickname}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ flex: 1, height: '38px', borderRadius: '20px', backgroundColor: '#2a3942', border: 'none', color: '#e9edef', padding: '0 14px', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: replyText.trim() ? 'pointer' : 'default', opacity: replyText.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Viewers List Overlay / Drawer */}
              <AnimatePresence>
                {showViewers && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: '#111b21',
                      borderTopLeftRadius: '16px',
                      borderTopRightRadius: '16px',
                      borderTop: '1px solid rgba(134, 150, 160, 0.2)',
                      boxShadow: '0 -10px 30px rgba(0,0,0,0.8)',
                      zIndex: 50,
                      maxHeight: '60%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', backgroundColor: '#202c33' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e9edef', fontWeight: 700, fontSize: '0.9rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#00a884' }}>visibility</span>
                        <span>Viewed by ({currentStatus.viewedBy ? currentStatus.viewedBy.length : 0})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowViewers(false)}
                        style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                      </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentStatus.viewedBy && currentStatus.viewedBy.length > 0 ? (
                        currentStatus.viewedBy.map((viewer, idx) => {
                          const viewerName = typeof viewer === 'string' ? viewer : viewer.nickname || 'Contact';
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 8px', borderRadius: '8px', backgroundColor: '#1d272d' }}>
                              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#00a884', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}>
                                {viewerName.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e9edef' }}>{viewerName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#00a884' }}>Viewed story</div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#8696a0', fontSize: '0.85rem' }}>
                          No views on this status story yet.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reply Toast Overlay */}
              {replySentToast && (
                <div style={{ position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#00a884', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, zIndex: 40, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                  Reply Sent!
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#e9edef', padding: '40px' }}>
              <Icon icon="solar:play-circle-bold-duotone" width="64" height="64" style={{ color: '#00a884', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Status Stories Yet</h3>
              <p style={{ color: '#8696a0', fontSize: '0.85rem', marginBottom: '24px', textAlign: 'center' }}>
                Share your first status update with your room contacts.
              </p>
              <button
                type="button"
                onClick={() => setMode('create')}
                style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '20px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon icon="solar:add-circle-bold-duotone" width="20" height="20" />
                <span>Create Status Update</span>
              </button>
            </div>
          )
        )}

        {/* =========================================================================
            MODE 2: CREATE NEW STATUS STORY
           ========================================================================= */}
        {mode === 'create' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#111b21', color: '#e9edef' }}>
            {/* Creator Header */}
            <div style={{ height: '56px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', backgroundColor: '#202c33' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {effectiveUserList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                    title="Back to Status Stories"
                  >
                    <Icon icon="solar:alt-arrow-left-bold" width="20" height="20" />
                  </button>
                )}
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Create Status Update</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* Type Switcher Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(134, 150, 160, 0.15)', backgroundColor: '#182229' }}>
              {[
                { key: 'text', label: 'Text Status', icon: 'title' },
                { key: 'image', label: 'Photo', icon: 'image' },
                { key: 'video', label: 'Video', icon: 'videocam' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? '3px solid #00a884' : '3px solid transparent',
                    color: activeTab === tab.key ? '#00a884' : '#8696a0',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Main Creator Content Area */}
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {/* Text Mode Options */}
              {activeTab === 'text' && (
                <>
                  <div
                    style={{
                      height: '180px',
                      borderRadius: '16px',
                      background: selectedGradient,
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <textarea
                      placeholder="Type a status update..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        outline: 'none',
                        resize: 'none',
                        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                      }}
                    />

                    {/* Draggable Stickers Overlay */}
                    {stickers.map((st) => (
                      <motion.div
                        key={st.id}
                        drag
                        dragConstraints={{ top: -70, left: -140, right: 140, bottom: 70 }}
                        onClick={() => removeSticker(st.id)}
                        title="Click to remove sticker"
                        style={{ position: 'absolute', cursor: 'grab', fontSize: '2rem', userSelect: 'none' }}
                      >
                        {st.emoji}
                      </motion.div>
                    ))}
                  </div>

                  {/* Gradient Color Options */}
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#8696a0', marginBottom: '8px', fontWeight: 600 }}>Background Theme</div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {GRADIENTS.map((grad, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedGradient(grad)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: grad,
                            cursor: 'pointer',
                            border: selectedGradient === grad ? '3px solid #00a884' : '2px solid transparent',
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stickers Palette */}
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#8696a0', marginBottom: '8px', fontWeight: 600 }}>Add Sticker</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {STICKER_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => addSticker(emoji)}
                          style={{ background: '#202c33', border: '1px solid rgba(255,255,255,0.1)', fontSize: '1.2rem', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Image / Video File Upload Mode */}
              {(activeTab === 'image' || activeTab === 'video') && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(0, 168, 132, 0.4)', borderRadius: '16px', padding: '30px', backgroundColor: '#182229' }}>
                  {mediaUrl ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      {activeTab === 'image' ? (
                        <img src={mediaUrl} alt="Preview" style={{ maxHeight: '200px', borderRadius: '12px', objectFit: 'contain' }} />
                      ) : (
                        <video src={mediaUrl} controls controlsList="nodownload" style={{ maxHeight: '200px', borderRadius: '12px' }} />
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#00a884', marginTop: '8px', fontWeight: 600 }}>{mediaFileName}</div>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#00a884' }}>
                        {activeTab === 'image' ? 'add_photo_alternate' : 'video_call'}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e9edef' }}>
                        {uploading ? 'Compressing & Uploading...' : `Choose ${activeTab === 'image' ? 'Image' : 'Video'} File`}
                      </span>
                      <input
                        type="file"
                        accept={activeTab === 'image' ? 'image/*' : 'video/*'}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Creator Footer Action Button */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(134, 150, 160, 0.15)', backgroundColor: '#202c33', display: 'flex', justifyContent: 'flex-end' }}>
              <MagneticButton
                type="button"
                onClick={handleSubmitNewStatus}
                style={{
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '24px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 168, 132, 0.4)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                <span>Post Status Update</span>
              </MagneticButton>
            </div>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
}
