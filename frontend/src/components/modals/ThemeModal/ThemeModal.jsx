import React, { useState } from 'react';

const WALLPAPER_PRESETS = [
  {
    name: 'Nature River',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop',
  },
  {
    name: 'Dark Cyberpunk',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1920&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=200&auto=format&fit=crop',
  },
  {
    name: 'Deep Space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=200&auto=format&fit=crop',
  },
  {
    name: 'Abstract Fluid',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
  },
];

export default function ThemeModal({ isOpen, onClose, themes, currentTheme, customWallpaper, onSelectTheme }) {
  const [inputUrl, setInputUrl] = useState(customWallpaper || '');
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const handleApplyCustomUrl = (urlToApply) => {
    const targetUrl = (urlToApply || inputUrl).trim();
    if (targetUrl) {
      setImageError(false);
      onSelectTheme('custom', targetUrl);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setInputUrl(dataUrl);
        setImageError(false);
        onSelectTheme('custom', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 20, 26, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#111b21',
          borderRadius: '18px',
          border: '1px solid rgba(134, 150, 160, 0.2)',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
        }}
        className="animate-fade-in"
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: '#e9edef' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884' }}>palette</span>
            <span>Chat Themes & Wallpapers</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Theme Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {themes.map((theme) => (
            <div
              key={theme.key}
              onClick={() => {
                if (theme.key === 'custom') {
                  onSelectTheme('custom', inputUrl || customWallpaper);
                } else {
                  onSelectTheme(theme.key);
                }
              }}
              style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: currentTheme === theme.key ? '#202c33' : '#182229',
                border: `2px solid ${currentTheme === theme.key ? '#00a884' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: theme.previewColor, fontSize: '28px' }}>{theme.icon}</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e9edef' }}>{theme.name}</span>
            </div>
          ))}
        </div>

        {/* Custom Wallpaper Section */}
        {currentTheme === 'custom' && (
          <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', backgroundColor: '#182229', border: '1px solid rgba(134, 150, 160, 0.15)' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e9edef', marginBottom: '10px' }}>
              Custom Image Wallpaper
            </div>

            {/* Presets Grid */}
            <div style={{ fontSize: '0.75rem', color: '#8696a0', marginBottom: '6px' }}>Pick a curated wallpaper:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {WALLPAPER_PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  onClick={() => {
                    setInputUrl(preset.url);
                    handleApplyCustomUrl(preset.url);
                  }}
                  style={{
                    position: 'relative',
                    height: '56px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: inputUrl === preset.url ? '2px solid #00a884' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  title={preset.name}
                >
                  <img src={preset.thumb} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>

            {/* URL Input */}
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
              Or Paste Any Image URL:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="https://images.unsplash.com/photo-..."
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setImageError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyCustomUrl(inputUrl);
                }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#2a3942',
                  border: '1px solid rgba(134, 150, 160, 0.2)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => handleApplyCustomUrl(inputUrl)}
                style={{
                  backgroundColor: '#00a884',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Apply
              </button>
            </div>

            {/* File Upload from Device */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#e9edef',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#00a884' }}>upload</span>
                <span>Upload From Device</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              {customWallpaper && (
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl('');
                    onSelectTheme('wa-doodle');
                  }}
                  style={{ background: 'none', border: 'none', color: '#f15c6d', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reset Wallpaper
                </button>
              )}
            </div>

            {/* Live Preview Thumbnail */}
            {inputUrl && !imageError && (
              <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', height: '90px', position: 'relative', border: '1px solid rgba(0, 168, 132, 0.3)' }}>
                <img
                  src={inputUrl}
                  alt="Wallpaper preview"
                  onError={() => setImageError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '4px', right: '6px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#00a884', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  Active Preview
                </div>
              </div>
            )}

            {imageError && (
              <div style={{ color: '#f15c6d', fontSize: '0.72rem', marginTop: '6px' }}>
                Unable to load image from this URL. Please check the link or upload an image file.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => {
              if (currentTheme === 'custom' && inputUrl) {
                handleApplyCustomUrl(inputUrl);
              }
              onClose();
            }}
            style={{
              backgroundColor: '#00a884',
              color: '#fff',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.84rem',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
