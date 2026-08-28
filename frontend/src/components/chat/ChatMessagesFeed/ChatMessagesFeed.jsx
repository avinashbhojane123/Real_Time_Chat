import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import AnimatedMessageBubble from '../../animated/AnimatedMessageBubble';
import AnimatedTypingIndicator from '../../animated/AnimatedTypingIndicator';
import ScrollToBottomPill from '../../animated/ScrollToBottomPill';
import YouTubePreview from '../../YouTubePreview';
import InstagramPreview from '../../InstagramPreview';
import { formatDateHeader, formatMessageTime } from '../../../utils/chatUtils';
import './ChatMessagesFeed.css';

export default function ChatMessagesFeed({
  filteredMessages,
  nickname,
  users,
  chatFeedRef,
  chatBottomRef,
  showScrollToBottom,
  setShowScrollToBottom,
  unreadCount,
  setUnreadCount,
  typingUsers,
  particles,
  activeDragId,
  dragTranslateX,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  setReplyingTo,
  setLightboxImage,
  setDocumentViewerFile,
  handleVotePoll,
  showToast,
  activeMenuMsgId,
  setActiveMenuMsgId,
  activeReactionMsgId,
  setActiveReactionMsgId,
  showCustomReactionForMsgId,
  setShowCustomReactionForMsgId,
  startEditing,
  handleTogglePinMessage,
  handleDeleteMessage,
  handleReactToMessage,
  QUICK_REACTIONS,
  EMOJI_LIST,
  pinnedMessage,
}) {
  // Helper function to normalize reaction maps/arrays into a clean list
  const getNormalizedReactions = (reactions) => {
    if (!reactions) return [];
    if (Array.isArray(reactions)) return reactions;
    if (typeof reactions === 'object') {
      const list = [];
      Object.entries(reactions).forEach(([emoji, users]) => {
        if (Array.isArray(users)) {
          users.forEach((userNick) => {
            list.push({ emoji, nickname: userNick });
          });
        }
      });
      return list;
    }
    return [];
  };

  const isImageFile = (msg) => {
    if (!msg?.fileUrl) return false;
    if (msg.fileType && msg.fileType.startsWith('image/')) return true;
    const target = `${msg.fileUrl} ${msg.fileName || ''}`.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|avif|heic|bmp)($|\?)/i.test(target) || msg.fileUrl.startsWith('data:image/');
  };

  const isVideoFile = (msg) => {
    if (!msg?.fileUrl) return false;
    if (msg.fileType && msg.fileType.startsWith('video/')) return true;
    const target = `${msg.fileUrl} ${msg.fileName || ''}`.toLowerCase();
    return /\.(mp4|webm|mov|m4v|mkv|avi)($|\?)/i.test(target);
  };

  const isAudioFile = (msg) => {
    if (!msg?.fileUrl) return false;
    if (msg.fileType && msg.fileType.startsWith('audio/')) return true;
    const target = `${msg.fileUrl} ${msg.fileName || ''}`.toLowerCase();
    return /\.(mp3|wav|ogg|aac|m4a|flac)($|\?)/i.test(target);
  };

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const cleanUrl = url.replace(/^\/?api\//, '/');
    const storedBase = localStorage.getItem('baseUrl') || import.meta.env.VITE_API_URL || import.meta.env.VITE_DEFAULT_API_URL || '';
    const serverBase = storedBase.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    if (serverBase) {
      return `${serverBase}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
    }
    return cleanUrl;
  };

  const visibleMessages = filteredMessages.filter((m) => !m.isDeleted);
  const prevMessagesLengthRef = useRef(filteredMessages.length);

  // Scroll listener to toggle showScrollToBottom & clear unreadCount when scrolled to bottom
  useEffect(() => {
    const feedEl = chatFeedRef?.current;
    if (!feedEl) return;

    const handleScroll = () => {
      const distanceFromBottom = feedEl.scrollHeight - feedEl.scrollTop - feedEl.clientHeight;
      const isAtBottom = distanceFromBottom <= 150;

      if (setShowScrollToBottom) {
        setShowScrollToBottom(!isAtBottom);
      }
      if (isAtBottom && setUnreadCount) {
        setUnreadCount(0);
      }
    };

    feedEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => feedEl.removeEventListener('scroll', handleScroll);
  }, [chatFeedRef, setShowScrollToBottom, setUnreadCount]);

  // Auto-scroll effect on initial mount & new messages
  useEffect(() => {
    const feedEl = chatFeedRef?.current;
    if (!feedEl) return;

    const prevLength = prevMessagesLengthRef.current;
    const currentLength = filteredMessages.length;
    prevMessagesLengthRef.current = currentLength;

    const distanceFromBottom = feedEl.scrollHeight - feedEl.scrollTop - feedEl.clientHeight;
    const isNearBottom = distanceFromBottom <= 200;
    const lastMsg = filteredMessages[filteredMessages.length - 1];
    const isOwnMessage = lastMsg?.nickname === nickname;

    if (prevLength === 0 || isOwnMessage || isNearBottom) {
      chatBottomRef?.current?.scrollIntoView({ behavior: prevLength === 0 ? 'auto' : 'smooth' });
      if (setUnreadCount) setUnreadCount(0);
    } else if (currentLength > prevLength) {
      if (setUnreadCount) setUnreadCount((prev) => prev + 1);
    }
  }, [filteredMessages, nickname, chatFeedRef, chatBottomRef, setUnreadCount]);

  return (
    <div
      ref={chatFeedRef}
      className="wa-doodle-wallpaper wa-feed-container"
    >
      <div className="wa-feed-inner">
      {visibleMessages.length === 0 ? (
        <div style={{ margin: 'auto', textAlign: 'center', color: '#8696a0', padding: '32px 16px', maxWidth: '380px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 168, 132, 0.15)',
              color: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            <Icon icon="solar:chat-round-line-bold-duotone" width="32" height="32" />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e9edef', marginBottom: '4px' }}>
            Welcome to the Chat
          </div>
          <div style={{ fontSize: '0.8rem', color: '#8696a0', lineHeight: 1.4 }}>
            No messages here yet. Type a message below to start real-time chatting with everyone online!
          </div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {visibleMessages.map((msg, idx) => {
            const isMe = msg.nickname === nickname;
            const showDate =
              idx === 0 ||
              formatDateHeader(msg.createdAt) !== formatDateHeader(visibleMessages[idx - 1].createdAt);

            const isMenuActive = activeMenuMsgId === msg.id || activeReactionMsgId === msg.id || showCustomReactionForMsgId === msg.id;

            return (
              <AnimatedMessageBubble
                key={msg.id || idx}
                isOwn={isMe}
                onSwipeReply={() => setReplyingTo(msg)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative',
                  zIndex: isMenuActive ? 100 : 1,
                }}
              >
                {/* Feature 2: M3 Sticky Date Header Tonal Pill */}
                {showDate && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px 0', position: 'sticky', top: '8px', zIndex: 15 }}>
                    <div
                      style={{
                        backgroundColor: '#202c33',
                        color: '#00a884',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 14px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(0, 168, 132, 0.25)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {formatDateHeader(msg.createdAt)}
                    </div>
                  </div>
                )}

                {/* Message Bubble Item */}
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    position: 'relative',
                    alignItems: 'center',
                    userSelect: 'none',
                    zIndex: isMenuActive ? 100 : 1,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, msg.id)}
                  onPointerMove={(e) => handlePointerMove(e, msg.id)}
                  onPointerUp={() => handlePointerUp(msg)}
                  onPointerCancel={() => handlePointerUp(msg)}
                >
                  {/* Feature 5: M3 Swipe-to-Reply Spring Snap Visual Indicator */}
                  {activeDragId === msg.id && dragTranslateX > 5 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: isMe ? 'auto' : '4px',
                        right: isMe ? `${dragTranslateX + 16}px` : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#202c33',
                        border: `2px solid ${dragTranslateX > 50 ? '#00a884' : 'rgba(0, 168, 132, 0.5)'}`,
                        color: '#00a884',
                        opacity: Math.min(dragTranslateX / 40, 1),
                        transform: `scale(${Math.min(dragTranslateX / 40, 1.2)})`,
                        transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                        zIndex: 10,
                      }}
                    >
                      <Icon icon="solar:reply-bold-duotone" width="18" height="18" />
                    </div>
                  )}

                  {/* Feature 1 & 6: M3 Asymmetrical Bubbles & Contextual Selection Highlight Surface */}
                  <div
                    className={`wa-bubble-box ${isMe ? 'wa-bubble-out' : 'wa-bubble-in'} ${activeMenuMsgId === msg.id ? 'm3-selected-surface' : ''} group`}
                    style={{
                      transform: activeDragId === msg.id ? `translateX(${dragTranslateX}px)` : 'none',
                      transition: activeDragId === msg.id ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                    }}
                  >
                    {/* Sender Nickname Header for Incoming Messages */}
                    {!isMe && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00a884', marginBottom: '2px' }}>
                        {msg.nickname}
                      </div>
                    )}

                    {/* Feature 3 (Set 2): M3 Quoted Reply Sub-Card */}
                    {msg.replyTo && (
                      <div className="wa-quote-box m3-quote-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        {msg.replyTo.isStatus ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {msg.replyTo.statusMediaUrl ? (
                              <img
                                src={msg.replyTo.statusMediaUrl}
                                alt="Status thumbnail"
                                style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '6px',
                                  background: msg.replyTo.statusBgColor || 'linear-gradient(135deg, #005c4b, #00a884)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Icon icon="solar:play-circle-bold-duotone" width="18" height="18" style={{ color: '#fff' }} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#00a884', fontWeight: 700 }}>
                                <Icon icon="solar:play-circle-bold-duotone" width="14" height="14" />
                                <span>{msg.replyTo.nickname}'s Status</span>
                              </div>
                              <div style={{ color: '#8696a0', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {msg.replyTo.message}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontWeight: 700, color: '#00a884' }}>{msg.replyTo.nickname}: </span>
                            <span style={{ color: '#8696a0' }}>{msg.replyTo.message}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Message Content */}
                    <div>
                      {msg.message && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>}

                      {/* Image Attachment Preview with M3 Media Card & Lightbox */}
                      {isImageFile(msg) && (
                        <div className="m3-media-card" style={{ marginTop: '6px', borderRadius: '12px', overflow: 'hidden' }}>
                          <motion.img
                            layoutId={`chat-img-${msg.id}`}
                            src={resolveMediaUrl(msg.fileUrl)}
                            alt={msg.fileName || 'Photo attachment'}
                            style={{ maxWidth: '100%', maxHeight: '280px', cursor: 'pointer', objectFit: 'cover', display: 'block', borderRadius: '12px' }}
                            onClick={() => setLightboxImage({ url: resolveMediaUrl(msg.fileUrl), name: msg.fileName, id: msg.id })}
                            onError={(e) => {
                              if (msg.fileUrl && !e.target.dataset.retried) {
                                e.target.dataset.retried = 'true';
                                e.target.src = msg.fileUrl;
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Video Attachment Player */}
                      {isVideoFile(msg) && (
                        <div className="m3-media-card" style={{ marginTop: '6px', borderRadius: '12px', overflow: 'hidden' }}>
                          <video
                            controls
                            src={resolveMediaUrl(msg.fileUrl)}
                            style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '12px', display: 'block' }}
                          />
                        </div>
                      )}

                      {/* Audio Voice Note Player */}
                      {isAudioFile(msg) && (
                        <div className="m3-media-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 12px', minWidth: '220px', borderRadius: '12px' }}>
                          <Icon icon="solar:volume-loud-bold-duotone" width="22" height="22" style={{ color: '#00a884' }} />
                          <audio controls src={resolveMediaUrl(msg.fileUrl)} style={{ height: '30px', flex: 1, outline: 'none' }} />
                        </div>
                      )}

                      {/* Document & File Attachment Card */}
                      {msg.fileUrl && !isImageFile(msg) && !isVideoFile(msg) && !isAudioFile(msg) && (
                        <div
                          className="m3-media-card"
                          onClick={() => setDocumentViewerFile({ url: resolveMediaUrl(msg.fileUrl), name: msg.fileName, type: msg.fileType })}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 12px', cursor: 'pointer', borderRadius: '12px' }}
                        >
                          <Icon icon="solar:document-bold-duotone" width="24" height="24" style={{ color: '#00a884' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fileName || 'Attachment Document'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Click to preview document</div>
                          </div>
                        </div>
                      )}

                      {/* Live Interactive Poll Card */}
                      {msg.pollData && (
                        <div className="poll-card m3-media-card" style={{ marginTop: '6px', padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e9edef', marginBottom: '8px' }}>
                            {msg.pollData.question}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(() => {
                              const totalVotes = msg.pollData.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
                              return msg.pollData.options.map((opt) => {
                                const voteCount = opt.votes?.length || 0;
                                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                const hasVoted = opt.votes?.includes(nickname);
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    className="poll-option-btn"
                                    onClick={() => handleVotePoll(msg.id, opt.id)}
                                  >
                                    <div className="poll-option-fill" style={{ width: `${pct}%` }} />
                                    <div className="poll-option-content">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {hasVoted && <Icon icon="solar:check-circle-bold-duotone" width="16" height="16" style={{ color: '#00a884' }} />}
                                        <span>{opt.text}</span>
                                      </div>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.85 }}>{pct}% ({voteCount})</span>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Shared Location Card */}
                      {msg.locationData && (
                        <div className="m3-media-card" style={{ marginTop: '6px', maxWidth: '280px', backgroundColor: 'rgba(0,0,0,0.25)' }}>
                          <a
                            href={`https://www.google.com/maps?q=${msg.locationData.lat},${msg.locationData.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <img
                              src={`https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${msg.locationData.lng},${msg.locationData.lat}&z=14&l=map&pt=${msg.locationData.lng},${msg.locationData.lat},pm2rdm`}
                              alt="Map Location"
                              style={{ width: '100%', height: '130px', objectFit: 'cover' }}
                            />
                            <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#182229' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#00a884', fontWeight: 700 }}>
                                <Icon icon="solar:map-point-wave-bold-duotone" width="18" height="18" />
                                <span>View on Google Maps</span>
                              </div>
                              <Icon icon="solar:export-bold-duotone" width="16" height="16" style={{ color: '#8696a0' }} />
                            </div>
                          </a>
                        </div>
                      )}

                      {/* YouTube & Instagram Previews */}
                      {msg.message && <YouTubePreview messageText={msg.message} onCopySuccess={showToast} />}
                      {msg.message && <InstagramPreview messageText={msg.message} onCopySuccess={showToast} />}
                    </div>

                    {/* Timestamp & Cyan Double Tick */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '2px',
                        float: 'right',
                        marginLeft: '12px',
                      }}
                    >
                      {msg.expiresAt && (
                        <span style={{ fontSize: '0.65rem', color: '#ff9800', display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Disappearing secret message">
                          <Icon icon="solar:stopwatch-bold-duotone" width="13" height="13" />
                        </span>
                      )}
                      {msg.isEdited && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', italic: 'true' }}>edited</span>
                      )}
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {/* Feature 3: M3 Expressive Delivery Status Checkmarks */}
                      {isMe && (() => {
                        const readByOthers = msg.readBy ? msg.readBy.filter((n) => n !== nickname) : [];
                        const isRead = readByOthers.length > 0;
                        const otherUsersOnline = users.some((u) => u.nickname !== nickname && u.isOnline);

                        return (
                          <motion.span
                            key={isRead ? 'read' : 'unread'}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: isRead ? [0.8, 1.25, 1] : 1 }}
                            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
                            style={{ display: 'inline-flex', alignItems: 'center' }}
                            title={isRead ? `Read by: ${readByOthers.join(', ')}` : otherUsersOnline ? 'Delivered' : 'Sent'}
                          >
                            <Icon
                              icon={isRead ? 'solar:check-read-bold-duotone' : otherUsersOnline ? 'solar:check-read-linear' : 'solar:check-linear'}
                              width="16"
                              height="16"
                              style={{ color: isRead ? '#53bdeb' : '#8696a0' }}
                            />
                          </motion.span>
                        );
                      })()}
                    </div>

                      {/* Backdrop dismiss overlay for active menus */}
                      {isMenuActive && (
                        <div
                          style={{ position: 'fixed', inset: 0, zIndex: 90, cursor: 'default' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuMsgId(null);
                            setActiveReactionMsgId(null);
                            setShowCustomReactionForMsgId(null);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Message 3 Dots Button Trigger */}
                      {!msg.isDeleted && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: isMe ? '4px' : 'auto',
                            left: !isMe ? '4px' : 'auto',
                            background: 'none',
                            border: 'none',
                            color: '#8696a0',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 25,
                          }}
                          className="group-hover:opacity-100 opacity-60 hover:opacity-100"
                          title="Message options"
                        >
                          <Icon icon="solar:alt-arrow-down-bold-duotone" width="16" height="16" />
                        </button>
                      )}

                      {/* 3 Dots Context Dropdown Menu */}
                      {!msg.isDeleted && activeMenuMsgId === msg.id && (
                        <div
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            marginTop: '4px',
                            right: isMe ? '0px' : 'auto',
                            left: !isMe ? '0px' : 'auto',
                            backgroundColor: '#233138',
                            borderRadius: '10px',
                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.75)',
                            border: '1px solid rgba(134, 150, 160, 0.25)',
                            padding: '6px 0',
                            zIndex: 200,
                            minWidth: '150px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMsgId(msg.id);
                            setActiveMenuMsgId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                          className="hover:bg-[#182229]"
                        >
                          <Icon icon="solar:smile-circle-bold-duotone" width="18" height="18" style={{ color: '#00a884' }} />
                          <span>React</span>
                        </button>

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(msg);
                            setActiveMenuMsgId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                          className="hover:bg-[#182229]"
                        >
                          <Icon icon="solar:reply-bold-duotone" width="18" height="18" style={{ color: '#8696a0' }} />
                          <span>Reply</span>
                        </button>

                        {isMe && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(msg);
                              setActiveMenuMsgId(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                            className="hover:bg-[#182229]"
                          >
                            <Icon icon="solar:pen-new-square-bold-duotone" width="18" height="18" style={{ color: '#8696a0' }} />
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePinMessage(msg);
                            setActiveMenuMsgId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                          className="hover:bg-[#182229]"
                        >
                          <Icon icon="solar:pin-bold-duotone" width="18" height="18" style={{ color: '#8696a0' }} />
                          <span>{pinnedMessage?.id === msg.id ? 'Unpin' : 'Pin'}</span>
                        </button>

                        {isMe && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg.id);
                              setActiveMenuMsgId(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#f15c6d', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                            className="hover:bg-[#182229]"
                          >
                            <Icon icon="solar:trash-bin-trash-bold-duotone" width="18" height="18" style={{ color: '#f15c6d' }} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Emoji Reactions Popover */}
                    {activeReactionMsgId === msg.id && (
                      <div
                        className="reactions-popover"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          right: isMe ? '0px' : 'auto',
                          left: !isMe ? '0px' : 'auto',
                        }}
                      >
                        {QUICK_REACTIONS.map((emoji, i) => (
                          <button
                            key={i}
                            type="button"
                            className="reaction-item-btn"
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactToMessage(msg.id, emoji, e);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="reaction-item-btn"
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCustomReactionForMsgId(showCustomReactionForMsgId === msg.id ? null : msg.id);
                            setActiveReactionMsgId(null);
                          }}
                          title="More Emojis"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696a0', padding: '4px' }}
                        >
                          <Icon icon="solar:add-circle-bold-duotone" width="18" height="18" />
                        </button>
                      </div>
                    )}

                    {/* Custom Reaction Emoji Picker Grid */}
                    {showCustomReactionForMsgId === msg.id && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '-200px',
                          right: isMe ? '0px' : 'auto',
                          left: !isMe ? '0px' : 'auto',
                          width: '260px',
                          maxHeight: '190px',
                          backgroundColor: '#202c33',
                          border: '1px solid rgba(134, 150, 160, 0.25)',
                          borderRadius: '16px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                          zIndex: 100,
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', padding: '0 4px' }}>
                          <span>Select Reaction</span>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCustomReactionForMsgId(null);
                            }}
                            style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Icon icon="solar:close-circle-bold-duotone" width="18" height="18" />
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', overflowY: 'auto', padding: '4px' }}>
                          {EMOJI_LIST.map((emoji, i) => (
                            <button
                              key={i}
                              type="button"
                              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                              className="hover:bg-[#2a3942]"
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactToMessage(msg.id, emoji, e);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feature 1 (Set 2): M3 Reaction Assist Chips */}
                    {(() => {
                      const normalizedReactions = getNormalizedReactions(msg.reactions);
                      if (normalizedReactions.length === 0) return null;
                      return (
                        <motion.button
                          type="button"
                          className="m3-reaction-chip"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.92 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                          }}
                          title={normalizedReactions.map((r) => `${r.nickname}: ${r.emoji}`).join('\n')}
                        >
                          {Array.from(new Set(normalizedReactions.map((r) => r.emoji))).map((emoji, i) => (
                            <span key={i}>{emoji}</span>
                          ))}
                          <span style={{ color: '#00a884', fontWeight: 700, fontSize: '0.7rem' }}>
                            {normalizedReactions.length}
                          </span>
                        </motion.button>
                      );
                    })()}
                  </div>
                </div>
              </AnimatedMessageBubble>
            );
          })}
        </AnimatePresence>
      )}

      <AnimatePresence>
        <AnimatedTypingIndicator typingUsers={typingUsers} />
      </AnimatePresence>
      <div ref={chatBottomRef} />
      </div>
      {/* Feature 4: M3 Small Extended FAB with Unread Numerical Badge */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            type="button"
            onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              position: 'fixed',
              bottom: '80px',
              right: '24px',
              backgroundColor: 'rgba(0, 168, 132, 0.25)',
              color: '#00a884',
              border: '1px solid rgba(0, 168, 132, 0.4)',
              backdropFilter: 'blur(10px)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 40,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Icon icon="solar:arrow-down-bold-duotone" width="18" height="18" />
            <span>Scroll to bottom</span>
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: '#00a884',
                  color: '#111b21',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: '4px',
                }}
              >
                +{unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Emoji Reaction Particle Burst Layer */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, y: p.originY, x: p.originX, scale: 0.5 }}
              animate={{
                opacity: [1, 0.9, 0],
                y: p.originY + p.y,
                x: p.originX + p.x,
                scale: p.scale,
                rotate: p.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                fontSize: '2rem',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {p.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
