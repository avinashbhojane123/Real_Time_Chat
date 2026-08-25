import { motion, AnimatePresence } from 'motion/react';

/**
 * ScrollToBottomPill renders a floating button when the user scrolls up in chat.
 * Shows unread messages badge with spring entrance.
 */
export default function ScrollToBottomPill({
  visible = false,
  unreadCount = 0,
  onClick,
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 24, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onClick}
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '24px',
            backgroundColor: 'var(--m3-primary, #6366f1)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            cursor: 'pointer',
            zIndex: 90,
          }}
          title="Scroll to latest messages"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            arrow_downward
          </span>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: '12px',
                padding: '2px 7px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '2px solid #111b21',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
