import React from 'react';

export default function DocumentViewerModal({ documentFile, onClose }) {
  if (!documentFile) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.94)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: '56px', backgroundColor: '#202c33', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#e9edef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.95rem' }}>
          <span className="material-symbols-outlined" style={{ color: '#00a884' }}>description</span>
          <span>{documentFile.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
      <div style={{ flex: 1, backgroundColor: '#525659' }}>
        <iframe src={documentFile.url} title="Document Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
      </div>
    </div>
  );
}
