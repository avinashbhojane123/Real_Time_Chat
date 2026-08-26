import React from 'react';

export default function ClearConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#111b21', borderRadius: '16px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '20px', boxShadow: '0 12px 30px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f44336', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>delete_sweep</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#e9edef' }}>Clear All Messages?</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#8696a0', marginBottom: '20px', lineHeight: 1.4 }}>
          Are you sure you want to clear all chat messages for everyone?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
