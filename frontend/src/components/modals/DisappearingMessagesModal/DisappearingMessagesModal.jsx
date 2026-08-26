import React from 'react';

export default function DisappearingMessagesModal({
  isOpen,
  onClose,
  disappearingTimer,
  onSelectTimer,
}) {
  if (!isOpen) return null;

  const TIMER_OPTIONS = [
    { label: 'Off', val: 0 },
    { label: '10 Seconds', val: 10 },
    { label: '30 Seconds', val: 30 },
    { label: '60 Seconds', val: 60 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#111b21', borderRadius: '18px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#e9edef' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#ff9800' }}>timer</span>
            <span>Disappearing Messages</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#8696a0', marginBottom: '16px', lineHeight: 1.4 }}>
          Set a self-destruct countdown timer for new messages. Messages automatically disappear after the selected duration.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {TIMER_OPTIONS.map((item) => (
            <button
              key={item.val}
              onClick={() => onSelectTimer(item.val, item.label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: disappearingTimer === item.val ? '#202c33' : '#182229',
                border: `1px solid ${disappearingTimer === item.val ? '#00a884' : 'rgba(134,150,160,0.15)'}`,
                color: '#e9edef',
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: disappearingTimer === item.val ? 700 : 400 }}>{item.label}</span>
              {disappearingTimer === item.val && <span className="material-symbols-outlined" style={{ color: '#00a884', fontSize: '18px' }}>check_circle</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
