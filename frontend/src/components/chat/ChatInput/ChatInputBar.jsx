import React from 'react';
import MagneticButton from '../../animated/MagneticButton';
import './ChatInputBar.css';

export default function ChatInputBar({
  replyingTo,
  setReplyingTo,
  editingMsg,
  cancelEditing,
  showEmojiPicker,
  setShowEmojiPicker,
  EMOJI_LIST,
  showActionMenu,
  setShowActionMenu,
  isUploadingFile,
  handleFileUpload,
  setShowPollModal,
  handleShareLocation,
  showDisappearingMenu,
  setShowDisappearingMenu,
  disappearingTimer,
  setShowThemeModal,
  setShowClearConfirm,
  setShowLogoutConfirm,
  inputText,
  setInputText,
  handleInputChange,
  handleSendMessage,
  isRecordingAudio,
  recDuration,
  startRecording,
  stopRecording,
  cancelRecording,
  formatTimer,
}) {
  return (
    <>
      {/* Replying Banner Bar */}
      {replyingTo && (
        <div
          style={{
            backgroundColor: '#182229',
            borderTop: '1px solid rgba(134, 150, 160, 0.15)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '20px' }}>
              reply
            </span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00a884' }}>Replying to {replyingTo.nickname}</div>
              <div style={{ fontSize: '0.75rem', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyingTo.message}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Editing Message Banner Bar */}
      {editingMsg && (
        <div
          style={{
            backgroundColor: '#182229',
            borderTop: '1px solid rgba(134, 150, 160, 0.15)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '20px' }}>
              edit
            </span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#00a884' }}>Editing Message</div>
              <div style={{ fontSize: '0.75rem', color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editingMsg.message}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelEditing}
            style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
            title="Cancel editing"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Emoji Picker Container */}
      {showEmojiPicker && (
        <div className="emoji-picker-container">
          <div className="emoji-picker-header">
            <span>Choose Emoji</span>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
          <div className="emoji-grid">
            {EMOJI_LIST.map((emoji, i) => (
              <button
                key={i}
                type="button"
                className="emoji-btn"
                onClick={() => {
                  setInputText((prev) => prev + emoji);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <footer
        style={{
          minHeight: '62px',
          backgroundColor: '#202c33',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        {isRecordingAudio ? (
          /* Live Voice Recording UI Bar */
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', backgroundColor: '#182229', padding: '6px 14px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff2e74' }}>
              <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '20px' }}>mic</span>
              <span style={{ fontSize: '0.86rem', fontWeight: 700 }}>Recording... {formatTimer(recDuration)}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={cancelRecording}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px' }}
              title="Cancel recording"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
            <button
              type="button"
              onClick={stopRecording}
              style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="Send Voice Note"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
            </button>
          </div>
        ) : (
          /* Standard Input Controls Form */
          <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            {/* Emoji Picker Toggle Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Emojis"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>sentiment_satisfied</span>
            </button>

            {/* Action Group Popup Menu Button (+ Icon) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowActionMenu(!showActionMenu)}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Attachments & Actions"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px', transform: showActionMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  add
                </span>
              </button>

              {/* Action Dropdown Popup Menu */}
              {showActionMenu && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '48px',
                    left: 0,
                    backgroundColor: '#233138',
                    borderRadius: '16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                    border: '1px solid rgba(134, 150, 160, 0.2)',
                    padding: '8px 0',
                    zIndex: 100,
                    width: '240px',
                  }}
                  className="animate-fade-in"
                >
                  {/* 1. File & Image Upload */}
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#00a884' }}>attach_file</span>
                    <span>{isUploadingFile ? 'Uploading File...' : 'Attach File or Image'}</span>
                    <input
                      type="file"
                      onChange={(e) => {
                        handleFileUpload(e);
                        setShowActionMenu(false);
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {/* 2. Create Live Poll */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPollModal(true);
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#00a884' }}>poll</span>
                    <span>Create Poll</span>
                  </button>

                  {/* 3. Share Location */}
                  <button
                    type="button"
                    onClick={() => {
                      handleShareLocation();
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ff2e74' }}>location_on</span>
                    <span>Share Location</span>
                  </button>

                  {/* 4. Disappearing Messages */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisappearingMenu(!showDisappearingMenu);
                      setShowActionMenu(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#e9edef', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
                    className="hover:bg-[#182229]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ff9800' }}>timer</span>
                    <span>Disappearing Messages {disappearingTimer > 0 ? `(${disappearingTimer}s)` : ''}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Text Field */}
            <input
              type="text"
              placeholder={editingMsg ? 'Edit message...' : 'Type a message'}
              value={inputText}
              onChange={handleInputChange}
              style={{
                flex: 1,
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#2a3942',
                border: 'none',
                color: '#e9edef',
                padding: '0 16px',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />

            {/* Send / Save or Voice Record Button */}
            {inputText.trim() || editingMsg ? (
              <MagneticButton
                type="submit"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                  flexShrink: 0,
                }}
                title={editingMsg ? 'Save edit' : 'Send message'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {editingMsg ? 'check' : 'send'}
                </span>
              </MagneticButton>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#00a884',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 168, 132, 0.4)',
                  flexShrink: 0,
                }}
                title="Record Voice Note"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>mic</span>
              </button>
            )}
          </form>
        )}
      </footer>
    </>
  );
}
