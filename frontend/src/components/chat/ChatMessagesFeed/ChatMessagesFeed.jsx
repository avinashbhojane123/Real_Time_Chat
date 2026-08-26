import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  unreadCount,
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
  return (
    <div
      ref={chatFeedRef}
      className="wa-doodle-wallpaper wa-feed-container"
    >
      {filteredMessages.length === 0 ? (
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
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>forum</span>
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
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.nickname === nickname;
            const showDate =
              idx === 0 ||
              formatDateHeader(msg.createdAt) !== formatDateHeader(filteredMessages[idx - 1].createdAt);

            return (
              <AnimatedMessageBubble
                key={msg.id || idx}
                isOwn={isMe}
                onSwipeReply={() => setReplyingTo(msg)}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                {/* Date Header Pill */}
                {showDate && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 6px 0' }}>
                    <div
                      style={{
                        backgroundColor: '#182229',
                        color: '#8696a0',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
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
                  }}
                  onPointerDown={(e) => handlePointerDown(e, msg.id)}
                  onPointerMove={(e) => handlePointerMove(e, msg.id)}
                  onPointerUp={() => handlePointerUp(msg)}
                  onPointerCancel={() => handlePointerUp(msg)}
                >
                  {/* Animated Drag-to-Reply Visual Indicator */}
                  {activeDragId === msg.id && dragTranslateX > 5 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: isMe ? 'auto' : '4px',
                        right: isMe ? `${dragTranslateX + 16}px` : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#202c33',
                        border: '2px solid #00a884',
                        color: '#00a884',
                        opacity: Math.min(dragTranslateX / 40, 1),
                        transform: `scale(${Math.min(dragTranslateX / 40, 1.2)})`,
                        transition: 'transform 0.1s ease',
                        zIndex: 10,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        reply
                      </span>
                    </div>
                  )}

                  <div
                    className={`wa-bubble-box ${isMe ? 'wa-bubble-out' : 'wa-bubble-in'} group`}
                    style={{
                      transform: activeDragId === msg.id ? `translateX(${dragTranslateX}px)` : 'none',
                      transition: activeDragId === msg.id ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)',
                    }}
                  >
                    {/* Sender Nickname Header for Incoming Messages */}
                    {!isMe && (
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00a884', marginBottom: '2px' }}>
                        {msg.nickname}
                      </div>
                    )}

                    {/* Reply Quote Inner Box */}
                    {msg.replyTo && (
                      <div className="wa-quote-box" style={{ position: 'relative', overflow: 'hidden' }}>
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
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fff' }}>
                                  donut_large
                                </span>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#00a884', fontWeight: 700 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>donut_large</span>
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

                      {/* Image Attachment Preview with Motion layoutId */}
                      {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                        <motion.img
                          layoutId={`chat-img-${msg.id}`}
                          src={msg.fileUrl}
                          alt="Attachment"
                          style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '8px', marginTop: '6px', cursor: 'pointer', objectFit: 'cover' }}
                          onClick={() => setLightboxImage({ url: msg.fileUrl, name: msg.fileName, id: msg.id })}
                        />
                      )}

                      {/* Audio Voice Note Player */}
                      {msg.fileUrl && msg.fileType?.startsWith('audio/') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: '12px', minWidth: '220px' }}>
                          <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '22px' }}>graphic_eq</span>
                          <audio controls src={msg.fileUrl} style={{ height: '30px', flex: 1, outline: 'none' }} />
                        </div>
                      )}

                      {/* Document & File Attachment Card */}
                      {msg.fileUrl && !msg.fileType?.startsWith('image/') && !msg.fileType?.startsWith('audio/') && (
                        <div
                          onClick={() => setDocumentViewerFile({ url: msg.fileUrl, name: msg.fileName, type: msg.fileType })}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', backgroundColor: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(134,150,160,0.15)' }}
                        >
                          <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '24px' }}>description</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fileName || 'Attachment Document'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Click to preview document</div>
                          </div>
                        </div>
                      )}

                      {/* Live Interactive Poll Card */}
                      {msg.pollData && (
                        <div className="poll-card" style={{ marginTop: '6px' }}>
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
                                        {hasVoted && <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '16px' }}>check_circle</span>}
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
                        <div style={{ marginTop: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(134,150,160,0.2)', backgroundColor: 'rgba(0,0,0,0.25)', maxWidth: '280px' }}>
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
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                                <span>View on Google Maps</span>
                              </div>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8696a0' }}>open_in_new</span>
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
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>timer</span>
                        </span>
                      )}
                      {msg.isEdited && (
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', italic: 'true' }}>edited</span>
                      )}
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {isMe && (() => {
                        const readByOthers = msg.readBy ? msg.readBy.filter((n) => n !== nickname) : [];
                        const isRead = readByOthers.length > 0;
                        const otherUsersOnline = users.some((u) => u.nickname !== nickname && u.isOnline);

                        if (isRead) {
                          return (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '15px', color: '#53bdeb' }}
                              title={`Read by: ${readByOthers.join(', ')}`}
                            >
                              done_all
                            </span>
                          );
                        } else if (otherUsersOnline) {
                          return (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '15px', color: '#8696a0' }}
                              title="Delivered to room"
                            >
                              done_all
                            </span>
                          );
                        } else {
                          return (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '15px', color: '#8696a0' }}
                              title="Sent"
                            >
                              done
                            </span>
                          );
                        }
                      })()}
                    </div>

                    {/* Message 3 Dots Button Trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: isMe ? '2px' : 'auto',
                        left: !isMe ? '2px' : 'auto',
                        background: 'none',
                        border: 'none',
                        color: '#8696a0',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 15,
                      }}
                      className="group-hover:opacity-100 opacity-60 hover:opacity-100"
                      title="Message options"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_vert</span>
                    </button>

                    {/* 3 Dots Context Dropdown Menu */}
                    {activeMenuMsgId === msg.id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '26px',
                          right: isMe ? '6px' : 'auto',
                          left: !isMe ? '6px' : 'auto',
                          backgroundColor: '#233138',
                          borderRadius: '10px',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
                          border: '1px solid rgba(134, 150, 160, 0.2)',
                          padding: '4px 0',
                          zIndex: 60,
                          minWidth: '150px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReactionMsgId(msg.id);
                            setActiveMenuMsgId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                          className="hover:bg-[#182229]"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#00a884' }}>add_reaction</span>
                          <span>React</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(msg);
                            setActiveMenuMsgId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                          className="hover:bg-[#182229]"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8696a0' }}>reply</span>
                          <span>Reply</span>
                        </button>

                        {isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              startEditing(msg);
                              setActiveMenuMsgId(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                            className="hover:bg-[#182229]"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8696a0' }}>edit</span>
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            handleTogglePinMessage(msg);
                            setActiveMenuMsgId(null);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                          className="hover:bg-[#182229]"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8696a0' }}>push_pin</span>
                          <span>{pinnedMessage?.id === msg.id ? 'Unpin' : 'Pin'}</span>
                        </button>

                        {isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteMessage(msg.id);
                              setActiveMenuMsgId(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#f44336', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left' }}
                            className="hover:bg-[#182229]"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f44336' }}>delete</span>
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Emoji Reactions Popover */}
                    {activeReactionMsgId === msg.id && (
                      <div
                        className="reactions-popover"
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
                            onClick={(e) => handleReactToMessage(msg.id, emoji, e)}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="reaction-item-btn"
                          onClick={() => {
                            setShowCustomReactionForMsgId(showCustomReactionForMsgId === msg.id ? null : msg.id);
                            setActiveReactionMsgId(null);
                          }}
                          title="More Emojis"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696a0', padding: '4px' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        </button>
                      </div>
                    )}

                    {/* Custom Reaction Emoji Picker Grid */}
                    {showCustomReactionForMsgId === msg.id && (
                      <div
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
                          zIndex: 80,
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', padding: '0 4px' }}>
                          <span>Select Reaction</span>
                          <button
                            type="button"
                            onClick={() => setShowCustomReactionForMsgId(null)}
                            style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', overflowY: 'auto', padding: '4px' }}>
                          {EMOJI_LIST.map((emoji, i) => (
                            <button
                              key={i}
                              type="button"
                              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                              className="hover:bg-[#2a3942]"
                              onClick={(e) => handleReactToMessage(msg.id, emoji, e)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reactions Pill Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#202c33',
                          border: '1px solid rgba(134, 150, 160, 0.2)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          marginTop: '4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          cursor: 'pointer',
                        }}
                        title={msg.reactions.map((r) => `${r.nickname}: ${r.emoji}`).join('\n')}
                      >
                        {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji, i) => (
                          <span key={i}>{emoji}</span>
                        ))}
                        <span style={{ color: '#8696a0', fontWeight: 600, fontSize: '0.7rem' }}>
                          {msg.reactions.length}
                        </span>
                      </div>
                    )}
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
      <ScrollToBottomPill
        visible={showScrollToBottom}
        unreadCount={unreadCount}
        onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

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
