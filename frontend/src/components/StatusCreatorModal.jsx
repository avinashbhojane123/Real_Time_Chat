import { useState } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiConfig';

const GRADIENTS = [
  'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
  'linear-gradient(135deg, #11998e, #38ef7d)',
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
      alert('Please enter text for your status.');
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
      bgColor: activeTab === 'text' ? selectedGradient : '#0f0f13',
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#16161e',
          borderRadius: '20px',
          border: '1px solid var(--m3-outline-variant)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#25d366' }}>
              auto_awesome
            </span>
            <span>Create Status Update</span>
          </div>

          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a0a0b0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '4px',
            margin: '16px 20px 0 20px',
            borderRadius: '12px',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'text' ? '#25d366' : 'transparent',
              color: activeTab === 'text' ? '#000' : '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
              backgroundColor: activeTab === 'image' ? '#25d366' : 'transparent',
              color: activeTab === 'image' ? '#000' : '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={() => {
              setActiveTab('image');
              setMediaUrl('');
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              image
            </span>
            Image
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'video' ? '#25d366' : 'transparent',
              color: activeTab === 'video' ? '#000' : '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
                  borderRadius: '16px',
                  background: selectedGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                }}
              >
                <textarea
                  placeholder="Type a status update or paste a URL..."
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
                  }}
                />
              </div>

              {/* Gradient Palette */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
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
                    }}
                    onClick={() => setSelectedGradient(g)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Image Mode */}
          {activeTab === 'image' && (
            <div>
              {mediaUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={mediaUrl}
                    alt="Upload Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#81c784', marginTop: '6px' }}>
                    ✓ Image Uploaded ({mediaFileName})
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    height: '140px',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#25d366' }}>
                    add_photo_alternate
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#c7c5d0', marginTop: '8px' }}>
                    {uploading ? 'Uploading Image...' : 'Click to Upload Image'}
                  </span>
                </label>
              )}

              <input
                type="text"
                placeholder="Add a caption or link..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Video Mode */}
          {activeTab === 'video' && (
            <div>
              {mediaUrl ? (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <video
                    src={mediaUrl}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#81c784', marginTop: '6px' }}>
                    ✓ Video Uploaded ({mediaFileName})
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    height: '140px',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ff4e4e' }}>
                    video_call
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#c7c5d0', marginTop: '8px' }}>
                    {uploading ? 'Uploading Video...' : 'Click to Upload Video (MP4/WebM)'}
                  </span>
                </label>
              )}

              <input
                type="text"
                placeholder="Add a caption or link..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="m3-btn m3-btn-text"
            onClick={onClose}
            style={{ color: '#a0a0b0' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="m3-btn m3-btn-filled"
            onClick={handleSubmit}
            disabled={uploading}
            style={{
              backgroundColor: '#25d366',
              color: '#000',
              fontWeight: 700,
              borderRadius: '24px',
              padding: '8px 20px',
            }}
          >
            Post Status
          </button>
        </div>
      </div>
    </div>
  );
}
