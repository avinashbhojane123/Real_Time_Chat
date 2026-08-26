import React from 'react';

export default function PollModal({
  isOpen,
  onClose,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  onCreatePoll,
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111b21', borderRadius: '18px', border: '1px solid rgba(134, 150, 160, 0.2)', padding: '24px', boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }} className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: '#e9edef' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined" style={{ color: '#00a884' }}>poll</span>
            <span>Create Live Poll</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
            Poll Question:
          </label>
          <input
            type="text"
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#2a3942', border: 'none', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8696a0', display: 'block', marginBottom: '6px' }}>
            Options:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pollOptions.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...pollOptions];
                  newOpts[idx] = e.target.value;
                  setPollOptions(newOpts);
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#2a3942', border: 'none', color: '#fff', fontSize: '0.82rem', outline: 'none' }}
              />
            ))}
          </div>
          {pollOptions.length < 5 && (
            <button
              type="button"
              onClick={() => setPollOptions([...pollOptions, ''])}
              style={{ marginTop: '8px', background: 'none', border: 'none', color: '#00a884', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add Option
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onCreatePoll} style={{ backgroundColor: '#00a884', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: '18px', fontWeight: 700, cursor: 'pointer' }}>
            Send Poll
          </button>
        </div>
      </div>
    </div>
  );
}
