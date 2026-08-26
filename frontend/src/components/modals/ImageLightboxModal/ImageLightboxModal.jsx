import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function ImageLightboxModal({ lightboxImage, onClose }) {
  return (
    <AnimatePresence>
      {lightboxImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 20, 26, 0.94)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={onClose}
        >
          <button type="button" onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <motion.img
            layoutId={lightboxImage.id ? `chat-img-${lightboxImage.id}` : undefined}
            src={lightboxImage.url}
            alt={lightboxImage.name}
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 12px 40px rgba(0,0,0,0.8)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{lightboxImage.name}</span>
            <a href={lightboxImage.url} download target="_blank" rel="noreferrer" style={{ backgroundColor: '#00a884', color: '#fff', textDecoration: 'none', padding: '6px 18px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              Download
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
