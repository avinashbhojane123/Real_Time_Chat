import React from 'react';

export default function ThemeModal({ isOpen, onClose, themes, currentTheme, customWallpaper, onSelectTheme }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111b21', borderRadius: '18px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: '#e9edef' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884' }}>palette</span>
            <span>Chat Themes & Wallpapers</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {themes.map((theme) => (
            <div
              key={theme.key}
              onClick={() => onSelectTheme(theme.key)}
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

        {currentTheme === 'custom' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
              Custom Image Wallpaper URL:
            </label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/photo-1518709268805-4e9042af9f23"
              value={customWallpaper}
              onChange={(e) => onSelectTheme('custom', e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#2a3942', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
