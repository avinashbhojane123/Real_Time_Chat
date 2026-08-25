import { motion, AnimatePresence } from 'motion/react';

/**
 * AnimatedModal wraps overlays with backdrop blur fade & spring scale transitions.
 * Supports drag-to-dismiss vertically if enableDragDismiss is true.
 */
export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  enableDragDismiss = false,
  maxWidth = '500px',
  zIndex = 9999,
  className = '',
  style = {},
  backdropStyle = {},
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: zIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            ...backdropStyle,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 28,
              mass: 0.9,
            }}
            drag={enableDragDismiss ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={(e, info) => {
              if (enableDragDismiss && info.offset.y > 120) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: maxWidth,
              position: 'relative',
              boxSizing: 'border-box',
              ...style,
            }}
            className={`animated-modal-content ${className}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
