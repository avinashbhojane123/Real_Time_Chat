import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { getApiBaseUrl } from '../utils/apiConfig';
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

export default function StatusCreatorModal({ baseUrl, onClose, onSubmitStatus }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'video'
  const [text, setText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [stickers, setStickers] = useState([]);

  const STICKER_LIST = ['✨', '🔥', '❤️', '🎉', '⭐', '🚀', '💯', '😎'];

  const addSticker = (emoji) => {
    setStickers((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), emoji },
    ]);
  };

  const removeSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };



  const cleanApiUrl = (baseUrl || getApiBaseUrl()).replace(/\/+$/, '');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
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

  const handleSubmit = () => {
    if (activeTab === 'text' && !text.trim()) {
      alert('Please enter text for your status update.');
      return;
    }
    if ((activeTab === 'image' || activeTab === 'video') && !mediaUrl) {
      alert('Please select and upload a media file.');
      return;
    }

    onSubmitStatus({
      type: activeTab,
      content: text.trim(),
      mediaUrl: mediaUrl || null,
      bgColor: activeTab === 'text' ? selectedGradient : '#0b141a',
    });

    onClose();
  };

  return (
    <AnimatedModal
      isOpen={true}
      onClose={onClose}
      maxWidth="480px"
      enableDragDismiss={true}
      zIndex={99999}
      backdropStyle={{
        backgroundColor: 'rgba(11, 20, 26, 0.92)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          width: '100%',
          backgroundColor: '#111b21',
          borderRadius: '16px',
          border: '1px solid rgba(134, 150, 160, 0.2)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#202c33',
            borderBottom: '1px solid rgba(134, 150, 160, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e9edef', fontWeight: 700, fontSize: '1.05rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '24px' }}>
              auto_awesome
            </span>
            <span>Create Status Story</span>
          </div>

          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8696a0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
            }}
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#202c33',
            padding: '4px',
            margin: '16px 20px 0 20px',
            borderRadius: '10px',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'text' ? '#00a884' : 'transparent',
              color: activeTab === 'text' ? '#ffffff' : '#8696a0',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setActiveTab('text');
              setMediaUrl('');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              title
            </span>
            Text
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'image' ? '#00a884' : 'transparent',
              color: activeTab === 'image' ? '#ffffff' : '#8696a0',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setActiveTab('image');
              setMediaUrl('');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              image
            </span>
            Photo
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'video' ? '#00a884' : 'transparent',
              color: activeTab === 'video' ? '#ffffff' : '#8696a0',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => {
              setActiveTab('video');
              setMediaUrl('');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              videocam
            </span>
            Video
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {/* Text Mode */}
          {activeTab === 'text' && (
            <div>
              <div
                style={{
                  height: '180px',
                  borderRadius: '14px',
                  background: selectedGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Draggable Stickers Overlay */}
                <AnimatePresence>
                  {stickers.map((st) => (
                    <motion.div
                      key={st.id}
                      drag
                      dragConstraints={{ top: -70, left: -140, right: 140, bottom: 70 }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onDoubleClick={() => removeSticker(st.id)}
                      title="Double click to remove sticker"
                      style={{
                        position: 'absolute',
                        fontSize: '2.2rem',
                        cursor: 'grab',
                        userSelect: 'none',
                        zIndex: 15,
                      }}
                    >
                      {st.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>

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
                    fontWeight: 600,
                    textAlign: 'center',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Sticker Toolbar */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '6px 10px', backgroundColor: '#202c33', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8696a0' }}>Stickers:</span>
                {STICKER_LIST.map((emoji) => (
                  <motion.button
                    key={emoji}
                    type="button"
                    whileHover={{ scale: 1.3, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addSticker(emoji)}
                    style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '2px' }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              {/* Gradient Color Selector */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                {GRADIENTS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: g,
                      border: selectedGradient === g ? '3px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      transition: 'transform 0.15s ease',
                    }}
                    onClick={() => setSelectedGradient(g)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Image Mode */}
          {activeTab === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mediaUrl ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={mediaUrl}
                    alt="Upload Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#00a884', marginTop: '6px', fontWeight: 600 }}>
                    ✓ Photo Uploaded ({mediaFileName})
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    height: '140px',
                    border: '2px dashed rgba(134, 150, 160, 0.3)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#202c33',
                  }}
                >
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#00a884' }}>
                    add_photo_alternate
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#8696a0', marginTop: '8px', fontWeight: 500 }}>
                    {uploading ? 'Uploading Photo...' : 'Click to Upload Photo'}
                  </span>
                </label>
              )}

              <input
                type="text"
                placeholder="Add a caption..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#2a3942',
                  border: '1px solid rgba(134, 150, 160, 0.2)',
                  color: '#e9edef',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Video Mode */}
          {activeTab === 'video' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mediaUrl ? (
                <div style={{ textAlign: 'center' }}>
                  <video
                    src={mediaUrl}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', objectFit: 'contain', backgroundColor: '#000' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#00a884', marginTop: '6px', fontWeight: 600 }}>
                    ✓ Video Uploaded ({mediaFileName})
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    height: '140px',
                    border: '2px dashed rgba(134, 150, 160, 0.3)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#202c33',
                  }}
                >
                  <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#00a884' }}>
                    video_call
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#8696a0', marginTop: '8px', fontWeight: 500 }}>
                    {uploading ? 'Uploading Video...' : 'Click to Upload Video (MP4/WebM)'}
                  </span>
                </label>
              )}

              <input
                type="text"
                placeholder="Add a caption..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#2a3942',
                  border: '1px solid rgba(134, 150, 160, 0.2)',
                  color: '#e9edef',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#202c33',
            borderTop: '1px solid rgba(134, 150, 160, 0.15)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8696a0',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              padding: '8px 16px',
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <MagneticButton
            onClick={handleSubmit}
            disabled={uploading}
            style={{
              backgroundColor: '#00a884',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: '24px',
              padding: '10px 24px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0, 168, 132, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              send
            </span>
            Post Status
          </MagneticButton>

        </div>
      </div>
    </AnimatedModal>
  );
}

